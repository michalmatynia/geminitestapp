import { MongoClient, type Db } from 'mongodb';

const MONGODB_URI = process.env.MONGODB_URI ?? 'mongodb://127.0.0.1:27022/arch_web_local';
const MONGODB_DB  = process.env.MONGODB_DB  ?? 'arch_web_local';

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
