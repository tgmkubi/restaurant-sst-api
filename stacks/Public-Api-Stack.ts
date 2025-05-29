import * as apigatewayv2_alpha from "@aws-cdk/aws-apigatewayv2-alpha";
import * as cdk from "aws-cdk-lib";
import * as logs from "aws-cdk-lib/aws-logs";
import * as sst from "sst/constructs";

import { StackContext } from "sst/constructs";
import {ConfigStack} from "./ConfigStack";
import {apiFnBuilder} from "./helpers/utils";

export function PublicApiStack({ stack }: StackContext) {

    const { globalCognitoUserPool, mongoDbSecret } = sst.use(ConfigStack)

    // ------------------- DEFAULTS -------------------
    const moduleName = "PublicApi";
    const folderPrefix = "packages/functions/src/Public-Api/functions";
    const apiName = "public";
    // ------------------- DEFAULTS -------------------


    const apiAccessLogGroup = new logs.LogGroup(stack, `${moduleName}AccessLogGroup`, {
        logGroupName: `/aws/vendedlogs/apigateway/${moduleName}-AccessLogGroup`,
        removalPolicy: cdk.RemovalPolicy.DESTROY,
        retention: logs.RetentionDays.ONE_MONTH,
    });

    const authorizerFn = new sst.Function(stack, `${moduleName}Authorizer`, {
        handler: `packages/functions/src/Authorizer/functions/apiPublic.authorizer`,
        functionName: `${stack.stage}-${moduleName}-Authorizer`,
        permissions: ["secretsmanager:GetSecretValue"],
        environment: {
            MONGO_DB_SECRET_NAME: mongoDbSecret.secretName,
        }
    });


    const publicApi = new sst.Api(stack, moduleName, {
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
            "POST /{academyName}/auth/login": apiFnBuilder({
                apiName,
                stage: stack.stage,
                handler: `${folderPrefix}/auth/actions.login`,
            }),

        },
    });

    // new apigatewayv2_alpha.ApiMapping(stack, "PublicApiMapping", {
    //     api: publicApi.cdk.httpApi,
    //     //domainName: customDomain,
    //
    //     apiMappingKey: "public",
    //     stage: publicApi.cdk.httpApi.defaultStage,
    // });

    publicApi.attachPermissions([
        "secretsmanager:GetSecretValue",
    ]);

    stack.addOutputs({
        ApiId: publicApi.id,
        ApiHttpId: publicApi.httpApiId,
        ApiEndpoint: publicApi.url,
        ApiBaseUrl: `https://api.academy.${process.env.DOMAIN}/public/p1`,
    });
}
