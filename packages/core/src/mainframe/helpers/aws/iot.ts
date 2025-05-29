import {
    IoTDataPlaneClient,
    PublishCommand,
    PublishCommandInput,
    PublishCommandOutput,
} from "@aws-sdk/client-iot-data-plane"; // ES Modules import

const iotDataClient = new IoTDataPlaneClient({ region: process.env.SERVICE_REGION });

export const publish = async ({ topic, payload }: PublishCommandInput): Promise<PublishCommandOutput> => {
    const command = new PublishCommand({ topic, payload });
    return await iotDataClient.send(command);
};
