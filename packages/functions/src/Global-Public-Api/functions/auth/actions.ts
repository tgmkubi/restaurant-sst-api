import {lambdaHandlerGlobalPublic} from "@kss-backend/core/mainframe/core/middy";
import {apiResponse} from "@kss-backend/core/mainframe/helpers/response"
import {
    initiateAuth
} from "@kss-backend/core/mainframe/helpers/aws/cognito";

export const login = lambdaHandlerGlobalPublic(
    async (event: any) => {

        const { email, password } = event.body;
        const { GLOBAL_COGNITO_USER_POOL_CLIENT_ID } = process.env || {}

        const res = await initiateAuth(GLOBAL_COGNITO_USER_POOL_CLIENT_ID, email, password);

        return apiResponse(200, {
            auth: res
        });
    },
    {
        initMongoDbConnection: false,
    },
);
