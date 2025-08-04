import * as cdk from "aws-cdk-lib";
import * as dynamodb from "aws-cdk-lib/aws-dynamodb";
import * as cognito from "aws-cdk-lib/aws-cognito";
import * as secrets_manager from "aws-cdk-lib/aws-secretsmanager";
import * as acm from "aws-cdk-lib/aws-certificatemanager";
import * as route53 from "aws-cdk-lib/aws-route53";
import * as apigatewayv2_alpha from "@aws-cdk/aws-apigatewayv2-alpha";
import * as targets from "aws-cdk-lib/aws-route53-targets";


import { StackContext, Cognito } from "sst/constructs";
import {RemovalPolicy} from "aws-cdk-lib";

export function ConfigStack({ app, stack }: StackContext) {

    // ------------------- DEFAULTS -------------------
    // ------------------- DEFAULTS -------------------

    const mainTable = new dynamodb.Table(stack, "MainTable", {
        tableName: `${app.stage}-${process.env.MAIN_TABLE_NAME}`,
        partitionKey: { name: "pk", type: dynamodb.AttributeType.STRING },
        sortKey: { name: "sk", type: dynamodb.AttributeType.STRING },
        billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
        removalPolicy: cdk.RemovalPolicy.RETAIN,
    });

    const globalCognitoUserPool = new Cognito(stack, "GlobalCognitoUserPool", {
        identityPoolFederation: {},
        login: ["email"],
        cdk: {
            userPool: {
                userPoolName: `${app.stage}-${process.env.GLOBAL_COGNITO_USER_POOL_NAME}`,
                selfSignUpEnabled: true,
                signInAliases: {
                    email: true,
                },
                customAttributes: {
                    companyId: new cognito.StringAttribute({ mutable: true }),
                },
                accountRecovery: cognito.AccountRecovery.EMAIL_ONLY,
                removalPolicy: RemovalPolicy.DESTROY,
            },
            userPoolClient: {
                userPoolClientName: `${app.stage}-${process.env.GLOBAL_COGNITO_USER_POOL_NAME}-Client`,
                supportedIdentityProviders: [cognito.UserPoolClientIdentityProvider.COGNITO],
                authFlows: {
                    userPassword: stack.stage !== "prod",
                    custom: false,
                    userSrp: true,
                },
            },
        },
    });
    const adminsGroup = new cognito.CfnUserPoolGroup(stack, "AdminsGroup", {
        groupName: "Admins",
        userPoolId: globalCognitoUserPool.cdk.userPool.userPoolId,
        description: "Administrators group",
    });

    const mongoDbSecret = new secrets_manager.Secret(stack, "MongoDbSecret", {
        secretName: `${app.stage}-mongodb-secret`,
        description: `Secrets for Mongodb`,
        secretObjectValue: {
            connectionUri: cdk.SecretValue.unsafePlainText(""),
        },
        removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    // ------------------- Custom Domain for API Settings -------------------
    // Active if you have any custom domain for your API
    // const globalApiDomainName = `global.api.${process.env.DOMAIN}`;
    // const hostedZone = route53.HostedZone.fromHostedZoneAttributes(stack, "HostedZone", {
    //     hostedZoneId: process.env.HOSTED_ZONE_ID || "",
    //     zoneName: process.env.DOMAIN || "",
    // });
    // const certificate = new acm.Certificate(stack, "ApiCertificate", {
    //     domainName: regionApiDomainName,
    //     certificateName: "API Certificate",
    //     validation: acm.CertificateValidation.fromDns(hostedZone),
    // });
    // const customDomain = new apigatewayv2_alpha.DomainName(stack, "ApiCustomDomain", {
    //     domainName: regionApiDomainName,
    //     certificate: certificate,
    // });
    // new route53.RecordSet(stack, "ApiRecordSet", {
    //     zone: hostedZone,
    //     recordType: route53.RecordType.A,
    //     recordName: regionApiDomainName,
    //     target: route53.RecordTarget.fromAlias(
    //         new targets.ApiGatewayv2DomainProperties(
    //             customDomain.regionalDomainName,
    //             customDomain.regionalHostedZoneId,
    //         ),
    //     ),
    // });
    // ------------------- Custom Domain for API Settings -------------------



    stack.addOutputs({});

    return {
        mainTable,
        globalCognitoUserPool,
        mongoDbSecret
    };

}
