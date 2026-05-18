import 'server-only';

import { getAuthDataProvider, requireAuthProvider } from '@/shared/lib/auth/services/auth-provider';
import { getMongoDb } from '@/shared/lib/db/mongo-client';
import {
  type ChallengeRecord,
  CHALLENGES_COLLECTION,
} from './auth-challenge-types';
import {
  getMongoChallenge,
  setMongoChallenge,
  deleteMongoChallenge
} from './auth-challenge-mongo';
import { parseChallengeRecord } from './auth-challenge-parser';

const memoryChallenges = new Map<string, ChallengeRecord>();
let challengeIndexesReady: Promise<void> | null = null;

export const getMemoryChallenge = (id: string): ChallengeRecord | null => memoryChallenges.get(id) ?? null;
export const setMemoryChallenge = (record: ChallengeRecord): void => {
  memoryChallenges.set(record._id, record);
};
export const deleteMemoryChallenge = (id: string): boolean => memoryChallenges.delete(id);

export const listMongoChallenges = async (): Promise<ChallengeRecord[]> => {
  const mongoUri = process.env['MONGODB_URI'];
  if (typeof mongoUri !== 'string' || mongoUri.length === 0) {
    throw new Error('Database Configuration Error: MONGODB_URI is required to list auth challenges from MongoDB.');
  }
  const mongo = await getMongoDb();
  const rows = await mongo.collection<ChallengeRecord>(CHALLENGES_COLLECTION).find({}).toArray();
  return rows
    .map((row) => parseChallengeRecord(row))
    .filter((row): row is ChallengeRecord => row !== null);
};

export const listMemoryChallenges = (): ChallengeRecord[] => [...memoryChallenges.values()];

export const getChallenge = async (id: string): Promise<ChallengeRecord | null> => {
  requireAuthProvider(await getAuthDataProvider());
  const mongoUri = process.env['MONGODB_URI'];
  if (typeof mongoUri === 'string' && mongoUri.length > 0) {
    return getMongoChallenge(id);
  }
  return getMemoryChallenge(id);
};

export const setChallenge = async (record: ChallengeRecord): Promise<void> => {
  requireAuthProvider(await getAuthDataProvider());
  const mongoUri = process.env['MONGODB_URI'];
  if (typeof mongoUri === 'string' && mongoUri.length > 0) {
    challengeIndexesReady ??= (async (): Promise<void> => {
      const mongo = await getMongoDb();
      const collection = mongo.collection<ChallengeRecord>(CHALLENGES_COLLECTION);
      await collection.createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 });
      await collection.createIndex({ userId: 1 });
      await collection.createIndex({ email: 1, purpose: 1 });
    })();
    await challengeIndexesReady;
    await setMongoChallenge(record);
    return;
  }
  setMemoryChallenge(record);
};

export const deleteChallenge = async (id: string): Promise<void> => {
  requireAuthProvider(await getAuthDataProvider());
  const mongoUri = process.env['MONGODB_URI'];
  if (typeof mongoUri === 'string' && mongoUri.length > 0) {
    await deleteMongoChallenge(id);
    return;
  }
  deleteMemoryChallenge(id);
};

export const listChallengesInternal = async (parser: (row: Record<string, unknown>) => ChallengeRecord | null): Promise<ChallengeRecord[]> => {
  requireAuthProvider(await getAuthDataProvider());
  const mongoUri = process.env['MONGODB_URI'];
  if (typeof mongoUri === 'string' && mongoUri.length > 0) {
    const mongo = await getMongoDb();
    const rows = await mongo.collection<ChallengeRecord>(CHALLENGES_COLLECTION).find({}).toArray();
    return rows
      .map((row) => parser(row as unknown as Record<string, unknown>))
      .filter((row): row is ChallengeRecord => row !== null);
  }
  return listMemoryChallenges();
};

export const deleteChallenges = async (ids: string[]): Promise<void> => {
  if (ids.length === 0) {
    return;
  }

  requireAuthProvider(await getAuthDataProvider());

  const mongoUri = process.env['MONGODB_URI'];
  if (typeof mongoUri === 'string' && mongoUri.length > 0) {
    const mongo = await getMongoDb();
    await mongo.collection<ChallengeRecord>(CHALLENGES_COLLECTION).deleteMany({
      _id: {
        $in: ids,
      },
    });
    return;
  }

  ids.forEach((id) => {
    deleteMemoryChallenge(id);
  });
};
