import 'server-only';

import type { AuthSecurityProfile } from '@/shared/contracts/auth';
import { getAuthDataProvider, requireAuthProvider } from '@/shared/lib/auth/services/auth-provider';
import { getMongoDb } from '@/shared/lib/db/mongo-client';

export type { AuthSecurityProfile };

type MongoProfileDoc = {
  _id: string;
  userId: string;
  mfaEnabled?: boolean;
  mfaSecret?: string | null;
  recoveryCodes?: string[];
  allowedIps?: string[];
  disabledAt?: Date | string | null;
  bannedAt?: Date | string | null;
  createdAt?: Date | string;
  updatedAt?: Date | string;
};

const PROFILES_COLLECTION = 'auth_security_profiles';

const buildDefaultProfile = (userId: string): AuthSecurityProfile => ({
  userId,
  mfaEnabled: false,
  mfaSecret: null,
  recoveryCodes: [],
  allowedIps: [],
  disabledAt: null,
  bannedAt: null,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
});

const normalizeProfile = (profile: AuthSecurityProfile): AuthSecurityProfile => ({
  ...profile,
  recoveryCodes: Array.isArray(profile.recoveryCodes) ? profile.recoveryCodes : [],
  allowedIps: Array.isArray(profile.allowedIps) ? profile.allowedIps : [],
});

const parseNumber = (value: string | undefined, fallback: number): number => {
  if (value === undefined || value.length === 0) return fallback;
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const toIsoString = (value: Date | string | null | undefined): string | null => {
  if (value === null || value === undefined) return null;
  if (value instanceof Date) return value.toISOString();
  if (typeof value === 'string' && value.length === 0) return null;
  return value;
};

const AUTH_SECURITY_CACHE_TTL_MS = parseNumber(
  process.env['AUTH_SECURITY_CACHE_TTL_MS'] ?? process.env['AUTH_TOKEN_REFRESH_TTL_MS'],
  60_000
);

const securityCache = new Map<string, { value: AuthSecurityProfile; ts: number }>();
const securityInflight = new Map<string, Promise<AuthSecurityProfile>>();

export const invalidateAuthSecurityProfileCache = (userId?: string): void => {
  if (userId !== undefined && userId.length > 0) {
    securityCache.delete(userId);
    securityInflight.delete(userId);
    return;
  }
  securityCache.clear();
  securityInflight.clear();
};

const buildProfileFromDoc = (doc: MongoProfileDoc): AuthSecurityProfile => {
  const userId = doc.userId;
  return normalizeProfile({
    userId,
    mfaEnabled: Boolean(doc.mfaEnabled),
    mfaSecret: doc.mfaSecret ?? null,
    recoveryCodes: doc.recoveryCodes ?? [],
    allowedIps: doc.allowedIps ?? [],
    disabledAt: toIsoString(doc.disabledAt),
    bannedAt: toIsoString(doc.bannedAt),
    createdAt: toIsoString(doc.createdAt) ?? new Date().toISOString(),
    updatedAt: toIsoString(doc.updatedAt) ?? new Date().toISOString(),
  });
};

export const getAuthSecurityProfile = async (userId: string): Promise<AuthSecurityProfile> => {
  const now = Date.now();
  const cached = securityCache.get(userId);
  if (cached !== undefined && now - cached.ts < AUTH_SECURITY_CACHE_TTL_MS) {
    return cached.value;
  }
  const inflight = securityInflight.get(userId);
  if (inflight !== undefined) return inflight;

  const promise = (async (): Promise<AuthSecurityProfile> => {
    requireAuthProvider(await getAuthDataProvider());
    const mongoUri = process.env['MONGODB_URI'];
    if (typeof mongoUri !== 'string' || mongoUri.length === 0) return buildDefaultProfile(userId);
    const mongo = await getMongoDb();
    const doc = await mongo
      .collection<MongoProfileDoc>(PROFILES_COLLECTION)
      .findOne({ _id: userId });
    if (doc === null) return buildDefaultProfile(userId);
    return buildProfileFromDoc(doc);
  })();

  securityInflight.set(userId, promise);
  try {
    const value = await promise;
    securityCache.set(userId, { value, ts: Date.now() });
    return value;
  } finally {
    securityInflight.delete(userId);
  }
};

const mapProfileUpdates = (updates: Partial<AuthSecurityProfile>): Partial<MongoProfileDoc> => {
  const payload: Partial<MongoProfileDoc> = {};
  if (typeof updates.mfaEnabled === 'boolean') {
    payload.mfaEnabled = updates.mfaEnabled;
  }
  if (updates.mfaSecret !== undefined) {
    payload.mfaSecret = updates.mfaSecret;
  }
  if (updates.recoveryCodes !== undefined) {
    payload.recoveryCodes = updates.recoveryCodes;
  }
  if (updates.allowedIps !== undefined) {
    payload.allowedIps = updates.allowedIps;
  }
  if (updates.disabledAt !== undefined) {
    const disabledAt = updates.disabledAt;
    payload.disabledAt = (disabledAt !== null && disabledAt.length > 0) ? new Date(disabledAt) : null;
  }
  if (updates.bannedAt !== undefined) {
    const bannedAt = updates.bannedAt;
    payload.bannedAt = (bannedAt !== null && bannedAt.length > 0) ? new Date(bannedAt) : null;
  }
  return payload;
};

const performMongoProfileUpdate = async (userId: string, mongoPayload: Partial<MongoProfileDoc>, now: Date): Promise<void> => {
  const mongo = await getMongoDb();
  const mongoSet: Partial<MongoProfileDoc> & { _id: string; userId: string; updatedAt: Date } = {
    _id: userId,
    userId,
    ...mongoPayload,
    updatedAt: now,
  };
  await mongo.collection<MongoProfileDoc>(PROFILES_COLLECTION).updateOne(
    { _id: userId },
    {
      $set: mongoSet,
      $setOnInsert: { createdAt: now },
    },
    { upsert: true }
  );
};

export const updateAuthSecurityProfile = async (
  userId: string,
  updates: Partial<AuthSecurityProfile>
): Promise<AuthSecurityProfile> => {
  const now = new Date();
  const mongoPayload = {
    ...mapProfileUpdates(updates),
    updatedAt: now,
  };

  requireAuthProvider(await getAuthDataProvider());
  const mongoUri = process.env['MONGODB_URI'];
  if (typeof mongoUri !== 'string' || mongoUri.length === 0) return buildDefaultProfile(userId);
  
  await performMongoProfileUpdate(userId, mongoPayload, now);
  
  invalidateAuthSecurityProfileCache(userId);
  return getAuthSecurityProfile(userId);
};
