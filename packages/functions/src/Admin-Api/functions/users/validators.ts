import { exportModelPropKey, exportModelPropKeyValue } from "@lms-backend/core/mainframe/helpers/utils";
import {UserMiddyModel} from "@lms-backend/core/mainframe/database/middyModels";

export const createAdminUserValidator = {
    type: "object",
    properties: {
        body: {
            type: "object",
            properties: {
                ...exportModelPropKeyValue(UserMiddyModel, UserMiddyModel.properties.email),
                ...exportModelPropKeyValue(UserMiddyModel, UserMiddyModel.properties.firstName),
                ...exportModelPropKeyValue(UserMiddyModel, UserMiddyModel.properties.lastName),
                ...exportModelPropKeyValue(UserMiddyModel, UserMiddyModel.properties.role),
            },
            required: [
                exportModelPropKey(UserMiddyModel, UserMiddyModel.properties.email),
                exportModelPropKey(UserMiddyModel, UserMiddyModel.properties.firstName),
                exportModelPropKey(UserMiddyModel, UserMiddyModel.properties.lastName),
            ],
        },
    },
    required: ["body"],
};
