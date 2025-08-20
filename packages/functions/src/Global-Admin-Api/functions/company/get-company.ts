import { lambdaHandlerGlobalAdmin } from "@kss-backend/core/mainframe/core/middy";
import { apiResponse } from "@kss-backend/core/mainframe/helpers/response";
import createError from "http-errors";
import { UserRolesEnum } from "@kss-backend/core/mainframe/database/interfaces/user";
import { IAPIGatewayProxyEventWithUser } from "@kss-backend/core/mainframe/helpers/interfaces/middleware";
import { APIGatewayProxyResult } from 'aws-lambda';
import { populateCompanyAdmins } from "@kss-backend/core/mainframe/helpers/company.helper";

const getCompanyHandler = async (event: IAPIGatewayProxyEventWithUser): Promise<APIGatewayProxyResult> => {
    console.log("getCompany function started");
    console.log("Event pathParameters:", event.pathParameters);
    console.log("Event globalModels available:", !!event.globalModels);

    if (!event.globalModels) {
        console.error("Global models not available");
        throw new createError.InternalServerError('Global models not available');
    }

    const id = event.pathParameters?.id;
    console.log("Looking for company with ID:", id);

    if (!id) {
        throw new createError.BadRequest("Company ID is required");
    }

    try {
        const company = await event.globalModels.Company.findOne({ _id: id });
        console.log("Company found:", !!company);

        if (!company) {
            console.log("Company not found in database");
            throw new createError.NotFound("Company Not found");
        }

        // Populate company with admins from tenant database
        const companyWithAdmins = await populateCompanyAdmins(company);

        console.log("Returning company data with admins");
        return apiResponse(200, {
            company: companyWithAdmins,
        });
    } catch (error) {
        console.error("Error in getCompany:", error);
        throw error;
    }
};

export const handler = lambdaHandlerGlobalAdmin(getCompanyHandler, {
    initMongoDbConnection: true,
    isGlobalEndpoint: true,
    requiredPermissionGroups: [UserRolesEnum.GLOBAL_ADMIN]
});
