import axios from "axios";
import { verify } from "jsonwebtoken";
import jwkToPem from "jwk-to-pem";
import {adminGetUser} from "@kss-backend/core/mainframe/helpers/aws/cognito";
import {closeMongodbConnection, getMongodbConnection} from "@kss-backend/core/mainframe/database/mongodb/connect";
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
    console.log('--- AUTHORIZER START ---');
    console.log('event.headers:', event.headers);
    console.log('event.pathParameters:', event.pathParameters);
    console.log('event.queryStringParameters:', event.queryStringParameters);

    const {MONGO_DB_SECRET_NAME} = process.env || {};
    await closeMongodbConnection();
    await getMongodbConnection(moduleTypes.GLOBAL);
    // Multi-tenant: companyId ile global database'den company datasını bul
    let userPoolId = event.userPoolId || process.env.COGNITO_USER_POOL_ID;
    let companyIdFromPath = event.pathParameters?.companyId;
    if (companyIdFromPath) {
        try {
            const { Company } = await (await import("@kss-backend/core/mainframe/database/mongodb/connect")).getGlobalModels();
            const company = await Company.findOne({ _id: companyIdFromPath });
            if (company && company.cognitoUserPoolId) {
                userPoolId = company.cognitoUserPoolId;
                console.log('Company found in global DB:', company);
            } else {
                console.log('Company not found or missing cognitoUserPoolId:', companyIdFromPath);
            }
        } catch (err) {
            console.log('Error fetching company from global DB:', err);
        }
    }
    console.log("userPoolId (resolved):", userPoolId);

    const token = authorization.split(" ").pop();
    console.log('Authorization token:', token);
    const pem = await getJWK(userPoolId || "");

    if (!pem) {
        console.log('PEM not found, JWT public key fetch failed');
        return generateAuthResponse("user", "Deny", event.methodArn);
    }
    let response: any = generateAuthResponse("user", "Deny", event.methodArn);

    let sub = "";
    let email = "";
    let cognitoGroups = null;
    let cognitoUsername = "";
    let companyId = undefined;
    let userRole = undefined;

    // JWT verify işlemini promise ile yap
    let decodedToken: any;
    try {
        decodedToken = await new Promise<any>((resolve, reject) => {
            verify(token, pem, { algorithms: ["RS256"] }, (err, decoded) => {
                if (err) reject(err);
                else resolve(decoded);
            });
        });
    } catch (err) {
        console.log("JWT verification failed", err);
        return generateAuthResponse("user", "Deny", event.methodArn);
    }

    console.log('Decoded JWT:', decodedToken);
    sub = decodedToken?.sub;
    email = decodedToken?.email;
    cognitoGroups = decodedToken["cognito:groups"] ? decodedToken["cognito:groups"].join(",") : "";
    cognitoUsername = decodedToken["cognito:username"];
    companyId = decodedToken["custom:companyId"] || null;
    userRole = decodedToken["custom:role"] || decodedToken["role"] || null;
    console.log('JWT claims:', { sub, email, cognitoGroups, cognitoUsername, companyId, userRole });

    // companyId eksikse forbidden
    if (!sub || !cognitoUsername || !companyId) {
        console.log("Missing required claims", { sub, cognitoUsername, companyId });
        return generateAuthResponse("user", "Deny", event.methodArn);
    }

    console.log("USER CHECKING WITH USERNAME IS ->", cognitoUsername)
    const cognitoUser = await adminGetUser(userPoolId, cognitoUsername);
    if (!cognitoUser) {
        console.log("USER NOT FOUND IN COGNITO", { userPoolId, cognitoUsername });
        return generateAuthResponse("user", "Deny", event.methodArn);
    }
    console.log("sub", sub)
    // Fetch user from MongoDB
    const tenantConnection = await getMongodbConnection(companyId);
    const mongoose = require('mongoose');
    const { UserModel } = await import('@kss-backend/core/mainframe/database/mongodb/models/user.model');
    const userModelInstance = tenantConnection.model('User', UserModel.schema);
    const companyIdStr = companyId.replace(/^COMPANY_/, "");
    const objectId = (() => {
        try {
            return new mongoose.Types.ObjectId(companyIdStr);
        } catch (e) {
            return null;
        }
    })();
    console.log('MongoDB user query:', { cognitoSub: sub, companyId: { $in: [companyIdStr, objectId] } });
    let dbUser = await userModelInstance.findOne({
        cognitoSub: sub,
        companyId: { $in: objectId ? [companyIdStr, objectId] : [companyIdStr] }
    });
    if (!dbUser) {
        console.log("USER NOT FOUND IN MONGODB", { sub, companyId, companyIdStr });
        await closeMongodbConnection();
        return generateAuthResponse("user", "Deny", event.methodArn);
    }
    const dbUserJson = dbUser.toJSON();
    console.log('MongoDB user found:', dbUserJson);

    // MongoDB'den gelen user rolünü kullan
    const user = {
        id: dbUserJson._id,
        role: dbUserJson.role,
        ...dbUserJson,
        companyId: companyId
    };
    // Sadece MongoDB'deki user rolü case-sensitive olarak kontrol edilir
    if (!(user.role === "ADMIN" || user.role === "GLOBAL_ADMIN")) {
        console.log("User role forbidden", user.role);
        await closeMongodbConnection();
        return generateAuthResponse("user", "Deny", event.methodArn);
    }
    response = {
        ...generateAuthResponse(sub, "Allow"),
        context: {
            user: JSON.stringify(user)
        },
    };
    console.log("AUTHORIZER response", response);
    console.log('--- AUTHORIZER END ---');
    await closeMongodbConnection();
    return response;
};
