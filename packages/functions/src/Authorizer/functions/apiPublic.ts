import {closeMongodbConnection, getMongodbConnection} from "@kss-backend/core/mainframe/database/mongodb/connect";
import {AcademyModel} from "@kss-backend/core/mainframe/database/mongodb/models/academy.model";
import {moduleTypes} from "../../../../../stacks/helpers/stackConstants";

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
    const { academyName } = event.pathParameters;
    console.log("academyName",academyName)

    const {MONGO_DB_SECRET_NAME} = process.env || {};
    await closeMongodbConnection();
    await getMongodbConnection(moduleTypes.GLOBAL);


    const academyDb = await AcademyModel.findOne({
        name: academyName
    })
    if(!academyDb) return generateAuthResponse("user", "Deny", event.methodArn);


    const academy = {
        id: academyDb._id,
        ...academyDb.toJSON()
    };
    const response = {
        ...generateAuthResponse("public", "Allow"),
        context: {
            academy: JSON.stringify(academy)
        },
    };
    console.log("AUTHORIZER response", response);

    await closeMongodbConnection();
    return response;
};
