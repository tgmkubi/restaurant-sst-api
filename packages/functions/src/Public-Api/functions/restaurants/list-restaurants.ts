import { APIGatewayProxyResult } from 'aws-lambda';
import { IAPIGatewayProxyEventWithUser } from '@kss-backend/core/mainframe/helpers/interfaces/middleware';
import { lambdaHandlerTenantPublic } from '@kss-backend/core/mainframe/core/middy';
import { apiResponse } from '@kss-backend/core/mainframe/helpers/response';
import createError from 'http-errors';

const listRestaurantsHandler = async (event: IAPIGatewayProxyEventWithUser): Promise<APIGatewayProxyResult> => {
    try {
        // Get companyId from path parameters
        const tempCompanyId = event.pathParameters?.companyId;
        if (!tempCompanyId) {
            throw new createError.BadRequest("Company ID is required");
        }
        const tempCompanyIdStr = tempCompanyId.toString();
        const companyIdOnly = tempCompanyIdStr.startsWith('COMPANY_') ? tempCompanyIdStr.replace('COMPANY_', '') : tempCompanyIdStr;
        const companyId = companyIdOnly;

        // Tenant database name must be COMPANY_{companyId}
        const tenantDatabaseName = `COMPANY_${companyIdOnly}`;
        // Get tenant models for the correct database
        const { getTenantModels } = await import('@kss-backend/core/mainframe/database/mongodb/connect');
        const tenantModels = await getTenantModels(tenantDatabaseName);
        event.tenantModels = tenantModels;

        if (!tenantModels) {
            throw new createError.InternalServerError("Tenant models not available");
        }

        // Get restaurants for the company
        const restaurants = await tenantModels.Restaurant.find({
            companyId: companyId,
            isActive: true
        })
        .select('_id name displayName description address city country phone email currency isActive createdAt companyId')
        .lean()
        .maxTimeMS(5000);

        return apiResponse(200, {
            success: true,
            data: restaurants,
            total: restaurants.length
        });

    } catch (error) {
        console.error('Error listing restaurants:', error);

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

export const handler = lambdaHandlerTenantPublic(listRestaurantsHandler, {
    initMongoDbConnection: true
});
