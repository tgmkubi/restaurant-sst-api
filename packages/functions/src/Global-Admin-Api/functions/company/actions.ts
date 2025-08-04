import { lambdaHandlerGlobalAdmin } from "@kss-backend/core/mainframe/core/middy";
import { apiResponse } from "@kss-backend/core/mainframe/helpers/response";
import {
    adminCreateUser,
    adminDeleteUser,
    createUserPool,
    createUserPoolClient,
    deleteUserPool,
} from "@kss-backend/core/mainframe/helpers/aws/cognito";
import { createCompanyValidator } from "./validators";
import createError from "http-errors";
import { CompanyModel } from "@kss-backend/core/mainframe/database/mongodb/models/company.model";
import {UserModel} from "@kss-backend/core/mainframe/database/mongodb/models/user.model";
import {moduleTypes} from "../../../../../../stacks/helpers/stackConstants";
import {createAcademyAdminUserValidator, createGlobalAdminUserValidator} from "../users/validators";
import {UserRolesEnum} from "@kss-backend/core/mainframe/database/interfaces/user";
import {closeMongodbConnection, getMongodbConnection} from "@kss-backend/core/mainframe/database/mongodb/connect";

export const createCompany = lambdaHandlerGlobalAdmin(
    async (event: any) => {
        const { name, displayName, description } = event.body;

        const company = await CompanyModel.findOne({
            name: name
        });
        if (company) {
            throw new createError.Conflict("Company with this name already exists");
        }

        const resCognitoUserPool = await createUserPool({
            PoolName: name,
            Schema: [
                {
                    Name: "email",
                    Required: true,
                    Mutable: true,
                },
                {
                    Name: "companyId",
                    Required: false,
                    Mutable: true,
                    AttributeDataType: "String",
                },
            ],
            AutoVerifiedAttributes: ["email"],
            UserAttributeUpdateSettings: {
                AttributesRequireVerificationBeforeUpdate: ["email"],
            },
            UsernameConfiguration: {
                CaseSensitive: false,
            },
            Policies: {
                // UserPoolPolicyType
                PasswordPolicy: {
                    // PasswordPolicyType
                    MinimumLength: 8,
                    RequireUppercase: true,
                    RequireLowercase: true,
                    RequireNumbers: true,
                    RequireSymbols: true,
                    TemporaryPasswordValidityDays: 365,
                },
            },
        });

        if (!resCognitoUserPool.UserPool) {
            throw new createError.InternalServerError("Failed to create Cognito User Pool");
        }

        const resCognitoUserPoolClient = await createUserPoolClient({
            UserPoolId: resCognitoUserPool.UserPool.Id,
            ClientName: `${name}-client`,
        });

        if (!resCognitoUserPoolClient.UserPoolClient) {
            throw new createError.InternalServerError("Failed to create Cognito User Pool Client");
        }

        const companyCreated = await CompanyModel.create({
            name,
            displayName: displayName || name,
            domain: `${name}.${process.env.DOMAIN}`,
            description,
            cognitoUserPoolId: resCognitoUserPool.UserPool.Id,
            cognitoClientId: resCognitoUserPoolClient.UserPoolClient.ClientId,
            createdBy: event.user.id,
        });


        return apiResponse(200, {
            company: companyCreated
        });
    },
    {
        requestValidator: createCompanyValidator,
        requiredPermissionGroups: [UserRolesEnum.GLOBAL_ADMIN],
        initMongoDbConnection: true
    },
);

export const listCompany = lambdaHandlerGlobalAdmin(
    async (event: any) => {

            const companies = await CompanyModel.find({})

            return apiResponse(200, {
                companies
            });
    },{
        requiredPermissionGroups: [UserRolesEnum.GLOBAL_ADMIN],
        initMongoDbConnection: true
    },
);

export const getCompany = lambdaHandlerGlobalAdmin(
    async (event: any) => {
        const { id } = event.pathParameters;

        const company = await CompanyModel.findOne({ _id: id });
        if (!company) {
            throw new createError.NotFound("Company Not found");
        }

        return apiResponse(200, {
            company,
        });
    },
    {
        requiredPermissionGroups: [UserRolesEnum.GLOBAL_ADMIN],
        initMongoDbConnection: true
    },
);

