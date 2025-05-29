import createError from "http-errors";

export const exportModelPropKeyValue = (object: object, prop: any) => {
    // @ts-ignore
    return { [Object.keys(object?.properties).find((key) => object?.properties[key] === prop)]: prop };
};

export const exportModelPropKey = (object: object, prop: any) => {
    // @ts-ignore
    return Object.keys(object?.properties).find((key) => object?.properties[key] === prop);
};

export const unixTimestamp = () => {
    return Math.floor(Date.now() / 1000);
};

export const cognitoAttributesToProperties = (attributes: any) => {
    // @ts-ignore
    return attributes.map((attribute) => {
        return { [attribute.Name]: attribute.Value };
    });
};


export const validateId = (id: string, moduleType: string) => {
    if (id === null || id === undefined || !id.includes(moduleType)) {
        throw createError.BadRequest(`Id is not valid.`);
    }
};


export const promiseResolver = (arr: any, bulkSize = 1000) => {
    const bulks = [];
    for (let i = 0; i < Math.ceil(arr.length / bulkSize); i++) {
        bulks.push(arr.slice(i * bulkSize, (i + 1) * bulkSize));
    }
    return bulks;
};

export const chunkArray = (arr: any, bulkSize = 1000) => {
    const bulks = [];
    for (let i = 0; i < Math.ceil(arr.length / bulkSize); i++) {
        bulks.push(arr.slice(i * bulkSize, (i + 1) * bulkSize));
    }
    return bulks;
};

export const deleteDuplicatesFromArray = <T = any>(list: string[]) => {
    list = list.filter((id) => id);
    const resultArray = list.filter(function (elem: any, pos: any) {
        return list.indexOf(elem) == pos;
    });
    return resultArray as T;
};

export const streamToString = (stream: any): Promise<string> =>
    new Promise((resolve, reject) => {
        const chunks: any[] = [];
        stream.on("data", (chunk: any) => chunks.push(chunk));
        stream.on("error", reject);
        stream.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
    });

export const marshallDataForDynamodbV2 = (obj: any) => {
    // Iterate through each key in the object, convert booleans to 1 or 0, nulls to empty strings
    for (const key in obj) {
        // Check if the value is a boolean
        if (typeof obj[key] === "boolean") {
            // Convert true to 1 and false to 0
            obj[key] = obj[key] ? 1 : 0;
        }

        if (obj[key] === null) {
            obj[key] = "";
        }
        // If the value is an object, recursively call the function
        else if (typeof obj[key] === "object") {
            obj[key] = marshallDataForDynamodbV2(obj[key]);
        }
    }
    return obj;
};

export const sleep = (ms: number) => {
    return new Promise((resolve) => setTimeout(resolve, ms));
};
