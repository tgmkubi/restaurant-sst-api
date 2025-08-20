// Connection cache helper for Lambda reuse
let connectionCache: { [key: string]: any } = {};

export const getCachedConnection = (key: string) => {
    return connectionCache[key];
};

export const setCachedConnection = (key: string, connection: any) => {
    connectionCache[key] = connection;
};

export const clearConnectionCache = () => {
    connectionCache = {};
};

// Warm up connections for better performance
export const warmUpConnections = async () => {
    // This can be called during Lambda initialization
    console.log('Warming up database connections...');
};