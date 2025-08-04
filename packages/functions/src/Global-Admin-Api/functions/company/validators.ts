import { CompanyMiddyModel } from "@kss-backend/core/mainframe/database/middyModels";

export const createCompanyValidator = {
    type: "object",
    properties: {
        body: {
            type: "object",
            ...CompanyMiddyModel
        },
    },
    required: ["body"],
};
