import axios from "axios";
import { verify } from "jsonwebtoken";
import jwkToPem from "jwk-to-pem";
import {adminGetUser} from "@kss-backend/core/mainframe/helpers/aws/cognito";
import {UserModel} from "@kss-backend/core/mainframe/database/mongodb/models/user.model";
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

const getJWK = async (cognitoUserPoolId: string) => {
    const url = `https://cognito-idp.${process.env.SERVICE_REGION}.amazonaws.com/${cognitoUserPoolId}/.well-known/jwks.json`;
    try {
        const { data } = await axios.get(url);
        return jwkToPem(data.keys[0]);
    } catch (e) {
        return undefined;
    }
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
    await closeMongodbConnection();

    const userPoolId = academyDb.cognitoUserPoolId;

    const token = authorization.split(" ").pop();
    const pem = await getJWK(userPoolId || "");

    if (!pem) return generateAuthResponse("user", "Deny", event.methodArn);
    let response: any = generateAuthResponse("user", "Deny", event.methodArn);

    let sub = "";
    let email = "";
    let cognitoGroups = null;
    let cognitoUsername = "";
    let companyId = undefined;

    verify(token, pem, { algorithms: ["RS256"] }, function (err, decodedToken: any) {
        if (err) return generateAuthResponse("user", "Deny", event.methodArn);

        console.log("AUTH TOKEN IS VALID FOR MAIN AUTHORIZER", decodedToken);

        sub = decodedToken?.sub;
        email = decodedToken?.email;
        cognitoGroups = decodedToken["cognito:groups"] ? decodedToken["cognito:groups"].join(",") : "";
        cognitoUsername = decodedToken["cognito:username"];
        companyId = decodedToken["custom:companyId"] || null;
    });

    console.log("USER CHECKING WITH USERNAME IS ->", cognitoUsername)
    const cognitoUser = await adminGetUser(userPoolId, cognitoUsername);
    if (!cognitoUser) {
        console.log("USER NOT FOUND IN COGNITO");
        return generateAuthResponse("user", "Deny", event.methodArn);
    }
    console.log("sub", sub)
    // Fetch user from MongoDB
    await getMongodbConnection(companyId);
    let dbUser = await UserModel.findOne({
        cognitoSub: sub,
    });
    if (!dbUser) {
        console.log("USER NOT FOUND IN MONGODB");
        return generateAuthResponse("user", "Deny", event.methodArn);
    }
    const dbUserJson = dbUser.toJSON();

    const user = {
        id: dbUserJson._id,
        ...dbUserJson
    };
    const academy = {
        id: academyDb._id,
        ...academyDb.toJSON()
    };
    response = {
        ...generateAuthResponse(sub, "Allow"),
        context: {
            user: JSON.stringify(user),
            academy: JSON.stringify(academy)
        },
    };
    console.log("AUTHORIZER response", response);

    await closeMongodbConnection();
    return response;
};
