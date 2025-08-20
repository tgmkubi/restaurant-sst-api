import { lambdaHandlerGlobalAdmin } from "@kss-backend/core/mainframe/core/middy";
import { apiResponse } from "@kss-backend/core/mainframe/helpers/response";
import createError from "http-errors";
import { UserRolesEnum } from "@kss-backend/core/mainframe/database/interfaces/user";
import { IAPIGatewayProxyEventWithUser } from "@kss-backend/core/mainframe/helpers/interfaces/middleware";
import { APIGatewayProxyResult } from 'aws-lambda';
import { populateCompanyAdmins } from "@kss-backend/core/mainframe/helpers/company.helper";
import { getTenantModels } from "@kss-backend/core/mainframe/database/mongodb/connect";

const getCompanyAdminHandler = async (event: IAPIGatewayProxyEventWithUser): Promise<APIGatewayProxyResult> => {
    console.log("getCompany function started");
    console.log("Event pathParameters:", event.pathParameters);
    console.log("Event globalModels available:", !!event.globalModels);

    if (!event.globalModels) {
        throw new createError.InternalServerError('Global models not available');
    }

    const id = event.pathParameters?.id;
    const userId = event.pathParameters?.userId;
    console.log("Looking for company with ID:", id);

    if (!id) {
        throw new createError.BadRequest("Company ID is required");
    }

    const company = await event.globalModels.Company.findOne({ _id: id });
    if (!company) {
        throw new createError.NotFound("Company not found");
    }

    const companyId = `COMPANY_${company._id}`;

    // Get tenant models for the company database
    const tenantModels = await getTenantModels(companyId);

    const user = await tenantModels.User.findOne({
        _id: userId,
        role: UserRolesEnum.ADMIN
    });

    if (!user) {
        throw new createError.NotFound("User not found");
    }

    return apiResponse(200, {
        user: user,
    });
};

export const handler = lambdaHandlerGlobalAdmin(getCompanyAdminHandler, {
    initMongoDbConnection: true,
    isGlobalEndpoint: true,
    requiredPermissionGroups: [UserRolesEnum.GLOBAL_ADMIN]
});
