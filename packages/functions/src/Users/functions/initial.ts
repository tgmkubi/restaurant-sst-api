import {moduleTypes} from "../../../../../stacks/helpers/stackConstants";
import {UserModel} from "@lms-backend/core/mainframe/database/mongodb/models/user.model";
import {getMongodbConnection} from "@lms-backend/core/mainframe/database/mongodb/connect";
import {UserRolesEnum} from "@lms-backend/core/mainframe/database/interfaces/user";

export const createGlobalAdminUser = async (event: any) => {
    const { userId, email, firstName, lastName } = event;
    console.log({ userId, email, firstName, lastName })

    await getMongodbConnection();

    const res  = await UserModel.create({
        cognitoSub: userId,
        cognitoUsername: userId,
        email,
        firstName,
        lastName,
        role: UserRolesEnum.GLOBAL_ADMIN,
        academyId: moduleTypes.GLOBAL,
        createdBy: "INIT-STACK",
    });
    console.log("Created global admin user", res);
}