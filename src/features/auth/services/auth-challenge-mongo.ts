import 'server-only';

import { getMongoDb } from '@/shared/lib/db/mongo-client';
import {
  type ChallengeRecord,
  CHALLENGES_COLLECTION,
} from './auth-challenge-types';

export const getMongoChallenge = async (id: string): Promise<ChallengeRecord | null> => {
  const mongoUri = process.env['MONGODB_URI'];
  if (typeof mongoUri !== 'string' || mongoUri.length === 0) {
    throw new Error('Database Configuration Error: MONGODB_URI is required to retrieve an auth challenge from MongoDB.');
  }
  const mongo = await getMongoDb();
  return mongo.collection<ChallengeRecord>(CHALLENGES_COLLECTION).findOne({ _id: id });
};

export const setMongoChallenge = async (record: ChallengeRecord): Promise<void> => {
  const mongoUri = process.env['MONGODB_URI'];
  if (typeof mongoUri !== 'string' || mongoUri.length === 0) {
    throw new Error('Database Configuration Error: MONGODB_URI is required to set an auth challenge in MongoDB.');
  }
  const mongo = await getMongoDb();
  await mongo
    .collection<ChallengeRecord>(CHALLENGES_COLLECTION)
    .updateOne({ _id: record._id }, { $set: record }, { upsert: true });
};

export const deleteMongoChallenge = async (id: string): Promise<void> => {
  const mongoUri = process.env['MONGODB_URI'];
  if (typeof mongoUri !== 'string' || mongoUri.length === 0) {
    throw new Error('Database Configuration Error: MONGODB_URI is required to delete an auth challenge from MongoDB.');
  }
  const mongo = await getMongoDb();
  await mongo.collection<ChallengeRecord>(CHALLENGES_COLLECTION).deleteOne({ _id: id });
};
