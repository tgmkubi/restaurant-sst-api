import { APIGatewayProxyResult } from 'aws-lambda';
import { IAPIGatewayProxyEventWithUserAndBody } from '@kss-backend/core/mainframe/helpers/interfaces/middleware';
import { lambdaHandlerTenantAuth } from '@kss-backend/core/mainframe/core/middy';
import { apiResponse } from '@kss-backend/core/mainframe/helpers/response';
import { UserRolesEnum } from '@kss-backend/core/mainframe/database/interfaces/user';
import createError from 'http-errors';

const deleteMenuHandler = async (event: IAPIGatewayProxyEventWithUserAndBody<null>): Promise<APIGatewayProxyResult> => {
    try {
        const menuId = event.pathParameters?.id;
        const restaurantId = event.pathParameters?.restaurantId;
        const companyId = event.pathParameters?.companyId;
        if (!menuId || !restaurantId || !companyId) {
            throw new createError.BadRequest('Missing required fields');
        }
        const companyIdStr = companyId.toString();
        const companyIdOnly = companyIdStr.startsWith('COMPANY_') ? companyIdStr.replace('COMPANY_', '') : companyIdStr;
        const tenantDatabaseName = `COMPANY_${companyIdOnly}`;
        const { getTenantModels } = await import('@kss-backend/core/mainframe/database/mongodb/connect');
        const tenantModels = await getTenantModels(tenantDatabaseName);
        if (!tenantModels) {
            throw new createError.InternalServerError('Tenant models not available');
        }
        const result = await tenantModels.Menu.deleteOne({ _id: menuId, restaurantId });
        if (result.deletedCount === 0) {
            throw new createError.NotFound('Menu not found');
        }
        return apiResponse(200, { success: true, message: 'Menu deleted' });
    } catch (error) {
        if (error instanceof createError.HttpError) {
            return apiResponse(error.statusCode, { error: error.message });
        }
        return apiResponse(500, { error: 'Internal server error', message: error instanceof Error ? error.message : 'Unknown error' });
    }
};

export const handler = lambdaHandlerTenantAuth(deleteMenuHandler, {
    initMongoDbConnection: true,
    requiredPermissionGroups: [UserRolesEnum.ADMIN, UserRolesEnum.GLOBAL_ADMIN]
});
