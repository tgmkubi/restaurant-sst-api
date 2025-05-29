import {
    EventBridgeClient,
    ListTargetsByRuleCommand,
    ListTargetsByRuleCommandInput,
    PutEventsCommand,
    PutEventsCommandInput,
    PutTargetsCommand,
    PutTargetsCommandInput,
    PutRuleCommand,
    PutRuleCommandInput,
} from "@aws-sdk/client-eventbridge";

export const listTargetsByRule = async (params: ListTargetsByRuleCommandInput) => {
    const { Rule } = params;
    const client = new EventBridgeClient({ region: process.env.SERVICE_REGION });
    return await client.send(
        new ListTargetsByRuleCommand({
            Rule: Rule,
        }),
    );
};

export const putEvents = async (params: PutEventsCommandInput) => {
    const client = new EventBridgeClient({ region: process.env.SERVICE_REGION });
    return await client.send(new PutEventsCommand(params));
};

export const putRule = async (params: PutRuleCommandInput) => {
    const client = new EventBridgeClient({ region: process.env.SERVICE_REGION });
    return await client.send(new PutRuleCommand(params));
};

export const putTargets = async (params: PutTargetsCommandInput) => {
    const client = new EventBridgeClient({ region: process.env.SERVICE_REGION });
    return await client.send(new PutTargetsCommand(params));
};
