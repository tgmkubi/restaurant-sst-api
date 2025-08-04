import {lambdaHandlerGlobalPublic} from "@kss-backend/core/mainframe/core/middy";
import {apiResponse} from "@kss-backend/core/mainframe/helpers/response"
import {
    initiateAuth
} from "@kss-backend/core/mainframe/helpers/aws/cognito";
import {IAPIGatewayProxyEventPublic} from "@kss-backend/core/mainframe/helpers/interfaces/middleware";

export const login = lambdaHandlerGlobalPublic(
    async (event: IAPIGatewayProxyEventPublic) => {

        const { email, password } = event.body;

        const res = await initiateAuth(event.academy.cognitoClientId, email, password);

        return apiResponse(200, {
            auth: res
        });
    },
    {},
);
