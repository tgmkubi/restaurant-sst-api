import { APIGatewayProxyResult } from 'aws-lambda';
import { IAPIGatewayProxyEventWithUserAndBody } from '@kss-backend/core/mainframe/helpers/interfaces/middleware';
import { lambdaHandlerTenantAuth } from '@kss-backend/core/mainframe/core/middy';
import { apiResponse } from '@kss-backend/core/mainframe/helpers/response';
import { UserRolesEnum } from '@kss-backend/core/mainframe/database/interfaces/user';
import createError from 'http-errors';

const deleteQRCodeHandler = async (event: IAPIGatewayProxyEventWithUserAndBody<null>): Promise<APIGatewayProxyResult> => {
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
        await qrcode.deleteOne();
        return apiResponse(200, { success: true, message: 'QRCode deleted' });
    } catch (error) {
        if (error instanceof createError.HttpError) {
            return apiResponse(error.statusCode, { error: error.message });
        }
        return apiResponse(500, { error: 'Internal server error', message: error instanceof Error ? error.message : 'Unknown error' });
    }
};

export const handler = lambdaHandlerTenantAuth(deleteQRCodeHandler, {
    initMongoDbConnection: true,
    requiredPermissionGroups: [UserRolesEnum.ADMIN, UserRolesEnum.GLOBAL_ADMIN]
});
