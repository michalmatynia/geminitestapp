import "server-only";

import crypto from "crypto";
import prisma from "@/shared/lib/db/prisma";
import { getMongoDb } from "@/shared/lib/db/mongo-client";
import { getAuthDataProvider, requireAuthProvider } from "@/features/auth/services/auth-provider";

type ChallengeRecord = {
  _id: string;
  userId: string;
  email: string;
  ip: string | null;
  mfaRequired: boolean;
  expiresAt: Date;
  createdAt: Date;
};

const CHALLENGES_COLLECTION = "auth_login_challenges";
const CHALLENGE_TTL_MINUTES = 5;

const memoryChallenges = new Map<string, ChallengeRecord>();
let challengeIndexesReady: Promise<void> | null = null;

const nowPlusMinutes = (minutes: number): Date =>
  new Date(Date.now() + minutes * 60 * 1000);

const getMongoChallenge = async (id: string): Promise<ChallengeRecord | null> => {
  if (!process.env.MONGODB_URI) return null;
  const mongo = await getMongoDb();
  return mongo.collection<ChallengeRecord>(CHALLENGES_COLLECTION).findOne({ _id: id });
};

const getPrismaChallenge = async (id: string): Promise<ChallengeRecord | null> => {
  const row = await prisma.authLoginChallenge.findUnique({ where: { id } });
  if (!row) return null;
  if (row.data && typeof row.data === "object") {
    return row.data as unknown as ChallengeRecord;
  }
  return null;
};

const setMongoChallenge = async (record: ChallengeRecord): Promise<void> => {
  if (!process.env.MONGODB_URI) return;
  const mongo = await getMongoDb();
  await mongo
    .collection<ChallengeRecord>(CHALLENGES_COLLECTION)
    .updateOne({ _id: record._id }, { $set: record }, { upsert: true });
};

const setPrismaChallenge = async (record: ChallengeRecord): Promise<void> => {
  await prisma.authLoginChallenge.upsert({
    where: { id: record._id },
    update: { data: record },
    create: { id: record._id, data: record },
  });
};

const deleteMongoChallenge = async (id: string): Promise<void> => {
  if (!process.env.MONGODB_URI) return;
  const mongo = await getMongoDb();
  await mongo.collection<ChallengeRecord>(CHALLENGES_COLLECTION).deleteOne({ _id: id });
};

const deletePrismaChallenge = async (id: string): Promise<void> => {
  await prisma.authLoginChallenge.deleteMany({ where: { id } });
};

const getMemoryChallenge = (id: string): ChallengeRecord | null => memoryChallenges.get(id) ?? null;
const setMemoryChallenge = (record: ChallengeRecord): void => { memoryChallenges.set(record._id, record); };
const deleteMemoryChallenge = (id: string): boolean => memoryChallenges.delete(id);

const getChallenge = async (id: string): Promise<ChallengeRecord | null> => {
  const provider = requireAuthProvider(await getAuthDataProvider());
  if (provider === "prisma") {
    return getPrismaChallenge(id);
  }
  if (process.env.MONGODB_URI) {
    return getMongoChallenge(id);
  }
  return getMemoryChallenge(id);
};

const setChallenge = async (record: ChallengeRecord): Promise<void> => {
  const provider = requireAuthProvider(await getAuthDataProvider());
  if (provider === "prisma") {
    await setPrismaChallenge(record);
    return;
  }
  if (process.env.MONGODB_URI) {
    if (!challengeIndexesReady) {
      challengeIndexesReady = (async (): Promise<void> => {
        const mongo = await getMongoDb();
        const collection = mongo.collection<ChallengeRecord>(CHALLENGES_COLLECTION);
        await collection.createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 });
        await collection.createIndex({ userId: 1 });
      })();
    }
    await challengeIndexesReady;
    await setMongoChallenge(record);
    return;
  }
  setMemoryChallenge(record);
};

const deleteChallenge = async (id: string): Promise<void> => {
  const provider = requireAuthProvider(await getAuthDataProvider());
  if (provider === "prisma") {
    await deletePrismaChallenge(id);
    return;
  }
  if (process.env.MONGODB_URI) {
    await deleteMongoChallenge(id);
    return;
  }
  deleteMemoryChallenge(id);
};

export const createLoginChallenge = async (input: {
  userId: string;
  email: string;
  ip: string | null;
  mfaRequired: boolean;
}): Promise<{ id: string; expiresAt: Date; mfaRequired: boolean }> => {
  const id = crypto.randomBytes(32).toString("hex");
  const record: ChallengeRecord = {
    _id: id,
    userId: input.userId,
    email: input.email.toLowerCase(),
    ip: input.ip ?? null,
    mfaRequired: input.mfaRequired,
    expiresAt: nowPlusMinutes(CHALLENGE_TTL_MINUTES),
    createdAt: new Date(),
  };
  await setChallenge(record);
  return { id, expiresAt: record.expiresAt, mfaRequired: record.mfaRequired };
};

export const consumeLoginChallenge = async (input: {
  id: string;
  email: string;
  ip: string | null;
}): Promise<ChallengeRecord | null> => {
  const record = await getChallenge(input.id);
  if (!record) return null;
  await deleteChallenge(input.id);

  if (record.expiresAt.getTime() < Date.now()) return null;
  if (record.email !== input.email.toLowerCase()) return null;
  if (record.ip && input.ip && record.ip !== input.ip) return null;

  return record;
};
