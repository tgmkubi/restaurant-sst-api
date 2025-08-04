import { SSTConfig } from "sst";
import {ConfigStack} from "./stacks/ConfigStack";
import {InitialStack} from "./stacks/InitialStack";
import {GlobalAdminApiStack} from "./stacks/Global-Admin-Api-Stack";
import {GlobalPublicApiStack} from "./stacks/Global-Public-Api-Stack";
import {AdminApiStack} from "./stacks/Admin-Api-Stack";
import {ProtectedApiStack} from "./stacks/Protected-Api-Stack";

export default {
    config() {
        return {
            name: "kss-backend",
            region: "eu-central-1",
        };
    },
    stacks(app) {
        const stackName = (stackName: string) => {
            return `kss-${app.stage}-${stackName}-stack`;
        };
        const stackId = (stackName: string) => {
            return `kss-${stackName}`;
        };

        const environment: { [name: string]: any } = {
            SERVICE_REGION: process.env.SERVICE_REGION,
            STAGE: process.env.STAGE,
            DOMAIN: process.env.DOMAIN,
            MAIN_TABLE_NAME: process.env.MAIN_TABLE_NAME,
            GLOBAL_COGNITO_USER_POOL_NAME: process.env.GLOBAL_COGNITO_USER_POOL_NAME,
            DEFAULT_USER_FIRST_NAME: process.env.DEFAULT_USER_FIRST_NAME,
            DEFAULT_USER_LAST_NAME: process.env.DEFAULT_USER_LAST_NAME,
            DEFAULT_USER_EMAIL: process.env.DEFAULT_USER_EMAIL
        };
        app.setDefaultFunctionProps({
            environment: environment,
            runtime: "nodejs20.x",
        });

        app.stack(ConfigStack, { stackName: stackName("Config"), id: stackId("Config") });
        app.stack(InitialStack, { stackName: stackName("Initial"), id: stackId("Initial") });
        app.stack(GlobalAdminApiStack, { stackName: stackName("GlobalAdminApi"), id: stackId("GlobalAdminApi") });
        app.stack(GlobalPublicApiStack, { stackName: stackName("GlobalPublicApi"), id: stackId("GlobalPublicApi") });

        app.stack(AdminApiStack, { stackName: stackName("AdminApi"), id: stackId("AdminApi") });
        app.stack(ProtectedApiStack, { stackName: stackName("ProtectedApi"), id: stackId("ProtectedApi") });


    },
} satisfies SSTConfig;
