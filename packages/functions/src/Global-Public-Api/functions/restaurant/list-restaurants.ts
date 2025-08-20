import { lambdaHandlerGlobalPublic } from "@kss-backend/core/mainframe/core/middy";
import { apiResponse } from "@kss-backend/core/mainframe/helpers/response";
import createError from "http-errors";
import { IGetRestaurantEvent } from "../../types/restaurant";

export const listRestaurantHandler = async (event: IGetRestaurantEvent) => {
    const { companyId } = event.pathParameters;
    if (!companyId) {
        throw new createError.BadRequest("Company ID is required");
    }
    const companyIdStr = companyId.toString();
    const companyIdOnly = companyIdStr.startsWith('COMPANY_') ? companyIdStr.replace('COMPANY_', '') : companyIdStr;
    const tenantDatabaseName = `COMPANY_${companyIdOnly}`;
    const { getTenantModels } = await import('@kss-backend/core/mainframe/database/mongodb/connect');
    const tenantModels = await getTenantModels(tenantDatabaseName);
    if (!tenantModels) {
        throw new createError.InternalServerError("Tenant models not available");
    }
    const restaurants = await tenantModels.Restaurant.find({ companyId: companyIdOnly, isActive: true }).lean().maxTimeMS(5000);
    if (!restaurants || restaurants.length === 0) {
        throw new createError.NotFound("No active restaurants found");
    }
    return apiResponse(200, { success: true, data: restaurants });
}


export const handler = lambdaHandlerGlobalPublic(listRestaurantHandler, {
    initMongoDbConnection: true,
    isGlobalEndpoint: true
});

