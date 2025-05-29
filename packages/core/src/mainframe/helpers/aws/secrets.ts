import { SecretsManagerClient, GetSecretValueCommand } from "@aws-sdk/client-secrets-manager";

export const getSecret = async (secretName: string | undefined) => {
    try {
        console.log("SECRET NAME", secretName);
        const secretsClient = new SecretsManagerClient({ region: process.env.SERVICE_REGION });
        const command = new GetSecretValueCommand({ SecretId: secretName });
        const secretValue: any = await secretsClient.send(command);
        return JSON.parse(secretValue.SecretString);
    } catch (error: any) {
        if (error.name === "ResourceNotFoundException") return null;
        throw error;
    }
};
