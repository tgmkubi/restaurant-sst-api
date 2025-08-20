import { APIGatewayProxyResult } from 'aws-lambda';
import { IAPIGatewayProxyEventWithUserAndBody } from '@kss-backend/core/mainframe/helpers/interfaces/middleware';
import { lambdaHandlerTenantAuth } from '@kss-backend/core/mainframe/core/middy';
import { apiResponse } from '@kss-backend/core/mainframe/helpers/response';
import { UserRolesEnum } from '@kss-backend/core/mainframe/database/interfaces/user';

const getProductHandler = async (event: IAPIGatewayProxyEventWithUserAndBody<null>): Promise<APIGatewayProxyResult> => {
    try {
        const productId = event.pathParameters?.id;
        if (!productId) {
            return apiResponse(400, { error: 'Product id is required' });
        }

        if (!event.tenantModels) {
            return apiResponse(500, { error: 'Tenant models not available' });
        }
        const product = await event.tenantModels.Product.findById(productId)
            .select('name description price imageUrl restaurantId categoryId createdAt')
            .lean();
        if (!product) {
            return apiResponse(404, { error: 'Product not found' });
        }
        return apiResponse(200, { success: true, data: product });
    } catch (error) {
        return apiResponse(500, { error: 'Internal server error', message: error instanceof Error ? error.message : 'Unknown error' });
    }
};

export const handler = lambdaHandlerTenantAuth(getProductHandler, {
    initMongoDbConnection: true,
    requiredPermissionGroups: [UserRolesEnum.ADMIN, UserRolesEnum.GLOBAL_ADMIN]
});
