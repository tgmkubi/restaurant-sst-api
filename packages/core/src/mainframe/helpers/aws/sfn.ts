import {
    SFNClient,
    DescribeExecutionCommand,
    StartExecutionCommand,
    SendTaskSuccessCommand,
    SendTaskFailureCommand,
} from "@aws-sdk/client-sfn";
import { v4 as uuidv4 } from 'uuid';

export const getExecution = async (executionArn: string) => {
    const sfnClient = new SFNClient();
    const describeExecutionCommand = new DescribeExecutionCommand({
        executionArn,
    });
    return await sfnClient.send(describeExecutionCommand);
};

export const startExecution = async (stateMachineArn: string | undefined, name: string | undefined = undefined, input: any) => {
    name = name || uuidv4();
    const sfnClient = new SFNClient();
    const startExecutionCommand = new StartExecutionCommand({
        stateMachineArn,
        name,
        input: JSON.stringify(input),
    });
    return await sfnClient.send(startExecutionCommand);
};

export const sendTaskSuccess = async (taskToken: string | undefined, output: any) => {
    const sfnClient = new SFNClient();
    const command = new SendTaskSuccessCommand({
        taskToken: taskToken,
        output: JSON.stringify(output),
    });

    return await sfnClient.send(command);
};

export const sendTaskFailure = async (taskToken: string | undefined, error: any, cause: string | undefined) => {
    const sfnClient = new SFNClient();
    const command = new SendTaskFailureCommand({
        taskToken: taskToken,
        error: JSON.stringify(error),
        cause: cause,
    });

    return await sfnClient.send(command);
};
