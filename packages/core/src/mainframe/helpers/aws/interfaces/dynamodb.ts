import { AttributeValue } from "@aws-sdk/client-dynamodb";
import { IDataItems } from "../../interfaces/global";

export interface IPaginatedResponseOutput {
    items: IDataItems | [];
    itemsCount: number;
    token: string | undefined | null;
}

export interface IPartiQueryPaginatedInput {
    pk: string;
    skCondition: string;
    topFields?: string[];
    dataFields?: string[];
    whereQuery?: string | undefined;
    parameters?: AttributeValue[] | undefined;
    token?: string | undefined | null;
    limit?: number | undefined;
    globalCount?: number;
    globalBytes?: number;
}

export interface IPartiQueryInput {
    pk: string;
    skCondition: string;
    topFields: string[];
    dataFields: string[];
    whereQuery?: string | undefined;
    parameters?: AttributeValue[] | undefined;
    token?: string | undefined | null;
    limit?: number | undefined;
}

export interface IBuildPartiQueryInput {
    pk: string;
    skCondition: string;
    topFields: string[];
    dataFields: string[];
    whereQuery?: string | undefined;
}
