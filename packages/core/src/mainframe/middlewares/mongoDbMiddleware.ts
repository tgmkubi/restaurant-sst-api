import middy from "@middy/core";
import { APIGatewayProxyResult } from "aws-lambda";
import {
    IAPIGatewayProxyEventWithUser,
    IMongoDbMiddlewareOptions
} from "../helpers/interfaces/middleware";
import { closeMongodbConnection, getMongodbConnection, getGlobalModels, getTenantModels } from "../database/mongodb/connect";
import { moduleTypes } from "../../../../../stacks/helpers/stackConstants";

const defaults = {};

const mongoDbMiddleware = (opts: IMongoDbMiddlewareOptions) => {
    const options = { ...defaults, ...opts };
    const { initMongoDbConnection, isGlobalEndpoint, isTenantEndpoint } = options;

    const mongodbMiddlewareBefore: middy.MiddlewareFn<IAPIGatewayProxyEventWithUser, APIGatewayProxyResult> = async (
        request: any,
    ) => {
        const { event } = request;

        console.log("mongodbMiddleware EVENT", event);
        console.log("initMongoDbConnection", initMongoDbConnection);

        if (initMongoDbConnection) {
            if (isGlobalEndpoint) {
                // Global endpoint - connect to global database
                await getMongodbConnection(moduleTypes.GLOBAL);
                const globalModels = await getGlobalModels();
                event.globalModels = globalModels;

            } else if (isTenantEndpoint) {
                // Prefer companyId from pathParameters if present
                let companyId = event?.pathParameters?.companyId;
                let company;
                // Sadece company lookup için global connection/model aç
                const { Company } = await getGlobalModels();

                if (companyId) {
                    // Remove any prefix (e.g., COMPANY_) if present
                    if (companyId.startsWith('COMPANY_')) {
                        companyId = companyId.replace('COMPANY_', '');
                    }
                    company = await Company.findOne({ _id: companyId, isActive: true });
                } else {
                    // Fallback to subdomain extraction
                    const host = event.headers.Host || event.headers.host;
                    if (host) {
                        const subdomain = host.split('.')[0];
                        company = await Company.findOne({ subdomain: subdomain, isActive: true });
                    }
                }

                if (company) {
                    // Connect to tenant database using COMPANY_{company._id} format
                    const databaseName = `COMPANY_${String(company._id)}`;
                    await getMongodbConnection(databaseName);
                    const tenantModels = await getTenantModels(databaseName);

                    // Add tenant context to event
                    event.tenantContext = {
                        companyId: String(company._id),
                        databaseName: databaseName,
                        subdomain: company.subdomain,
                        company: company,
                        models: tenantModels
                    };
                } else {
                    throw new Error(`Company not found for companyId or subdomain.`);
                }
            } else {
                // Default behavior - use user's companyId or global
                const databaseName = event?.user?.companyId || moduleTypes.GLOBAL;
                await getMongodbConnection(databaseName);

                if (databaseName === moduleTypes.GLOBAL) {
                    const globalModels = await getGlobalModels();
                    event.globalModels = globalModels;
                } else {
                    const tenantModels = await getTenantModels(databaseName);
                    event.tenantModels = tenantModels;
                }
            }
        }
    };

    const mongodbMiddlewareAfter: middy.MiddlewareFn<IAPIGatewayProxyEventWithUser, APIGatewayProxyResult> = async (
        request,
    ) => {
        const { response } = request;

        // Note: We don't close connections here as they are cached and reused
        // Connections will be closed when Lambda container is destroyed

        request.response = response;
    };

    const mongodbMiddlewareOnError: middy.MiddlewareFn<IAPIGatewayProxyEventWithUser, APIGatewayProxyResult> = (
        request,
    ) => {
        if (request.response === undefined) return;
        return mongodbMiddlewareAfter(request);
    };

    return {
        before: mongodbMiddlewareBefore,
        after: mongodbMiddlewareAfter,
        onError: mongodbMiddlewareOnError,
    };
};

export default mongoDbMiddleware;
