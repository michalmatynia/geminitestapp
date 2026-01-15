import { MongoClient } from "mongodb";

let client: MongoClient | null = null;
let clientPromise: Promise<MongoClient> | null = null;

const getMongoUri = () => {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    throw new Error("MONGODB_URI is not set.");
  }
  return uri;
};

export async function getMongoClient() {
  if (client) return client;
  if (!clientPromise) {
    clientPromise = new MongoClient(getMongoUri()).connect();
  }
  client = await clientPromise;
  return client;
}

export async function getMongoDb() {
  const dbName = process.env.MONGODB_DB || "app";
  const mongoClient = await getMongoClient();
  return mongoClient.db(dbName);
}
