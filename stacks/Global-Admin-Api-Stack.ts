import * as apigatewayv2_alpha from "@aws-cdk/aws-apigatewayv2-alpha";
import * as cdk from "aws-cdk-lib";
import * as logs from "aws-cdk-lib/aws-logs";
import * as sst from "sst/constructs";

import { StackContext } from "sst/constructs";
import {ConfigStack} from "./ConfigStack";
import {apiFnBuilder} from "./helpers/utils";
// import {listUsers} from "@kss-backend/functions/src/Global-Admin-Api/functions/users/actions";
// import {getAcademyAdmin} from "@kss-backend/functions/src/Global-Admin-Api/functions/academy/actions";

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
                resultsCacheTtl: "30 minutes",
            },
        },
        defaults: {
            authorizer: "lambdaAuthorizer",
            function: {
                environment: {
                    MONGO_DB_SECRET_NAME: mongoDbSecret.secretName,
                    GLOBAL_COGNITO_USER_POOL_ID: globalCognitoUserPool.userPoolId,
                },
                timeout: 60,
                runtime: "nodejs20.x",
            },
        },
        accessLog: {
            destinationArn: apiAccessLogGroup.logGroupArn,
        },

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


            // ----------------- ACADEMY -----------------
            "POST /academy": apiFnBuilder({
                apiName,
                stage: stack.stage,
                handler: `${folderPrefix}/academy/actions.createAcademy`,
                permissions: ["cognito-idp:CreateUserPool", "cognito-idp:CreateUserPoolClient"],
            }),
            "GET /academy": apiFnBuilder({
                apiName,
                stage: stack.stage,
                handler: `${folderPrefix}/academy/actions.listAcademy`,
            }),
            "GET /academy/{id}": apiFnBuilder({
                apiName,
                stage: stack.stage,
                handler: `${folderPrefix}/academy/actions.getAcademy`,
            }),
            "DELETE /academy/{id}": apiFnBuilder({
                apiName,
                stage: stack.stage,
                handler: `${folderPrefix}/academy/actions.deleteAcademy`,
                permissions: ["cognito-idp:DeleteUserPool", "cognito-idp:DeleteUserPoolClient"],
            }),
            "POST /academy/{id}/admin": apiFnBuilder({
                apiName,
                stage: stack.stage,
                handler: `${folderPrefix}/academy/actions.createAcademyAdmin`,
                permissions: ["cognito-idp:AdminCreateUser"],
            }),
            "GET /academy/{id}/admin": apiFnBuilder({
                apiName,
                stage: stack.stage,
                handler: `${folderPrefix}/academy/actions.listAcademyAdmins`,
            }),
            "GET /academy/{id}/admin/{userId}": apiFnBuilder({
                apiName,
                stage: stack.stage,
                handler: `${folderPrefix}/academy/actions.getAcademyAdmin`,
            }),
            "DELETE /academy/{id}/admin/{userId}": apiFnBuilder({
                apiName,
                stage: stack.stage,
                handler: `${folderPrefix}/academy/actions.deleteAcademyAdmin`,
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
        ApiBaseUrl: `https://api.tenant.${process.env.DOMAIN}/global/p3`,
    });
}
