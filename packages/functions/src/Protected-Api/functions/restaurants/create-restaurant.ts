import { APIGatewayProxyResult } from 'aws-lambda';
import { IAPIGatewayProxyEventWithUserAndBody } from '@kss-backend/core/mainframe/helpers/interfaces/middleware';
import { lambdaHandlerTenantAuth } from '@kss-backend/core/mainframe/core/middy';
import { apiResponse } from '@kss-backend/core/mainframe/helpers/response';
import { UserRolesEnum } from '@kss-backend/core/mainframe/database/interfaces/user';
import createError from 'http-errors';

interface CreateRestaurantBody {
    name: string;
    displayName: string;
    description?: string;
    address: string;
    city: string;
    country: string;
    phone?: string;
    email?: string;
    companyId?: string; // Optional for GLOBAL_ADMIN
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
}

const createRestaurantHandler = async (event: IAPIGatewayProxyEventWithUserAndBody<CreateRestaurantBody>): Promise<APIGatewayProxyResult> => {
    
    try {
        // Check if user has admin permissions
        const isGlobalAdmin = event.user?.role === UserRolesEnum.GLOBAL_ADMIN;
        const isCompanyAdmin = event.user?.role === UserRolesEnum.ADMIN;

        if (!event.user || (!isGlobalAdmin && !isCompanyAdmin)) {
            throw new createError.Forbidden('Only global admins or company admins can create restaurants');
        }

        // For GLOBAL_ADMIN, companyId should come from path parameters or body
        // For ADMIN, companyId comes from user context
        let companyId: string;

        let companyIdOnly;
        if (isGlobalAdmin) {
            // Global admin can specify companyId in path parameters or body
            const tempCompanyId = event.pathParameters?.companyId || event.body.companyId;
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

        const {
            name,
            displayName,
            description,
            address,
            city,
            country,
            phone,
            email,
            businessHours,
            logoUrl,
            coverImageUrl,
            primaryColor,
            secondaryColor,
            currency = 'TRY',
            taxRate,
            allowOnlineOrdering = true
        } = event.body;

        // Validate required fields
        if (!name || !displayName || !address || !city || !country) {
            throw new createError.BadRequest("Missing required fields: name, displayName, address, city, country");
        }

        // Check if restaurant with same name already exists for this company (optimized query)
        if (!event.tenantModels) {
            throw new createError.InternalServerError("Tenant models not available");
        }
        const existingRestaurant = await event.tenantModels.Restaurant.findOne({
            companyId: companyId,
            name: name
        })
        .select('_id') // Only select ID for faster query
        .lean() // Use lean for better performance
        .maxTimeMS(2000); // 2 second timeout

        if (existingRestaurant) {
            throw new createError.Conflict("Restaurant with same name already exists for this company");
        }

        // Default business hours if not provided
        const defaultBusinessHours = businessHours || {
            monday: { isOpen: true, openTime: "09:00", closeTime: "22:00" },
            tuesday: { isOpen: true, openTime: "09:00", closeTime: "22:00" },
            wednesday: { isOpen: true, openTime: "09:00", closeTime: "22:00" },
            thursday: { isOpen: true, openTime: "09:00", closeTime: "22:00" },
            friday: { isOpen: true, openTime: "09:00", closeTime: "22:00" },
            saturday: { isOpen: true, openTime: "09:00", closeTime: "22:00" },
            sunday: { isOpen: false }
        };

        // Create restaurant
        const newRestaurant = new event.tenantModels.Restaurant({
            name,
            displayName,
            description,
            address,
            city,
            country,
            phone,
            email,
            businessHours: defaultBusinessHours,
            logoUrl,
            coverImageUrl,
            primaryColor,
            secondaryColor,
            currency,
            taxRate,
            allowOnlineOrdering,
            isActive: true,
            companyId: companyId,
            createdBy: event.user.cognitoSub || event.user.id || 'system'
        });

        const savedRestaurant = await newRestaurant.save();

        return apiResponse(201, {
            success: true,
            data: {
                id: savedRestaurant._id,
                name: savedRestaurant.name,
                displayName: savedRestaurant.displayName,
                description: savedRestaurant.description,
                address: savedRestaurant.address,
                city: savedRestaurant.city,
                country: savedRestaurant.country,
                phone: savedRestaurant.phone,
                email: savedRestaurant.email,
                currency: savedRestaurant.currency,
                isActive: savedRestaurant.isActive,
                companyId: savedRestaurant.companyId,
                createdAt: savedRestaurant.createdAt
            }
        });

    } catch (error) {
        console.error('Error creating restaurant:', error);

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

export const handler = lambdaHandlerTenantAuth(createRestaurantHandler, {
    initMongoDbConnection: true,
    requiredPermissionGroups: [UserRolesEnum.ADMIN, UserRolesEnum.GLOBAL_ADMIN]
});