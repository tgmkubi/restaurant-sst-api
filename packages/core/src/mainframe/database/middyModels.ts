import {UserRolesEnum} from "./interfaces/user";

export const UserMiddyModel: any = {
    properties: {
        cognitoSub: { type: "string", minLength: 1, maxLength: 100 },
        email: { type: "string", minLength: 10, maxLength: 100 },
        firstName: { type: "string", minLength: 1, maxLength: 100 },
        lastName: { type: "string", minLength: 1, maxLength: 100 },
        companyId: { type: "string", minLength: 1, maxLength: 100 },
        role: { type: "string" },
    },
    required: ["email", "firstName", "lastName"],
};

export const AcademyMiddyModel: any = {
    properties: {
        name: { type: "string", minLength: 1, maxLength: 100 },
        displayName: { type: "string", minLength: 1, maxLength: 100 },
        domain: { type: "string", minLength: 1, maxLength: 100 },
        description: { type: "string", minLength: 0, maxLength: 500 },
        cognitoUserPoolId: { type: "string", minLength: 1, maxLength: 100 },
        cognitoClientId: { type: "string", minLength: 1, maxLength: 100 },
        createdBy: { type: "string", minLength: 1, maxLength: 100 },
        updatedBy: { type: "string", minLength: 1, maxLength: 100 },
    },
    required: ["name"]
};

export const CompanyMiddyModel: any = {
    properties: {
        name: { type: "string", minLength: 1, maxLength: 100 },
        displayName: { type: "string", minLength: 1, maxLength: 100 },
        domain: { type: "string", minLength: 1, maxLength: 100 },
        description: { type: "string", minLength: 0, maxLength: 500 },
        cognitoUserPoolId: { type: "string", minLength: 1, maxLength: 100 },
        cognitoClientId: { type: "string", minLength: 1, maxLength: 100 },
        createdBy: { type: "string", minLength: 1, maxLength: 100 },
        updatedBy: { type: "string", minLength: 1, maxLength: 100 },
    },
    required: ["name"]
};
