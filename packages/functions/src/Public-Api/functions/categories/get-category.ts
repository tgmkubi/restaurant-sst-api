import { APIGatewayProxyResult } from 'aws-lambda';
import { IAPIGatewayProxyEventWithUser } from '@kss-backend/core/mainframe/helpers/interfaces/middleware';
import { lambdaHandlerTenantPublic } from '@kss-backend/core/mainframe/core/middy';
import { apiResponse } from '@kss-backend/core/mainframe/helpers/response';
import createError from 'http-errors';

const getCategoryHandler = async (event: IAPIGatewayProxyEventWithUser): Promise<APIGatewayProxyResult> => {
    try {
        const categoryId = event.pathParameters?.id;
        if (!categoryId) {
            throw new createError.BadRequest("Category ID is required");
        }
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
        const category = await tenantModels.Category.findOne({
            _id: categoryId,
            restaurantId: restaurantId,
            isActive: true
        })
        .lean()
        .maxTimeMS(5000);
        if (!category) {
            throw new createError.NotFound("Category not found");
        }
        return apiResponse(200, {
            success: true,
            data: category
        });
    } catch (error) {
        console.error('Error getting category:', error);
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

export const handler = lambdaHandlerTenantPublic(getCategoryHandler, {
    initMongoDbConnection: true
});
