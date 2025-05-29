import middy from "@middy/core";
import { APIGatewayProxyResult } from "aws-lambda";
import {
    IAPIGatewayProxyEventWithUser,
    IMongoDbMiddlewareOptions
} from "../helpers/interfaces/middleware";
import {closeMongodbConnection, getMongodbConnection} from "../database/mongodb/connect";

const defaults = {};

const mongoDbMiddleware = (opts: IMongoDbMiddlewareOptions) => {
    const options = { ...defaults, ...opts };
    const { initMongoDbConnection } = options;

    const mongodbMiddlewareBefore: middy.MiddlewareFn<IAPIGatewayProxyEventWithUser, APIGatewayProxyResult> = async (
        request: any,
    ) => {
        const { event } = request;

        console.log("mongodbMiddleware EVENT", event)

        console.log("initMongoDbConnection", initMongoDbConnection)
        if (initMongoDbConnection) {
            await getMongodbConnection(event?.user?.academyId);
        }
    };

    const mongodbMiddlewareAfter: middy.MiddlewareFn<IAPIGatewayProxyEventWithUser, APIGatewayProxyResult> = async (
        request,
    ) => {
        const { response } = request;

        if (initMongoDbConnection) {
            await closeMongodbConnection();
        }
        request.response = response;
    };

    const mongodbMiddlewareOnError: middy.MiddlewareFn<IAPIGatewayProxyEventWithUser, APIGatewayProxyResult> = (
        request,
    ) => {
        if (request.response === undefined) return;
        return mongodbMiddlewareAfter(request);
    };

    return {
        before: mongodbMiddlewareBefore,
        after: mongodbMiddlewareAfter,
        onError: mongodbMiddlewareOnError,
    };
};

export default mongoDbMiddleware;
