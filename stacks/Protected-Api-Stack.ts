import * as apigatewayv2_alpha from "@aws-cdk/aws-apigatewayv2-alpha";
import * as cdk from "aws-cdk-lib";
import * as logs from "aws-cdk-lib/aws-logs";
import * as sst from "sst/constructs";

import { StackContext } from "sst/constructs";
import {ConfigStack} from "./ConfigStack";
import {apiFnBuilder} from "./helpers/utils";

export function ProtectedApiStack({ stack }: StackContext) {

    const { globalCognitoUserPool, mongoDbSecret } = sst.use(ConfigStack)

    // ------------------- DEFAULTS -------------------
    const moduleName = "ProtectedApi";
    const folderPrefix = "packages/functions/src/Protected-Api/functions";
    const apiName = "protected";
    // ------------------- DEFAULTS -------------------


    const apiAccessLogGroup = new logs.LogGroup(stack, `${moduleName}AccessLogGroup`, {
        logGroupName: `/aws/vendedlogs/apigateway/${moduleName}-AccessLogGroup`,
        removalPolicy: cdk.RemovalPolicy.DESTROY,
        retention: logs.RetentionDays.ONE_MONTH,
    });

    const authorizerFn = new sst.Function(stack, `${moduleName}Authorizer`, {
        handler: `packages/functions/src/Authorizer/functions/apiMain.authorizer`,
        functionName: `${stack.stage}-${moduleName}-Authorizer`,
        permissions: ["cognito-idp:ProtectedGetUser", "secretsmanager:GetSecretValue"],
        environment: {
            MONGO_DB_SECRET_NAME: mongoDbSecret.secretName,
        }
    });


    const protectedApi = new sst.Api(stack, moduleName, {
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
            "GET /{academyName}/me": apiFnBuilder({
                apiName,
                stage: stack.stage,
                handler: `${folderPrefix}/me/actions.getMe`,
            }),

        },
    });

    // new apigatewayv2_alpha.ApiMapping(stack, "ProtectedApiMapping", {
    //     api: protectedApi.cdk.httpApi,
    //     //domainName: customDomain,
    //
    //     apiMappingKey: "protected",
    //     stage: protectedApi.cdk.httpApi.defaultStage,
    // });

    protectedApi.attachPermissions([
        "secretsmanager:GetSecretValue",
    ]);

    stack.addOutputs({
        ApiId: protectedApi.id,
        ApiHttpId: protectedApi.httpApiId,
        ApiEndpoint: protectedApi.url,
        ApiBaseUrl: `https://api.academy.${process.env.DOMAIN}/protected/p1`,
    });
}
