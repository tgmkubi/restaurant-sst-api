import { APIGatewayProxyResult } from 'aws-lambda';
import { IAPIGatewayProxyEventWithUserAndBody } from '@kss-backend/core/mainframe/helpers/interfaces/middleware';
import { lambdaHandlerTenantAuth } from '@kss-backend/core/mainframe/core/middy';
import { apiResponse } from '@kss-backend/core/mainframe/helpers/response';
import { UserRolesEnum } from '@kss-backend/core/mainframe/database/interfaces/user';

const listProductsHandler = async (event: IAPIGatewayProxyEventWithUserAndBody<null>): Promise<APIGatewayProxyResult> => {
    try {
        const restaurantId = event.pathParameters?.restaurantId;
        const categoryId = event.queryStringParameters?.categoryId;
        if (!restaurantId) {
            return apiResponse(400, { error: 'restaurantId is required' });
        }

        // Support both event.tenantModels and event.tenantContext.models
        const tenantModels = event.tenantModels || event.tenantContext?.models;
        if (!tenantModels) {
            return apiResponse(500, { error: 'Tenant models not available' });
        }
        const query: any = { restaurantId, isActive: true };
        if (categoryId) query.categoryId = categoryId;
        const products = await tenantModels.Product.find(query)
            .select('name description price imageUrl categoryId createdAt')
            .sort({ createdAt: -1 })
            .lean();
        return apiResponse(200, { success: true, data: products });
    } catch (error) {
        return apiResponse(500, { error: 'Internal server error', message: error instanceof Error ? error.message : 'Unknown error' });
    }
};

export const handler = lambdaHandlerTenantAuth(listProductsHandler, {
    initMongoDbConnection: true,
    requiredPermissionGroups: [UserRolesEnum.ADMIN, UserRolesEnum.GLOBAL_ADMIN]
});
