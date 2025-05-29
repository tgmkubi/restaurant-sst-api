import { sign } from "jsonwebtoken";
import { getSecret } from "./aws/secrets";

export const getPrivateKeyJWT = async (jwtSecretName: string) => {
    const secret = await getSecret(jwtSecretName);
    console.log("JWT SECRET", secret);
    return secret?.private_key?.replaceAll(/\\n/g, "\n") || null;
};

export const createEventToken = async ({ eventId, userId, jwtSecretName }: any) => {
    const privateKey = await getPrivateKeyJWT(jwtSecretName);
    if (!privateKey) throw new Error("JWT Secret Private Key not found");

    return sign(
        {
            eventId: eventId,
            userId: userId,
        },
        Buffer.from(privateKey, "utf8"),
        { algorithm: "RS256" },
    );
};
