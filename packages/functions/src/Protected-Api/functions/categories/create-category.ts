import { APIGatewayProxyResult } from 'aws-lambda';
import { IAPIGatewayProxyEventWithUserAndBody } from '@kss-backend/core/mainframe/helpers/interfaces/middleware';
import { lambdaHandlerTenantAuth } from '@kss-backend/core/mainframe/core/middy';
import { apiResponse } from '@kss-backend/core/mainframe/helpers/response';
import { UserRolesEnum } from '@kss-backend/core/mainframe/database/interfaces/user';
import createError from 'http-errors';

interface CreateCategoryBody {
    name: string;
    description?: string;
}

const createCategoryHandler = async (event: IAPIGatewayProxyEventWithUserAndBody<CreateCategoryBody>): Promise<APIGatewayProxyResult> => {
    try {
        const { name, description } = event.body;
        const restaurantId = event.pathParameters?.restaurantId;
        const companyId = event.pathParameters?.companyId;
        const tenantModels = event.tenantModels || event.tenantContext?.models;
        if (!name || !restaurantId || !companyId) {
            throw new createError.BadRequest('Missing required fields');
        }
        if (!tenantModels) {
            throw new createError.InternalServerError('Tenant models not available');
        }
        // Check for duplicate category name in restaurant
        const existing = await tenantModels.Category.findOne({ restaurantId, name }).select('_id').lean();
        if (existing) {
            throw new createError.Conflict('Category with same name already exists in this restaurant');
        }
        const newCategory = new tenantModels.Category({
            name,
            description,
            restaurantId,
            isActive: true,
            createdBy: event.user.cognitoSub || event.user.id || 'system'
        });
        const savedCategory = await newCategory.save();
        return apiResponse(201, {
            success: true,
            data: {
                id: savedCategory._id,
                name: savedCategory.name,
                description: savedCategory.description,
                restaurantId: savedCategory.restaurantId,
                createdAt: savedCategory.createdAt
            }
        });
    } catch (error) {
        if (error instanceof createError.HttpError) {
            return apiResponse(error.statusCode, { error: error.message });
        }
        return apiResponse(500, { error: 'Internal server error', message: error instanceof Error ? error.message : 'Unknown error' });
    }
};

export const handler = lambdaHandlerTenantAuth(createCategoryHandler, {
    initMongoDbConnection: true,
    requiredPermissionGroups: [UserRolesEnum.ADMIN, UserRolesEnum.GLOBAL_ADMIN]
});
