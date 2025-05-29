import {
    SchedulerClient,
    CreateScheduleCommand,
    CreateScheduleCommandInput,
    CreateScheduleCommandOutput,
} from "@aws-sdk/client-scheduler";

export const createScheduler = async (params: CreateScheduleCommandInput): Promise<CreateScheduleCommandOutput> => {
    const client = new SchedulerClient({ region: process.env.SERVICE_REGION });
    return await client.send(new CreateScheduleCommand(params));
};
