import { APIGatewayProxyResult } from 'aws-lambda';
import { IAPIGatewayProxyEventWithUser } from '@kss-backend/core/mainframe/helpers/interfaces/middleware';
import { lambdaHandlerTenantPublic } from '@kss-backend/core/mainframe/core/middy';
import { apiResponse } from '@kss-backend/core/mainframe/helpers/response';
import { UserRolesEnum } from '@kss-backend/core/mainframe/database/interfaces/user';
import createError from 'http-errors';

const getRestaurantHandler = async (event: IAPIGatewayProxyEventWithUser): Promise<APIGatewayProxyResult> => {
    try {
        // Get restaurant ID from path parameters
        const restaurantId = event.pathParameters?.id;
        if (!restaurantId) {
            throw new createError.BadRequest("Restaurant ID is required");
        }

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

        // Get restaurant by ID and company
        const restaurant = await tenantModels.Restaurant.findOne({
            _id: restaurantId,
            companyId: companyId,
            isActive: true
        })
        .lean()
        .maxTimeMS(5000);

        if (!restaurant) {
            throw new createError.NotFound("Restaurant not found");
        }

        return apiResponse(200, {
            success: true,
            data: restaurant
        });

    } catch (error) {
        console.error('Error getting restaurant:', error);

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

export const handler = lambdaHandlerTenantPublic(getRestaurantHandler, {
    initMongoDbConnection: true,
});