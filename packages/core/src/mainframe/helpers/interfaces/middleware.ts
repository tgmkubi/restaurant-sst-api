import { APIGatewayEventRequestContextLambdaAuthorizer, APIGatewayProxyEvent } from "aws-lambda";
import { IUser } from "../../database/interfaces/user";
import { Model } from "mongoose";
import { ICompany } from "../../database/interfaces/company";

export type IPermissionGroups = {
    requiredPermissionGroups: string[] | undefined;
};
export type IInitMongoDbConnection = {
    initMongoDbConnection: boolean;
};


export interface IAuthMiddlewareOptions extends IPermissionGroups { }
export interface IMongoDbMiddlewareOptions extends IInitMongoDbConnection {
    isGlobalEndpoint?: boolean;
    isTenantEndpoint?: boolean;
}

interface ILambdaContext {
    user: IUser;
    company: ICompany;
}

interface IAPIGatewayEventRequestContextLambdaAuthorizer
    extends APIGatewayEventRequestContextLambdaAuthorizer<ILambdaContext> { }

export interface IAPIGatewayProxyEventPublic extends APIGatewayProxyEvent {
    // academy?: IAcademyData;
    globalModels?: {
        Company: Model<ICompany>;
        User: Model<IUser>;
    };
    tenantModels?: any;
    tenantContext?: {
        companyId: string;
        databaseName: string;
        subdomain: string;
        company: any;
        models: any;
    };
}

export interface IAPIGatewayProxyEventWithUser extends IAPIGatewayEventRequestContextLambdaAuthorizer {
    user: IUser;
    globalModels?: {
        Company: Model<ICompany>;
        User: Model<IUser>;
    };
    tenantModels?: any;
    tenantContext?: {
        companyId: string;
        databaseName: string;
        subdomain: string;
        company: any;
        models: any;
    };
    pathParameters: { [name: string]: string } | null;
    queryStringParameters: { [name: string]: string } | null;
}

export interface IAPIGatewayProxyEvent extends IAPIGatewayEventRequestContextLambdaAuthorizer {
    company: ICompany;
}

export interface IAPIGatewayProxyEventWithUserAndBody<TBody = object> extends IAPIGatewayProxyEventWithUser {
    body: TBody;
}
