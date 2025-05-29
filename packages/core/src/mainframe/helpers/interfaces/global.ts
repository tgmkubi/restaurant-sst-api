export interface IDataItem<T = any> {
    createdAt: string;
    createdBy: string;
    updatedAt: string;
    updatedBy?: string;
    deletedAt?: string;
    deletedBy?: string;
}

export interface IDataItems extends Array<IDataItem> {}

type SchemaType<T> = T extends string
    ? { type: "string"; minLength?: number; maxLength?: number }
    : T extends number
    ? { type: "number"; minimum?: number; maximum?: number }
    : T extends boolean
    ? { type: "boolean"; default?: boolean }
    : T extends Array<infer U>
    ? { type: "array"; items?: SchemaType<U> }
    : T extends { [key: string]: any }
    ? { type: "object"; properties?: { [K in keyof T]: SchemaType<T[K]> }; required?: (keyof T)[] }
    : never;

export interface IDataModel<T> {
    properties: { [K in keyof T]: SchemaType<T[K]> };
    required?: (keyof T)[];
}

export interface INormalisedDataInput<T = any> {
    event: any;
    id?: string | undefined;
    dataItem?: T | IDataItem | undefined;
}
