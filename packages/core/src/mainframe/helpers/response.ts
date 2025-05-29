export const apiResponse = (statusCode: number, payload: any) => {
    return {
        statusCode: statusCode,
        headers: {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
        },
        body: JSON.stringify({
            statusCode: statusCode,
            payload: payload,
        }),
    };
};
