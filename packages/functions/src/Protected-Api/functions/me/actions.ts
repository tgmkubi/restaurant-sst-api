import {lambdaHandlerAcademy} from "@lms-backend/core/mainframe/core/middy";
import {apiResponse} from "@lms-backend/core/mainframe/helpers/response";
import {UserModel} from "@lms-backend/core/mainframe/database/mongodb/models/user.model";
import createError from "http-errors";
import {IAPIGatewayProxyEventWithUser} from "@lms-backend/core/mainframe/helpers/interfaces/middleware";


export const getMe = lambdaHandlerAcademy(
    async (event: IAPIGatewayProxyEventWithUser) => {

        const user = await UserModel.findOne({ _id: event.user.id });
        if (!user) {
            throw new createError.NotFound("User not found");
        }

        return apiResponse(200, {
            user,
        });
    },
    {
        initMongoDbConnection: true
    },
);
