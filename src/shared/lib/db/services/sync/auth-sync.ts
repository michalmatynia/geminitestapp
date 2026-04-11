import { ObjectId } from 'mongodb';

import { BatchCountResult } from '@/shared/contracts/base';
import type {
  MongoUserDoc,
  MongoAccountDoc,
  MongoSessionDoc,
  MongoVerificationTokenDoc,
  MongoAuthSecurityProfileDoc,
} from '../database-sync-types';
import type { DatabaseSyncHandler } from './types';
import type { Prisma } from '@prisma/client';

type UserSeed = {
  id: string;
  name: string | null;
  email: string | null;
  emailVerified: Date | null;
  image: string | null;
  passwordHash: string | null;
};

type AccountSeed = {
  id: string;
  userId: string;
  type: string;
  provider: string;
  providerAccountId: string;
  refresh_token: string | null;
  access_token: string | null;
  expires_at: number | null;
  token_type: string | null;
  scope: string | null;
  id_token: string | null;
  session_state: string | null;
};

type SessionSeed = {
  id: string;
  sessionToken: string;
  userId: string;
  expires: Date;
};

type VerificationTokenSeed = {
  identifier: string;
  token: string;
  expires: Date;
};

type AuthSecurityProfileSeed = {
  id: string;
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

type UserRow = UserSeed;
type AccountRow = AccountSeed;
type SessionRow = SessionSeed;
type VerificationTokenRow = VerificationTokenSeed;
type AuthSecurityProfileRow = AuthSecurityProfileSeed;

export const syncUsers: DatabaseSyncHandler = async ({ mongo, prisma, normalizeId, toDate }) => {
  const docs = (await mongo.collection('users').find({}).toArray()) as MongoUserDoc[];
  const data = docs
    .map((doc: MongoUserDoc) => {
      const id = normalizeId(doc as Record<string, unknown>);
      if (!id) return null;
      return {
        id,
        name: doc.name ?? null,
        email: doc.email ?? null,
        emailVerified: toDate(doc.emailVerified) ?? null,
        image: doc.image ?? null,
        passwordHash: doc.passwordHash ?? null,
      };
    })
    .filter((item): item is UserSeed => item !== null);

  const deleted = (await prisma.user.deleteMany()) as BatchCountResult;
  const created: BatchCountResult = data.length
    ? ((await prisma.user.createMany({
      data: data as Prisma.UserCreateManyInput[],
    })) as BatchCountResult)
    : { count: 0 };

  return {
    sourceCount: data.length,
    targetDeleted: deleted.count,
    targetInserted: created.count,
  };
};

export const syncAccounts: DatabaseSyncHandler = async ({ mongo, prisma, normalizeId }) => {
  const docs = (await mongo.collection('accounts').find({}).toArray()) as MongoAccountDoc[];
  const data = docs
    .map((doc: MongoAccountDoc) => {
      const id = normalizeId(doc as Record<string, unknown>);
      const userIdRaw = doc.userId;
      const userId = userIdRaw instanceof ObjectId ? userIdRaw.toString() : String(userIdRaw ?? '');
      if (!id || !userId) return null;
      return {
        id,
        userId,
        type: doc.type ?? 'oauth',
        provider: doc.provider ?? '',
        providerAccountId: doc.providerAccountId ?? '',
        refresh_token: doc.refresh_token ?? null,
        access_token: doc.access_token ?? null,
        expires_at: doc.expires_at ?? null,
        token_type: doc.token_type ?? null,
        scope: doc.scope ?? null,
        id_token: doc.id_token ?? null,
        session_state: doc.session_state ?? null,
      };
    })
    .filter((item): item is AccountSeed => item !== null);

  const deleted = (await prisma.account.deleteMany()) as BatchCountResult;
  const created: BatchCountResult = data.length
    ? ((await prisma.account.createMany({
      data: data as Prisma.AccountCreateManyInput[],
    })) as BatchCountResult)
    : { count: 0 };
  return { sourceCount: data.length, targetDeleted: deleted.count, targetInserted: created.count };
};

export const syncSessions: DatabaseSyncHandler = async ({ mongo, prisma, normalizeId, toDate }) => {
  const docs = (await mongo
    .collection('sessions')
    .find({})
    .toArray()) as MongoSessionDoc[];
  const data = docs
    .map((doc: MongoSessionDoc): SessionSeed | null => {
      const id = normalizeId(doc as Record<string, unknown>);
      const userIdRaw = doc.userId;
      const userId = userIdRaw instanceof ObjectId ? userIdRaw.toString() : String(userIdRaw ?? '');
      const sessionToken = doc.sessionToken;
      const expires = toDate(doc.expires);
      if (!id || !userId || !sessionToken || !expires) return null;
      return {
        id,
        sessionToken,
        userId,
        expires,
      };
    })
    .filter((item): item is SessionSeed => item !== null);

  const deleted = (await prisma.session.deleteMany()) as BatchCountResult;
  const created: BatchCountResult = data.length
    ? ((await prisma.session.createMany({
      data: data as Prisma.SessionCreateManyInput[],
    })) as BatchCountResult)
    : { count: 0 };
  return { sourceCount: data.length, targetDeleted: deleted.count, targetInserted: created.count };
};

export const syncVerificationTokens: DatabaseSyncHandler = async ({ mongo, prisma, toDate }) => {
  const docs = (await mongo
    .collection('verification_tokens')
    .find({})
    .toArray()) as MongoVerificationTokenDoc[];
  const data = docs
    .map((doc: MongoVerificationTokenDoc): VerificationTokenSeed | null => {
      const identifier = doc.identifier;
      const token = doc.token;
      const expires = toDate(doc.expires);
      if (!identifier || !token || !expires) return null;
      return { identifier, token, expires };
    })
    .filter((item): item is VerificationTokenSeed => item !== null);

  const deleted = (await prisma.verificationToken.deleteMany()) as BatchCountResult;
  const created: BatchCountResult = data.length
    ? ((await prisma.verificationToken.createMany({
      data: data as Prisma.VerificationTokenCreateManyInput[],
    })) as BatchCountResult)
    : { count: 0 };
  return { sourceCount: data.length, targetDeleted: deleted.count, targetInserted: created.count };
};

export const syncAuthSecurityProfiles: DatabaseSyncHandler = async ({
  mongo,
  prisma,
  normalizeId,
  toDate,
}) => {
  const docs = (await mongo.collection('auth_security_profiles').find({}).toArray()) as MongoAuthSecurityProfileDoc[];
  const data = docs
    .map((doc: MongoAuthSecurityProfileDoc): AuthSecurityProfileSeed | null => {
      const id = normalizeId(doc as Record<string, unknown>);
      const userId = doc.userId ?? id;
      if (!userId) return null;
      return {
        id,
        userId,
        mfaEnabled: Boolean(doc.mfaEnabled),
        mfaSecret: doc.mfaSecret ?? null,
        recoveryCodes: doc.recoveryCodes ?? [],
        allowedIps: doc.allowedIps ?? [],
        disabledAt: toDate(doc.disabledAt),
        bannedAt: toDate(doc.bannedAt),
        createdAt: toDate(doc.createdAt) ?? new Date(),
        updatedAt: toDate(doc.updatedAt) ?? new Date(),
      };
    })
    .filter((item): item is AuthSecurityProfileSeed => item !== null);

  const deleted = (await prisma.authSecurityProfile.deleteMany()) as BatchCountResult;
  const created: BatchCountResult = data.length
    ? ((await prisma.authSecurityProfile.createMany({
      data: data as Prisma.AuthSecurityProfileCreateManyInput[],
    })) as BatchCountResult)
    : { count: 0 };
  return { sourceCount: data.length, targetDeleted: deleted.count, targetInserted: created.count };
};

// --- Prisma to Mongo handlers ---

export const syncUsersPrismaToMongo: DatabaseSyncHandler = async ({ mongo, prisma, toObjectIdMaybe }) => {
  const rows = (await prisma.user.findMany()) as UserRow[];
  const docs = rows.map((row) => ({
    _id: toObjectIdMaybe(row.id) as ObjectId | string,
    id: row.id,
    name: row.name,
    email: row.email,
    emailVerified: row.emailVerified,
    image: row.image,
    passwordHash: row.passwordHash,
  }));
  const collection = mongo.collection('users');
  const deleted = await collection.deleteMany({});
  if (docs.length) await collection.insertMany(docs as Record<string, unknown>[]);
  return {
    sourceCount: rows.length,
    targetDeleted: deleted.deletedCount ?? 0,
    targetInserted: docs.length,
  };
};

export const syncAccountsPrismaToMongo: DatabaseSyncHandler = async ({
  mongo,
  prisma,
  toObjectIdMaybe,
}) => {
  const rows = (await prisma.account.findMany()) as AccountRow[];
  const docs = rows.map((row) => ({
    _id: toObjectIdMaybe(row.id) as ObjectId | string,
    id: row.id,
    userId: toObjectIdMaybe(row.userId) as ObjectId | string,
    type: row.type,
    provider: row.provider,
    providerAccountId: row.providerAccountId,
    refresh_token: row.refresh_token ?? null,
    access_token: row.access_token ?? null,
    expires_at: row.expires_at ?? null,
    token_type: row.token_type ?? null,
    scope: row.scope ?? null,
    id_token: row.id_token ?? null,
    session_state: row.session_state ?? null,
  }));
  const collection = mongo.collection('accounts');
  const deleted = await collection.deleteMany({});
  if (docs.length) await collection.insertMany(docs as Record<string, unknown>[]);
  return {
    sourceCount: rows.length,
    targetDeleted: deleted.deletedCount ?? 0,
    targetInserted: docs.length,
  };
};

export const syncSessionsPrismaToMongo: DatabaseSyncHandler = async ({
  mongo,
  prisma,
  toObjectIdMaybe,
}) => {
  const rows = (await prisma.session.findMany()) as SessionRow[];
  const docs = rows.map((row) => ({
    _id: toObjectIdMaybe(row.id) as ObjectId | string,
    id: row.id,
    sessionToken: row.sessionToken,
    userId: toObjectIdMaybe(row.userId) as ObjectId | string,
    expires: row.expires,
  }));
  const collection = mongo.collection('sessions');
  const deleted = await collection.deleteMany({});
  if (docs.length) await collection.insertMany(docs as Record<string, unknown>[]);
  return {
    sourceCount: rows.length,
    targetDeleted: deleted.deletedCount ?? 0,
    targetInserted: docs.length,
  };
};

export const syncVerificationTokensPrismaToMongo: DatabaseSyncHandler = async ({ mongo, prisma }) => {
  const rows = (await prisma.verificationToken.findMany()) as VerificationTokenRow[];
  const docs = rows.map((row) => ({
    identifier: row.identifier,
    token: row.token,
    expires: row.expires,
  }));
  const collection = mongo.collection('verification_tokens');
  const deleted = await collection.deleteMany({});
  if (docs.length) await collection.insertMany(docs as Record<string, unknown>[]);
  return {
    sourceCount: rows.length,
    targetDeleted: deleted.deletedCount ?? 0,
    targetInserted: docs.length,
  };
};

export const syncAuthSecurityProfilesPrismaToMongo: DatabaseSyncHandler = async ({ mongo, prisma }) => {
  const rows = (await prisma.authSecurityProfile.findMany()) as AuthSecurityProfileRow[];
  const docs = rows.map((row) => ({
    _id: row.id,
    id: row.id,
    userId: row.userId,
    mfaEnabled: row.mfaEnabled,
    mfaSecret: row.mfaSecret,
    recoveryCodes: row.recoveryCodes ?? [],
    allowedIps: row.allowedIps ?? [],
    disabledAt: row.disabledAt,
    bannedAt: row.bannedAt,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  }));
  const collection = mongo.collection('auth_security_profiles');
  const deleted = await collection.deleteMany({});
  if (docs.length) await collection.insertMany(docs as Record<string, unknown>[]);
  return {
    sourceCount: rows.length,
    targetDeleted: deleted.deletedCount ?? 0,
    targetInserted: docs.length,
  };
};
