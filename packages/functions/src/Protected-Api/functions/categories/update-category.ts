import { APIGatewayProxyResult } from 'aws-lambda';
import { IAPIGatewayProxyEventWithUserAndBody } from '@kss-backend/core/mainframe/helpers/interfaces/middleware';
import { lambdaHandlerTenantAuth } from '@kss-backend/core/mainframe/core/middy';
import { apiResponse } from '@kss-backend/core/mainframe/helpers/response';
import { UserRolesEnum } from '@kss-backend/core/mainframe/database/interfaces/user';
import createError from 'http-errors';

interface UpdateCategoryBody {
    name?: string;
    description?: string;
}

const updateCategoryHandler = async (event: IAPIGatewayProxyEventWithUserAndBody<UpdateCategoryBody>): Promise<APIGatewayProxyResult> => {
    try {
        const categoryId = event.pathParameters?.id;
        const tenantModels = event.tenantModels || event.tenantContext?.models;
        if (!categoryId) {
            throw new createError.BadRequest('Category id is required');
        }
        if (!tenantModels) {
            throw new createError.InternalServerError('Tenant models not available');
        }
        const category = await tenantModels.Category.findById(categoryId);
        if (!category) {
            throw new createError.NotFound('Category not found');
        }
        if (event.body.name) category.name = event.body.name;
        if (event.body.description) category.description = event.body.description;
        category.updatedBy = event.user.cognitoSub || event.user.id || 'system';
        await category.save();
        return apiResponse(200, { success: true, data: {
            id: category._id,
            name: category.name,
            description: category.description,
            restaurantId: category.restaurantId,
            updatedAt: category.updatedAt
        }});
    } catch (error) {
        if (error instanceof createError.HttpError) {
            return apiResponse(error.statusCode, { error: error.message });
        }
        return apiResponse(500, { error: 'Internal server error', message: error instanceof Error ? error.message : 'Unknown error' });
    }
};

export const handler = lambdaHandlerTenantAuth(updateCategoryHandler, {
    initMongoDbConnection: true,
    requiredPermissionGroups: [UserRolesEnum.ADMIN, UserRolesEnum.GLOBAL_ADMIN]
});
