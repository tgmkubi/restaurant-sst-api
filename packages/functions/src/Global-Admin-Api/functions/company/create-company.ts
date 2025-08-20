import { APIGatewayProxyResult } from 'aws-lambda';
import { IAPIGatewayProxyEventWithUserAndBody } from "@kss-backend/core/mainframe/helpers/interfaces/middleware";
import { lambdaHandlerGlobalAdmin } from '@kss-backend/core/mainframe/core/middy';
import { UserRolesEnum } from '@kss-backend/core/mainframe/database/interfaces/user';
import { createUserPool, createUserPoolClient } from "@kss-backend/core/mainframe/helpers/aws/cognito";
import { apiResponse } from "@kss-backend/core/mainframe/helpers/response";
import createError from "http-errors";
import config from "../../../../../../config";

interface CreateCompanyBody {
    name: string;
    displayName: string;
    description?: string;
    subdomain: string; // Will create subdomain.qrlist.com
    vatNumber?: string;
    address?: string;
    email?: string;
    phone?: string;
    maxRestaurants?: number;
    maxUsers?: number;
}

const createCompanyHandler = async (event: IAPIGatewayProxyEventWithUserAndBody<CreateCompanyBody>): Promise<APIGatewayProxyResult> => {
    try {
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

        const {
            name,
            displayName,
            description,
            subdomain,
            vatNumber,
            address,
            email,
            phone,
            maxRestaurants = 1,
            maxUsers = 10,
        } = event.body;

        // Validate required fields
        if (!name || !displayName || !subdomain) {
            throw new createError.BadRequest('Missing required fields: name, displayName, subdomain');
        }

        // Validate subdomain format (only lowercase letters, numbers, hyphens)
        const subdomainRegex = /^[a-z0-9-]+$/;
        if (!subdomainRegex.test(subdomain)) {
            throw new createError.BadRequest('Subdomain can only contain lowercase letters, numbers, and hyphens');
        }

        // Generate full domain for the company
        const domain = `${subdomain}.${config.DOMAIN}`;

        // Check if company with same name, domain, or subdomain already exists
        const existingCompany = await globalModels.Company.findOne({
            $or: [
                { name: name },
                { domain: domain },
                { subdomain: subdomain }
            ]
        });

        if (existingCompany) {
            if (existingCompany.name === name) {
                throw new createError.Conflict('Company with this name already exists');
            }
            if (existingCompany.subdomain === subdomain) {
                throw new createError.Conflict(`Subdomain '${subdomain}' is already taken. Try a different subdomain.`);
            }
        }

        // Generate database name for tenant
        const databaseName = `${subdomain}_company`;

        // Create Cognito User Pool first
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

        // Create company with Cognito details
        const newCompany = new globalModels.Company({
            name,
            displayName,
            description,
            domain,
            subdomain,
            databaseName,
            vatNumber,
            address,
            email,
            phone,
            maxRestaurants,
            maxUsers,
            isActive: true,
            cognitoUserPoolId: resCognitoUserPool.UserPool.Id,
            cognitoClientId: resCognitoUserPoolClient.UserPoolClient.ClientId,
            createdBy: event.user.cognitoSub || event.user.id || 'system',
        });

        const savedCompany = await newCompany.save();

        return apiResponse(201, {
            success: true,
            data: {
                id: savedCompany._id,
                name: savedCompany.name,
                displayName: savedCompany.displayName,
                domain: savedCompany.domain,
                subdomain: savedCompany.subdomain,
                databaseName: savedCompany.databaseName,
                isActive: savedCompany.isActive,
                maxRestaurants: savedCompany.maxRestaurants,
                maxUsers: savedCompany.maxUsers,
                cognitoUserPoolId: savedCompany.cognitoUserPoolId,
                cognitoClientId: savedCompany.cognitoClientId,
                createdAt: savedCompany.createdAt
            }
        });

    } catch (error) {
        console.error('Error creating company:', error);

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

export const handler = lambdaHandlerGlobalAdmin(createCompanyHandler, {
    initMongoDbConnection: true,
    isGlobalEndpoint: true,
    requiredPermissionGroups: ['GLOBAL_ADMIN']
});
