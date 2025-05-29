import {lambdaHandlerAcademyPublic} from "@lms-backend/core/mainframe/core/middy";
import {apiResponse} from "@lms-backend/core/mainframe/helpers/response"
import {
    initiateAuth
} from "@lms-backend/core/mainframe/helpers/aws/cognito";
import {IAPIGatewayProxyEventPublic} from "@lms-backend/core/mainframe/helpers/interfaces/middleware";

export const login = lambdaHandlerAcademyPublic(
    async (event: IAPIGatewayProxyEventPublic) => {

        const { email, password } = event.body;

        const res = await initiateAuth(event.academy.cognitoClientId, email, password);

        return apiResponse(200, {
            auth: res
        });
    },
    {},
);
