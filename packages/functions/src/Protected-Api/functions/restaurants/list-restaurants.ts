import { APIGatewayProxyResult } from 'aws-lambda';
import { IAPIGatewayProxyEventWithUser } from '@kss-backend/core/mainframe/helpers/interfaces/middleware';
import { lambdaHandlerTenantAuth } from '@kss-backend/core/mainframe/core/middy';
import { apiResponse } from '@kss-backend/core/mainframe/helpers/response';
import { UserRolesEnum } from '@kss-backend/core/mainframe/database/interfaces/user';
import createError from 'http-errors';

const listRestaurantsHandler = async (event: IAPIGatewayProxyEventWithUser): Promise<APIGatewayProxyResult> => {
    try {
        // Check if user has admin permissions
        const isGlobalAdmin = event.user?.role === UserRolesEnum.GLOBAL_ADMIN;
        const isCompanyAdmin = event.user?.role === UserRolesEnum.ADMIN;

        if (!event.user || (!isGlobalAdmin && !isCompanyAdmin)) {
            throw new createError.Forbidden('Only global admins or company admins can list restaurants');
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

        // Get restaurants for the company
        const resolvedTenantModels = event.tenantModels || (event.tenantContext && event.tenantContext.models);
        if (!resolvedTenantModels) {
            throw new createError.InternalServerError("Tenant models not available");
        }
        const restaurants = await resolvedTenantModels.Restaurant.find({
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

export const handler = lambdaHandlerTenantAuth(listRestaurantsHandler, {
    initMongoDbConnection: true,
    requiredPermissionGroups: [UserRolesEnum.ADMIN, UserRolesEnum.GLOBAL_ADMIN]
});
