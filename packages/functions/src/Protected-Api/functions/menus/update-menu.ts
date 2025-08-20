import { APIGatewayProxyResult } from 'aws-lambda';
import { IAPIGatewayProxyEventWithUserAndBody } from '@kss-backend/core/mainframe/helpers/interfaces/middleware';
import { lambdaHandlerTenantAuth } from '@kss-backend/core/mainframe/core/middy';
import { apiResponse } from '@kss-backend/core/mainframe/helpers/response';
import { UserRolesEnum } from '@kss-backend/core/mainframe/database/interfaces/user';
import createError from 'http-errors';

interface UpdateMenuBody {
    name?: string;
    description?: string;
    products?: string[];
}

const updateMenuHandler = async (event: IAPIGatewayProxyEventWithUserAndBody<UpdateMenuBody>): Promise<APIGatewayProxyResult> => {
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
        const updateFields: UpdateMenuBody = {};
        if (event.body?.name !== undefined) updateFields.name = event.body.name;
        if (event.body?.description !== undefined) updateFields.description = event.body.description;
        if (event.body?.products !== undefined) updateFields.products = event.body.products;
        const menu = await tenantModels.Menu.findOneAndUpdate(
            { _id: menuId, restaurantId },
            { $set: updateFields },
            { new: true }
        ).lean().maxTimeMS(5000);
        if (!menu) {
            throw new createError.NotFound('Menu not found');
        }
        return apiResponse(200, { success: true, data: menu });
    } catch (error) {
        if (error instanceof createError.HttpError) {
            return apiResponse(error.statusCode, { error: error.message });
        }
        return apiResponse(500, { error: 'Internal server error', message: error instanceof Error ? error.message : 'Unknown error' });
    }
};

export const handler = lambdaHandlerTenantAuth(updateMenuHandler, {
    initMongoDbConnection: true,
    requiredPermissionGroups: [UserRolesEnum.ADMIN, UserRolesEnum.GLOBAL_ADMIN]
});
