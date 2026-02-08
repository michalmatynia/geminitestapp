import 'server-only';

let client: MongoClient | null = null;
let clientPromise: Promise<MongoClient> | null = null;

import { createRequire } from 'module';

import type { Db } from 'mongodb';
import type { MongoClient } from 'mongodb';


const getMongoClientCtor = (): { MongoClient: new (uri: string) => MongoClient } => {
  // Turbopack currently struggles to bundle the MongoDB driver (Node built-ins like tls, timers/promises).
  // Use a runtime require with a non-literal specifier to keep it out of the bundler graph.
  const requireFn = createRequire(import.meta.url);
  const pkgName = 'mon' + 'godb';
  return requireFn(pkgName) as { MongoClient: new (uri: string) => MongoClient };
};

const getMongoUri = (): string => {
  const uri = process.env["MONGODB_URI"];
  if (!uri) {
    throw new Error('MONGODB_URI is not set.');
  }
  return uri;
};

export async function getMongoClient(): Promise<MongoClient> {
  if (client) return client;
  if (!clientPromise) {
    const { MongoClient } = getMongoClientCtor();
    clientPromise = new MongoClient(getMongoUri()).connect();
  }
  client = await clientPromise;
  return client;
}

export async function getMongoDb(): Promise<Db> {
  const dbName = process.env["MONGODB_DB"] || 'app';
  const mongoClient = await getMongoClient();
  return mongoClient.db(dbName);
}
