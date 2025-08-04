import {
    CognitoIdentityProviderClient,
    CreateUserPoolCommand,
    CreateUserPoolCommandInput,
    CreateUserPoolCommandOutput,
    CreateUserPoolClientCommand,
    CreateUserPoolClientCommandInput,
    CreateUserPoolClientCommandOutput,
    DeleteUserPoolClientCommand,
    DeleteUserPoolCommand,
    AdminCreateUserCommand,
    AdminGetUserCommand,
    AdminGetUserCommandOutput,
    AdminListGroupsForUserCommand,
    ListUsersCommand,
    ListGroupsCommand,
    ListUsersInGroupCommand,
    UpdateUserPoolCommand,
    AdminDisableUserCommand,
    AdminDeleteUserCommand,
    AdminResetUserPasswordCommand,
    AdminSetUserPasswordCommand,
    GroupType,
    ListIdentityProvidersCommand,
    ListIdentityProvidersCommandInput,
    DescribeIdentityProviderCommand,
    DescribeIdentityProviderCommandInput,
    DescribeUserPoolCommand,
    InitiateAuthCommand,
    InitiateAuthCommandOutput,
    AuthFlowType,
    ChallengeName,
} from "@aws-sdk/client-cognito-identity-provider";
import { deleteDuplicatesFromArray } from "../utils";
export { GroupType };

const cognitoIdpClient = new CognitoIdentityProviderClient({ region: process.env.AWS_REGION });

export const deleteUserPoolClient = async (userPoolId: string, clientId: string) => {
    const command = new DeleteUserPoolClientCommand({
        UserPoolId: userPoolId,
        ClientId: clientId,
    });
    return await cognitoIdpClient.send(command);
};

export const deleteUserPool = async (userPoolId: string) => {
    const command = new DeleteUserPoolCommand({
        UserPoolId: userPoolId,
    });
    return await cognitoIdpClient.send(command);
};

export const adminCreateUser = async (userPoolId: string | undefined = undefined, username: string, userAttributes: any) => {
    const command = new AdminCreateUserCommand({
        UserPoolId: userPoolId,
        Username: username,
        UserAttributes: userAttributes,
    });
    return await cognitoIdpClient.send(command);
};

export const adminGetUser = async (userPoolId: string | undefined = undefined, username: string): Promise<AdminGetUserCommandOutput | null> => {
    try {
        return await cognitoIdpClient.send(
            new AdminGetUserCommand({
                UserPoolId: userPoolId,
                Username: username,
            }),
        );
    } catch (error: any) {
        if (error.name === "UserNotFoundException") return null;
        throw error;
    }
};

export const adminListUsers = async (userPoolId: string) => {
    return await cognitoIdpClient.send(
        new ListUsersCommand({
            UserPoolId: userPoolId,
        }),
    );
};

export const listGroups = async (userPoolId: string) => {
    return await cognitoIdpClient.send(
        new ListGroupsCommand({
            UserPoolId: userPoolId,
        }),
    );
};

export const listUsersInGroup = async (
    userPoolId: string,
    groupName: string,
    nextToken: string | undefined = undefined,
) => {
    const res = await cognitoIdpClient.send(
        new ListUsersInGroupCommand({
            UserPoolId: userPoolId,
            GroupName: groupName,
            ...(nextToken && { NextToken: nextToken }),
        }),
    );

    if (res.NextToken) {
        const { Users }: any = await listUsersInGroup(userPoolId, groupName, res.NextToken);
        // @ts-ignore
        res.Users = [...res.Users, ...Users];
    }

    return { Users: res.Users, NextToken: res.NextToken };
};

export const updateUserPoolInviteMessageTemplate = async (
    userPoolId: string,
    emailSubject: string,
    emailMessage: string,
) => {
    //UserAttributeUpdateSettings and AdminCreateUserConfig are need to be given because it throws error otherwise.
    return await cognitoIdpClient.send(
        new UpdateUserPoolCommand({
            UserPoolId: userPoolId,
            AutoVerifiedAttributes: ["email"],
            UserAttributeUpdateSettings: {
                AttributesRequireVerificationBeforeUpdate: ["email"],
            },
            AdminCreateUserConfig: {
                InviteMessageTemplate: {
                    EmailSubject: emailSubject,
                    EmailMessage: emailMessage,
                },
            },
        }),
    );
};

export const adminDisableUser = async (userPoolId: string, email: string) => {
    return await cognitoIdpClient.send(
        new AdminDisableUserCommand({
            UserPoolId: userPoolId,
            Username: email,
        }),
    );
};

export const adminDeleteUser = async (userPoolId: string | undefined = undefined, username: string) => {
    return await cognitoIdpClient.send(
        new AdminDeleteUserCommand({
            UserPoolId: userPoolId,
            Username: username,
        }),
    );
};

