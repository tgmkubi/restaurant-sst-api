import { APIGatewayProxyResult } from 'aws-lambda';
import { IAPIGatewayProxyEventWithUser } from '@kss-backend/core/mainframe/helpers/interfaces/middleware';
import { lambdaHandlerTenantAuth } from '@kss-backend/core/mainframe/core/middy';
import { apiResponse } from '@kss-backend/core/mainframe/helpers/response';
import { UserRolesEnum } from '@kss-backend/core/mainframe/database/interfaces/user';
import createError from 'http-errors';

const deleteRestaurantHandler = async (event: IAPIGatewayProxyEventWithUser): Promise<APIGatewayProxyResult> => {
    try {
        // Check if user has admin permissions
        const isGlobalAdmin = event.user?.role === UserRolesEnum.GLOBAL_ADMIN;
        const isCompanyAdmin = event.user?.role === UserRolesEnum.ADMIN;

        if (!event.user || (!isGlobalAdmin && !isCompanyAdmin)) {
            throw new createError.Forbidden('Only global admins or company admins can delete restaurants');
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

        // Check if restaurant exists and belongs to the company
        const existingRestaurant = await event.tenantModels.Restaurant.findOne({
            _id: restaurantId,
            companyId: companyId,
            isActive: true
        });

        if (!existingRestaurant) {
            throw new createError.NotFound("Restaurant not found or already inactive");
        }

        // Soft delete: Mark restaurant as inactive instead of hard delete
        // This preserves data integrity and allows for recovery if needed
        const deletedRestaurant = await event.tenantModels.Restaurant.findByIdAndUpdate(
            restaurantId,
            {
                isActive: false,
                updatedBy: event.user.cognitoSub || event.user.id || 'system',
                deletedAt: new Date(),
                deletedBy: event.user.cognitoSub || event.user.id || 'system'
            },
            { new: true }
        ).lean();

        // TODO: Consider also cleaning up related data like:
        // - Categories belonging to this restaurant
        // - Products belonging to this restaurant
        // - QR codes belonging to this restaurant

        return apiResponse(200, {
            success: true,
            message: 'Restaurant deleted successfully',
            data: {
                id: deletedRestaurant._id,
                name: deletedRestaurant.name,
                displayName: deletedRestaurant.displayName,
                isActive: deletedRestaurant.isActive,
                deletedAt: deletedRestaurant.deletedAt
            }
        });

    } catch (error) {
        console.error('Error deleting restaurant:', error);

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

export const handler = lambdaHandlerTenantAuth(deleteRestaurantHandler, {
    initMongoDbConnection: true,
    requiredPermissionGroups: [UserRolesEnum.ADMIN, UserRolesEnum.GLOBAL_ADMIN]
});