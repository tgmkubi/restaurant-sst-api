import { APIGatewayProxyResult } from 'aws-lambda';
import { IAPIGatewayProxyEventWithUserAndBody } from '@kss-backend/core/mainframe/helpers/interfaces/middleware';
import { lambdaHandlerTenantAuth } from '@kss-backend/core/mainframe/core/middy';
import { apiResponse } from '@kss-backend/core/mainframe/helpers/response';
import { UserRolesEnum } from '@kss-backend/core/mainframe/database/interfaces/user';
import createError from 'http-errors';

interface CreateMenuBody {
    name: string;
    description?: string;
    products: string[];
}

const createMenuHandler = async (event: IAPIGatewayProxyEventWithUserAndBody<CreateMenuBody>): Promise<APIGatewayProxyResult> => {
    try {
        const { name, description, products } = event.body || {};
        const restaurantId = event.pathParameters?.restaurantId;
        const companyId = event.pathParameters?.companyId;
        if (!name || !restaurantId || !companyId) {
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
        const menu = await tenantModels.Menu.create({
            name,
            displayName: name,
            description,
            products,
            restaurantId,
            isActive: true,
            createdAt: new Date(),
            createdBy: event.user?.id || "unknown"
        });
        return apiResponse(201, { success: true, data: menu });
    } catch (error) {
        throw new createError.InternalServerError(error instanceof Error ? error.message : 'Unknown error');
    }
};

export const handler = lambdaHandlerTenantAuth(createMenuHandler, {
    initMongoDbConnection: true,
    requiredPermissionGroups: [UserRolesEnum.ADMIN, UserRolesEnum.GLOBAL_ADMIN]
});
