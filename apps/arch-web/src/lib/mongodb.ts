import { MongoClient, type Db } from 'mongodb';

const DEFAULT_MONGODB_URI = 'mongodb://127.0.0.1:27022/arch_web_local';
const DEFAULT_MONGODB_DB = 'arch_web_local';

const firstEnvValue = (...keys: string[]): string | null => {
  for (const key of keys) {
    const value = process.env[key]?.trim();
    if (value) return value;
  }
  return null;
};

const resolveArchMongoConfig = (): { uri: string; dbName: string } => {
  const activeSource = firstEnvValue(
    'ARCH_MONGODB_ACTIVE_SOURCE',
    'MONGODB_ARCH_ACTIVE_SOURCE'
  );
  const useCloud = activeSource === 'cloud';
  const uri = useCloud
    ? firstEnvValue(
        'ARCH_MONGODB_CLOUD_URI',
        'MONGODB_ARCH_CLOUD_URI',
        'ARCH_MONGODB_URI',
        'MONGODB_ARCH_URI',
        ...(process.env.NODE_ENV === 'production' ? ['MONGODB_URI'] : [])
      )
    : firstEnvValue(
        'ARCH_MONGODB_LOCAL_URI',
        'MONGODB_ARCH_LOCAL_URI',
        'ARCH_MONGODB_URI',
        'MONGODB_ARCH_URI'
      );
  const dbName = useCloud
    ? firstEnvValue(
        'ARCH_MONGODB_CLOUD_DB',
        'MONGODB_ARCH_CLOUD_DB',
        'ARCH_MONGODB_DB',
        'MONGODB_ARCH_DB',
        ...(process.env.NODE_ENV === 'production' ? ['MONGODB_DB'] : [])
      )
    : firstEnvValue(
        'ARCH_MONGODB_LOCAL_DB',
        'MONGODB_ARCH_LOCAL_DB',
        'ARCH_MONGODB_DB',
        'MONGODB_ARCH_DB'
      );

  return {
    uri: uri ?? DEFAULT_MONGODB_URI,
    dbName: dbName ?? DEFAULT_MONGODB_DB,
  };
};

const { uri: MONGODB_URI, dbName: MONGODB_DB } = resolveArchMongoConfig();

const clientCache = new Map<string, MongoClient>();

async function getClient(): Promise<MongoClient> {
  const cached = clientCache.get(MONGODB_URI);
  if (cached) return cached;
  const client = new MongoClient(MONGODB_URI, {
    maxPoolSize: 5,
    serverSelectionTimeoutMS: 10_000,
    connectTimeoutMS: 10_000,
  });
  await client.connect();
  clientCache.set(MONGODB_URI, client);
  return client;
}

export async function getDb(): Promise<Db> {
  const client = await getClient();
  return client.db(MONGODB_DB);
}

export async function closeMongoClient(): Promise<void> {
  const clients = Array.from(clientCache.values());
  clientCache.clear();
  await Promise.all(clients.map((c) => c.close()));
}
