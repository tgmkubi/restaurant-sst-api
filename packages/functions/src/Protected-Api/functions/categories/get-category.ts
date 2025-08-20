import { APIGatewayProxyResult } from 'aws-lambda';
import { IAPIGatewayProxyEventWithUserAndBody } from '@kss-backend/core/mainframe/helpers/interfaces/middleware';
import { lambdaHandlerTenantAuth } from '@kss-backend/core/mainframe/core/middy';
import { apiResponse } from '@kss-backend/core/mainframe/helpers/response';
import { UserRolesEnum } from '@kss-backend/core/mainframe/database/interfaces/user';

const getCategoryHandler = async (event: IAPIGatewayProxyEventWithUserAndBody<null>): Promise<APIGatewayProxyResult> => {
    try {
        const categoryId = event.pathParameters?.id;
        const tenantModels = event.tenantModels || event.tenantContext?.models;
        if (!categoryId) {
            return apiResponse(400, { error: 'Category id is required' });
        }
        if (!tenantModels) {
            return apiResponse(500, { error: 'Tenant models not available' });
        }
        const category = await tenantModels.Category.findById(categoryId)
            .select('name description restaurantId createdAt')
            .lean();
        if (!category) {
            return apiResponse(404, { error: 'Category not found' });
        }
        return apiResponse(200, { success: true, data: category });
    } catch (error) {
        return apiResponse(500, { error: 'Internal server error', message: error instanceof Error ? error.message : 'Unknown error' });
    }
};

export const handler = lambdaHandlerTenantAuth(getCategoryHandler, {
    initMongoDbConnection: true,
    requiredPermissionGroups: [UserRolesEnum.ADMIN, UserRolesEnum.GLOBAL_ADMIN]
});
