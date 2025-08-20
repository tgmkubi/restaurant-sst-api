import * as apigatewayv2_alpha from "@aws-cdk/aws-apigatewayv2-alpha";
import * as cdk from "aws-cdk-lib";
import * as logs from "aws-cdk-lib/aws-logs";
import * as sst from "sst/constructs";

import { StackContext } from "sst/constructs";
import { apiFnBuilder } from "./helpers/utils";
import { ConfigStack } from "./ConfigStack";

export function GlobalPublicApiStack({ stack }: StackContext) {

    const { globalCognitoUserPool, mongoDbSecret } = sst.use(ConfigStack);

    // ------------------- DEFAULTS -------------------
    const moduleName = "GlobalPublicApi";
    const folderPrefix = "packages/functions/src/Global-Public-Api/functions";
    const apiName = "globalPublic";
    // ------------------- DEFAULTS -------------------

    const apiAccessLogGroup = new logs.LogGroup(stack, `${moduleName}AccessLogGroup`, {
        logGroupName: `/aws/vendedlogs/apigateway/${moduleName}-AccessLogGroup`,
        removalPolicy: cdk.RemovalPolicy.DESTROY,
        retention: logs.RetentionDays.ONE_MONTH,
    });

    const authorizerFn = new sst.Function(stack, `${moduleName}Authorizer`, {
        handler: `packages/functions/src/Authorizer/functions/apiPublic.authorizer`,
        functionName: `${stack.stage}-${moduleName}-Authorizer`,
        permissions: ["cognito-idp:ProtectedGetUser", "secretsmanager:GetSecretValue"],
        environment: {
            MONGO_DB_SECRET_NAME: mongoDbSecret.secretName,
        }
    });

    const globalPublicApi = new sst.Api(stack, moduleName, {
        authorizers: {
            lambdaAuthorizer: {
                type: "lambda",
                function: authorizerFn,
                //resultsCacheTtl: "30 minutes",
            },
        },
        defaults: {
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
            // ----------------- COMPANY -----------------
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

            // ----------------- RESTAURANT -----------------
            "GET /company/{companyId}/restaurant": apiFnBuilder({
                apiName,
                stage: stack.stage,
                handler: `${folderPrefix}/restaurant/actions.listRestaurants`,
            }),
            "GET /company/{companyId}/restaurant/{id}": apiFnBuilder({
                apiName,
                stage: stack.stage,
                handler: `${folderPrefix}/restaurant/actions.getRestaurant`,
            }),
        },
    });

    // activate if you have any domain
    // new apigatewayv2_alpha.ApiMapping(stack, "GlobalPublicApiMapping", {
    //     api: globalPublicApi.cdk.httpApi,
    //     //domainName: customDomain,
    //
    //     apiMappingKey: "public",
    //     stage: globalPublicApi.cdk.httpApi.defaultStage,
    // });

    globalPublicApi.attachPermissions([
        "secretsmanager:GetSecretValue",
    ]);

    stack.addOutputs({
        ApiId: globalPublicApi.id,
        ApiHttpId: globalPublicApi.httpApiId,
        ApiEndpoint: globalPublicApi.url,
        ApiBaseUrl: `https://api.global.${process.env.DOMAIN}/public/p1`,
    });
}
