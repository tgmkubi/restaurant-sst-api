import middy from "@middy/core";
import httpContentEncodingMiddleware from "@middy/http-content-encoding";
import httpCorsMiddleware from "@middy/http-cors";

import httpEventNormalizerMiddleware from "@middy/http-event-normalizer";
import httpHeaderNormalizerMiddleware from "@middy/http-header-normalizer";
import httpJsonBodyParserMiddleware from "@middy/http-json-body-parser";
import httpMultipartBodyParserMiddleware from "@middy/http-multipart-body-parser";
import httpPartialResponseMiddleware from "@middy/http-partial-response";
import httpResponseSerializerMiddleware from "@middy/http-response-serializer";
import httpSecurityHeadersMiddleware from "@middy/http-security-headers";
import httpUrlencodeBodyParserMiddleware from "@middy/http-urlencode-body-parser";
import httpUrlencodePathParametersParserMiddleware from "@middy/http-urlencode-path-parser";
import validator from "@middy/validator";
import { transpileSchema } from "@middy/validator/transpile";
import { Handler } from "aws-lambda";

import authMiddleware from "../middlewares/authMiddleware.js";
import httpErrorHandlerMiddleware from "../middlewares/httpErrorHandlerMiddleware";
import mongoDbMiddleware from "../middlewares/mongoDbMiddleware";

interface LambdaOptions {
    requestValidator?: object;
    requiredPermissionGroups?: PermissionGroups["requiredPermissionGroups"];
    requiredLicences?: string[];
    initMongoDbConnection?: boolean;
    isGlobalEndpoint?: boolean;
    isTenantEndpoint?: boolean;
}

export type PermissionGroups = {
    requiredPermissionGroups: string[] | undefined;
};

export const lambdaHandlerGlobalAdmin = (handler: Handler, opts?: LambdaOptions) => {
    let requestValidator, requiredPermissionGroups, requiredLicences, initMongoDbConnection, isGlobalEndpoint;
    if (opts && opts.requestValidator) {
        requestValidator = opts.requestValidator;
    } else {
        requestValidator = {};
    }

    if (opts && opts.requiredPermissionGroups) {
        requiredPermissionGroups = opts.requiredPermissionGroups;
    }
    if (opts && opts.initMongoDbConnection) {
        initMongoDbConnection = opts.initMongoDbConnection;
    }
    if (opts && opts.isGlobalEndpoint) {
        isGlobalEndpoint = opts.isGlobalEndpoint;
    }

    return middy(handler)
        .use(httpEventNormalizerMiddleware())
        .use(httpHeaderNormalizerMiddleware())
        .use(httpUrlencodePathParametersParserMiddleware())
        .use(
            httpUrlencodeBodyParserMiddleware({
                disableContentTypeError: true,
            }),
        )
        .use(
            httpJsonBodyParserMiddleware({
                disableContentTypeError: true,
            }),
        )
        .use(
            httpMultipartBodyParserMiddleware({
                disableContentTypeError: true,
            }),
        )
        .use(httpSecurityHeadersMiddleware())
        .use(httpCorsMiddleware())
        .use(httpContentEncodingMiddleware())
        .use(
            httpResponseSerializerMiddleware({
                serializers: [
                    {
                        regex: /^application\/json$/,
                        serializer: ({ body }) => JSON.stringify(body),
                    },
                ],
            }),
        )
        .use(httpPartialResponseMiddleware())
        .use(
            validator({
                eventSchema: transpileSchema(requestValidator),
            }),
        )
        .use(httpErrorHandlerMiddleware())
        .use(
            authMiddleware({
                requiredPermissionGroups,
            }),
        )
        .use(
            mongoDbMiddleware({
                initMongoDbConnection: !!initMongoDbConnection,
                isGlobalEndpoint: !!isGlobalEndpoint,
            })
        )

};

export const lambdaHandlerGlobalPublic = (handler: Handler, opts: LambdaOptions) => {
    let { requestValidator, initMongoDbConnection, isGlobalEndpoint } = opts || {};

    requestValidator = requestValidator || {};

    // causing 415 error
    //     .use(httpUrlencodeBodyParserMiddleware())
    //     .use(httpJsonBodyParserMiddleware())
    //     .use(httpMultipartBodyParserMiddleware())

    return middy(handler)
        .use(httpEventNormalizerMiddleware())
        .use(httpHeaderNormalizerMiddleware())
        .use(httpUrlencodePathParametersParserMiddleware())
        .use(
            httpUrlencodeBodyParserMiddleware({
                disableContentTypeError: true,
            }),
        )
        .use(
            httpJsonBodyParserMiddleware({
                disableContentTypeError: true,
            }),
        )
        .use(
            httpMultipartBodyParserMiddleware({
                disableContentTypeError: true,
            }),
        )
        .use(httpSecurityHeadersMiddleware())
        .use(httpCorsMiddleware())
        .use(httpContentEncodingMiddleware())
        .use(
            httpResponseSerializerMiddleware({
                serializers: [
                    {
                        regex: /^application\/json$/,
                        serializer: ({ body }) => JSON.stringify(body),
                    },
                ],
            }),
        )
        .use(httpPartialResponseMiddleware())
        .use(
            validator({
                eventSchema: transpileSchema(requestValidator),
            }),
        )
        .use(httpErrorHandlerMiddleware())
        .use(
            mongoDbMiddleware({
                initMongoDbConnection: !!initMongoDbConnection,
                isGlobalEndpoint: !!isGlobalEndpoint,
            })
        )
};

