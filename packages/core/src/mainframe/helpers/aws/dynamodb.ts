import {
    DeleteItemCommand,
    DescribeTableCommand,
    DynamoDBClient,
    GetItemCommand,
    PutItemCommand,
    QueryCommand,
    UpdateItemCommand,
    ExecuteStatementCommand,
    ExecuteStatementCommandInput,
    ExecuteStatementCommandOutput,
    BatchWriteItemCommand,
    BatchGetItemCommand,
    QueryCommandInput,
} from "@aws-sdk/client-dynamodb";
import { marshall, unmarshall } from "@aws-sdk/util-dynamodb";

import { NodeHttpHandler } from "@smithy/node-http-handler";
import { Agent } from "https";
import {
    IBuildPartiQueryInput,
    IPaginatedResponseOutput,
    IPartiQueryInput,
    IPartiQueryPaginatedInput,
} from "./interfaces/dynamodb";
import { IDataItem } from "../interfaces/global";
import {chunkArray} from "../utils";

const dynamodbGlobalClient = new DynamoDBClient({
    region: process.env.SERVICE_REGION,
    requestHandler: new NodeHttpHandler({
        httpsAgent: new Agent({
            keepAlive: false,
        }),
    }),
});
const tableName = process.env.MAIN_TABLE_NAME || "main";

export const getItem = async <T = any>(key: any, consistentRead: boolean = false) => {
    const getItemCommand = new GetItemCommand({
        TableName: tableName,
        Key: marshall(key),
        ConsistentRead: consistentRead,
    });
    const res = await dynamodbGlobalClient.send(getItemCommand);
    return res.Item ? (unmarshall(res.Item) as T) : null;
};

export const describeTable = async () => {
    const describeTableCommand = new DescribeTableCommand({
        TableName: tableName,
    });
    try {
        return await dynamodbGlobalClient.send(describeTableCommand);
    } catch (error: any) {
        if (error.name !== "ResourceNotFoundException") throw error;
        return null;
    }
};

export const insertItem = async (item: any) => {
    return await dynamodbGlobalClient.send(
        new PutItemCommand({
            TableName: tableName,
            Item: marshall(item),
        }),
    );
};

export const deleteItem = async (key: any) => {
    const deleteItemCommand = new DeleteItemCommand({
        TableName: tableName,
        Key: marshall(key),
    });
    return await dynamodbGlobalClient.send(deleteItemCommand);
};


export const updateItem = async (pk: string, sk: string, data: any) => {
    const params: any = {
        TableName: tableName,
        Key: marshall({ pk, sk }),
        UpdateExpression: "set #data = :data",
        ExpressionAttributeNames: {
            "#data": "data",
        },
        ExpressionAttributeValues: {
            ":data": marshall(data),
        },
        ReturnValues: "UPDATED_NEW",
    };
    const updateCommand = new UpdateItemCommand(params);
    return await dynamodbGlobalClient.send(updateCommand);
};


export const batchWriteItems = async (items: any[]) => {
    const params = {
        RequestItems: {
            [tableName]: items.map((item) => {
                return {
                    PutRequest: {
                        Item: marshall(item),
                    },
                };
            }),
        },
    };
    return await dynamodbGlobalClient.send(new BatchWriteItemCommand(params));
};

export const batchDeleteItems = async (items: any[]) => {
    const params = {
        RequestItems: {
            [tableName]: items.map((item) => {
                return {
                    DeleteRequest: {
                        Key: marshall(item),
                    },
                };
            }),
        },
    };
    return await dynamodbGlobalClient.send(new BatchWriteItemCommand(params));
};

interface Item {
    pk: string;
    sk: string;
}

interface IBatchGetItemsInput {
    items: Item[] | Record<string, any>[];
    collectedItems?: any[];
}

export const batchGetItems = async ({
    items = [],
    collectedItems = [],
}: IBatchGetItemsInput): Promise<IDataItem[]> => {
    items = items.filter((i) => i && i.pk && i.sk);
    // use redis cache
    // const redisRes = await batchReadItem({ skList: items.map((item) => item.sk), })
    // return redisRes.items;

    const chunkedItems = chunkArray(items, 25);
    for (const chunk of chunkedItems) {
        const res = await dynamodbGlobalClient.send(
            new BatchGetItemCommand({
                RequestItems: {
                    [tableName]: {
                        Keys: chunk.map((item: any) => marshall(item)),
                    },
                },
            }),
        );

        res.Responses = res.Responses || {};
        collectedItems = [
            ...collectedItems,
            ...(res.Responses[tableName] ? res.Responses[tableName].map((r) => unmarshall(r)) : []),
        ];

        // Check for any unprocessed keys to continue the recursion
        res.UnprocessedKeys = res.UnprocessedKeys || {};
        if (res.UnprocessedKeys[tableName]) {
            // Extract unprocessed keys
            const unprocessedKeys = res?.UnprocessedKeys?.MyTable?.Keys?.map((key) => unmarshall(key));
            // Recursive call with unprocessed keys
            // @ts-ignore
            await batchGetItems({items: unprocessedKeys, collectedItems });
        }
    }

    return collectedItems;
};

