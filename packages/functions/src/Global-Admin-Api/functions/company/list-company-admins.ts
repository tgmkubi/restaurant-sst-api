import { APIGatewayProxyResult } from "aws-lambda";
import { IAPIGatewayProxyEventWithUserAndBody } from "@kss-backend/core/mainframe/helpers/interfaces/middleware";
import { getTenantModels } from "@kss-backend/core/mainframe/database/mongodb/connect";
import { lambdaHandlerGlobalAdmin } from '@kss-backend/core/mainframe/core/middy';
import { UserRolesEnum } from '@kss-backend/core/mainframe/database/interfaces/user';
import { apiResponse } from "@kss-backend/core/mainframe/helpers/response";
import createError from "http-errors";

const listCompanyAdminsHandler = async (event: IAPIGatewayProxyEventWithUserAndBody): Promise<APIGatewayProxyResult> => {
    // Check if user has global admin permissions
    console.log("USER ROLE:", event.user.role);
    console.log("REQUIRED ROLE:", UserRolesEnum.GLOBAL_ADMIN);
    console.log("USER OBJECT:", event.user);

    if (!event.globalModels) {
        throw new createError.InternalServerError('Global models not available');
    }

    const { globalModels } = event;

    const id = event.pathParameters?.id;

    const company = await globalModels.Company.findOne({ _id: id });
    if (!company) {
        throw new createError.NotFound("Company not found");
    }

    const companyId = `COMPANY_${company._id}`

    // Get tenant models for the company database
    const tenantModels = await getTenantModels(companyId);

    const users = await tenantModels.User.find({
        companyId: company._id,
        role: UserRolesEnum.ADMIN
    });
    
    return apiResponse(200, {
        admins: users,
        company,
    });
};

export const handler = lambdaHandlerGlobalAdmin(listCompanyAdminsHandler, {
    initMongoDbConnection: true,
    isGlobalEndpoint: true,
    requiredPermissionGroups: ['GLOBAL_ADMIN'],
});
