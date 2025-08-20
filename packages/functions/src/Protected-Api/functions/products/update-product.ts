import { APIGatewayProxyResult } from 'aws-lambda';
import { IAPIGatewayProxyEventWithUserAndBody } from '@kss-backend/core/mainframe/helpers/interfaces/middleware';
import { lambdaHandlerTenantAuth } from '@kss-backend/core/mainframe/core/middy';
import { apiResponse } from '@kss-backend/core/mainframe/helpers/response';
import { UserRolesEnum } from '@kss-backend/core/mainframe/database/interfaces/user';
import createError from 'http-errors';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';

interface UpdateProductBody {
    name?: string;
    description?: string;
    price?: number;
    categoryId?: string;
    imageBase64?: string;
    imageType?: string;
}

const s3BucketName = process.env.PRODUCT_IMAGE_BUCKET || 'product-images';
const s3Client = new S3Client({ region: process.env.AWS_REGION || 'eu-central-1' });

const updateProductHandler = async (event: IAPIGatewayProxyEventWithUserAndBody<UpdateProductBody>): Promise<APIGatewayProxyResult> => {
    try {
        const productId = event.pathParameters?.id;
        const restaurantId = event.pathParameters?.restaurantId;
        const companyId = event.pathParameters?.companyId;
        if (!productId || !restaurantId || !companyId) {
            throw new createError.BadRequest('Missing required fields');
        }
        if (!event.tenantModels) {
            throw new createError.InternalServerError('Tenant models not available');
        }
        const product = await event.tenantModels.Product.findById(productId);
        if (!product) {
            throw new createError.NotFound('Product not found');
        }
        // Update fields
        if (event.body.name) product.name = event.body.name;
        if (event.body.description) product.description = event.body.description;
        if (event.body.price !== undefined) product.price = event.body.price;
        if (event.body.categoryId) product.categoryId = event.body.categoryId;
        if (event.body.imageBase64 && event.body.imageType) {
            // Upload new image to S3
            const fileExt = event.body.imageType.split('/')[1] || 'png';
            const fileName = `${Date.now()}_${Math.random().toString(36).substring(2, 8)}.${fileExt}`;
            const s3Key = `${companyId}/${restaurantId}/products/${fileName}`;
            const buffer = Buffer.from(event.body.imageBase64, 'base64');
            await s3Client.send(new PutObjectCommand({
                Bucket: s3BucketName,
                Key: s3Key,
                Body: buffer,
                ContentType: event.body.imageType,
                ACL: 'public-read'
            }));
            product.imageUrl = `https://${s3BucketName}.s3.amazonaws.com/${s3Key}`;
        }
        product.updatedBy = event.user.cognitoSub || event.user.id || 'system';
        await product.save();
        return apiResponse(200, { success: true, data: {
            id: product._id,
            name: product.name,
            description: product.description,
            price: product.price,
            imageUrl: product.imageUrl,
            restaurantId: product.restaurantId,
            categoryId: product.categoryId,
            updatedAt: product.updatedAt
        }});
    } catch (error) {
        if (error instanceof createError.HttpError) {
            return apiResponse(error.statusCode, { error: error.message });
        }
        return apiResponse(500, { error: 'Internal server error', message: error instanceof Error ? error.message : 'Unknown error' });
    }
};

export const handler = lambdaHandlerTenantAuth(updateProductHandler, {
    initMongoDbConnection: true,
    requiredPermissionGroups: [UserRolesEnum.ADMIN, UserRolesEnum.GLOBAL_ADMIN]
});
