import { APIGatewayProxyResult } from 'aws-lambda';
import { IAPIGatewayProxyEventWithUser } from '@kss-backend/core/mainframe/helpers/interfaces/middleware';
import { lambdaHandlerTenantAuth } from '@kss-backend/core/mainframe/core/middy';
import { apiResponse } from '@kss-backend/core/mainframe/helpers/response';
import { UserRolesEnum } from '@kss-backend/core/mainframe/database/interfaces/user';
import createError from 'http-errors';

const getRestaurantHandler = async (event: IAPIGatewayProxyEventWithUser): Promise<APIGatewayProxyResult> => {
    try {
        // Check if user has admin permissions
        const isGlobalAdmin = event.user?.role === UserRolesEnum.GLOBAL_ADMIN;
        const isCompanyAdmin = event.user?.role === UserRolesEnum.ADMIN;

        if (!event.user || (!isGlobalAdmin && !isCompanyAdmin)) {
            throw new createError.Forbidden('Only global admins or company admins can view restaurants');
        }

        // Get restaurant ID from path parameters
        const restaurantId = event.pathParameters?.id;
        if (!restaurantId) {
            throw new createError.BadRequest("Restaurant ID is required");
        }

        // For GLOBAL_ADMIN, companyId can come from query parameters
        // For ADMIN, companyId comes from user context
        let companyId: string;

        let companyIdOnly;
        if (isGlobalAdmin) {
            // Global admin companyId artık path parametresi ile gelmeli
            const tempCompanyId = event.pathParameters?.companyId;
            if (!tempCompanyId) {
                throw new createError.BadRequest("Company ID is required for global admin operations");
            }
            const tempCompanyIdStr = tempCompanyId.toString();
            if (tempCompanyIdStr.startsWith('COMPANY_')) {
                companyIdOnly = tempCompanyIdStr.replace('COMPANY_', '');
            } else {
                companyIdOnly = tempCompanyIdStr;
            }
            companyId = companyIdOnly;

            // Verify company exists in global database
            if (!event.globalModels) {
                throw new createError.InternalServerError("Global models not available");
            }

            const company = await event.globalModels.Company.findOne({
                _id: companyId,
                isActive: true
            });

            if (!company) {
                throw new createError.NotFound("Company not found or inactive");
            }

        } else {
            // Company admin - use their own company
            const rawCompanyId = event.user.companyId;
            if (!rawCompanyId) {
                throw new createError.BadRequest("User is not associated with any company");
            }
            const tempCompanyIdStr = rawCompanyId ? rawCompanyId.toString() : '';
            if (tempCompanyIdStr.startsWith('COMPANY_')) {
                companyIdOnly = tempCompanyIdStr.replace('COMPANY_', '');
            } else {
                companyIdOnly = tempCompanyIdStr;
            }
            companyId = companyIdOnly;
        }

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
        const restaurant = await event.tenantModels.Restaurant.findOne({
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

export const handler = lambdaHandlerTenantAuth(getRestaurantHandler, {
    initMongoDbConnection: true,
    requiredPermissionGroups: [UserRolesEnum.ADMIN, UserRolesEnum.GLOBAL_ADMIN]
});