export const adminListGroupsForUser = async (userPoolId: string, email: string) => {
    const res = await cognitoIdpClient.send(
        new AdminListGroupsForUserCommand({
            UserPoolId: userPoolId,
            Username: email,
        }),
    );
    return res?.Groups || [];
};

export const adminResetUserPassword = async (userPoolId: string, email: string) => {
    try {
        await cognitoIdpClient.send(
            new AdminResetUserPasswordCommand({
                UserPoolId: userPoolId,
                Username: email,
            }),
        );
        return {
            success: true,
            errorName: null,
        };
    } catch (error: any) {
        return {
            success: false,
            errorName: error.name,
            errorMessage: error.message,
        };
    }
};

export const adminReCreateUser = async (userPoolId: string, username: string, userAttributes: any) => {
    const command = new AdminCreateUserCommand({
        UserPoolId: userPoolId,
        Username: username,
        UserAttributes: userAttributes,
        MessageAction: "RESEND",
    });
    return await cognitoIdpClient.send(command);
};

export const adminSetUserPassword = async (userPoolId: string, email: string, password: string) => {
    return await cognitoIdpClient.send(
        new AdminSetUserPasswordCommand({
            UserPoolId: userPoolId,
            Username: email,
            Password: password,
            Permanent: true,
        }),
    );
};

export const listAllAdminIds = async (userPoolId: string) => {
    const userGroupsRes = await listGroups(userPoolId);
    const cognitoAuthGroupNames = userGroupsRes?.Groups?.map((group) => group.GroupName) || [];

    const authGroups: any = {};
    let adminIds: string[] = [];
    for (const groupName of cognitoAuthGroupNames) {
        if (!groupName) continue;

        const authGroupUsersRes = await listUsersInGroup(userPoolId, groupName);
        const userEmails = [];
        for (const user of authGroupUsersRes?.Users || []) {
            const email = user?.Attributes?.find((attr) => attr.Name === "email")?.Value;
            userEmails.push(email);
        }
        authGroups[groupName] = {
            emails: userEmails || [],
            ids:
                authGroupUsersRes?.Users?.map((user) => user?.Attributes?.find((attr) => attr.Name === "sub")?.Value) ||
                [],
        };
        adminIds = [...adminIds, ...authGroups[groupName].ids.map((id: string) => `USER_${id}`)];
    }
    return {
        adminIds: deleteDuplicatesFromArray(adminIds),
        authGroups,
    };
};


export const listIdentityProviders = async (userPoolId: string) => {
    const command = new ListIdentityProvidersCommand({
        UserPoolId: userPoolId,
    });
    return await cognitoIdpClient.send(command);
};

export const describeIdentityProvider = async (userPoolId: string, providerName: string) => {
    const command = new DescribeIdentityProviderCommand({
        UserPoolId: userPoolId,
        ProviderName: providerName,
    });
    return await cognitoIdpClient.send(command);
}

export const describeUserPool = async (userPoolId: string) => {
    const command = new DescribeUserPoolCommand({
        UserPoolId: userPoolId,
    });
    return await cognitoIdpClient.send(command);
}

export const initiateAuth = async (clientId: string | undefined, username: string, password: string, authFlow: AuthFlowType | undefined = "USER_PASSWORD_AUTH") => {
    const command = new InitiateAuthCommand({
        AuthFlow: authFlow,
        ClientId: clientId,
        AuthParameters: {
            USERNAME: username,
            PASSWORD: password,
        },
    });
    try {
        const res = await cognitoIdpClient.send(command) as InitiateAuthCommandOutput;
        console.log("InitiateAuth response:", res);
        return {
            success: true,
            errorMessage: null,
            accessToken: res.AuthenticationResult?.AccessToken,
            idToken: res.AuthenticationResult?.IdToken,
            refreshToken: res.AuthenticationResult?.RefreshToken,
            expiresIn: res.AuthenticationResult?.ExpiresIn,
            tokenType: res.AuthenticationResult?.TokenType,
            ChallengeName: res.ChallengeName || null,
            Session: res.Session || null,
            ChallengeParameters: res.ChallengeParameters || null,
        }
    } catch (error: any) {
        return {
            success: false,
            errorMessage: error.message || "An error occurred during authentication",
            errorName: error.name || "UnknownError",
        };
    }
}

export const createUserPool = async (params: CreateUserPoolCommandInput) : Promise<CreateUserPoolCommandOutput> => {
    const command = new CreateUserPoolCommand(params);
    return await cognitoIdpClient.send(command);
}

export const createUserPoolClient = async (params: CreateUserPoolClientCommandInput): Promise<CreateUserPoolClientCommandOutput> => {
    const command = new CreateUserPoolClientCommand(params);
    return await cognitoIdpClient.send(command);
}