import { APIGatewayEventRequestContextLambdaAuthorizer } from "aws-lambda";
import {IUser} from "../../database/interfaces/user";
import {IAcademy} from "../../database/interfaces/academy";

export type IPermissionGroups = {
    requiredPermissionGroups: string[] | undefined;
};
export type IInitMongoDbConnection = {
    initMongoDbConnection: boolean;
};


export interface IAuthMiddlewareOptions extends IPermissionGroups {}
export interface IMongoDbMiddlewareOptions extends IInitMongoDbConnection {}

interface ILambdaContext {
    user: IUser;
    academy: IAcademy;
}

interface IAPIGatewayEventRequestContextLambdaAuthorizer
    extends APIGatewayEventRequestContextLambdaAuthorizer<ILambdaContext> {}

export interface IAPIGatewayProxyEventWithUser extends IAPIGatewayEventRequestContextLambdaAuthorizer {
    academy: IAcademy;
    user: IUser;
}

export interface IAPIGatewayProxyEventWithUserAndBody<TBody = object> extends IAPIGatewayProxyEventWithUser {
    body: TBody;
}
