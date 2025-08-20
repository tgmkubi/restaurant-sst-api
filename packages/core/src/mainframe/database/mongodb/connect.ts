import mongoose from 'mongoose';
import {getSecret} from "../../helpers/aws/secrets";
import {moduleTypes} from "../../../../../../stacks/helpers/stackConstants";

const mongoDbSecretName = process.env.MONGO_DB_SECRET_NAME || undefined;

// Global connection cache
let globalConnection: mongoose.Connection | null = null;
// Tenant connections cache (singleton)
const tenantConnections: Map<string, mongoose.Connection> = new Map();

// Retry helper for connection
async function withRetry(fn: () => Promise<mongoose.Connection>, retries = 2, delay = 1000): Promise<mongoose.Connection> {
    let lastError;
    for (let i = 0; i <= retries; i++) {
        try {
            return await fn();
        } catch (err) {
            lastError = err;
            if (i < retries) await new Promise(res => setTimeout(res, delay));
        }
    }
    throw lastError;
}

export const initMongodbConnection = async (databaseName: string) => {
    if (!mongoDbSecretName) throw new Error("MongoDB secret name is not provided");
    const {connectionUri} = await getSecret(mongoDbSecretName);
    if (!connectionUri) {
        throw new Error("MongoDB connection URI not found in secrets");
    }

    // Global DB
    if (databaseName === moduleTypes.GLOBAL) {
        if (globalConnection) {
            if (globalConnection.readyState === 1) {
                console.log("GLOBAL MONGODB CONNECTION ALREADY EXISTS");
                return globalConnection;
            } else {
                // Bağlantı bozulduysa kapat
                try { await globalConnection.close(); } catch {}
                globalConnection = null;
            }
        }
        const connectionUriParts = connectionUri.split("?");
        const uri = `${connectionUriParts[0]}${databaseName}?${connectionUriParts[1]}&maxPoolSize=10&minPoolSize=2&maxIdleTimeMS=30000&serverSelectionTimeoutMS=5000&socketTimeoutMS=20000&connectTimeoutMS=15000`;
        console.log("Connecting to Global MongoDB with URI:", uri);
        globalConnection = await withRetry(() => mongoose.createConnection(uri, {
            maxPoolSize: 10,
            minPoolSize: 2,
            maxIdleTimeMS: 30000,
            serverSelectionTimeoutMS: 5000,
            socketTimeoutMS: 20000,
            connectTimeoutMS: 15000,
            bufferCommands: false
        }).asPromise());
        return globalConnection;
    } else {
        // Tenant DB
        if (tenantConnections.has(databaseName)) {
            const existingConnection = tenantConnections.get(databaseName)!;
            if (existingConnection.readyState === 1) {
                console.log(`TENANT MONGODB CONNECTION ALREADY EXISTS: ${databaseName}`);
                return existingConnection;
            } else {
                // Bağlantı bozulduysa kapat
                try { await existingConnection.close(); } catch {}
                tenantConnections.delete(databaseName);
            }
        }
        const connectionUriParts = connectionUri.split("?");
        const uri = `${connectionUriParts[0]}${databaseName}?${connectionUriParts[1]}&maxPoolSize=3&minPoolSize=1&maxIdleTimeMS=20000&serverSelectionTimeoutMS=5000&socketTimeoutMS=15000&connectTimeoutMS=10000`;
        console.log(`Connecting to Tenant MongoDB with URI: ${databaseName}`);
        const connection = await withRetry(() => mongoose.createConnection(uri, {
            maxPoolSize: 3,
            minPoolSize: 1,
            maxIdleTimeMS: 20000,
            serverSelectionTimeoutMS: 5000,
            socketTimeoutMS: 15000,
            connectTimeoutMS: 10000,
            bufferCommands: false
        }).asPromise());
        tenantConnections.set(databaseName, connection);
        return connection;
    }
};

export const closeMongodbConnection = async () => {
    // Close global connection
    if (globalConnection && globalConnection.readyState === 1) {
        console.log("CLOSING GLOBAL MONGODB CONNECTION");
        await globalConnection.close();
        globalConnection = null;
    }
    
    // Close all tenant connections
    for (const [databaseName, connection] of tenantConnections) {
        if (connection.readyState === 1) {
            console.log(`CLOSING TENANT MONGODB CONNECTION: ${databaseName}`);
            await connection.close();
        }
    }
    tenantConnections.clear();
};

export const getMongodbConnection = async (databaseName: string | undefined = moduleTypes.GLOBAL) => {
    const dbName = databaseName || moduleTypes.GLOBAL;
    
    if (dbName === moduleTypes.GLOBAL) {
        if (globalConnection && globalConnection.readyState === 1) {
            console.log("GLOBAL MONGODB CONNECTION ALREADY EXISTS");
            return globalConnection;
        }
    } else {
        if (tenantConnections.has(dbName)) {
            const existingConnection = tenantConnections.get(dbName)!;
            if (existingConnection.readyState === 1) {
                console.log(`TENANT MONGODB CONNECTION ALREADY EXISTS: ${dbName}`);
                return existingConnection;
            }
        }
    }
    
    console.log(`CREATING ---> MONGODB CONNECTION: ${dbName}`);
    return await initMongodbConnection(dbName);
}

// Utility functions for getting models with specific connections
export const getGlobalModels = async () => {
    const connection = await getMongodbConnection(moduleTypes.GLOBAL);
    // Bağlantı hazır olana kadar bekle (retry)
    let retries = 3;
    while (connection.readyState !== 1 && retries > 0) {
        await new Promise(res => setTimeout(res, 500));
        retries--;
    }
    if (connection.readyState !== 1) throw new Error('Global MongoDB connection is not ready');

    const { CompanyModel } = await import('./models/company.model');
    const { UserModel } = await import('./models/user.model');
    const { RestaurantModel } = await import('./models/restaurant.model');

    const CompanyModelInstance = connection.model('Company', CompanyModel.schema);
    const UserModelInstance = connection.model('User', UserModel.schema);
    const RestaurantModelInstance = connection.model('Restaurant', RestaurantModel.schema);

    return {
        Company: CompanyModelInstance,
        User: UserModelInstance,
        Restaurant: RestaurantModelInstance,
    };
};

export const getTenantModels = async (databaseName: string) => {
    const connection = await getMongodbConnection(databaseName);
    // Bağlantı hazır olana kadar bekle (retry)
    let retries = 3;
    while (connection.readyState !== 1 && retries > 0) {
        await new Promise(res => setTimeout(res, 500));
        retries--;
    }
    if (connection.readyState !== 1) throw new Error('Tenant MongoDB connection is not ready');

    const { RestaurantModel } = await import('./models/restaurant.model');
    const { CategoryModel } = await import('./models/category.model');
    const { ProductModel } = await import('./models/product.model');
    const { QRCodeModel } = await import('./models/qrcode.model');
    const { UserModel } = await import('./models/user.model');
    const { MenuModel } = await import('./models/menu.model');

    return {
        Restaurant: connection.model('Restaurant', RestaurantModel.schema),
        Category: connection.model('Category', CategoryModel.schema),
        Product: connection.model('Product', ProductModel.schema),
        QRCode: connection.model('QRCode', QRCodeModel.schema),
        User: connection.model('User', UserModel.schema),
        Menu: connection.model('Menu', MenuModel.schema),
    };
};
