import { APIGatewayProxyResult } from 'aws-lambda';
import { IAPIGatewayProxyEventWithUserAndBody } from '@kss-backend/core/mainframe/helpers/interfaces/middleware';
import { lambdaHandlerTenantAuth } from '@kss-backend/core/mainframe/core/middy';
import { apiResponse } from '@kss-backend/core/mainframe/helpers/response';
import { UserRolesEnum } from '@kss-backend/core/mainframe/database/interfaces/user';

const getQRCodeHandler = async (event: IAPIGatewayProxyEventWithUserAndBody<null>): Promise<APIGatewayProxyResult> => {
    try {
        const qrcodeId = event.pathParameters?.id;
        const tenantModels = event.tenantModels || event.tenantContext?.models;
        if (!qrcodeId) {
            return apiResponse(400, { error: 'QRCode id is required' });
        }
        if (!tenantModels) {
            return apiResponse(500, { error: 'Tenant models not available' });
        }
        const qrcode = await tenantModels.QRCode.findById(qrcodeId)
            .select('code qrCodeUrl targetUrl restaurantId createdAt')
            .lean();
        if (!qrcode) {
            return apiResponse(404, { error: 'QRCode not found' });
        }
        return apiResponse(200, { success: true, data: qrcode });
    } catch (error) {
        return apiResponse(500, { error: 'Internal server error', message: error instanceof Error ? error.message : 'Unknown error' });
    }
};

export const handler = lambdaHandlerTenantAuth(getQRCodeHandler, {
    initMongoDbConnection: true,
    requiredPermissionGroups: [UserRolesEnum.ADMIN, UserRolesEnum.GLOBAL_ADMIN]
});
