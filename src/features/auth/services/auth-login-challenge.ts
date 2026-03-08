import 'server-only';

import crypto from 'crypto';

import { getAuthDataProvider, requireAuthProvider } from '@/shared/lib/auth/services/auth-provider';
import { getMongoDb } from '@/shared/lib/db/mongo-client';
import prisma from '@/shared/lib/db/prisma';

export type AuthChallengePurpose =
  | 'credentials'
  | 'magic_login'
  | 'magic_email_link'
  | 'email_verification';

type ChallengeRecord = {
  _id: string;
  userId: string;
  email: string;
  ip: string | null;
  mfaRequired: boolean;
  purpose: AuthChallengePurpose;
  callbackUrl: string | null;
  expiresAt: Date;
  createdAt: Date;
};

const CHALLENGES_COLLECTION = 'auth_login_challenges';
const DEFAULT_LOGIN_CHALLENGE_TTL_MINUTES = 5;
const MAGIC_LOGIN_CHALLENGE_TTL_MINUTES = 10;
const MAGIC_EMAIL_LINK_TTL_MINUTES = 20;
const EMAIL_VERIFICATION_TTL_MINUTES = 7 * 24 * 60;

const memoryChallenges = new Map<string, ChallengeRecord>();
let challengeIndexesReady: Promise<void> | null = null;

const nowPlusMinutes = (minutes: number): Date => new Date(Date.now() + minutes * 60 * 1000);

const isAuthChallengePurpose = (value: unknown): value is AuthChallengePurpose =>
  value === 'credentials' ||
  value === 'magic_login' ||
  value === 'magic_email_link' ||
  value === 'email_verification';

const toDate = (value: unknown): Date | null => {
  if (value instanceof Date) return value;
  if (typeof value === 'string' || typeof value === 'number') {
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }
  return null;
};

const normalizeCallbackUrl = (value: unknown): string | null => {
  if (typeof value !== 'string') {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
};

const parseChallengeRecord = (value: unknown): ChallengeRecord | null => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const record = value as Record<string, unknown>;
  const expiresAt = toDate(record['expiresAt']);
  const createdAt = toDate(record['createdAt']);
  if (
    typeof record['_id'] !== 'string' ||
    typeof record['userId'] !== 'string' ||
    typeof record['email'] !== 'string' ||
    typeof record['mfaRequired'] !== 'boolean' ||
    !expiresAt ||
    !createdAt
  ) {
    return null;
  }
  return {
    _id: record['_id'],
    userId: record['userId'],
    email: record['email'],
    ip: typeof record['ip'] === 'string' ? record['ip'] : null,
    mfaRequired: record['mfaRequired'],
    purpose: isAuthChallengePurpose(record['purpose']) ? record['purpose'] : 'credentials',
    callbackUrl: normalizeCallbackUrl(record['callbackUrl']),
    expiresAt,
    createdAt,
  };
};

const getMongoChallenge = async (id: string): Promise<ChallengeRecord | null> => {
  if (!process.env['MONGODB_URI']) return null;
  const mongo = await getMongoDb();
  return mongo.collection<ChallengeRecord>(CHALLENGES_COLLECTION).findOne({ _id: id });
};

const getPrismaChallenge = async (id: string): Promise<ChallengeRecord | null> => {
  const row = await prisma.authLoginChallenge.findUnique({ where: { id } });
  if (!row) return null;
  return parseChallengeRecord(row.data);
};

const setMongoChallenge = async (record: ChallengeRecord): Promise<void> => {
  if (!process.env['MONGODB_URI']) return;
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
  if (!process.env['MONGODB_URI']) return;
  const mongo = await getMongoDb();
  await mongo.collection<ChallengeRecord>(CHALLENGES_COLLECTION).deleteOne({ _id: id });
};

const deletePrismaChallenge = async (id: string): Promise<void> => {
  await prisma.authLoginChallenge.deleteMany({ where: { id } });
};

const getMemoryChallenge = (id: string): ChallengeRecord | null => memoryChallenges.get(id) ?? null;
const setMemoryChallenge = (record: ChallengeRecord): void => {
  memoryChallenges.set(record._id, record);
};
const deleteMemoryChallenge = (id: string): boolean => memoryChallenges.delete(id);

const getChallenge = async (id: string): Promise<ChallengeRecord | null> => {
  const provider = requireAuthProvider(await getAuthDataProvider());
  if (provider === 'prisma') {
    return getPrismaChallenge(id);
  }
  if (process.env['MONGODB_URI']) {
    return getMongoChallenge(id);
  }
  return getMemoryChallenge(id);
};

