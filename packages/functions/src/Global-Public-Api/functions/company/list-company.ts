import { lambdaHandlerGlobalPublic } from "@kss-backend/core/mainframe/core/middy";
import { apiResponse } from "@kss-backend/core/mainframe/helpers/response";
import createError from "http-errors";

export const listCompanyHandler = async (event: any) => {
        if (!event.globalModels) {
            throw new createError.InternalServerError("Global models not available");
        }

        const companies = await event.globalModels.Company.find({});

        return apiResponse(200, {
            companies
        });
}

export const handler = lambdaHandlerGlobalPublic(listCompanyHandler, {
    initMongoDbConnection: true,
    isGlobalEndpoint: true
});
