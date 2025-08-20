import { lambdaHandlerGlobalPublic } from "@kss-backend/core/mainframe/core/middy";
import { apiResponse } from "@kss-backend/core/mainframe/helpers/response";
import createError from "http-errors";
import { IGetCompanyEvent } from "../../types/company";

export const getCompanyHandler = async (event: IGetCompanyEvent) => {
        if (!event.globalModels) {
            throw new createError.InternalServerError("Global models not available");
        }

        const { id } = event.pathParameters;

        const company = await event.globalModels.Company.findOne({ _id: id });
        if (!company) {
            throw new createError.NotFound("Company Not found");
        }

        return apiResponse(200, {
            company,
        });
}


export const handler = lambdaHandlerGlobalPublic(getCompanyHandler, {
    initMongoDbConnection: true,
    isGlobalEndpoint: true
});

