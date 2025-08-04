import {lambdaHandlerGlobalPublic} from "@kss-backend/core/mainframe/core/middy";
import {initiateAuth} from "@kss-backend/core/mainframe/helpers/aws/cognito";
import {apiResponse} from "@kss-backend/core/mainframe/helpers/response";
import {AcademyModel} from "@kss-backend/core/mainframe/database/mongodb/models/academy.model";
import createError from "http-errors";

export const getAcademy = lambdaHandlerGlobalPublic(
    async (event: any) => {

        const { domain } = event.pathParameters;
        const academy = AcademyModel.findOne({
            domain
        });
        if (!academy) {
            throw new createError.NotFound(`Academy with domain ${domain} not found`);
        }

        return apiResponse(200, {
            academy
        });
    },
    {
        initMongoDbConnection: true,
    },
);