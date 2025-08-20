import { APIGatewayProxyResult } from 'aws-lambda';
import { IAPIGatewayProxyEventWithUserAndBody } from '@kss-backend/core/mainframe/helpers/interfaces/middleware';
import { lambdaHandlerTenantAuth } from '@kss-backend/core/mainframe/core/middy';
import { apiResponse } from '@kss-backend/core/mainframe/helpers/response';
import { UserRolesEnum } from '@kss-backend/core/mainframe/database/interfaces/user';

const listCategoriesHandler = async (event: IAPIGatewayProxyEventWithUserAndBody<null>): Promise<APIGatewayProxyResult> => {
    try {
        const restaurantId = event.pathParameters?.restaurantId;
        const tenantModels = event.tenantModels || event.tenantContext?.models;
        if (!restaurantId) {
            return apiResponse(400, { error: 'restaurantId is required' });
        }
        if (!tenantModels) {
            return apiResponse(500, { error: 'Tenant models not available' });
        }
        const categories = await tenantModels.Category.find({ restaurantId, isActive: true })
            .select('name description restaurantId createdAt')
            .sort({ createdAt: -1 })
            .lean();
        return apiResponse(200, { success: true, data: categories });
    } catch (error) {
        return apiResponse(500, { error: 'Internal server error', message: error instanceof Error ? error.message : 'Unknown error' });
    }
};

export const handler = lambdaHandlerTenantAuth(listCategoriesHandler, {
    initMongoDbConnection: true,
    requiredPermissionGroups: [UserRolesEnum.ADMIN, UserRolesEnum.GLOBAL_ADMIN]
});