export const deleteCompany = lambdaHandlerGlobalAdmin(
    async (event: any) => {
        const { id } = event.pathParameters;

        const company = await CompanyModel.findOne({ _id: id});
        if (!company) {
            throw new createError.NotFound("Company not found");
        }

        await deleteUserPool(company.cognitoUserPoolId);
        await company.deleteOne();

        return apiResponse(200, {
            message: "Company deleted successfully",
        });
    },
    {
        requiredPermissionGroups: [UserRolesEnum.GLOBAL_ADMIN],
        initMongoDbConnection: true
    },
);

export const createCompanyAdmin = lambdaHandlerGlobalAdmin(
    async (event: any) => {

        const { id } = event.pathParameters;
        const { email, firstName, lastName } = event.body;

        const company = await CompanyModel.findOne({
            _id: id,
        });
        if (!company) {
            throw new createError.NotFound("Academy not found");
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

        const cognitoSub = resCognito?.User?.Attributes?.find(attr => attr.Name === 'sub')?.Value || undefined;
        let dbUser = undefined;

        if (cognitoSub) {

            // Close global database connection
            await closeMongodbConnection();
            // Create Connection to User's Academy Database
            await getMongodbConnection(companyId);

            dbUser = await UserModel.create({
                cognitoSub: cognitoSub,
                cognitoUsername: resCognito.User?.Username,
                email,
                firstName,
                lastName,
                role: UserRolesEnum.ADMIN,
                companyId: companyId,
                createdBy: event.user.id
            })
        } else {
            throw new createError.InternalServerError("Failed to create user in Cognito");
        }
        await closeMongodbConnection();

        return apiResponse(200, {
            user: dbUser,
        });
    },
    {
        requestValidator: createGlobalAdminUserValidator,
        requiredPermissionGroups: [UserRolesEnum.GLOBAL_ADMIN],
        initMongoDbConnection: true
    },
);

export const listCompanyAdmins = lambdaHandlerGlobalAdmin(
    async (event: any) => {

        const { id } = event.pathParameters;

        const company = await CompanyModel.findOne({
            _id: id,
        });
        if (!company) {
            throw new createError.NotFound("Company not found");
        }
        const companyId = `COMPANY_${company._id}`;

        // Close global database connection
        await closeMongodbConnection();
        // Create Connection to User's Academy Database
        await getMongodbConnection(companyId);

        const users = await UserModel.find({
            companyId: companyId,
            role: UserRolesEnum.ADMIN
        });
        await closeMongodbConnection();

        return apiResponse(200, {
            users: users,
        });
    },
    {
        requiredPermissionGroups: [UserRolesEnum.GLOBAL_ADMIN],
        initMongoDbConnection: true
    },
);

export const getAcademyAdmin = lambdaHandlerGlobalAdmin(
    async (event: any) => {

        const { id, userId } = event.pathParameters;

        const company = await CompanyModel.findOne({
            _id: id,
        });
        if (!company) {
            throw new createError.NotFound("Company not found");
        }
        const companyId = `COMPANY_${company._id}`;

        // Close global database connection
        await closeMongodbConnection();
        // Create Connection to User's Academy Database
        await getMongodbConnection(companyId);

        const user = await UserModel.findOne({
            _id: userId,
            role: UserRolesEnum.ADMIN
        });
        await closeMongodbConnection();

        return apiResponse(200, {
            user: user,
        });
    },
    {
        requiredPermissionGroups: [UserRolesEnum.GLOBAL_ADMIN],
        initMongoDbConnection: true
    },
);

export const deleteCompanyAdmin = lambdaHandlerGlobalAdmin(
    async (event: any) => {

        const { id, userId } = event.pathParameters;
        console.log(id)

        const company = await CompanyModel.findOne({
            _id: id,
        });
        if (!company) {
            throw new createError.NotFound("Company not found");
        }
        const companyId = `COMPANY_${company._id}`;

        // Close global database connection
        await closeMongodbConnection();
        // Create Connection to User's Academy Database
        await getMongodbConnection(companyId);

        const user = await UserModel.findOne({
            _id: userId,
            role: UserRolesEnum.ADMIN
        });
        if (!user) {
            throw new createError.NotFound("User not found");
        }

        await adminDeleteUser(company.cognitoUserPoolId, user.cognitoUsername);
        await user.deleteOne();
        await closeMongodbConnection();

        return apiResponse(200, {
            message: "Company Admin deleted successfully",
        });
    },
    {
        requiredPermissionGroups: [UserRolesEnum.GLOBAL_ADMIN],
        initMongoDbConnection: true
    },
);
