import { APIGatewayClient, GetApiKeysCommand } from "@aws-sdk/client-api-gateway";
import { ApiGatewayManagementApiClient, PostToConnectionCommand } from "@aws-sdk/client-apigatewaymanagementapi"; // ES Modules import
import { ApiGatewayV2Client, GetApisCommand, ResetAuthorizersCacheCommand } from "@aws-sdk/client-apigatewayv2";

const agmClient = new ApiGatewayManagementApiClient({
    endpoint: `https://ws.${process.env.DOMAIN}/${process.env.STAGE}`,
});

const agClient = new APIGatewayClient({ region: process.env.SERVICE_REGION });
const agV2Client = new ApiGatewayV2Client({ region: process.env.SERVICE_REGION });

export const postToConnection = async (connectionId: string, strPayload: string) => {
    const command = new PostToConnectionCommand({
        ConnectionId: connectionId,
        Data: strPayload,
    });
    return await agmClient.send(command);
};

export const getApikeys = async (nameQuery?: string | undefined) => {
    const command = new GetApiKeysCommand({
        nameQuery: nameQuery,
        includeValues: true,
    });
    return await agClient.send(command);
};

export const getApis = async () => {
    const command = new GetApisCommand({});
    return await agV2Client.send(command);
};

export const resetAuthorizersCache = async (apiId: string | undefined) => {
    const command = new ResetAuthorizersCacheCommand({
        ApiId: apiId,
        StageName: `$default`,
    });
    return await agV2Client.send(command);
};
