// Interface to load env variables
// Note these variables can possibly be undefined
// as someone could skip these varibales or not setup a .env file at all

interface ENV {
    SERVICE_REGION: string | undefined;
    AWS_REGION: string | undefined;
    STAGE: string | undefined;
    DOMAIN: string | undefined;
    MAIN_TABLE_NAME: string | undefined;
    GLOBAL_COGNITO_USER_POOL_NAME: string | undefined;
    DEFAULT_USER_FIRST_NAME: string | undefined;
    DEFAULT_USER_LAST_NAME: string | undefined;
    DEFAULT_USER_EMAIL: string | undefined;
}

interface Config {
    SERVICE_REGION: string;
    AWS_REGION: string;
    STAGE: string;
    DOMAIN: string;
    MAIN_TABLE_NAME: string;
    GLOBAL_COGNITO_USER_POOL_NAME: string;
    DEFAULT_USER_FIRST_NAME: string;
    DEFAULT_USER_LAST_NAME: string;
    DEFAULT_USER_EMAIL: string;
}

// Loading process.env as ENV interface

const getConfig = (): ENV => {
  return {
    SERVICE_REGION: process.env.SERVICE_REGION,
    AWS_REGION: process.env.AWS_REGION,
    STAGE: process.env.STAGE,
    DOMAIN: process.env.DOMAIN,
    MAIN_TABLE_NAME: process.env.MAIN_TABLE_NAME,
    GLOBAL_COGNITO_USER_POOL_NAME: process.env.GLOBAL_COGNITO_USER_POOL_NAME,
    DEFAULT_USER_FIRST_NAME: process.env.DEFAULT_USER_FIRST_NAME,
    DEFAULT_USER_LAST_NAME: process.env.DEFAULT_USER_LAST_NAME,
    DEFAULT_USER_EMAIL: process.env.DEFAULT_USER_EMAIL,
  };
};

// Throwing an Error if any field was undefined we don't 
// want our app to run if it can't connect to DB and ensure 
// that these fields are accessible. If all is good return
// it as Config which just removes the undefined from our type 
// definition.

const getSanitzedConfig = (config: ENV): Config => {
  for (const [key, value] of Object.entries(config)) {
    if (value === undefined) {
      throw new Error(`Missing key ${key} in config.env`);
    }
  }
  return config as Config;
};

const config = getConfig();

const sanitizedConfig = getSanitzedConfig(config);

export default sanitizedConfig;
