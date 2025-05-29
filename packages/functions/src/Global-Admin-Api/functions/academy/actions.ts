import {lambdaHandlerGlobalAdmin} from "@lms-backend/core/mainframe/core/middy";
import {apiResponse} from "@lms-backend/core/mainframe/helpers/response";
import {
    adminCreateUser, adminDeleteUser,
    createUserPool,
    createUserPoolClient,
    deleteUserPool, deleteUserPoolClient
} from "@lms-backend/core/mainframe/helpers/aws/cognito";
import {createAcademyValidator} from "./validators";
import createError from "http-errors";
import {AcademyModel} from "@lms-backend/core/mainframe/database/mongodb/models/academy.model";
import {UserModel} from "@lms-backend/core/mainframe/database/mongodb/models/user.model";
import {moduleTypes} from "../../../../../../stacks/helpers/stackConstants";
import {createAcademyAdminUserValidator, createGlobalAdminUserValidator} from "../users/validators";
import {UserRolesEnum} from "@lms-backend/core/mainframe/database/interfaces/user";
import {closeMongodbConnection, getMongodbConnection} from "@lms-backend/core/mainframe/database/mongodb/connect";

export const createAcademy = lambdaHandlerGlobalAdmin(
    async (event: any) => {
        const { name, displayName, description } = event.body;

        const academy = await AcademyModel.findOne({
            name: name
        });
        if (academy) {
            throw new createError.Conflict("Academy with this name already exists");
        }

        const resCognitoUserPool = await createUserPool({
            PoolName: name,
            Schema: [
                {
                    Name: "email",
                    Required: true,
                    Mutable: true,
                },
                {
                    Name: "academyId",
                    Required: false,
                    Mutable: true,
                    AttributeDataType: "String",
                },
            ],
            AutoVerifiedAttributes: ["email"],
            UserAttributeUpdateSettings: {
                AttributesRequireVerificationBeforeUpdate: ["email"],
            },
            UsernameConfiguration: {
                CaseSensitive: false,
            },
            Policies: {
                // UserPoolPolicyType
                PasswordPolicy: {
                    // PasswordPolicyType
                    MinimumLength: 8,
                    RequireUppercase: true,
                    RequireLowercase: true,
                    RequireNumbers: true,
                    RequireSymbols: true,
                    TemporaryPasswordValidityDays: 365,
                },
            },
        });

        if (!resCognitoUserPool.UserPool) {
            throw new createError.InternalServerError("Failed to create Cognito User Pool");
        }

        const resCognitoUserPoolClient = await createUserPoolClient({
            UserPoolId: resCognitoUserPool.UserPool.Id,
            ClientName: `${name}-client`,
        });

        if (!resCognitoUserPoolClient.UserPoolClient) {
            throw new createError.InternalServerError("Failed to create Cognito User Pool Client");
        }

        const academyCreated = await AcademyModel.create({
            name,
            displayName: displayName || name,
            domain: `${name}.${process.env.DOMAIN}`,
            description,
            cognitoUserPoolId: resCognitoUserPool.UserPool.Id,
            cognitoClientId: resCognitoUserPoolClient.UserPoolClient.ClientId,
            createdBy: event.user.id,
        });


        return apiResponse(200, {
            academy: academyCreated
        });
    },
    {
        requestValidator: createAcademyValidator,
        requiredPermissionGroups: [UserRolesEnum.GLOBAL_ADMIN],
        initMongoDbConnection: true
    },
);

export const listAcademy = lambdaHandlerGlobalAdmin(
    async (event: any) => {

            const academies = await AcademyModel.find({})

            return apiResponse(200, {
                academies
            });
    },{
        requiredPermissionGroups: [UserRolesEnum.GLOBAL_ADMIN],
        initMongoDbConnection: true
    },
);

export const getAcademy = lambdaHandlerGlobalAdmin(
    async (event: any) => {
        const { id } = event.pathParameters;

        const academy = await AcademyModel.findOne({ _id: id });
        if (!academy) {
            throw new createError.NotFound("Academy Not found");
        }

        return apiResponse(200, {
            academy,
        });
    },
    {
        requiredPermissionGroups: [UserRolesEnum.GLOBAL_ADMIN],
        initMongoDbConnection: true
    },
);

