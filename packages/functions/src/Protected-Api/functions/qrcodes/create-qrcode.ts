import { APIGatewayProxyResult } from 'aws-lambda';
import { IAPIGatewayProxyEventWithUserAndBody } from '@kss-backend/core/mainframe/helpers/interfaces/middleware';
import { lambdaHandlerTenantAuth } from '@kss-backend/core/mainframe/core/middy';
import { apiResponse } from '@kss-backend/core/mainframe/helpers/response';
import { UserRolesEnum } from '@kss-backend/core/mainframe/database/interfaces/user';
import createError from 'http-errors';
import { v4 as uuidv4 } from 'uuid';
import QRCode from 'qrcode';
import config from '../../../../../../config';

interface CreateQRCodeBody {
    displayName?: string;
}

const createQRCodeHandler = async (event: IAPIGatewayProxyEventWithUserAndBody<CreateQRCodeBody>): Promise<APIGatewayProxyResult> => {
    try {
        const restaurantId = event.pathParameters?.restaurantId;
        const companyId = event.pathParameters?.companyId;
        const tenantModels = event.tenantModels || event.tenantContext?.models;
        if (!restaurantId || !companyId) {
            throw new createError.BadRequest('Missing required fields');
        }
        if (!tenantModels) {
            throw new createError.InternalServerError('Tenant models not available');
        }
        // Generate code and targetUrl
        const code = uuidv4();
        const baseUrl = config.DOMAIN || 'http://localhost:3000';
        const targetUrl = `${baseUrl}/company/${companyId}/restaurant/${restaurantId}`;
        // Generate QR code image as PNG buffer
        const qrPngBuffer: Buffer = await QRCode.toBuffer(targetUrl, { type: 'png', width: 512 });
        // S3 upload
        const s3BucketName = process.env.MEDIA_ASSETS_BUCKET_NAME;
        const s3Key = `${companyId}/${restaurantId}/qrcode.png`;
        const { S3Client, PutObjectCommand } = await import('@aws-sdk/client-s3');
        const s3Client = new S3Client({ region: config.AWS_REGION || 'eu-central-1' });
        await s3Client.send(new PutObjectCommand({
            Bucket: s3BucketName,
            Key: s3Key,
            Body: qrPngBuffer,
            ContentType: 'image/png',
            ACL: 'public-read'
        }));
        const qrCodeUrl = `https://${s3BucketName}.s3.amazonaws.com/${s3Key}`;
        // Save QR code
        const newQRCode = new tenantModels.QRCode({
            code,
            qrCodeUrl,
            targetUrl,
            restaurantId,
            isActive: true,
            createdBy: event.user.cognitoSub || event.user.id || 'system'
        });
        const savedQRCode = await newQRCode.save();
        return apiResponse(201, {
            success: true,
            data: {
                id: savedQRCode._id,
                code: savedQRCode.code,
                qrCodeUrl: savedQRCode.qrCodeUrl,
                targetUrl: savedQRCode.targetUrl,
                restaurantId: savedQRCode.restaurantId,
                createdAt: savedQRCode.createdAt
            }
        });
    } catch (error) {
        if (error instanceof createError.HttpError) {
            return apiResponse(error.statusCode, { error: error.message });
        }
        return apiResponse(500, { error: 'Internal server error', message: error instanceof Error ? error.message : 'Unknown error' });
    }
};

export const handler = lambdaHandlerTenantAuth(createQRCodeHandler, {
    initMongoDbConnection: true,
    requiredPermissionGroups: [UserRolesEnum.ADMIN, UserRolesEnum.GLOBAL_ADMIN]
});
