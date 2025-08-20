import { APIGatewayProxyResult } from "aws-lambda";
import { IAPIGatewayProxyEventWithUser } from "@kss-backend/core/mainframe/helpers/interfaces/middleware";
import { getTenantModels } from "@kss-backend/core/mainframe/database/mongodb/connect";
import { lambdaHandlerGlobalAdmin } from '@kss-backend/core/mainframe/core/middy';
import { UserRolesEnum } from '@kss-backend/core/mainframe/database/interfaces/user';
import { adminDeleteUser } from "@kss-backend/core/mainframe/helpers/aws/cognito";
import { apiResponse } from "@kss-backend/core/mainframe/helpers/response";
import createError from "http-errors";

const deleteCompanyAdminHandler = async (event: IAPIGatewayProxyEventWithUser): Promise<APIGatewayProxyResult> => {
    if (!event.globalModels) {
        throw new createError.InternalServerError('Global models not available');
    }

    const id = event.pathParameters?.id;
    const userId = event.pathParameters?.userId;

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

    await adminDeleteUser(company.cognitoUserPoolId, user.cognitoUsername as string);
    await user.deleteOne();

    return apiResponse(200, {
        message: "Company Admin deleted successfully",
    });
};

export const handler = lambdaHandlerGlobalAdmin(deleteCompanyAdminHandler, {
    initMongoDbConnection: true,
    isGlobalEndpoint: true,
    requiredPermissionGroups: ['GLOBAL_ADMIN'],
});
