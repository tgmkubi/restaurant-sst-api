import { lambdaHandlerGlobalAdmin } from "@kss-backend/core/mainframe/core/middy";
import { apiResponse } from "@kss-backend/core/mainframe/helpers/response";
import createError from "http-errors";
import { UserRolesEnum } from "@kss-backend/core/mainframe/database/interfaces/user";
import { IAPIGatewayProxyEventWithUser } from "@kss-backend/core/mainframe/helpers/interfaces/middleware";
import { APIGatewayProxyResult } from 'aws-lambda';
import { populateCompaniesAdmins } from "@kss-backend/core/mainframe/helpers/company.helper";

const listCompanyHandler = async (event: IAPIGatewayProxyEventWithUser): Promise<APIGatewayProxyResult> => {
    if (!event.globalModels) {
        throw new createError.InternalServerError('Global models not available');
    }

    // Check if client wants admins populated (query parameter)
    const includeAdmins = event.queryStringParameters?.includeAdmins === 'true';

    // Optimized query with lean() and selected fields
    const companies = await event.globalModels.Company.find({ isActive: true })
        .select('_id name displayName domain subdomain databaseName isActive maxRestaurants maxUsers createdAt')
        .lean()
        .maxTimeMS(3000);

    // Only populate admins if requested
    if (includeAdmins && companies.length > 0) {
        const companiesWithAdmins = await populateCompaniesAdmins(companies);
        return apiResponse(200, {
            companies: companiesWithAdmins,
            total: companiesWithAdmins.length
        });
    }

    return apiResponse(200, {
        companies,
        total: companies.length,
        note: "Add ?includeAdmins=true to get admin details"
    });
}

export const handler = lambdaHandlerGlobalAdmin(listCompanyHandler, {
    initMongoDbConnection: true,
    isGlobalEndpoint: true,
    requiredPermissionGroups: [UserRolesEnum.GLOBAL_ADMIN]
});
