import * as cdk from "aws-cdk-lib";
import * as sfn from "aws-cdk-lib/aws-stepfunctions";
import * as tasks from "aws-cdk-lib/aws-stepfunctions-tasks";

import {eventOps, moduleTypes, stateMachineNames} from "./stackConstants";
import { Construct } from "constructs/lib/construct";
import * as logs from "aws-cdk-lib/aws-logs";

interface IStepInput {
    stack: Construct,
    moduleType: string,
    extra?: string
}

export const jobSucceed = ({stack, moduleType}: IStepInput) => {
    return new sfn.Succeed(stack, `${moduleType} Job Succeed`);
};
export const jobFailed = ({stack, moduleType}: IStepInput) => {
    return new sfn.Fail(stack, `${moduleType} Job Failed`, {
        comment: "Job Failed",
        error: "FAILED",
    });
};

export const createdEventStep = ({stack, moduleType, extra}: IStepInput) => {
    return new tasks.EventBridgePutEvents(stack, `Send CREATED - ${moduleType} Event to EventBridge ${extra}`, {
        entries: [
            {
                source: `com.lms.${moduleType.toLowerCase()}`,
                detailType: `CREATED_${moduleType}`,
                detail: sfn.TaskInput.fromJsonPathAt("$.eventDetail"),
            },
        ],
        resultPath: "$.createdEventOutput",
    });
};

export const updatedEventStep = ({stack, moduleType}: IStepInput) => {
    return new tasks.EventBridgePutEvents(stack, `Send Updated - ${moduleType} Event to EventBridge`, {
        entries: [
            {
                source: `com.ivp.${moduleType.toLowerCase()}`,
                detailType: `UPDATED_${moduleType}`,
                detail: sfn.TaskInput.fromJsonPathAt("$.eventDetail"),
            },
        ],
        resultPath: "$.updatedEventOutput",
    });
};

export const deletedEventStep = ({stack, moduleType, extra}: IStepInput) => {
    return new tasks.EventBridgePutEvents(stack, `Send Deleted - ${moduleType} Event to EventBridge ${extra}`, {
        entries: [
            {
                source: `com.ivp.${moduleType.toLowerCase()}`,
                detailType: `DELETED_${moduleType}`,
                detail: sfn.TaskInput.fromJsonPathAt("$.eventDetail"),
            },
        ],
        resultPath: "$.deletedEventOutput",
    });
};

export const errorEventStep = ({stack, moduleType, extra}: IStepInput) => {
    return new tasks.EventBridgePutEvents(
        stack,
        `Send ${eventOps.ERROR} ${moduleType} ${extra} Event to EventBridge`,
        {
            entries: [
                {
                    source: `com.lms.${moduleType.toLowerCase()}`,
                    detailType: `${eventOps.ERROR}_${moduleType}`,
                    detail: sfn.TaskInput.fromObject({
                        error: sfn.JsonPath.stringAt("$.createErrorOutput.Error"),
                        cause: sfn.JsonPath.stringAt("$.createErrorOutput.Cause"),
                        idempotencyId: sfn.JsonPath.stringAt("$.eventDetail.idempotencyId"),
                        userId: sfn.JsonPath.stringAt("$.eventDetail.userId"),
                        academyId: sfn.JsonPath.stringAt("$.eventDetail.academyId"),
                    }),
                },
            ],
            resultPath: "$.errorEventOutput",
        },
    );
};

export const defaultRetryProps = {
    maxAttempts: 5,
    jitterStrategy: sfn.JitterType.FULL,
    interval: cdk.Duration.seconds(10),
    backoffRate: 1.4,
    maxDelay: cdk.Duration.seconds(120),
};

export const defaultCatchProps = { errors: ["States.ALL"], resultPath: "$.createErrorOutput" };
export const logPrefix = "/aws/vendedlogs/states/";

export const sendTaskSuccessStep = ({
    stack,
    output = undefined,
    extra = ""
}: {stack: Construct, output: string | undefined, extra?: string}) => {
    
    if (!output) {
        output = sfn.JsonPath.jsonToString(
            sfn.TaskInput.fromObject({
                status: 200,
            }),
        );
    }
    return new tasks.CallAwsService(stack, `Send Task Success Step ${extra}`, {
        service: "sfn",
        action: "sendTaskSuccess",
        parameters: {
            TaskToken: sfn.JsonPath.stringAt("$.taskToken"),
            Output: output,
        },
        iamResources: ["*"],
        iamAction: "states:SendTaskSuccess",
        resultPath: "$.sendTaskSuccessOutput",
    });
};

export const sendTaskFailureStep = ({
    stack,
    extra = ""
}: {stack: Construct, extra?: string}) => {
    return new tasks.CallAwsService(stack, `Send Task Failure Step ${extra}`, {
        service: "sfn",
        action: "sendTaskFailure",
        parameters: {
            TaskToken: sfn.JsonPath.stringAt("$.taskToken"),
            Error: sfn.JsonPath.stringAt("$.createErrorOutput.Error"),
            Cause: sfn.JsonPath.stringAt("$.createErrorOutput.Cause"),
        },
        iamResources: ["*"],
        iamAction: "states:SendTaskFailure",
        resultPath: "$.sendTaskFailureOutput",
    });
};




