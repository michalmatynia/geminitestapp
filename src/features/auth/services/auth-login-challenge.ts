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
  pendingRegistration: PendingRegistrationRecord | null;
  expiresAt: Date;
  createdAt: Date;
};

type PendingRegistrationRecord = {
  source: 'kangur_parent';
  name: string | null;
  passwordHash: string;
};

export type AuthEmailVerificationChallengeRecord = {
  userId: string;
  email: string;
  callbackUrl: string | null;
  pendingRegistration: PendingRegistrationRecord | null;
  expiresAt: Date;
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

const normalizePendingRegistration = (value: unknown): PendingRegistrationRecord | null => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return null;
  }

  const record = value as Record<string, unknown>;
  if (record['source'] !== 'kangur_parent') {
    return null;
  }

  if (typeof record['passwordHash'] !== 'string' || record['passwordHash'].trim().length === 0) {
    return null;
  }

  return {
    source: 'kangur_parent',
    name: normalizeCallbackUrl(record['name']),
    passwordHash: record['passwordHash'].trim(),
  };
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
    pendingRegistration: normalizePendingRegistration(record['pendingRegistration']),
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

const listMongoChallenges = async (): Promise<ChallengeRecord[]> => {
  if (!process.env['MONGODB_URI']) return [];
  const mongo = await getMongoDb();
  const rows = await mongo.collection<ChallengeRecord>(CHALLENGES_COLLECTION).find({}).toArray();
  return rows
    .map((row) => parseChallengeRecord(row))
    .filter((row): row is ChallengeRecord => row !== null);
};

const listPrismaChallenges = async (): Promise<ChallengeRecord[]> => {
  const rows = await prisma.authLoginChallenge.findMany();
  return rows
    .map((row) => parseChallengeRecord(row.data))
    .filter((record): record is ChallengeRecord => record !== null);
};

const listMemoryChallenges = (): ChallengeRecord[] => [...memoryChallenges.values()];

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
        await collection.createIndex({ email: 1, purpose: 1 });
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

const listChallenges = async (): Promise<ChallengeRecord[]> => {
  const provider = requireAuthProvider(await getAuthDataProvider());
  if (provider === 'prisma') {
    return listPrismaChallenges();
  }
  if (process.env['MONGODB_URI']) {
    return listMongoChallenges();
  }
  return listMemoryChallenges();
};

const deleteChallenges = async (ids: string[]): Promise<void> => {
  if (ids.length === 0) {
    return;
  }

  const provider = requireAuthProvider(await getAuthDataProvider());
  if (provider === 'prisma') {
    await prisma.authLoginChallenge.deleteMany({
      where: {
        id: {
          in: ids,
        },
      },
    });
    return;
  }

  if (process.env['MONGODB_URI']) {
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

const replaceEmailVerificationChallenges = async (email: string): Promise<void> => {
  const normalizedEmail = email.toLowerCase();
  const existing = (await listChallenges()).filter(
    (record) => record.purpose === 'email_verification' && record.email === normalizedEmail
  );
  if (existing.length === 0) {
    return;
  }

  await deleteChallenges(existing.map((record) => record._id));
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
    pendingRegistration: null,
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
  pendingRegistration?: PendingRegistrationRecord | null;
}): Promise<{ id: string; expiresAt: Date }> => {
  const record: ChallengeRecord = {
    _id: crypto.randomBytes(32).toString('hex'),
    userId: input.userId,
    email: input.email.toLowerCase(),
    ip: input.ip ?? null,
    mfaRequired: input.mfaRequired ?? false,
    purpose: input.purpose,
    callbackUrl: normalizeCallbackUrl(input.callbackUrl),
    pendingRegistration: input.pendingRegistration ?? null,
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
  userId?: string | null;
  email: string;
  callbackUrl?: string | null;
  pendingRegistration?: {
    source: 'kangur_parent';
    name?: string | null;
    passwordHash: string;
  } | null;
}): Promise<{ id: string; expiresAt: Date }> =>
  (async () => {
    const normalizedEmail = input.email.toLowerCase();
    await replaceEmailVerificationChallenges(normalizedEmail);

    return createStoredChallenge({
      userId:
        input.userId?.trim() || `pending:kangur_parent:${encodeURIComponent(normalizedEmail)}`,
      email: normalizedEmail,
      purpose: 'email_verification',
      ttlMinutes: EMAIL_VERIFICATION_TTL_MINUTES,
      callbackUrl: input.callbackUrl,
      pendingRegistration: input.pendingRegistration
        ? {
            source: 'kangur_parent',
            name: normalizeCallbackUrl(input.pendingRegistration.name),
            passwordHash: input.pendingRegistration.passwordHash.trim(),
          }
        : null,
    });
  })();

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

export const findActiveEmailVerificationChallengeByEmail = async (
  email: string
): Promise<AuthEmailVerificationChallengeRecord | null> => {
  const normalizedEmail = email.toLowerCase().trim();
  if (!normalizedEmail) {
    return null;
  }

  const now = Date.now();
  const match = (await listChallenges())
    .filter(
      (record) =>
        record.purpose === 'email_verification' &&
        record.email === normalizedEmail &&
        record.expiresAt.getTime() >= now
    )
    .sort((left, right) => right.createdAt.getTime() - left.createdAt.getTime())[0];

  if (!match) {
    return null;
  }

  return {
    userId: match.userId,
    email: match.email,
    callbackUrl: match.callbackUrl,
    pendingRegistration: match.pendingRegistration,
    expiresAt: match.expiresAt,
  };
};
