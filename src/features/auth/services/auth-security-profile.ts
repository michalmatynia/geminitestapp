import "server-only";

import { getMongoDb } from "@/shared/lib/db/mongo-client";

export type AuthSecurityProfile = {
  userId: string;
  mfaEnabled: boolean;
  mfaSecret: string | null;
  recoveryCodes: string[];
  allowedIps: string[];
  disabledAt: Date | null;
  bannedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

type MongoProfileDoc = {
  _id: string;
  userId: string;
  mfaEnabled?: boolean;
  mfaSecret?: string | null;
  recoveryCodes?: string[];
  allowedIps?: string[];
  disabledAt?: Date | null;
  bannedAt?: Date | null;
  createdAt?: Date;
  updatedAt?: Date;
};

const PROFILES_COLLECTION = "auth_security_profiles";

const buildDefaultProfile = (userId: string): AuthSecurityProfile => ({
  userId,
  mfaEnabled: false,
  mfaSecret: null,
  recoveryCodes: [],
  allowedIps: [],
  disabledAt: null,
  bannedAt: null,
  createdAt: new Date(),
  updatedAt: new Date(),
});

const normalizeProfile = (profile: AuthSecurityProfile) => ({
  ...profile,
  recoveryCodes: Array.isArray(profile.recoveryCodes) ? profile.recoveryCodes : [],
  allowedIps: Array.isArray(profile.allowedIps) ? profile.allowedIps : [],
});

export const getAuthSecurityProfile = async (
  userId: string
): Promise<AuthSecurityProfile> => {
  if (!process.env.MONGODB_URI) return buildDefaultProfile(userId);
  const mongo = await getMongoDb();
  const doc = await mongo
    .collection<MongoProfileDoc>(PROFILES_COLLECTION)
    .findOne({ _id: userId });
  if (!doc) return buildDefaultProfile(userId);
  return normalizeProfile({
    userId: doc.userId ?? doc._id,
    mfaEnabled: Boolean(doc.mfaEnabled),
    mfaSecret: doc.mfaSecret ?? null,
    recoveryCodes: doc.recoveryCodes ?? [],
    allowedIps: doc.allowedIps ?? [],
    disabledAt: doc.disabledAt ?? null,
    bannedAt: doc.bannedAt ?? null,
    createdAt: doc.createdAt ?? new Date(),
    updatedAt: doc.updatedAt ?? new Date(),
  });
};

export const updateAuthSecurityProfile = async (
  userId: string,
  updates: Partial<AuthSecurityProfile>
): Promise<AuthSecurityProfile> => {
  const now = new Date();
  const payload: Partial<AuthSecurityProfile> = {
    updatedAt: now,
  };
  if (typeof updates.mfaEnabled === "boolean") {
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
    payload.disabledAt = updates.disabledAt;
  }
  if (updates.bannedAt !== undefined) {
    payload.bannedAt = updates.bannedAt;
  }

  if (!process.env.MONGODB_URI) return buildDefaultProfile(userId);
  const mongo = await getMongoDb();
  await mongo.collection<MongoProfileDoc>(PROFILES_COLLECTION).updateOne(
    { _id: userId },
    {
      $set: {
        _id: userId,
        userId,
        ...payload,
      },
      $setOnInsert: { createdAt: now },
    },
    { upsert: true }
  );
  return getAuthSecurityProfile(userId);
};
