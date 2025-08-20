import { APIGatewayProxyResult } from 'aws-lambda';
import { IAPIGatewayProxyEventPublic } from '@kss-backend/core/mainframe/helpers/interfaces/middleware';
import { lambdaHandlerTenantPublic } from '@kss-backend/core/mainframe/core/middy';
import { apiResponse } from '@kss-backend/core/mainframe/helpers/response';
import createError from 'http-errors';

const listMenusHandler = async (event: IAPIGatewayProxyEventPublic): Promise<APIGatewayProxyResult> => {
    try {
        const tenantContext = event.tenantContext;
        if (!tenantContext) {
            throw new createError.BadRequest('Invalid tenant context');
        }
        const restaurantId = event.pathParameters?.restaurantId;
        if (!restaurantId) {
            throw new createError.BadRequest('Restaurant ID is required');
        }
        const menus = await tenantContext.models.Menu.find({
            restaurantId: restaurantId,
            isActive: true
        }).select('_id name displayName description imageUrl products isActive createdAt updatedAt').lean().maxTimeMS(5000);
        return apiResponse(200, {
            success: true,
            data: menus,
            total: menus.length
        });
    } catch (error) {
        console.error('Error listing menus:', error);
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

export const handler = lambdaHandlerTenantPublic(listMenusHandler, {
    initMongoDbConnection: true
});
