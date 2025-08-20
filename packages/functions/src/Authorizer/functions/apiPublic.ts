/* import {closeMongodbConnection, getMongodbConnection} from "@kss-backend/core/mainframe/database/mongodb/connect";
import {moduleTypes} from "../../../../../stacks/helpers/stackConstants"; */

const generateAuthResponse = (principalId: string, effect: string, resource: string = "*") => {
    return {
        principalId: principalId,
        policyDocument: {
            Version: "2012-10-17",
            Statement: [
                {
                    Action: "execute-api:Invoke",
                    Effect: effect,
                    Resource: resource,
                },
            ],
        },
    };
};


export const authorizer = async (event: any) => {

    const { authorization } = event.headers;

    const {MONGO_DB_SECRET_NAME} = process.env || {};
    // Academy ile ilgili kodlar kaldırıldı. Artık bu fonksiyon sadece temel authorizer işlemlerini yapacak.
    const response = {
        ...generateAuthResponse("public", "Allow"),
        context: {}
    };
    console.log("AUTHORIZER response", response);
    return response;
};