export const defaultStates = ({
    stack, 
    moduleType = "",
    eventType = undefined
}: {stack: any, moduleType: string, eventType?: string | undefined}) => {
    const _jobSucceed = jobSucceed({stack, moduleType});
    const _jobFailed = jobFailed({stack, moduleType});

    const _errorEventStep = errorEventStep({stack, moduleType}).next(_jobFailed);
    const _createdEventStep = createdEventStep({stack, moduleType});
    const _updatedEventStep = updatedEventStep({stack, moduleType});
    const _deletedEventStep = deletedEventStep({stack, moduleType});

    const successTokenStep = sendTaskSuccessStep(
        {
            stack,
            output: sfn.JsonPath.jsonToString(sfn.JsonPath.objectAt("$")),
        }
    );
    const failureTokenStep = sendTaskFailureStep({stack});

    let event = null;
    if (eventType === eventOps.CREATED) event = _createdEventStep;
    if (eventType === eventOps.UPDATED) event = _updatedEventStep;
    if (eventType === eventOps.DELETED) event = _deletedEventStep;


    const errorHandlerChoice = new sfn.Choice(stack, "ERROR | Is Task Token Present?")
        .when(sfn.Condition.isPresent("$.taskToken"), failureTokenStep.next(_errorEventStep))
        .otherwise(_errorEventStep);

    const successHandlerChoice = new sfn.Choice(stack, "SUCCESS | Is Task Token Present?")
        .when(sfn.Condition.isPresent("$.taskToken"), successTokenStep.next(_jobSucceed));
    if (event) {
        successHandlerChoice.otherwise(event.next(_jobSucceed));
    } else {
        successHandlerChoice.otherwise(_jobSucceed);
    }

    return {
        jobSucceed: _jobSucceed,
        jobFailed: _jobFailed,
        errorEventStep: _errorEventStep,
        createdEventStep: _createdEventStep,
        updatedEventStep: _updatedEventStep,
        deletedEventStep: _deletedEventStep,
        successTokenStep: successTokenStep,
        failureTokenStep: failureTokenStep,
        // primary
        errorHandlerChoice: errorHandlerChoice,
        successHandlerChoice: successHandlerChoice,
    }
}


// STEPS

export const createUpdateDynamoDbDataStep = ({
    stack,
    moduleType = "",
    itemPath
}: {stack: any, moduleType: string,itemPath: string}
) => {
    return new tasks.CallAwsService(stack, `Create/Update ${moduleType} DynamoDB Data`, {
        service: "dynamodb",
        action: "putItem",
        parameters: {
            TableName: process.env.MAIN_TABLE_NAME,
            Item: sfn.JsonPath.objectAt(`$.${itemPath}`),
        },
        iamResources: ["*"],
        iamAction: "dynamodb:PutItem",
        resultPath: `$.create${moduleType}DataOutput`,
    });
}

export const deleteDynamoDbDataStep = ({
    stack,
    moduleType = "",
    pk,
    sk
}:{stack: any, moduleType: string, pk: string, sk: string}) => {
    return new tasks.CallAwsService(stack, `Delete DynamoDB Data`, {
        service: "dynamodb",
        action: "deleteItem",
        parameters: {
            TableName: process.env.MAIN_TABLE_NAME,
            Key: {
                pk: { S: pk },
                sk: { S: sk },
            },
        },
        iamResources: ["*"],
        iamAction: "dynamodb:DeleteItem",
        resultPath: `$.delete${moduleType}DataOutput`,
    });
}

export const startExecutionSMStep = (
    {
        stack,
        stateMachine,
        input = {},
        stepName = "Start Execution SM Step",
        resultPath = ""
    }: {
        stack: any,
        stateMachine: cdk.aws_stepfunctions.IStateMachine,
        input: any,
        stepName?: string,
        resultPath?: string
    }
) => {
    return new tasks.StepFunctionsStartExecution(stack, stepName, {
        stateMachine: stateMachine,
        integrationPattern: sfn.IntegrationPattern.WAIT_FOR_TASK_TOKEN,
        input: sfn.TaskInput.fromObject({
            taskToken: sfn.JsonPath.taskToken,
            ...input
        }),
        name: sfn.JsonPath.uuid(),
        resultPath: `$.${resultPath || "executionOutput"}`,
    });
}

export const stateMachineDefinitionCommons = ({stack, moduleType, stateMachineName}:
  {stack: any, moduleType: string, stateMachineName: string}
) => {
    return {
        stateMachineName: `${moduleType}-${stateMachineName}`,
        logs: {
            destination: new logs.LogGroup(
                stack,
                `${stateMachineName}StateMachineLogs`,
                {
                    logGroupName: `${logPrefix}-${stateMachineName}`,
                    removalPolicy: cdk.RemovalPolicy.DESTROY,
                },
            ),
        },
    }
}