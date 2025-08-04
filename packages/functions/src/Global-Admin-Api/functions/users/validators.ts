import { exportModelPropKey, exportModelPropKeyValue } from "@kss-backend/core/mainframe/helpers/utils";
import {UserMiddyModel} from "@kss-backend/core/mainframe/database/middyModels";

export const createGlobalAdminUserValidator = {
    type: "object",
    properties: {
        body: {
            type: "object",
            properties: {
                ...exportModelPropKeyValue(UserMiddyModel, UserMiddyModel.properties.email),
                ...exportModelPropKeyValue(UserMiddyModel, UserMiddyModel.properties.firstName),
                ...exportModelPropKeyValue(UserMiddyModel, UserMiddyModel.properties.lastName),
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

export const createAcademyAdminUserValidator = {
    type: "object",
    properties: {
        body: {
            type: "object",
            properties: {
                ...exportModelPropKeyValue(UserMiddyModel, UserMiddyModel.properties.email),
                ...exportModelPropKeyValue(UserMiddyModel, UserMiddyModel.properties.firstName),
                ...exportModelPropKeyValue(UserMiddyModel, UserMiddyModel.properties.lastName),
                ...exportModelPropKeyValue(UserMiddyModel, UserMiddyModel.properties.companyId),
            },
            required: [
                exportModelPropKey(UserMiddyModel, UserMiddyModel.properties.email),
                exportModelPropKey(UserMiddyModel, UserMiddyModel.properties.firstName),
                exportModelPropKey(UserMiddyModel, UserMiddyModel.properties.lastName),
                exportModelPropKey(UserMiddyModel, UserMiddyModel.properties.companyId),
            ],
        },
    },
    required: ["body"],
};