export const deleteAcademy = lambdaHandlerGlobalAdmin(
    async (event: any) => {
        const { id } = event.pathParameters;

        const academy = await AcademyModel.findOne({ _id: id});
        if (!academy) {
            throw new createError.NotFound("Academy not found");
        }

        await deleteUserPool(academy.cognitoUserPoolId);
        await academy.deleteOne();

        return apiResponse(200, {
            message: "Academy deleted successfully",
        });
    },
    {
        requiredPermissionGroups: [UserRolesEnum.GLOBAL_ADMIN],
        initMongoDbConnection: true
    },
);

export const createAcademyAdmin = lambdaHandlerGlobalAdmin(
    async (event: any) => {

        const { id } = event.pathParameters;
        const { email, firstName, lastName } = event.body;

        const academy = await AcademyModel.findOne({
            _id: id,
        });
        if (!academy) {
            throw new createError.NotFound("Academy not found");
        }
        const academyId = `ACADEMY_${academy._id}`;

        const resCognito = await adminCreateUser(
            academy.cognitoUserPoolId,
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
                    Value: academyId,
                }
            ]
        );

        const cognitoSub = resCognito?.User?.Attributes?.find(attr => attr.Name === 'sub')?.Value || undefined;
        let dbUser = undefined;

        if (cognitoSub) {

            // Close global database connection
            await closeMongodbConnection();
            // Create Connection to User's Academy Database
            await getMongodbConnection(academyId);

            dbUser = await UserModel.create({
                cognitoSub: cognitoSub,
                cognitoUsername: resCognito.User?.Username,
                email,
                firstName,
                lastName,
                role: UserRolesEnum.ADMIN,
                academyId: academyId,
                createdBy: event.user.id
            })
        } else {
            throw new createError.InternalServerError("Failed to create user in Cognito");
        }
        await closeMongodbConnection();

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

export const listAcademyAdmins = lambdaHandlerGlobalAdmin(
    async (event: any) => {

        const { id } = event.pathParameters;

        const academy = await AcademyModel.findOne({
            _id: id,
        });
        if (!academy) {
            throw new createError.NotFound("Academy not found");
        }
        const academyId = `ACADEMY_${academy._id}`;

        // Close global database connection
        await closeMongodbConnection();
        // Create Connection to User's Academy Database
        await getMongodbConnection(academyId);

        const users = await UserModel.find({
            academyId: academyId,
            role: UserRolesEnum.ADMIN
        });
        await closeMongodbConnection();

        return apiResponse(200, {
            users: users,
        });
    },
    {
        requiredPermissionGroups: [UserRolesEnum.GLOBAL_ADMIN],
        initMongoDbConnection: true
    },
);

export const getAcademyAdmin = lambdaHandlerGlobalAdmin(
    async (event: any) => {

        const { id, userId } = event.pathParameters;

        const academy = await AcademyModel.findOne({
            _id: id,
        });
        if (!academy) {
            throw new createError.NotFound("Academy not found");
        }
        const academyId = `ACADEMY_${academy._id}`;

        // Close global database connection
        await closeMongodbConnection();
        // Create Connection to User's Academy Database
        await getMongodbConnection(academyId);

        const user = await UserModel.findOne({
            _id: userId,
            role: UserRolesEnum.ADMIN
        });
        await closeMongodbConnection();

        return apiResponse(200, {
            user: user,
        });
    },
    {
        requiredPermissionGroups: [UserRolesEnum.GLOBAL_ADMIN],
        initMongoDbConnection: true
    },
);

export const deleteAcademyAdmin = lambdaHandlerGlobalAdmin(
    async (event: any) => {

        const { id, userId } = event.pathParameters;
        console.log(id)

        const academy = await AcademyModel.findOne({
            _id: id,
        });
        if (!academy) {
            throw new createError.NotFound("Academy not found");
        }
        const academyId = `ACADEMY_${academy._id}`;

        // Close global database connection
        await closeMongodbConnection();
        // Create Connection to User's Academy Database
        await getMongodbConnection(academyId);

        const user = await UserModel.findOne({
            _id: userId,
            role: UserRolesEnum.ADMIN
        });
        if (!user) {
            throw new createError.NotFound("User not found");
        }

        await adminDeleteUser(academy.cognitoUserPoolId, user.cognitoUsername);
        await user.deleteOne();
        await closeMongodbConnection();

        return apiResponse(200, {
            message: "Academy Admin deleted successfully",
        });
    },
    {
        requiredPermissionGroups: [UserRolesEnum.GLOBAL_ADMIN],
        initMongoDbConnection: true
    },
);