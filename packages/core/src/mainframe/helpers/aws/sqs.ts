import {
    SQSClient,
    SendMessageCommand,
    SendMessageCommandInput,
    SendMessageBatchCommand,
    SendMessageBatchCommandInput
} from "@aws-sdk/client-sqs";

const sqsClient = new SQSClient({ region: process.env.SERVICE_REGION });

export const sendMessage = async (queueUrl: string | undefined, messageBody: object, messageAttributes: any = null) => {
    const params: SendMessageCommandInput = {
        MessageBody: JSON.stringify(messageBody),
        QueueUrl: queueUrl,
    };
    if (messageAttributes) params.MessageAttributes = messageAttributes;

    return await sqsClient.send(new SendMessageCommand(params));
};

export const sendMessageBatch = async (queueUrl: string | undefined, entries: any[]) => {
    const params: SendMessageBatchCommandInput = {
        Entries: entries,
        QueueUrl: queueUrl,
    };

    return await sqsClient.send(new SendMessageBatchCommand(params));
}