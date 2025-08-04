import { dataKeyList } from "@kss-backend/core/mainframe/database/identifiers";
import { userData } from "@kss-backend/core/mainframe/database/modelGenerators";
import { userRoles } from "../../../../../stacks/helpers/stackConstants";
import { marshall } from "@aws-sdk/util-dynamodb";

export const createAdminUserModel = async (event: any) => {
    const { firstName, lastName, email } = event;
    const identity = dataKeyList.USER();
    identity.sk = "";

    const user = userData(undefined, identity, {
        data: {
            firstName,
            lastName,
            email,
            role: userRoles.ADMIN
        },
        createdBy: "GLOBAL",
        createdAt:  new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        updatedBy:  "GLOBAL",
    });
    return {
        user: user,
        userMarshalled: marshall(user),
    }
}