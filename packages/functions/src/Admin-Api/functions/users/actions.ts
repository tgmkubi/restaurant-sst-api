import {lambdaHandlerAcademy} from "@lms-backend/core/mainframe/core/middy";
import {apiResponse} from "@lms-backend/core/mainframe/helpers/response";
import {adminCreateUser, adminDeleteUser} from "@lms-backend/core/mainframe/helpers/aws/cognito";
import {createAdminUserValidator} from "./validators";
import {UserModel} from "@lms-backend/core/mainframe/database/mongodb/models/user.model";
import createError from "http-errors";
import {UserRolesEnum} from "@lms-backend/core/mainframe/database/interfaces/user";

export const createUser = lambdaHandlerAcademy(
    async (event: any) => {
        const { email, firstName, lastName, role } = event.body;

        // @ts-ignore
        if (role && !UserRolesEnum[role]) {
            throw new createError.BadRequest(`Invalid role: ${role}`);
        }

        const resCognito = await adminCreateUser(
            event.academy.cognitoUserPoolId,
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
                    Value: event.academy.id
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
                role: role || UserRolesEnum.ADMIN,
                academyId: event.academy.id,
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
        requestValidator: createAdminUserValidator,
        requiredPermissionGroups: [UserRolesEnum.GLOBAL_ADMIN, UserRolesEnum.ADMIN],
        initMongoDbConnection: true
    },
);

export const listUsers = lambdaHandlerAcademy(
    async (event: any) => {

            const users = await UserModel.find()

            return apiResponse(200, {
                users: users
            });
    },{
        requiredPermissionGroups: [UserRolesEnum.GLOBAL_ADMIN, UserRolesEnum.ADMIN],
        initMongoDbConnection: true
    },
);

export const getUser = lambdaHandlerAcademy(
    async (event: any) => {
        const { id } = event.pathParameters;

        const user = await UserModel.findOne({ _id: id });
        if (!user) {
            throw new createError.NotFound("User not found");
        }

        return apiResponse(200, {
            user,
        });
    },
    {
        requiredPermissionGroups: [UserRolesEnum.GLOBAL_ADMIN, UserRolesEnum.ADMIN],
        initMongoDbConnection: true
    },
);

export const deleteUser = lambdaHandlerAcademy(
    async (event: any) => {
        const { id } = event.pathParameters;

        const user = await UserModel.findOneAndDelete({ _id: id});
        if (!user) {
            throw new createError.NotFound("User not found");
        }
        console.log(user)

        await adminDeleteUser(event.academy.cognitoUserPoolId, user.cognitoUsername);
        await user.deleteOne();

        return apiResponse(200, {
            message: "User deleted successfully",
        });
    },
    {
        requiredPermissionGroups: [UserRolesEnum.GLOBAL_ADMIN, UserRolesEnum.ADMIN],
        initMongoDbConnection: true
    },
);