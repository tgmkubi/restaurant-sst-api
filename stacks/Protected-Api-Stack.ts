import * as apigatewayv2_alpha from "@aws-cdk/aws-apigatewayv2-alpha";
import * as cdk from "aws-cdk-lib";
import * as logs from "aws-cdk-lib/aws-logs";
import * as sst from "sst/constructs";

import { StackContext } from "sst/constructs";
import { ConfigStack } from "./ConfigStack";
import { apiFnBuilder } from "./helpers/utils";

export function ProtectedApiStack({ stack }: StackContext) {

    const { globalCognitoUserPool, mongoDbSecret, mediaAssetsBucket } = sst.use(ConfigStack);

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
        permissions: ["cognito-idp:ProtectedGetUser","cognito-idp:AdminGetUser", "secretsmanager:GetSecretValue"],
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
                    MEDIA_ASSETS_BUCKET_NAME: mediaAssetsBucket.bucketName,
                },
                timeout: 30, // Reduced to force optimization
                runtime: "nodejs20.x",
                memorySize: 1024, // Increased memory for better performance
            },
        },
        accessLog: {
            destinationArn: apiAccessLogGroup.logGroupArn,
        },

        routes: {
            // ----------------- RESTAURANT -----------------
            "POST /company/{companyId}/restaurant": apiFnBuilder({
                apiName,
                stage: stack.stage,
                handler: `${folderPrefix}/restaurants/actions.createRestaurant`,
            }),
            "GET /company/{companyId}/restaurant": apiFnBuilder({
                apiName,
                stage: stack.stage,
                handler: `${folderPrefix}/restaurants/actions.listRestaurants`,
            }),
            "GET /company/{companyId}/restaurant/{id}": apiFnBuilder({
                apiName,
                stage: stack.stage,
                handler: `${folderPrefix}/restaurants/actions.getRestaurant`,
            }),
            "PUT /company/{companyId}/restaurant/{id}": apiFnBuilder({
                apiName,
                stage: stack.stage,
                handler: `${folderPrefix}/restaurants/actions.updateRestaurant`,
            }),
            "DELETE /company/{companyId}/restaurant/{id}": apiFnBuilder({
                apiName,
                stage: stack.stage,
                handler: `${folderPrefix}/restaurants/actions.deleteRestaurant`,
            }),
            // ----------------- CATEGORY -----------------
            "POST /company/{companyId}/restaurant/{restaurantId}/category": apiFnBuilder({
                apiName,
                stage: stack.stage,
                handler: `${folderPrefix}/categories/actions.createCategory`,
            }),
            "GET /company/{companyId}/restaurant/{restaurantId}/category": apiFnBuilder({
                apiName,
                stage: stack.stage,
                handler: `${folderPrefix}/categories/actions.listCategories`,
            }),
            "GET /company/{companyId}/restaurant/{restaurantId}/category/{id}": apiFnBuilder({
                apiName,
                stage: stack.stage,
                handler: `${folderPrefix}/categories/actions.getCategory`,
            }),
            "PUT /company/{companyId}/restaurant/{restaurantId}/category/{id}": apiFnBuilder({
                apiName,
                stage: stack.stage,
                handler: `${folderPrefix}/categories/actions.updateCategory`,
            }),
            "DELETE /company/{companyId}/restaurant/{restaurantId}/category/{id}": apiFnBuilder({
                apiName,
                stage: stack.stage,
                handler: `${folderPrefix}/categories/actions.deleteCategory`,
            }),
            // ----------------- PRODUCT -----------------
            "POST /company/{companyId}/restaurant/{restaurantId}/product": apiFnBuilder({
                apiName,
                stage: stack.stage,
                handler: `${folderPrefix}/products/actions.createProduct`,
                permissions: ["s3:PutObject", "s3:PutObjectAcl"],
            }),
            "GET /company/{companyId}/restaurant/{restaurantId}/product": apiFnBuilder({
                apiName,
                stage: stack.stage,
                handler: `${folderPrefix}/products/actions.listProducts`,
                permissions: ["s3:GetObject"],
            }),
            "GET /company/{companyId}/restaurant/{restaurantId}/product/{id}": apiFnBuilder({
                apiName,
                stage: stack.stage,
                handler: `${folderPrefix}/products/actions.getProduct`,
                permissions: ["s3:GetObject"],
            }),
            "PUT /company/{companyId}/restaurant/{restaurantId}/product/{id}": apiFnBuilder({
                apiName,
                stage: stack.stage,
                handler: `${folderPrefix}/products/actions.updateProduct`,
                permissions: ["s3:PutObject"],
            }),
            "DELETE /company/{companyId}/restaurant/{restaurantId}/product/{id}": apiFnBuilder({
                apiName,
                stage: stack.stage,
                handler: `${folderPrefix}/products/actions.deleteProduct`,
                permissions: ["s3:DeleteObject"],
            }),
            // ----------------- MENU -----------------
            "POST /company/{companyId}/restaurant/{restaurantId}/menu": apiFnBuilder({
                apiName,
                stage: stack.stage,
                handler: `${folderPrefix}/menus/actions.createMenu`,
            }),
            "GET /company/{companyId}/restaurant/{restaurantId}/menu": apiFnBuilder({
                apiName,
                stage: stack.stage,
                handler: `${folderPrefix}/menus/actions.listMenus`,
            }),
            "GET /company/{companyId}/restaurant/{restaurantId}/menu/{id}": apiFnBuilder({
                apiName,
                stage: stack.stage,
                handler: `${folderPrefix}/menus/actions.getMenu`,
            }),
            "PUT /company/{companyId}/restaurant/{restaurantId}/menu/{id}": apiFnBuilder({
                apiName,
                stage: stack.stage,
                handler: `${folderPrefix}/menus/actions.updateMenu`,
            }),
            "DELETE /company/{companyId}/restaurant/{restaurantId}/menu/{id}": apiFnBuilder({
                apiName,
                stage: stack.stage,
                handler: `${folderPrefix}/menus/actions.deleteMenu`,
            }),
            // ----------------- QRCODE -----------------
            "POST /company/{companyId}/restaurant/{restaurantId}/qrcode": apiFnBuilder({
                apiName,
                stage: stack.stage,
                handler: `${folderPrefix}/qrcodes/actions.createQRCode`,
                permissions: ["s3:PutObject", "s3:PutObjectAcl"],
            }),
            "GET /company/{companyId}/restaurant/{restaurantId}/qrcode/{id}": apiFnBuilder({
                apiName,
                stage: stack.stage,
                handler: `${folderPrefix}/qrcodes/actions.getQRCode`,
            }),
            "PUT /company/{companyId}/restaurant/{restaurantId}/qrcode/{id}": apiFnBuilder({
                apiName,
                stage: stack.stage,
                handler: `${folderPrefix}/qrcodes/actions.updateQRCode`,
            }),
            "DELETE /company/{companyId}/restaurant/{restaurantId}/qrcode/{id}": apiFnBuilder({
                apiName,
                stage: stack.stage,
                handler: `${folderPrefix}/qrcodes/actions.deleteQRCode`,
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
        ApiBaseUrl: `https://api.tenant.${process.env.DOMAIN}/protected/p1`,
    });
}
