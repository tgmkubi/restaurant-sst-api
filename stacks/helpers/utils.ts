

export const parseCamelCaseFunctionName = (functionName: string) => {
    // Use a regular expression to split camelCase into words
    return functionName.split(/(?=[A-Z])/);
};

export const apiFnBuilder = (
    {
        stage,
        apiName,
        handler,
        environment = {},
        permissions= [],
        timeout = undefined,
        runtime= undefined,
        nodejs = undefined,
    }: {
        stage: any,
        apiName: string
        handler: any,
        environment?: any,
        permissions?: string[],
        timeout?: number | undefined,
        runtime?: string | undefined,
        nodejs?: any,
    }
) => {
    // "/events/actions.getMeProfile" ---> "Me-Get-Profile"
    const handlerSplit = handler.split("/");
    const functionName = handlerSplit.pop().split(".").pop();
    const moduleName = handlerSplit[handlerSplit.length - 1];

    const fnNameParts = functionName.split(/(?=[A-Z])/);
    const methodName = fnNameParts[0].charAt(0).toUpperCase() + fnNameParts[0].slice(1);
    fnNameParts[0] = fnNameParts[1];
    fnNameParts[1] = methodName;
    const lambdaFunctionName = fnNameParts.join("-");

    const functionObj: any = {
        handler: handler,
        functionName: `ivp-${stage}-${apiName}-${moduleName}-${lambdaFunctionName}`,
        environment: {},
        permissions: [],
    };
    if (environment) {
        functionObj.environment = environment;
    }
    if (permissions) {
        functionObj.permissions = permissions;
    }
    if (timeout) {
        functionObj.timeout = timeout;
    }
    if (runtime) {
        functionObj.runtime = runtime;
    }
    if (nodejs) {
        functionObj.nodejs = nodejs;
    }

    return {
        function: functionObj,
    };
};


export const defaultFunctionNodeEsBuild = {
    esbuild: {
        loader: {
            ".node": "text",
        },
    },
};
