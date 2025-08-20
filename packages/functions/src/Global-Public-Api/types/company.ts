import { IAPIGatewayProxyEventPublic } from "@kss-backend/core/mainframe/helpers/interfaces/middleware";

export interface IGetCompanyEvent extends IAPIGatewayProxyEventPublic {
    pathParameters: {
        id: string;
    };
}