// New handler for tenant-specific endpoints (public access)
export const lambdaHandlerTenantPublic = (handler: Handler, opts?: LambdaOptions) => {
    let { requestValidator, initMongoDbConnection } = opts || {};

    requestValidator = requestValidator || {};

    return middy(handler)
        .use(httpEventNormalizerMiddleware())
        .use(httpHeaderNormalizerMiddleware())
        .use(httpUrlencodePathParametersParserMiddleware())
        .use(
            httpUrlencodeBodyParserMiddleware({
                disableContentTypeError: true,
            }),
        )
        .use(
            httpJsonBodyParserMiddleware({
                disableContentTypeError: true,
            }),
        )
        .use(
            httpMultipartBodyParserMiddleware({
                disableContentTypeError: true,
            }),
        )
        .use(httpSecurityHeadersMiddleware())
        .use(httpCorsMiddleware())
        .use(httpContentEncodingMiddleware())
        .use(
            httpResponseSerializerMiddleware({
                serializers: [
                    {
                        regex: /^application\/json$/,
                        serializer: ({ body }) => JSON.stringify(body),
                    },
                ],
            }),
        )
        .use(httpPartialResponseMiddleware())
        .use(
            validator({
                eventSchema: transpileSchema(requestValidator),
            }),
        )
        .use(httpErrorHandlerMiddleware())
        .use(
            mongoDbMiddleware({
                initMongoDbConnection: !!initMongoDbConnection,
                isTenantEndpoint: true,
            })
        )
};

// New handler for tenant-specific endpoints (authenticated)
export const lambdaHandlerTenantAuth = (handler: Handler, opts?: LambdaOptions) => {
    let requestValidator, requiredPermissionGroups, initMongoDbConnection;
    if (opts && opts.requestValidator) {
        requestValidator = opts.requestValidator;
    } else {
        requestValidator = {};
    }

    if (opts && opts.requiredPermissionGroups) {
        requiredPermissionGroups = opts.requiredPermissionGroups;
    }
    if (opts && opts.initMongoDbConnection) {
        initMongoDbConnection = opts.initMongoDbConnection;
    }

    return middy(handler)
        .use(httpEventNormalizerMiddleware())
        .use(httpHeaderNormalizerMiddleware())
        .use(httpUrlencodePathParametersParserMiddleware())
        .use(
            httpUrlencodeBodyParserMiddleware({
                disableContentTypeError: true,
            }),
        )
        .use(
            httpJsonBodyParserMiddleware({
                disableContentTypeError: true,
            }),
        )
        .use(
            httpMultipartBodyParserMiddleware({
                disableContentTypeError: true,
            }),
        )
        .use(httpSecurityHeadersMiddleware())
        .use(httpCorsMiddleware())
        .use(httpContentEncodingMiddleware())
        .use(
            httpResponseSerializerMiddleware({
                serializers: [
                    {
                        regex: /^application\/json$/,
                        serializer: ({ body }) => JSON.stringify(body),
                    },
                ],
            }),
        )
        .use(httpPartialResponseMiddleware())
        .use(
            validator({
                eventSchema: transpileSchema(requestValidator),
            }),
        )
        .use(httpErrorHandlerMiddleware())
        .use(
            authMiddleware({
                requiredPermissionGroups,
            }),
        )
        .use(
            mongoDbMiddleware({
                initMongoDbConnection: !!initMongoDbConnection,
                isTenantEndpoint: true,
            })
        )
};

export const lambdaHandlerAcademy = (handler: Handler, opts?: LambdaOptions) => {
    let requestValidator, requiredPermissionGroups, requiredLicences, initMongoDbConnection;
    if (opts && opts.requestValidator) {
        requestValidator = opts.requestValidator;
    } else {
        requestValidator = {};
    }

    if (opts && opts.requiredPermissionGroups) {
        requiredPermissionGroups = opts.requiredPermissionGroups;
    }
    if (opts && opts.initMongoDbConnection) {
        initMongoDbConnection = opts.initMongoDbConnection;
    }


    return middy(handler)
        .use(httpEventNormalizerMiddleware())
        .use(httpHeaderNormalizerMiddleware())
        .use(httpUrlencodePathParametersParserMiddleware())
        .use(
            httpUrlencodeBodyParserMiddleware({
                disableContentTypeError: true,
            }),
        )
        .use(
            httpJsonBodyParserMiddleware({
                disableContentTypeError: true,
            }),
        )
        .use(
            httpMultipartBodyParserMiddleware({
                disableContentTypeError: true,
            }),
        )
        .use(httpSecurityHeadersMiddleware())
        .use(httpCorsMiddleware())
        .use(httpContentEncodingMiddleware())
        .use(
            httpResponseSerializerMiddleware({
                serializers: [
                    {
                        regex: /^application\/json$/,
                        serializer: ({ body }) => JSON.stringify(body),
                    },
                ],
            }),
        )
        .use(httpPartialResponseMiddleware())
        .use(
            validator({
                eventSchema: transpileSchema(requestValidator),
            }),
        )
        .use(httpErrorHandlerMiddleware())
        .use(
            authMiddleware({
                requiredPermissionGroups,
            }),
        )
        .use(
            mongoDbMiddleware({
                initMongoDbConnection: !!initMongoDbConnection,
            })
        )

};