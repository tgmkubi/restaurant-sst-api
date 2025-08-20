import { APIGatewayProxyResult } from 'aws-lambda';
import { IAPIGatewayProxyEventWithUserAndBody } from '@kss-backend/core/mainframe/helpers/interfaces/middleware';
import { lambdaHandlerTenantAuth } from '@kss-backend/core/mainframe/core/middy';
import { apiResponse } from '@kss-backend/core/mainframe/helpers/response';
import { UserRolesEnum } from '@kss-backend/core/mainframe/database/interfaces/user';
import createError from 'http-errors';

interface UpdateQRCodeBody {
    isActive?: boolean;
}

const updateQRCodeHandler = async (event: IAPIGatewayProxyEventWithUserAndBody<UpdateQRCodeBody>): Promise<APIGatewayProxyResult> => {
    try {
        const qrcodeId = event.pathParameters?.id;
        const tenantModels = event.tenantModels || event.tenantContext?.models;
        if (!qrcodeId) {
            throw new createError.BadRequest('QRCode id is required');
        }
        if (!tenantModels) {
            throw new createError.InternalServerError('Tenant models not available');
        }
        const qrcode = await tenantModels.QRCode.findById(qrcodeId);
        if (!qrcode) {
            throw new createError.NotFound('QRCode not found');
        }
        if (event.body.isActive !== undefined) qrcode.isActive = event.body.isActive;
        qrcode.updatedBy = event.user.cognitoSub || event.user.id || 'system';
        await qrcode.save();
        return apiResponse(200, { success: true, data: {
            id: qrcode._id,
            code: qrcode.code,
            qrCodeUrl: qrcode.qrCodeUrl,
            targetUrl: qrcode.targetUrl,
            restaurantId: qrcode.restaurantId,
            updatedAt: qrcode.updatedAt
        }});
    } catch (error) {
        if (error instanceof createError.HttpError) {
            return apiResponse(error.statusCode, { error: error.message });
        }
        return apiResponse(500, { error: 'Internal server error', message: error instanceof Error ? error.message : 'Unknown error' });
    }
};

export const handler = lambdaHandlerTenantAuth(updateQRCodeHandler, {
    initMongoDbConnection: true,
    requiredPermissionGroups: [UserRolesEnum.ADMIN, UserRolesEnum.GLOBAL_ADMIN]
});
