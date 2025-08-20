import { APIGatewayProxyResult } from 'aws-lambda';
import { IAPIGatewayProxyEventWithUser } from "@kss-backend/core/mainframe/helpers/interfaces/middleware";
import { lambdaHandlerGlobalAdmin } from '@kss-backend/core/mainframe/core/middy';
import { UserRolesEnum } from '@kss-backend/core/mainframe/database/interfaces/user';
import { ICompany } from '@kss-backend/core/mainframe/database/interfaces/company';
import { deleteUserPool, deleteUserPoolClient } from "@kss-backend/core/mainframe/helpers/aws/cognito";
import { apiResponse } from "@kss-backend/core/mainframe/helpers/response";
import createError from "http-errors";

const deleteCompanyHandler = async (event: IAPIGatewayProxyEventWithUser): Promise<APIGatewayProxyResult> => {
    try {
        // Check if user has global admin permissions
        if (event.user.role !== UserRolesEnum.GLOBAL_ADMIN) {
            throw createError.Forbidden('Insufficient permissions. Global admin role required.');
        }

        const globalModels = event.globalModels;
        if (!globalModels) {
            throw createError.InternalServerError('Global models not available');
        }

        // Get company ID from path parameters
        const id = event.pathParameters?.id;
        if (!id) {
            throw createError.BadRequest('Company ID is required');
        }

        // Find the company to delete
        const company = await globalModels.Company.findOne({
            _id: id,
            isActive: true
        }) as ICompany | null;

        if (!company) {
            throw createError.NotFound('Company not found or already inactive');
        }

        // Get company details for Cognito cleanup
        const { cognitoUserPoolId, cognitoClientId } = company;

        // Delete Cognito User Pool Client first
        if (cognitoClientId && cognitoUserPoolId) {
            try {
                await deleteUserPoolClient(cognitoUserPoolId, cognitoClientId);
                console.log(`Deleted Cognito User Pool Client: ${cognitoClientId}`);
            } catch (error) {
                console.error('Error deleting Cognito User Pool Client:', error);
                // Continue with deletion even if Cognito cleanup fails
            }
        }

        // Delete Cognito User Pool
        if (cognitoUserPoolId) {
            try {
                await deleteUserPool(cognitoUserPoolId);
                console.log(`Deleted Cognito User Pool: ${cognitoUserPoolId}`);
            } catch (error) {
                console.error('Error deleting Cognito User Pool:', error);
                // Continue with deletion even if Cognito cleanup fails
            }
        }

        // Soft delete: Mark company as inactive instead of hard delete
        // This preserves data integrity and allows for recovery if needed
        const deletedCompany = await globalModels.Company.findByIdAndUpdate(
            id,
            {
                isActive: false,
                updatedBy: event.user.cognitoSub || event.user.id || 'system',
                deletedAt: new Date(),
                deletedBy: event.user.cognitoSub || event.user.id || 'system'
            },
            { new: true }
        ) as ICompany | null;

        // TODO: Consider also cleaning up tenant database
        // This is a complex operation that might require additional logic
        // to handle data migration or backup before deletion

        return apiResponse(200, {
            success: true,
            message: 'Company deleted successfully',
            data: {
                id: (deletedCompany as any)?._id,
                name: deletedCompany?.name,
                displayName: deletedCompany?.displayName,
                isActive: deletedCompany?.isActive,
                deletedAt: (deletedCompany as any)?.deletedAt
            }
        });

    } catch (error) {
        console.error('Error deleting company:', error);

        if (error instanceof createError.HttpError) {
            return apiResponse(error.statusCode, {
                error: error.message
            });
        }

        return apiResponse(500, {
            error: 'Internal server error',
            message: error instanceof Error ? error.message : 'Unknown error'
        });
    }
};

export const handler = lambdaHandlerGlobalAdmin(deleteCompanyHandler, {
    initMongoDbConnection: true,
    isGlobalEndpoint: true,
    requiredPermissionGroups: ['GLOBAL_ADMIN']
});