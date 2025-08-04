import {lambdaHandlerGlobalPublic} from "@kss-backend/core/mainframe/core/middy";
import {apiResponse} from "@kss-backend/core/mainframe/helpers/response"
import {
    initiateAuth
} from "@kss-backend/core/mainframe/helpers/aws/cognito";
import {getMongodbConnection} from "@kss-backend/core/mainframe/database/mongodb/connect";
import { UserModel } from "@kss-backend/core/mainframe/database/mongodb/models/user.model";
import { UserRolesEnum } from "@kss-backend/core/mainframe/database/interfaces/user";
import { moduleTypes } from "../../../../../../stacks/helpers/stackConstants";

/* export const getUri = lambdaHandlerGlobalPublic(
    async (event: any) => {

        console.log("createGlobalAdminUser MONGO_DB_SECRET_NAME", process.env.MONGO_DB_SECRET_NAME);
        console.log("createGlobalAdminUser MONGO_DB_SECRET_VALUE", process.env.MONGO_DB_SECRET_VALUE);

        const connectionUri = process.env.MONGO_DB_SECRET_VALUE;
        if (!connectionUri) {
            return apiResponse(500, {
                error: "MongoDB connection URI is not provided in environment variables.",
            });
        }
        console.log("MongoDB connection URI:", connectionUri);

        const uri = JSON.parse(connectionUri);

        await getMongodbConnection();

        return apiResponse(200, {
            uri: uri.connectionUri,
            message: "MongoDB connection URI retrieved successfully.",
        });
    },
    {
        initMongoDbConnection: false,
    },
); */


/* import {moduleTypes} from "../../../../../stacks/helpers/stackConstants";
import {UserModel} from "@kss-backend/core/mainframe/database/mongodb/models/user.model";
import {getMongodbConnection} from "@kss-backend/core/mainframe/database/mongodb/connect";
import {UserRolesEnum} from "@kss-backend/core/mainframe/database/interfaces/user";

export const createGlobalAdminUser = async (event: any) => {
    const { userId, email, firstName, lastName } = event;
    console.log({ userId, email, firstName, lastName })

    console.log("createGlobalAdminUser MONGO_DB_SECRET_NAME", process.env.MONGO_DB_SECRET_NAME);

    await getMongodbConnection();

    const res  = await UserModel.create({
        cognitoSub: userId,
        cognitoUsername: userId,
        email,
        firstName,
        lastName,
        role: UserRolesEnum.GLOBAL_ADMIN,
        companyId: moduleTypes.GLOBAL,
        createdBy: "INIT-STACK",
    });
    console.log("Created global admin user", res);
} */


export const getUri = lambdaHandlerGlobalPublic(
    async (event: any) => {
        // const { userId, email, firstName, lastName } = event;
        // console.log({ userId, email, firstName, lastName })

        const userId = "a37488d2-b0b1-7080-219f-87fee922f369";
        const email = "kubilayuysall@gmail.com";
        const firstName = "Kubilay";
        const lastName = "Uysal";

        console.log("createGlobalAdminUser MONGO_DB_SECRET_NAME", process.env.MONGO_DB_SECRET_NAME);

        await getMongodbConnection();

        const res  = await UserModel.create({
            cognitoSub: userId,
            cognitoUsername: userId,
            email,
            firstName,
            lastName,
            role: UserRolesEnum.GLOBAL_ADMIN,
            // companyId: moduleTypes.GLOBAL,
            createdBy: "INIT-STACK",
        });
        console.log("Created global admin user", res);
    },
    {
        // initMongoDbConnection: false,
    },
);