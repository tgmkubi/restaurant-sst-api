import { AuthFlowType, CognitoIdentityProvider } from "@aws-sdk/client-cognito-identity-provider";
import axios from "axios";
import { IAxiosRequest, IAxiosResponse } from "./types";

export const getAuthenticationCredentials = async (username: string, password: string) => {
    const cognito = new CognitoIdentityProvider({
        region: "eu-west-2",
    });

    const clientId = process.env.VITE_CLIENT_ID;

    const params = {
        AuthFlow: AuthFlowType.USER_PASSWORD_AUTH,
        ClientId: clientId,
        AuthParameters: {
            USERNAME: username,
            PASSWORD: password,
        },
    };

    try {
        const response = await cognito.initiateAuth(params);

        return response.AuthenticationResult?.AccessToken;
    } catch (error) {
        console.error("Error authenticating with Cognito", error);
        throw error;
    }
};

export const makeAuthenticatedAxiosRequest = async <TBody, TResponse>({
    url,
    method,
    body,
    queryParameters,
}: IAxiosRequest<TBody>) => {
    if (!process.env.VITE_USERNAME || !process.env.VITE_PASSWORD) {
        throw new Error("Username or password not set");
    }

    const accessToken = await getAuthenticationCredentials(process.env.VITE_USERNAME, process.env.VITE_PASSWORD);

    // find a way to have a default for Authorization header when it would be unauthenticated
    return axios<IAxiosResponse<TResponse>>({
        method,
        url,
        data: body,
        headers: {
            Authorization: `Bearer ${accessToken}`,
        },
        params: queryParameters || {},
    });
};

export const makeAxiosRequest = async <TBody, TResponse>({
    url,
    method,
    body,
    queryParameters,
}: IAxiosRequest<TBody>) =>
    axios<IAxiosResponse<TResponse>>({
        method,
        url,
        data: body,
        headers: {
            Authorization: `Bearer none`,
        },
        params: queryParameters || {},
    });
