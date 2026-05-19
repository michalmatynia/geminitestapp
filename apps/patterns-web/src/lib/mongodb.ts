import { MongoClient, type Db } from 'mongodb';

const DEFAULT_MONGODB_URI = 'mongodb://127.0.0.1:27023/patterns_web_local';
const DEFAULT_MONGODB_DB = 'patterns_web_local';

const firstEnvValue = (...keys: string[]): string | null => {
  for (const key of keys) {
    const value = process.env[key]?.trim();
    if (value) return value;
  }
  return null;
};

const databaseNameFromUri = (uri: string | null): string | null => {
  if (uri === null) return null;
  try {
    const parsed = new URL(uri);
    const dbName = parsed.pathname.replace(/^\/+/, '').trim();
    return dbName.length > 0 ? dbName : null;
  } catch {
    return null;
  }
};

const resolvePatternsMongoConfig = (): { uri: string; dbName: string } => {
  const activeSource = firstEnvValue(
    'PATTERNS_MONGODB_ACTIVE_SOURCE',
    'MONGODB_PATTERNS_ACTIVE_SOURCE'
  );
  const useCloud = activeSource === 'cloud';

  const uri = useCloud
    ? firstEnvValue(
        'PATTERNS_MONGODB_CLOUD_URI',
        'MONGODB_PATTERNS_CLOUD_URI',
        'PATTERNS_MONGODB_URI',
        'MONGODB_PATTERNS_URI',
        ...(process.env.NODE_ENV === 'production' ? ['MONGODB_URI'] : [])
      )
    : firstEnvValue(
        'PATTERNS_MONGODB_LOCAL_URI',
        'MONGODB_PATTERNS_LOCAL_URI',
        'PATTERNS_MONGODB_URI',
        'MONGODB_PATTERNS_URI'
      );

  const dbName = useCloud
    ? firstEnvValue(
        'PATTERNS_MONGODB_CLOUD_DB',
        'MONGODB_PATTERNS_CLOUD_DB',
        'PATTERNS_MONGODB_DB',
        'MONGODB_PATTERNS_DB',
        ...(process.env.NODE_ENV === 'production' ? ['MONGODB_DB'] : [])
      )
    : firstEnvValue(
        'PATTERNS_MONGODB_LOCAL_DB',
        'MONGODB_PATTERNS_LOCAL_DB',
        'PATTERNS_MONGODB_DB',
        'MONGODB_PATTERNS_DB'
      );

  const resolvedUri = uri ?? DEFAULT_MONGODB_URI;
  return {
    uri: resolvedUri,
    dbName: dbName ?? databaseNameFromUri(resolvedUri) ?? DEFAULT_MONGODB_DB,
  };
};

const { uri: MONGODB_URI, dbName: MONGODB_DB } = resolvePatternsMongoConfig();

const clientCache = new Map<string, MongoClient>();

async function getClient(): Promise<MongoClient> {
  const cached = clientCache.get(MONGODB_URI);
  if (cached) return cached;

  const client = new MongoClient(MONGODB_URI, {
    maxPoolSize: 5,
    minPoolSize: 1,
    serverSelectionTimeoutMS: 1500,
    connectTimeoutMS: 1500,
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
  await Promise.all(clients.map((client) => client.close()));
}
