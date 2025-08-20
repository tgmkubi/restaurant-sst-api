import { IAPIGatewayProxyEventPublic } from "@kss-backend/core/mainframe/helpers/interfaces/middleware";

export interface IGetRestaurantEvent extends IAPIGatewayProxyEventPublic {
    pathParameters: {
        companyId: string;
        id: string;
    };
    globalModels?: {
        Company: any;
        User: any;
        Restaurant: any;
    };
}
