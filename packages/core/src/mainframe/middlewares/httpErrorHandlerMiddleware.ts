import { isHttpError } from "http-errors";

const errorResponse = (name: string, statusCode: number, detail: any) => {
    return {
        headers: { "Content-Type": "application/json" },
        statusCode,
        body: JSON.stringify({ error: detail ? detail : name }),
    };
};

const httpErrorHandlerMiddleware = () => {
    const httpErrorHandlerMiddlewareOnError = (request: any) => {
        // Error Messages can override here
        if (isHttpError(request.error)) {
            console.log(request.error);

            if (request.error.cause) {
                const causes = request.error.cause.data.map((err: any) => `${err.instancePath} ${err.message}`);
                return errorResponse(request.error.name, request.error.statusCode, {
                    message: request.error.message,
                    causes,
                });
            }
            return errorResponse(request.error.name, request.error.statusCode, { message: request.error.message });
        }
        return;
    };

    return {
        onError: httpErrorHandlerMiddlewareOnError,
    };
};

export default httpErrorHandlerMiddleware;
