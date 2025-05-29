import * as apigatewayv2_alpha from "@aws-cdk/aws-apigatewayv2-alpha";
import * as cdk from "aws-cdk-lib";
import * as logs from "aws-cdk-lib/aws-logs";
import * as sst from "sst/constructs";

import { StackContext } from "sst/constructs";
import {ConfigStack} from "./ConfigStack";
import {apiFnBuilder} from "./helpers/utils";

export function AdminApiStack({ stack }: StackContext) {

    const { globalCognitoUserPool, mongoDbSecret } = sst.use(ConfigStack)

    // ------------------- DEFAULTS -------------------
    const moduleName = "AdminApi";
    const folderPrefix = "packages/functions/src/Admin-Api/functions";
    const apiName = "admin";
    // ------------------- DEFAULTS -------------------


    const apiAccessLogGroup = new logs.LogGroup(stack, `${moduleName}AccessLogGroup`, {
        logGroupName: `/aws/vendedlogs/apigateway/${moduleName}-AccessLogGroup`,
        removalPolicy: cdk.RemovalPolicy.DESTROY,
        retention: logs.RetentionDays.ONE_MONTH,
    });

    const authorizerFn = new sst.Function(stack, `${moduleName}Authorizer`, {
        handler: `packages/functions/src/Authorizer/functions/apiMain.authorizer`,
        functionName: `${stack.stage}-${moduleName}-Authorizer`,
        permissions: ["cognito-idp:AdminGetUser", "secretsmanager:GetSecretValue"],
        environment: {
            MONGO_DB_SECRET_NAME: mongoDbSecret.secretName,
        }
    });


    const adminApi = new sst.Api(stack, moduleName, {
        authorizers: {
            lambdaAuthorizer: {
                type: "lambda",
                function: authorizerFn,
                //resultsCacheTtl: "30 minutes",
            },
        },
        defaults: {
            authorizer: "lambdaAuthorizer",
            function: {
                environment: {
                    MONGO_DB_SECRET_NAME: mongoDbSecret.secretName,
                },
                timeout: 60,
                runtime: "nodejs20.x",
            },
        },
        accessLog: {
            destinationArn: apiAccessLogGroup.logGroupArn,
        },

        routes: {
            "POST /{academyName}/users": apiFnBuilder({
                apiName,
                stage: stack.stage,
                handler: `${folderPrefix}/users/actions.createUser`,
                permissions: ["cognito-idp:AdminCreateUser"]
            }),
            "GET /{academyName}/users": apiFnBuilder({
                apiName,
                stage: stack.stage,
                handler: `${folderPrefix}/users/actions.listUsers`,
            }),
            "GET /{academyName}/users/{id}": apiFnBuilder({
                apiName,
                stage: stack.stage,
                handler: `${folderPrefix}/users/actions.getUser`,
            }),
            "DELETE /{academyName}/users/{id}": apiFnBuilder({
                apiName,
                stage: stack.stage,
                handler: `${folderPrefix}/users/actions.deleteUser`,
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
        ApiBaseUrl: `https://api.academy.${process.env.DOMAIN}/admin/p1`,
    });
}
