import { APIGatewayProxyResult } from 'aws-lambda';
import { IAPIGatewayProxyEventWithUserAndBody } from '@kss-backend/core/mainframe/helpers/interfaces/middleware';
import { lambdaHandlerTenantAuth } from '@kss-backend/core/mainframe/core/middy';
import { apiResponse } from '@kss-backend/core/mainframe/helpers/response';
import { UserRolesEnum } from '@kss-backend/core/mainframe/database/interfaces/user';
import createError from 'http-errors';

interface UpdateRestaurantBody {
    name?: string;
    displayName?: string;
    description?: string;
    address?: string;
    city?: string;
    country?: string;
    phone?: string;
    email?: string;
    businessHours?: {
        [key: string]: {
            isOpen: boolean;
            openTime?: string;
            closeTime?: string;
        }
    };
    logoUrl?: string;
    coverImageUrl?: string;
    primaryColor?: string;
    secondaryColor?: string;
    currency?: string;
    taxRate?: number;
    allowOnlineOrdering?: boolean;
    isActive?: boolean;
}

const updateRestaurantHandler = async (event: IAPIGatewayProxyEventWithUserAndBody<UpdateRestaurantBody>): Promise<APIGatewayProxyResult> => {
    try {
        // Check if user has admin permissions
        const isGlobalAdmin = event.user?.role === UserRolesEnum.GLOBAL_ADMIN;
        const isCompanyAdmin = event.user?.role === UserRolesEnum.ADMIN;

        if (!event.user || (!isGlobalAdmin && !isCompanyAdmin)) {
            throw new createError.Forbidden('Only global admins or company admins can update restaurants');
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
            companyId: companyId
        });

        if (!existingRestaurant) {
            throw new createError.NotFound("Restaurant not found");
        }

        // Prepare update data
        const updateData = {
            ...event.body,
            updatedBy: event.user.cognitoSub || event.user.id || 'system'
        };

        // Remove undefined values
        Object.keys(updateData).forEach(key => {
            const typedKey = key as keyof typeof updateData;
            if (updateData[typedKey] === undefined) {
                delete updateData[typedKey];
            }
        });

        // Update restaurant
        const updatedRestaurant = await event.tenantModels.Restaurant.findByIdAndUpdate(
            restaurantId,
            updateData,
            { new: true, runValidators: true }
        ).lean();

        return apiResponse(200, {
            success: true,
            data: {
                id: updatedRestaurant._id,
                name: updatedRestaurant.name,
                displayName: updatedRestaurant.displayName,
                description: updatedRestaurant.description,
                address: updatedRestaurant.address,
                city: updatedRestaurant.city,
                country: updatedRestaurant.country,
                phone: updatedRestaurant.phone,
                email: updatedRestaurant.email,
                currency: updatedRestaurant.currency,
                isActive: updatedRestaurant.isActive,
                companyId: updatedRestaurant.companyId,
                updatedAt: updatedRestaurant.updatedAt
            }
        });

    } catch (error) {
        console.error('Error updating restaurant:', error);

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

export const handler = lambdaHandlerTenantAuth(updateRestaurantHandler, {
    initMongoDbConnection: true,
    requiredPermissionGroups: [UserRolesEnum.ADMIN, UserRolesEnum.GLOBAL_ADMIN]
});