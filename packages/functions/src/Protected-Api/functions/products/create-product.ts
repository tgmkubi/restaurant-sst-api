import { APIGatewayProxyResult } from 'aws-lambda';
import { IAPIGatewayProxyEventWithUserAndBody } from '@kss-backend/core/mainframe/helpers/interfaces/middleware';
import { lambdaHandlerTenantAuth } from '@kss-backend/core/mainframe/core/middy';
import { apiResponse } from '@kss-backend/core/mainframe/helpers/response';
import { UserRolesEnum } from '@kss-backend/core/mainframe/database/interfaces/user';
import createError from 'http-errors';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import config from "../../../../../../config";

interface CreateProductBody {
    name: string;
    description?: string;
    price: number;
    categoryId: string;
    imageBase64?: string; // Optional: base64 image data
    imageType?: string;   // Optional: image mime type (e.g. 'image/png')
}

const s3BucketName = process.env.MEDIA_ASSETS_BUCKET_NAME;
const s3Client = new S3Client({ region: config.AWS_REGION || 'eu-central-1' });

const createProductHandler = async (event: IAPIGatewayProxyEventWithUserAndBody<CreateProductBody>): Promise<APIGatewayProxyResult> => {
    try {
        const { name, description, price, categoryId, imageBase64, imageType } = event.body;
        const restaurantId = event.pathParameters?.restaurantId;
        const companyId = event.pathParameters?.companyId;
        if (!name || !price || !categoryId || !restaurantId || !companyId) {
            throw new createError.BadRequest('Missing required fields');
        }

        // Support both event.tenantModels and event.tenantContext.models
        const tenantModels = event.tenantModels || event.tenantContext?.models;
        if (!tenantModels) {
            throw new createError.InternalServerError('Tenant models not available');
        }

        // Check for duplicate product name in restaurant
        const existing = await tenantModels.Product.findOne({
            restaurantId,
            name
        }).select('_id').lean();
        if (existing) {
            throw new createError.Conflict('Product with same name already exists in this restaurant');
        }

        let imageUrl: string | undefined;
        if (imageBase64 && imageType) {
            // Upload image to S3
            const fileExt = imageType.split('/')[1] || 'png';
            const fileName = `${Date.now()}_${Math.random().toString(36).substring(2, 8)}.${fileExt}`;
            const s3Key = `${companyId}/${restaurantId}/products/${fileName}`;
            const buffer = Buffer.from(imageBase64, 'base64');
            await s3Client.send(new PutObjectCommand({
                Bucket: s3BucketName,
                Key: s3Key,
                Body: buffer,
                ContentType: imageType,
                ACL: 'public-read'
            }));
            imageUrl = `https://${s3BucketName}.s3.amazonaws.com/${s3Key}`;
        }

        const newProduct = new tenantModels.Product({
            name,
            description,
            price,
            imageUrl,
            restaurantId,
            categoryId,
            isActive: true,
            createdBy: event.user.cognitoSub || event.user.id || 'system'
        });
        const savedProduct = await newProduct.save();
        return apiResponse(201, {
            success: true,
            data: {
                id: savedProduct._id,
                name: savedProduct.name,
                description: savedProduct.description,
                price: savedProduct.price,
                imageUrl: savedProduct.imageUrl,
                restaurantId: savedProduct.restaurantId,
                categoryId: savedProduct.categoryId,
                createdAt: savedProduct.createdAt
            }
        });
    } catch (error) {
        if (error instanceof createError.HttpError) {
            return apiResponse(error.statusCode, { error: error.message });
        }
        return apiResponse(500, { error: 'Internal server error', message: error instanceof Error ? error.message : 'Unknown error' });
    }
};

export const handler = lambdaHandlerTenantAuth(createProductHandler, {
    initMongoDbConnection: true,
    requiredPermissionGroups: [UserRolesEnum.ADMIN, UserRolesEnum.GLOBAL_ADMIN]
});