export const partiQueryHelpers = {
    operators: {
        beginsWith: (value: string, key: string = "sk") => `begins_with("${key}", '${value}')`,
        inList: (values: string[], key: string = "sk") => `${key} IN [${values.map((v) => `'${v}'`).join(",")}]`,
        contains: (property: string, value: string) => `contains(${property}, '${value}')`,
    },
};

const buildPartiQuery = ({
    pk,
    skCondition,
    topFields,
    dataFields,
    whereQuery,
}: IBuildPartiQueryInput): string => {
    const formattedDataFields = dataFields.map((fieldName) => `data.${fieldName}`).join(",");
    const formattedTopFields = topFields.join(",");

    const queryParts = [
        `SELECT ${formattedTopFields}${
            formattedTopFields.length && formattedDataFields.length ? "," : ""
        } ${formattedDataFields}`,
        `FROM "${tableName}"`,
        `WHERE pk = '${pk}' `,
        `AND ${skCondition} `,
        whereQuery && ` ${whereQuery} `,
    ].filter(Boolean); // Filter out empty parts
    return queryParts.join(" ");
};

export const executePartiQuery = async ({
    Statement,
    Parameters,
    NextToken,
    Limit,
}: ExecuteStatementCommandInput): Promise<ExecuteStatementCommandOutput> => {
    return dynamodbGlobalClient.send(
        new ExecuteStatementCommand({
            Statement: Statement,
            Parameters: Parameters?.length ? Parameters : undefined,
            NextToken: NextToken,
            Limit: Limit,
        }),
    );
};

export const runPartiQuery = async ({
    pk,
    skCondition,
    topFields,
    dataFields,
    whereQuery,
    parameters,
    token,
    limit,
}: IPartiQueryInput): Promise<IPaginatedResponseOutput> => {
    const query = buildPartiQuery({ pk, skCondition, topFields, dataFields, whereQuery });
    // @ts-ignore
    parameters = parameters ? marshall(parameters) : undefined;

    const res = await executePartiQuery({
        Statement: query,
        Parameters: parameters,
        NextToken: token || undefined,
        Limit: limit,
    });
    return {
        // @ts-ignore
        items: res.Items?.map((e) => unmarshall(e)) || [],
        itemsCount: res.Items?.length || 0,
        token: res.NextToken,
    };
};

export const runPartiQueryPaginated = async ({
    pk,
    skCondition,
    topFields = ["*"],
    dataFields = [],
    parameters = undefined,
    whereQuery = undefined,
    token = undefined,
    limit = undefined,
    globalCount = 0,
    globalBytes = 0,
}: IPartiQueryPaginatedInput): Promise<IPaginatedResponseOutput> => {
    token = token ? token.replace(/\s/g, "+") : undefined;
    // @ts-ignore
    limit = limit ? parseInt(limit) : undefined;

    const response = await runPartiQuery({
        pk: event.academy.id,
        skCondition,
        topFields,
        dataFields,
        whereQuery: whereQuery,
        parameters: parameters,
        token: token,
        limit: limit,
    });

    let { items, itemsCount } = response;
    const { token: tokenData } = response;

    token = tokenData;
    globalCount += itemsCount;
    globalBytes += Buffer.byteLength(JSON.stringify(items));

    // token check
    if (tokenData) {
        // limit check
        if (!(limit && globalCount >= limit)) {
            // data size check >= 5 MB =  5000000 bytes
            if (globalBytes <= 5000000) {

                const {
                    items: nextItems,
                    itemsCount: nextItemsCount,
                    token: recursiveToken,
                } = await runPartiQueryPaginated({
                    event,
                    skCondition,
                    topFields,
                    dataFields,
                    whereQuery,
                    parameters,
                    token,
                    limit,
                    globalCount,
                });
                itemsCount += nextItemsCount;
                items = [...items, ...nextItems];
                token = recursiveToken;
            } else {
                console.log("DATA SIZE EXCEEDED");
            }
        } else {
            console.log("LIMIT EXCEEDED");
        }
    } else {
        console.log("NO TOKEN");
    }

    return {
        items,
        itemsCount,
        token,
    };
};
