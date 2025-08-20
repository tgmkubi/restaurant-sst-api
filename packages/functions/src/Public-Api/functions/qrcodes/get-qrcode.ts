import { APIGatewayProxyResult } from 'aws-lambda';
import { IAPIGatewayProxyEventPublic } from '@kss-backend/core/mainframe/helpers/interfaces/middleware';
import { lambdaHandlerTenantPublic } from '@kss-backend/core/mainframe/core/middy';
import { apiResponse } from '@kss-backend/core/mainframe/helpers/response';
import createError from 'http-errors';

const getQrCodeHandler = async (event: IAPIGatewayProxyEventPublic): Promise<APIGatewayProxyResult> => {
    try {
        const tenantContext = event.tenantContext;
        if (!tenantContext) {
            throw new createError.BadRequest('Invalid tenant context');
        }
        const companyId = event.pathParameters?.companyId;
        if (!companyId) {
            throw new createError.BadRequest('Company ID is required');
        }
        const restaurantId = event.pathParameters?.restaurantId;
        if (!restaurantId) {
            throw new createError.BadRequest('Restaurant ID is required');
        }
        const qrCodeId = event.pathParameters?.id;
        if (!qrCodeId) {
            throw new createError.BadRequest('QR Code ID is required');
        }
        const qrCode = await tenantContext.models.QRCode.findOne({
            _id: qrCodeId,
            restaurantId: restaurantId,
            isActive: true
        }).lean();
        if (!qrCode) {
            throw new createError.NotFound('QR Code not found');
        }
        return apiResponse(200, {
            success: true,
            data: qrCode
        });
    } catch (error) {
        console.error('Error fetching QR code:', error);
        if (error instanceof createError.HttpError) {
            return apiResponse(error.statusCode, {
                error: error.message
            });
        }
        return apiResponse(500, {
            error: 'Internal server error',
            message: error instanceof Error ? error.message : 'Unknown error'
        });
    }
};

export const handler = lambdaHandlerTenantPublic(getQrCodeHandler, {
    initMongoDbConnection: true
});
