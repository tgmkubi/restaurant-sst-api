import * as apigatewayv2_alpha from "@aws-cdk/aws-apigatewayv2-alpha";
import * as cdk from "aws-cdk-lib";
import * as events from "aws-cdk-lib/aws-events";
import * as eventsTargets from "aws-cdk-lib/aws-events-targets";
import * as sfn from "aws-cdk-lib/aws-stepfunctions";
import * as tasks from "aws-cdk-lib/aws-stepfunctions-tasks";
import * as logs from "aws-cdk-lib/aws-logs";


import * as scheduler from "aws-cdk-lib/aws-scheduler";

import * as sst from "sst/constructs";

import { StackContext } from "sst/constructs";
import {ConfigStack} from "./ConfigStack";
import * as iam from "aws-cdk-lib/aws-iam";
import {
    defaultCatchProps,
    defaultRetryProps,
    defaultStates,
    logPrefix,
    stateMachineDefinitionCommons
} from "./helpers/stateMachine";
import {eventOps, functionFolderPrefix, moduleTypes, stateMachineNames} from "./helpers/stackConstants";

export function InitialStack({ app, stack }: StackContext) {

    // ------------------- DEFAULTS -------------------
    const stackName = "Initial";
    // ------------------- DEFAULTS -------------------

    const { globalCognitoUserPool, mongoDbSecret } = sst.use(ConfigStack);


/* ---------------------------------------------------------------------------------------------------------------------
# CreateInitialConfig StateMachine
----------------------------------------------------------------------------------------------------------------------*/
    const {
        successHandlerChoice,
        errorHandlerChoice
    } = defaultStates({
        stack,
        moduleType: moduleTypes.INITIAL,
        eventType: eventOps.CREATED
    });

    const createGlobalAdminUserFn = new sst.Function(stack, "CreateGlobalAdminUserFn", {
        handler: `${functionFolderPrefix}/Users/functions/initial.createGlobalAdminUser`,
        environment: {
            MONGO_DB_SECRET_NAME: mongoDbSecret.secretName,
        },
        permissions: ["secretsmanager:GetSecretValue"],
    });

    const createGlobalAdminUserCognitoStep = new tasks.CallAwsService(stack, "Create Global Admin User Cognito", {
        service: "cognitoIdentityProvider",
        action: "adminCreateUser",
        parameters: {
            UserPoolId: globalCognitoUserPool.userPoolId,
            Username: process.env.DEFAULT_USER_EMAIL,
            UserAttributes: [
                {
                    Name: "email",
                    Value: process.env.DEFAULT_USER_EMAIL,
                },
                {
                    Name: "email_verified",
                    Value: "true",
                },
                {
                    Name: "name",
                    Value: process.env.DEFAULT_USER_FIRST_NAME,
                },
                {
                    Name: "family_name",
                    Value: process.env.DEFAULT_USER_LAST_NAME,
                },
                {
                    Name: "custom:academyId",
                    Value: moduleTypes.GLOBAL,
                },
            ],
        },
        iamResources: ["*"],
        iamAction: "cognito-idp:AdminCreateUser",
        resultPath: "$.createUserOutput",
        resultSelector: {
            "userIdList.$": "$.User.Attributes[?(@.Name=='sub')].Value",
        },
    });

    const deleteStarterScheduler = new tasks.CallAwsService(stack, "Delete Starter Scheduler", {
        service: "scheduler",
        action: "deleteSchedule",
        parameters: {
            Name: sfn.JsonPath.stringAt("$.schedulerName"),
        },
        iamResources: ["*"],
        iamAction: "scheduler:DeleteSchedule",
        resultPath: "$.deleteStarterSchedulerOutput",
    });


    const createGlobalAdminUserStep = new tasks.LambdaInvoke(stack, "Create Global Admin Db Step", {
        lambdaFunction: createGlobalAdminUserFn,
        resultPath: "$.createUserErrorHandlerOutput",
        payload: sfn.TaskInput.fromObject({
            userId: sfn.JsonPath.stringAt("$.createUserOutput.userIdList[0]"),
            email: process.env.DEFAULT_USER_EMAIL,
            firstName: process.env.DEFAULT_USER_FIRST_NAME,
            lastName: process.env.DEFAULT_USER_LAST_NAME,
            userPoolId: globalCognitoUserPool.userPoolId,
        }),
    });


    createGlobalAdminUserCognitoStep.addRetry(defaultRetryProps);
    createGlobalAdminUserStep.addRetry(defaultRetryProps);

    createGlobalAdminUserCognitoStep.addCatch(errorHandlerChoice, defaultCatchProps);
    createGlobalAdminUserStep.addCatch(errorHandlerChoice, defaultCatchProps);



    const createInitialConfigSM = new sfn.StateMachine(
        stack,
        stateMachineNames.CreateInitialConfig,
        {
            definitionBody: sfn.DefinitionBody.fromChainable(
                createGlobalAdminUserCognitoStep
                    .next(createGlobalAdminUserStep)
                    .next(deleteStarterScheduler)
                    .next(successHandlerChoice)
            ),
            timeout: cdk.Duration.minutes(5),
            stateMachineType: sfn.StateMachineType.STANDARD,
            ...stateMachineDefinitionCommons({
                stack,
                moduleType: moduleTypes.INITIAL,
                stateMachineName: stateMachineNames.CreateInitialConfig
            }),
        },
    );


    const createInitialConfigSMSchedulerExecutionRole = new iam.Role(stack, "CreateInitialConfigSMSchedulerExecutionRole", {
        roleName: "InitialUserConfigSM-SchedulerExecutionRole",
        assumedBy: new iam.ServicePrincipal("scheduler.amazonaws.com"),
        inlinePolicies: {
            createInitialConfigSMSchedulerExecutionRole: new iam.PolicyDocument({
                statements: [
                    new iam.PolicyStatement({
                        actions: ["states:StartExecution"],
                        resources: [createInitialConfigSM.stateMachineArn],
                        effect: iam.Effect.ALLOW,
                    }),
                ],
            }),
        },
    });
    const createInitialConfigSMScheduler = new scheduler.CfnSchedule(stack, "CreateInitialConfigSMScheduler", {
        scheduleExpression: "rate(1 minutes)",
        flexibleTimeWindow: {
            mode: "OFF",
        },
        target: {
            arn: createInitialConfigSM.stateMachineArn,
            roleArn: createInitialConfigSMSchedulerExecutionRole.roleArn,
            input: JSON.stringify({
                schedulerName: `${stackName}-createInitialConfigSM-Starter-Rule`,
            }),
        },
        name: `${stackName}-createInitialConfigSM-Starter-Rule`,
    });



    return {
        createInitialConfigSM
    }
}
