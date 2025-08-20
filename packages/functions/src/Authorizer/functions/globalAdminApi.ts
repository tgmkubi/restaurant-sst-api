import axios from "axios";
import { verify } from "jsonwebtoken";
import jwkToPem from "jwk-to-pem";
import { adminGetUser } from "@kss-backend/core/mainframe/helpers/aws/cognito";
import { getGlobalModels } from "@kss-backend/core/mainframe/database/mongodb/connect";
import config from "../../../../../config";

// JWK cache to avoid repeated fetches
let jwkCache: { [key: string]: any[] } = {};
let jwkCacheExpiry: { [key: string]: number } = {};

// API Gateway v2.0 simple response format
const generateAuthResponse = (effect: string, context: any = {}) => {
    if (effect === "Allow") {
        return {
            isAuthorized: true,
            context: context
        };
    } else {
        return {
            isAuthorized: false
        };
    }
};

const getJWK = async (cognitoUserPoolId: string): Promise<any[] | undefined> => {
    const region = config.AWS_REGION || config.SERVICE_REGION || 'eu-central-1';
    const cacheKey = `${region}-${cognitoUserPoolId}`;
    const now = Date.now();

    // Check cache (5 minute TTL)
    if (jwkCache[cacheKey] && jwkCacheExpiry[cacheKey] > now) {
        console.log("Using cached JWK keys");
        return jwkCache[cacheKey];
    }

    const url = `https://cognito-idp.${region}.amazonaws.com/${cognitoUserPoolId}/.well-known/jwks.json`;

    try {
        const { data } = await axios.get(url, { timeout: 5000 });

        // Cache the result
        jwkCache[cacheKey] = data.keys;
        jwkCacheExpiry[cacheKey] = now + (5 * 60 * 1000); // 5 minutes

        console.log(`Fetched and cached ${data.keys.length} JWK keys`);
        return data.keys;
    } catch (error) {
        console.error("Error fetching JWK:", error);
        return undefined;
    }
};

export const authorizer = async (event: any) => {
    console.log("=== AUTHORIZER STARTED ===");
    console.log("Event:", JSON.stringify(event, null, 2));

    try {
        // Handle both v1.0 and v2.0 formats
        const authorization = event.authorizationToken || event.headers?.authorization || event.identitySource;
        // Global-Admin--Api Stack
        const { GLOBAL_COGNITO_USER_POOL_ID } = process.env;

        console.log("Authorization header:", authorization ? "Present" : "Missing");
        console.log("User Pool ID:", GLOBAL_COGNITO_USER_POOL_ID);

        // Validate required environment variables
        if (!GLOBAL_COGNITO_USER_POOL_ID) {
            console.error("GLOBAL_COGNITO_USER_POOL_ID not configured");
            return generateAuthResponse("Deny");
        }

        // Validate authorization header
        if (!authorization || !authorization.startsWith("Bearer ")) {
            console.log("Missing or invalid authorization header");
            return generateAuthResponse("Deny");
        }

        const token = authorization.split(" ")[1];
        if (!token) {
            console.log("No token found in authorization header");
            return generateAuthResponse("Deny");
        }

        // Get JWK keys
        const jwks = await getJWK(GLOBAL_COGNITO_USER_POOL_ID);
        if (!jwks || jwks.length === 0) {
            console.error("Failed to fetch JWK keys");
            return generateAuthResponse("Deny");
        }

        let decodedToken: any;

        try {
            // Parse JWT header to get kid
            const tokenParts = token.split('.');
            if (tokenParts.length !== 3) {
                console.log("Invalid JWT format");
                return generateAuthResponse("Deny");
            }

            const tokenHeader = JSON.parse(Buffer.from(tokenParts[0], 'base64').toString());

            if (!tokenHeader.kid) {
                console.log("No kid found in token header");
                return generateAuthResponse("Deny");
            }

            // Find matching JWK
            const jwk = jwks.find((key: any) => key.kid === tokenHeader.kid);
            if (!jwk) {
                console.log(`JWK not found for kid: ${tokenHeader.kid}`);
                return generateAuthResponse("Deny");
            }

            // Convert JWK to PEM and verify token
            const pem = jwkToPem(jwk);
            decodedToken = verify(token, pem, {
                algorithms: ["RS256"],
                issuer: `https://cognito-idp.${config.AWS_REGION || 'eu-central-1'}.amazonaws.com/${GLOBAL_COGNITO_USER_POOL_ID}`,
                audience: undefined // Skip audience validation for flexibility
            });

            console.log("Token verified successfully");
        } catch (err) {
            console.error("Token verification failed:", err);
            return generateAuthResponse("Deny");
        }

        // Extract token claims
        const sub = decodedToken?.sub;
        const email = decodedToken?.email;
        const cognitoGroups = decodedToken["cognito:groups"] || [];
        const cognitoUsername = decodedToken["cognito:username"] || decodedToken["username"] || sub;
        const companyId = decodedToken["custom:companyId"] || null;

        if (!sub || !cognitoUsername) {
            console.log("Missing required token claims (sub or username)");
            return generateAuthResponse("Deny");
        }

        console.log("Token claims:", { sub, email, cognitoUsername, companyId, groups: cognitoGroups });

        // Verify user exists in Cognito
        const cognitoUser = await adminGetUser(GLOBAL_COGNITO_USER_POOL_ID, cognitoUsername);
        if (!cognitoUser) {
            console.log("User not found in Cognito");
            return generateAuthResponse("Deny");
        }

        // Connect to MongoDB and fetch user (OPTIMIZED)
        let dbUser: any;
        try {
            // Get global models for global admin API
            const { User } = await getGlobalModels();

            dbUser = await User.findOne({ cognitoSub: sub })
                .select('_id email role cognitoSub companyId') // Only select needed fields
                .maxTimeMS(2000) // Reduced timeout
                .lean(); // Use lean() for better performance

            if (!dbUser) {
                console.log("User not found in MongoDB");
                return generateAuthResponse("Deny");
            }

            console.log(`Found user: ${dbUser.email}, Role: ${dbUser.role}`);

            // Verify user has GLOBAL_ADMIN role
            if (dbUser.role !== "GLOBAL_ADMIN") {
                console.log(`Access denied: User role is ${dbUser.role}, required GLOBAL_ADMIN`);
                return generateAuthResponse("Deny");
            }

        } catch (error) {
            console.error("MongoDB error:", error);
            return generateAuthResponse("Deny");
        }

        // Prepare user context
        const userContext = {
            id: dbUser._id.toString(),
            email: dbUser.email,
            role: dbUser.role,
            cognitoSub: dbUser.cognitoSub,
            companyId: dbUser.companyId || null
        };

        console.log("Authorization successful for global admin user");
        console.log("=== AUTHORIZER SUCCESS ===");

        const response = generateAuthResponse("Allow", {
            user: JSON.stringify(userContext),
            role: dbUser.role,
            companyId: userContext.companyId
        });

        console.log("Auth response:", JSON.stringify(response, null, 2));
        return response;

    } catch (error) {
        console.error("=== AUTHORIZER ERROR ===");
        console.error("Authorizer error:", error);
        const denyResponse = generateAuthResponse("Deny");
        console.log("Deny response:", JSON.stringify(denyResponse, null, 2));
        return denyResponse;
    }
};