const setChallenge = async (record: ChallengeRecord): Promise<void> => {
  const provider = requireAuthProvider(await getAuthDataProvider());
  if (provider === 'prisma') {
    await setPrismaChallenge(record);
    return;
  }
  if (process.env['MONGODB_URI']) {
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
  if (provider === 'prisma') {
    await deletePrismaChallenge(id);
    return;
  }
  if (process.env['MONGODB_URI']) {
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
  purpose?: Extract<AuthChallengePurpose, 'credentials' | 'magic_login'>;
  callbackUrl?: string | null;
  ttlMinutes?: number;
}): Promise<{ id: string; expiresAt: Date; mfaRequired: boolean }> => {
  const id = crypto.randomBytes(32).toString('hex');
  const record: ChallengeRecord = {
    _id: id,
    userId: input.userId,
    email: input.email.toLowerCase(),
    ip: input.ip ?? null,
    mfaRequired: input.mfaRequired,
    purpose: input.purpose ?? 'credentials',
    callbackUrl: normalizeCallbackUrl(input.callbackUrl),
    expiresAt: nowPlusMinutes(input.ttlMinutes ?? DEFAULT_LOGIN_CHALLENGE_TTL_MINUTES),
    createdAt: new Date(),
  };
  await setChallenge(record);
  return { id, expiresAt: record.expiresAt, mfaRequired: record.mfaRequired };
};

const createStoredChallenge = async (input: {
  userId: string;
  email: string;
  purpose: AuthChallengePurpose;
  ttlMinutes: number;
  callbackUrl?: string | null;
  ip?: string | null;
  mfaRequired?: boolean;
}): Promise<{ id: string; expiresAt: Date }> => {
  const record: ChallengeRecord = {
    _id: crypto.randomBytes(32).toString('hex'),
    userId: input.userId,
    email: input.email.toLowerCase(),
    ip: input.ip ?? null,
    mfaRequired: input.mfaRequired ?? false,
    purpose: input.purpose,
    callbackUrl: normalizeCallbackUrl(input.callbackUrl),
    expiresAt: nowPlusMinutes(input.ttlMinutes),
    createdAt: new Date(),
  };

  await setChallenge(record);
  return {
    id: record._id,
    expiresAt: record.expiresAt,
  };
};

const consumeStoredChallenge = async (input: {
  id: string;
  allowedPurposes: AuthChallengePurpose[];
  email?: string | null;
  ip?: string | null;
}): Promise<ChallengeRecord | null> => {
  const record = await getChallenge(input.id);
  if (!record) return null;
  await deleteChallenge(input.id);

  if (record.expiresAt.getTime() < Date.now()) return null;
  if (!input.allowedPurposes.includes(record.purpose)) return null;
  if (typeof input.email === 'string' && record.email !== input.email.toLowerCase()) return null;
  if (record.ip && input.ip && record.ip !== input.ip) return null;

  return record;
};

export const consumeLoginChallenge = async (input: {
  id: string;
  email: string;
  ip: string | null;
}): Promise<ChallengeRecord | null> => {
  return consumeStoredChallenge({
    ...input,
    allowedPurposes: ['credentials', 'magic_login'],
  });
};

export const createMagicLoginChallenge = async (input: {
  userId: string;
  email: string;
  callbackUrl?: string | null;
}): Promise<{ id: string; expiresAt: Date }> =>
  createStoredChallenge({
    userId: input.userId,
    email: input.email,
    purpose: 'magic_login',
    ttlMinutes: MAGIC_LOGIN_CHALLENGE_TTL_MINUTES,
    callbackUrl: input.callbackUrl,
  });

export const createMagicEmailLinkChallenge = async (input: {
  userId: string;
  email: string;
  callbackUrl?: string | null;
}): Promise<{ id: string; expiresAt: Date }> =>
  createStoredChallenge({
    userId: input.userId,
    email: input.email,
    purpose: 'magic_email_link',
    ttlMinutes: MAGIC_EMAIL_LINK_TTL_MINUTES,
    callbackUrl: input.callbackUrl,
  });

export const createEmailVerificationChallenge = async (input: {
  userId: string;
  email: string;
  callbackUrl?: string | null;
}): Promise<{ id: string; expiresAt: Date }> =>
  createStoredChallenge({
    userId: input.userId,
    email: input.email,
    purpose: 'email_verification',
    ttlMinutes: EMAIL_VERIFICATION_TTL_MINUTES,
    callbackUrl: input.callbackUrl,
  });

export const consumeMagicEmailLinkChallenge = async (
  id: string
): Promise<ChallengeRecord | null> =>
  consumeStoredChallenge({
    id,
    allowedPurposes: ['magic_email_link'],
  });

export const consumeEmailVerificationChallenge = async (
  id: string
): Promise<ChallengeRecord | null> =>
  consumeStoredChallenge({
    id,
    allowedPurposes: ['email_verification'],
  });
