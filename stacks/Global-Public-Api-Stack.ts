import * as apigatewayv2_alpha from "@aws-cdk/aws-apigatewayv2-alpha";
import * as cdk from "aws-cdk-lib";
import * as logs from "aws-cdk-lib/aws-logs";
import * as sst from "sst/constructs";

import { StackContext } from "sst/constructs";
import {apiFnBuilder} from "./helpers/utils";
import {ConfigStack} from "./ConfigStack";

export function GlobalPublicApiStack({ stack }: StackContext) {

    const { globalCognitoUserPool } = sst.use(ConfigStack);

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



    const globalPublicApi = new sst.Api(stack, moduleName, {
        authorizers: {},
        defaults: {
            function: {
                environment: {},
                timeout: 60,
                runtime: "nodejs20.x",
            },
        },
        accessLog: {
            destinationArn: apiAccessLogGroup.logGroupArn,
        },

        routes: {
            "POST /auth/login": apiFnBuilder({
                apiName,
                stage: stack.stage,
                handler: `${folderPrefix}/auth/actions.login`,
                environment: {
                    GLOBAL_COGNITO_USER_POOL_CLIENT_ID: globalCognitoUserPool.userPoolClientId
                },
                permissions: ["cognito-idp:InitiateAuth"],
            }),

            // --------- ACADEMY ----------------
            "GET /academy/{domain}": apiFnBuilder({
                apiName,
                stage: stack.stage,
                handler: `${folderPrefix}/academy/actions.getAcademy`,
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

    globalPublicApi.attachPermissions([]);

    stack.addOutputs({
        ApiId: globalPublicApi.id,
        ApiHttpId: globalPublicApi.httpApiId,
        ApiEndpoint: globalPublicApi.url,
        ApiBaseUrl: `https://api.global.${process.env.DOMAIN}/admin/p3`,
    });
}
