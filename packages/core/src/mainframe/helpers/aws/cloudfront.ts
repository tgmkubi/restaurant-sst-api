import { getSignedUrl } from "@aws-sdk/cloudfront-signer";
import { getPrivateKeyRepoCdn } from "../utils";

export const createPresignedRepoCdnUrlGet = (objectPath: string, dateLessThan: string | undefined = undefined) => {
    dateLessThan = dateLessThan || new Date(Date.now() + 1000 * 60 * 60 * 24).toString();

    return getSignedUrl({
        keyPairId: process.env.REPO_CDN_KEY_PAIR_ID || "",
        privateKey: getPrivateKeyRepoCdn(),
        url: `https://${process.env.REPO_CDN_DOMAIN}/${objectPath}`,
        dateLessThan: dateLessThan,
    });
};

export const createCdnUrlGet = (objectPath: string) => {
    return `https://${process.env.CDN_DOMAIN}/${objectPath}`;
};
