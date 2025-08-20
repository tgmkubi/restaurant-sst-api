import { lambdaHandlerGlobalPublic } from "@kss-backend/core/mainframe/core/middy";
import { apiResponse } from "@kss-backend/core/mainframe/helpers/response";
import createError from "http-errors";
import { IGetRestaurantEvent } from "../../types/restaurant";

export const getRestaurantHandler = async (event: IGetRestaurantEvent) => {
    const { id, companyId } = event.pathParameters;
    if (!id || !companyId) {
        throw new createError.BadRequest("Restaurant ID and Company ID are required");
    }
    const companyIdStr = companyId.toString();
    const companyIdOnly = companyIdStr.startsWith('COMPANY_') ? companyIdStr.replace('COMPANY_', '') : companyIdStr;
    const tenantDatabaseName = `COMPANY_${companyIdOnly}`;
    const { getTenantModels } = await import('@kss-backend/core/mainframe/database/mongodb/connect');
    const tenantModels = await getTenantModels(tenantDatabaseName);
    if (!tenantModels) {
        throw new createError.InternalServerError("Tenant models not available");
    }
    const restaurant = await tenantModels.Restaurant.findOne({ _id: id, companyId: companyIdOnly, isActive: true }).lean().maxTimeMS(5000);
    if (!restaurant) {
        throw new createError.NotFound("Restaurant not found");
    }
    return apiResponse(200, { success: true, data: restaurant });
}


export const handler = lambdaHandlerGlobalPublic(getRestaurantHandler, {
    initMongoDbConnection: true,
    isGlobalEndpoint: true
});

