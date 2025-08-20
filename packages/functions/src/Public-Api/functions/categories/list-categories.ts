import { APIGatewayProxyResult } from 'aws-lambda';
import { IAPIGatewayProxyEventWithUser } from '@kss-backend/core/mainframe/helpers/interfaces/middleware';
import { lambdaHandlerTenantPublic } from '@kss-backend/core/mainframe/core/middy';
import { apiResponse } from '@kss-backend/core/mainframe/helpers/response';
import createError from 'http-errors';

const listCategoriesHandler = async (event: IAPIGatewayProxyEventWithUser): Promise<APIGatewayProxyResult> => {
    try {
        const restaurantId = event.pathParameters?.restaurantId;
        if (!restaurantId) {
            throw new createError.BadRequest("Restaurant ID is required");
        }
        const companyId = event.pathParameters?.companyId;
        if (!companyId) {
            throw new createError.BadRequest("Company ID is required");
        }
        const companyIdStr = companyId.toString();
        const companyIdOnly = companyIdStr.startsWith('COMPANY_') ? companyIdStr.replace('COMPANY_', '') : companyIdStr;
        const tenantDatabaseName = `COMPANY_${companyIdOnly}`;
        const { getTenantModels } = await import('@kss-backend/core/mainframe/database/mongodb/connect');
        const tenantModels = await getTenantModels(tenantDatabaseName);
        event.tenantModels = tenantModels;
        if (!tenantModels) {
            throw new createError.InternalServerError("Tenant models not available");
        }
        const categories = await tenantModels.Category.find({
            restaurantId: restaurantId,
            isActive: true
        })
        .select('_id name description isActive createdAt restaurantId')
        .lean()
        .maxTimeMS(5000);
        return apiResponse(200, {
            success: true,
            data: categories,
            total: categories.length
        });
    } catch (error) {
        console.error('Error listing categories:', error);
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

export const handler = lambdaHandlerTenantPublic(listCategoriesHandler, {
    initMongoDbConnection: true
});
