import { APIGatewayProxyResult } from "aws-lambda";
import { IAPIGatewayProxyEventWithUserAndBody } from "@kss-backend/core/mainframe/helpers/interfaces/middleware";
import { getTenantModels } from "@kss-backend/core/mainframe/database/mongodb/connect";
import { lambdaHandlerGlobalAdmin } from '@kss-backend/core/mainframe/core/middy';
import { UserRolesEnum } from '@kss-backend/core/mainframe/database/interfaces/user';
import { adminCreateUser } from "@kss-backend/core/mainframe/helpers/aws/cognito";
import { apiResponse } from "@kss-backend/core/mainframe/helpers/response";
import createError from "http-errors";
import { createGlobalAdminUserValidator } from "../users/validators";

interface CreateCompanyAdminBody {
    email: string;
    firstName: string;
    lastName: string;
}

const createCompanyAdminHandler = async (event: IAPIGatewayProxyEventWithUserAndBody<CreateCompanyAdminBody>): Promise<APIGatewayProxyResult> => {
    // Check if user has global admin permissions
    console.log("USER ROLE:", event.user.role);
    console.log("REQUIRED ROLE:", UserRolesEnum.GLOBAL_ADMIN);
    console.log("USER OBJECT:", event.user);

    if (event.user.role !== UserRolesEnum.GLOBAL_ADMIN) {
        throw createError.Forbidden('Insufficient permissions. Global admin role required.');
    }

    const globalModels = event.globalModels;
    if (!globalModels) {
        throw createError.InternalServerError('Global models not available');
    }

    const id = event.pathParameters?.id;
    const { email, firstName, lastName } = event.body;

    const company = await globalModels.Company.findOne({ _id: id });
    if (!company) {
        throw new createError.NotFound("Company not found");
    }

    const companyId = `COMPANY_${company._id}`;

    const resCognito = await adminCreateUser(
        company.cognitoUserPoolId,
        email,
        [
            {
                Name: "email",
                Value: email,
            },
            {
                Name: "given_name",
                Value: firstName,
            },
            {
                Name: "family_name",
                Value: lastName,
            },
            {
                Name: "custom:companyId",
                Value: companyId,
            }
        ]
    );

    console.log("resCognito?.User?.Attributes: ", resCognito?.User?.Attributes);

    const cognitoSub = resCognito?.User?.Attributes?.find(attr => attr.Name === 'sub')?.Value || undefined;
    let dbUser = undefined;

    if (cognitoSub) {
        // Get tenant models for the company database
        const tenantModels = await getTenantModels(companyId);

        dbUser = await tenantModels.User.create({
            cognitoSub: cognitoSub,
            cognitoUsername: resCognito.User?.Username,
            email,
            firstName,
            lastName,
            role: UserRolesEnum.ADMIN,
            companyId: company._id,
            createdBy: event.user.id
        });
    } else {
        throw new createError.InternalServerError("Failed to create user in Cognito");
    }

    return apiResponse(200, {
        user: dbUser,
    });
};

export const handler = lambdaHandlerGlobalAdmin(createCompanyAdminHandler, {
    initMongoDbConnection: true,
    isGlobalEndpoint: true,
    requiredPermissionGroups: ['GLOBAL_ADMIN'],
    requestValidator: createGlobalAdminUserValidator,
});
