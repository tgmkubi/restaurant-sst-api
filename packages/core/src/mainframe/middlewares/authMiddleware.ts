import middy from "@middy/core";
import { APIGatewayProxyResult } from "aws-lambda";
import createError from "http-errors";
import {IAPIGatewayProxyEventWithUser, IAuthMiddlewareOptions} from "../helpers/interfaces/middleware";

const defaults = {};

const authMiddleware = (opts: IAuthMiddlewareOptions) => {
    const options = { ...defaults, ...opts };
    const { requiredPermissionGroups } = options;

    const authMiddlewareBefore: middy.MiddlewareFn<IAPIGatewayProxyEventWithUser, APIGatewayProxyResult> = async (
        request: any,
    ) => {
        const { event } = request;

        // LAMBDA AUTHORIZER
        if (event.requestContext.authorizer?.lambda) {
            const { user, academy } = event.requestContext.authorizer.lambda;

            event.user = JSON.parse(user);
            event.academy = academy ? JSON.parse(academy) : undefined;
        }

        if (requiredPermissionGroups) {
            if (!requiredPermissionGroups.includes(event.user.role)) {
                throw createError.Forbidden(`User does not have permission to perform this action`);
            }
        }
    };

    const authMiddlewareAfter: middy.MiddlewareFn<IAPIGatewayProxyEventWithUser, APIGatewayProxyResult> = (
        request,
    ) => {
        const { response } = request;

        request.response = response;
    };

    const authMiddlewareOnError: middy.MiddlewareFn<IAPIGatewayProxyEventWithUser, APIGatewayProxyResult> = (
        request,
    ) => {
        if (request.response === undefined) return;
        return authMiddlewareAfter(request);
    };

    return {
        before: authMiddlewareBefore,
        after: authMiddlewareAfter,
        onError: authMiddlewareOnError,
    };
};

export default authMiddleware;
