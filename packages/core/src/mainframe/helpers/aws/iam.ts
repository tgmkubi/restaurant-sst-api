import { IAMClient, DeleteRoleCommand, DeletePolicyCommand, DetachRolePolicyCommand } from "@aws-sdk/client-iam";

export const deleteRole = async (roleName: string) => {
    const iamClient = new IAMClient({ region: process.env.SERVICE_REGION });
    try {
        await iamClient.send(
            new DeleteRoleCommand({
                RoleName: roleName,
            }),
        );
    } catch (e) {
        console.log("deleteRole ERROR!", e);
        return null;
    }
};

export const deletePolicy = async (policyArn: string) => {
    const iamClient = new IAMClient({ region: process.env.SERVICE_REGION });
    try {
        await iamClient.send(
            new DeletePolicyCommand({
                PolicyArn: policyArn,
            }),
        );
    } catch (e) {
        console.log("deletePolicy ERROR!", e);
        return null;
    }
};

export const detachRolePolicy = async (policyArn: string, roleName: string) => {
    const iamClient = new IAMClient({ region: process.env.SERVICE_REGION });
    try {
        await iamClient.send(
            new DetachRolePolicyCommand({
                PolicyArn: policyArn,
                RoleName: roleName,
            }),
        );
    } catch (e) {
        console.log("detachRolePolicy ERROR!", e);
        return null;
    }
};
