import middy from "@middy/core";
import { APIGatewayProxyResult } from "aws-lambda";
import {IAPIGatewayProxyEvent} from "../helpers/interfaces/middleware";

const defaults = {};

const authMiddlewarePublic = () => {
    const options = { ...defaults };
    const { } = options;

    const authMiddlewarePublicBefore: middy.MiddlewareFn<IAPIGatewayProxyEvent, APIGatewayProxyResult> = async (
        request: any,
    ) => {
        const { event } = request;

        // LAMBDA AUTHORIZER
        if (event.requestContext.authorizer?.lambda) {
            const { academy } = event.requestContext.authorizer.lambda;

            event.academy = academy ? JSON.parse(academy) : undefined;
        }

    };

    const authMiddlewarePublicAfter: middy.MiddlewareFn<IAPIGatewayProxyEvent, APIGatewayProxyResult> = (
        request,
    ) => {
        const { response } = request;

        request.response = response;
    };

    const authMiddlewarePublicOnError: middy.MiddlewareFn<IAPIGatewayProxyEvent, APIGatewayProxyResult> = (
        request,
    ) => {
        if (request.response === undefined) return;
        return authMiddlewarePublicAfter(request);
    };

    return {
        before: authMiddlewarePublicBefore,
        after: authMiddlewarePublicAfter,
        onError: authMiddlewarePublicOnError,
    };
};

export default authMiddlewarePublic;
