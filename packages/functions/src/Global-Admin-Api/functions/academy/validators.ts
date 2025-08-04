import {AcademyMiddyModel} from "@kss-backend/core/mainframe/database/middyModels";

export const createAcademyValidator = {
    type: "object",
    properties: {
        body: {
            type: "object",
            ...AcademyMiddyModel
        },
    },
    required: ["body"],
};
