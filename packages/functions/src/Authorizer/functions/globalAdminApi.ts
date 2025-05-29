import axios from "axios";
import { verify } from "jsonwebtoken";
import jwkToPem from "jwk-to-pem";
import {adminGetUser} from "@lms-backend/core/mainframe/helpers/aws/cognito";
import {UserModel} from "@lms-backend/core/mainframe/database/mongodb/models/user.model";
import {getMongodbConnection} from "@lms-backend/core/mainframe/database/mongodb/connect";

console.log("PROCESS ENV MONGODB", process.env.MONGO_DB_SECRET_NAME)
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
    const {GLOBAL_COGNITO_USER_POOL_ID, MONGO_DB_SECRET_NAME} = process.env || {};
    const userPoolId = GLOBAL_COGNITO_USER_POOL_ID;
    console.log(authorization);
    console.log(userPoolId)

    const token = authorization.split(" ").pop();
    const pem = await getJWK(userPoolId || "");

    if (!pem) return generateAuthResponse("user", "Deny", event.methodArn);
    let response: any = generateAuthResponse("user", "Deny", event.methodArn);

    let sub = "";
    let email = "";
    let cognitoGroups = null;
    let cognitoUsername = "";
    let academyId = undefined;

    verify(token, pem, { algorithms: ["RS256"] }, function (err, decodedToken: any) {
        if (err) return generateAuthResponse("user", "Deny", event.methodArn);

        console.log("AUTH TOKEN IS VALID FOR MAIN AUTHORIZER", decodedToken);

        sub = decodedToken?.sub;
        email = decodedToken?.email;
        cognitoGroups = decodedToken["cognito:groups"] ? decodedToken["cognito:groups"].join(",") : "";
        cognitoUsername = decodedToken["cognito:username"];
        academyId = decodedToken["custom:academyId"] || null;
    });

    console.log("USER CHECKING WITH USERNAME IS ->", cognitoUsername)
    const cognitoUser = await adminGetUser(userPoolId, cognitoUsername);
    if (!cognitoUser) {
        console.log("USER NOT FOUND IN COGNITO");
        return generateAuthResponse("user", "Deny", event.methodArn);
    }
    console.log("sub", sub)
    // Fetch user from MongoDB
    await getMongodbConnection(academyId);
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
    response = {
        ...generateAuthResponse(sub, "Allow"),
        context: {
            user: JSON.stringify(user),
        },
    };
    console.log("AUTHORIZER response", response);

    return response;
};
