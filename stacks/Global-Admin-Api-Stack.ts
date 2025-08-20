// import * as apigatewayv2_alpha from "@aws-cdk/aws-apigatewayv2-alpha";
import * as cdk from "aws-cdk-lib";
import * as logs from "aws-cdk-lib/aws-logs";
import * as sst from "sst/constructs";

import { StackContext } from "sst/constructs";
import { ConfigStack } from "./ConfigStack";
import { apiFnBuilder } from "./helpers/utils";
// import {listUsers} from "@kss-backend/functions/src/Global-Admin-Api/functions/users/actions";

export function GlobalAdminApiStack({ stack }: StackContext) {

    const { globalCognitoUserPool, mongoDbSecret } = sst.use(ConfigStack)

    // ------------------- DEFAULTS -------------------
    const moduleName = "GlobalAdminApi";
    const folderPrefix = "packages/functions/src/Global-Admin-Api/functions";
    const apiName = "globalAdmin";
    // ------------------- DEFAULTS -------------------


    const apiAccessLogGroup = new logs.LogGroup(stack, `${moduleName}AccessLogGroup`, {
        logGroupName: `/aws/vendedlogs/apigateway/${moduleName}-AccessLogGroup`,
        removalPolicy: cdk.RemovalPolicy.DESTROY,
        retention: logs.RetentionDays.ONE_MONTH,
    });

    const authorizerFn = new sst.Function(stack, `${moduleName}Authorizer`, {
        handler: `packages/functions/src/Authorizer/functions/globalAdminApi.authorizer`,
        functionName: `${stack.stage}-${moduleName}-Authorizer`,
        permissions: ["cognito-idp:AdminGetUser", "secretsmanager:GetSecretValue"],
        environment: {
            GLOBAL_COGNITO_USER_POOL_ID: globalCognitoUserPool.userPoolId,
            MONGO_DB_SECRET_NAME: mongoDbSecret.secretName,
        }
    });

    authorizerFn.attachPermissions([
        "dynamodb:Query",
    ]);

    const adminApi = new sst.Api(stack, moduleName, {
        authorizers: {
            lambdaAuthorizer: {
                type: "lambda",
                function: authorizerFn,
                responseTypes: ["simple"], // Use simple response format for v2.0
                resultsCacheTtl: "5 minutes", // Cache for 5 minutes for better performance
            },
        },
        defaults: {
            authorizer: "lambdaAuthorizer",
            function: {
                environment: {
                    MONGO_DB_SECRET_NAME: mongoDbSecret.secretName,
                    GLOBAL_COGNITO_USER_POOL_ID: globalCognitoUserPool.userPoolId,
                },
                timeout: 30, // Reduced from 60 to force optimization
                runtime: "nodejs20.x",
                memorySize: 512, // Increased memory for better performance
            },
        },
        accessLog: {
            destinationArn: apiAccessLogGroup.logGroupArn,
        },

        // USERS
        routes: {
            "POST /users": apiFnBuilder({
                apiName,
                stage: stack.stage,
                handler: `${folderPrefix}/users/actions.createUser`,
                permissions: ["cognito-idp:AdminCreateUser"]
            }),
            "GET /users": apiFnBuilder({
                apiName,
                stage: stack.stage,
                handler: `${folderPrefix}/users/actions.listUsers`,
            }),
            "GET /users/{id}": apiFnBuilder({
                apiName,
                stage: stack.stage,
                handler: `${folderPrefix}/users/actions.getUser`,
            }),
            "DELETE /users/{id}": apiFnBuilder({
                apiName,
                stage: stack.stage,
                handler: `${folderPrefix}/users/actions.deleteUser`,
                permissions: ["cognito-idp:AdminDeleteUser"],
            }),

            // ----------------- COMPANY -----------------
            "POST /company": apiFnBuilder({
                apiName,
                stage: stack.stage,
                handler: `${folderPrefix}/company/actions.createCompany`,
                permissions: ["cognito-idp:CreateUserPool", "cognito-idp:CreateUserPoolClient"],
            }),
            "GET /company": apiFnBuilder({
                apiName,
                stage: stack.stage,
                handler: `${folderPrefix}/company/actions.listCompany`,
            }),
            "GET /company/{id}": apiFnBuilder({
                apiName,
                stage: stack.stage,
                handler: `${folderPrefix}/company/actions.getCompany`,
            }),
            "DELETE /company/{id}": apiFnBuilder({
                apiName,
                stage: stack.stage,
                handler: `${folderPrefix}/company/actions.deleteCompany`,
                permissions: ["cognito-idp:DeleteUserPool", "cognito-idp:DeleteUserPoolClient"],
            }),
            "POST /company/{id}/admin": apiFnBuilder({
                apiName,
                stage: stack.stage,
                handler: `${folderPrefix}/company/actions.createCompanyAdmin`,
                permissions: ["cognito-idp:AdminCreateUser"],
            }),
            "GET /company/{id}/admin": apiFnBuilder({
                apiName,
                stage: stack.stage,
                handler: `${folderPrefix}/company/actions.listCompanyAdmins`,
            }),
            "GET /company/{id}/admin/{userId}": apiFnBuilder({
                apiName,
                stage: stack.stage,
                handler: `${folderPrefix}/company/actions.getCompanyAdmin`,
            }),
            "DELETE /company/{id}/admin/{userId}": apiFnBuilder({
                apiName,
                stage: stack.stage,
                handler: `${folderPrefix}/company/actions.deleteCompanyAdmin`,
                permissions: ["cognito-idp:AdminDeleteUser"],
            }),
        },
    });

    // new apigatewayv2_alpha.ApiMapping(stack, "AdminApiMapping", {
    //     api: adminApi.cdk.httpApi,
    //     //domainName: customDomain,
    //
    //     apiMappingKey: "admin",
    //     stage: adminApi.cdk.httpApi.defaultStage,
    // });

    adminApi.attachPermissions([
        "secretsmanager:GetSecretValue",
    ]);

    stack.addOutputs({
        ApiId: adminApi.id,
        ApiHttpId: adminApi.httpApiId,
        ApiEndpoint: adminApi.url,
        ApiBaseUrl: `https://api.tenant.${process.env.DOMAIN}/global/admin/p1`,
    });
}
