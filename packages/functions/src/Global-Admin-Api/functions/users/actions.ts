import {lambdaHandlerGlobalAdmin} from "@lms-backend/core/mainframe/core/middy";
import {apiResponse} from "@lms-backend/core/mainframe/helpers/response";
import {adminCreateUser, adminDeleteUser} from "@lms-backend/core/mainframe/helpers/aws/cognito";
import {createGlobalAdminUserValidator} from "./validators";
import {UserModel} from "@lms-backend/core/mainframe/database/mongodb/models/user.model";
import {moduleTypes} from "../../../../../../stacks/helpers/stackConstants";
import createError from "http-errors";
import {UserRolesEnum} from "@lms-backend/core/mainframe/database/interfaces/user";

export const createUser = lambdaHandlerGlobalAdmin(
    async (event: any) => {
        const { email, firstName, lastName } = event.body;


        const resCognito = await adminCreateUser(
            process.env.GLOBAL_COGNITO_USER_POOL_ID,
            email,
            [
                {
                    Name: "email",
                    Value: email,
                },
                {
                    Name: "given_name",
                    Value: firstName,
                },
                {
                    Name: "family_name",
                    Value: lastName,
                },
                {
                    Name: "custom:academyId",
                    Value: moduleTypes.GLOBAL
                }
            ]
        );
        const cognitoSub = resCognito?.User?.Attributes?.find(attr => attr.Name === 'sub')?.Value || undefined;
        let dbUser = undefined;

        if (cognitoSub) {
            dbUser = await UserModel.create({
                cognitoSub: cognitoSub,
                cognitoUsername: resCognito.User?.Username,
                email,
                firstName,
                lastName,
                role: UserRolesEnum.GLOBAL_ADMIN,
                academyId: moduleTypes.GLOBAL,
                createdBy: event.user.id
            })
        } else {
            throw new createError.InternalServerError("Failed to create user in Cognito");
        }

        return apiResponse(200, {
            user: dbUser,
        });
    },
    {
        requestValidator: createGlobalAdminUserValidator,
        requiredPermissionGroups: [UserRolesEnum.GLOBAL_ADMIN],
        initMongoDbConnection: true
    },
);

export const listUsers = lambdaHandlerGlobalAdmin(
    async (event: any) => {

            const users = await UserModel.find({
                role: UserRolesEnum.GLOBAL_ADMIN
            })

            return apiResponse(200, {
                users: users
            });
    },{
        requiredPermissionGroups: [UserRolesEnum.GLOBAL_ADMIN],
        initMongoDbConnection: true
    },
);

export const getUser = lambdaHandlerGlobalAdmin(
    async (event: any) => {
        const { id } = event.pathParameters;

        const user = await UserModel.findOne({ _id: id, role: UserRolesEnum.GLOBAL_ADMIN });
        if (!user) {
            throw new createError.NotFound("User not found");
        }

        return apiResponse(200, {
            user,
        });
    },
    {
        requiredPermissionGroups: [UserRolesEnum.GLOBAL_ADMIN],
        initMongoDbConnection: true
    },
);

export const deleteUser = lambdaHandlerGlobalAdmin(
    async (event: any) => {
        const { id } = event.pathParameters;

        const user = await UserModel.findOneAndDelete({ _id: id, role: UserRolesEnum.GLOBAL_ADMIN });
        if (!user) {
            throw new createError.NotFound("User not found");
        }
        console.log(user)

        await adminDeleteUser(process.env.GLOBAL_COGNITO_USER_POOL_ID, user.cognitoUsername);
        await user.deleteOne();

        return apiResponse(200, {
            message: "User deleted successfully",
        });
    },
    {
        requiredPermissionGroups: [UserRolesEnum.GLOBAL_ADMIN],
        initMongoDbConnection: true
    },
);