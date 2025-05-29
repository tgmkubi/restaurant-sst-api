import mongoose from 'mongoose';
import {getSecret} from "../../helpers/aws/secrets";
import {moduleTypes} from "../../../../../../stacks/helpers/stackConstants";

const mongoDbSecretName = process.env.MONGO_DB_SECRET_NAME || undefined;

export const initMongodbConnection = async (databaseName: string) => {
    if (!mongoDbSecretName) throw new Error("MongoDB secret name is not provided");
    const {connectionUri} = await getSecret(mongoDbSecretName);
    if (!connectionUri) {
        throw new Error("MongoDB connection URI not found in secrets");
    }
    const connectionUriParts = connectionUri.split("?");
    const uri = `${connectionUriParts[0]}${databaseName}?${connectionUriParts[1]}`;
    console.log("Connecting to MongoDB with URI:", uri);
    return await mongoose.connect(uri);
}

export const closeMongodbConnection = async () => {
    if (mongoose.connection.readyState === 1) {
        console.log("CLOSING MONGODB CONNECTION");
        await mongoose.connection.close();
    }
};

export const getMongodbConnection = async (databaseName: string | undefined = moduleTypes.GLOBAL) => {
    if (mongoose.connection.readyState === 1) {
        console.log("MONGODB CONNECTION ALREADY EXISTS");
        return mongoose.connection;
    } else {
        console.log("CREATING ---> MONGODB CONNECTION");
        return await initMongodbConnection(databaseName);
    }
}
