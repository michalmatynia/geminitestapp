import { ObjectId } from 'mongodb';

import type {
  MongoUserDoc,
  MongoAccountDoc,
  MongoSessionDoc,
  MongoVerificationTokenDoc,
  MongoAuthSecurityProfileDoc,
} from '../database-sync-types';
import type { SyncHandler } from './types';
import type { Prisma } from '@prisma/client';

export const syncUsers: SyncHandler = async ({ mongo, prisma, normalizeId, toDate }) => {
  const docs = await mongo.collection('users').find({}).toArray();
  const data: Prisma.UserCreateManyInput[] = docs
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
    .filter(Boolean) as Prisma.UserCreateManyInput[];

  const deleted = await prisma.user.deleteMany();
  const created = data.length ? await prisma.user.createMany({ data }) : { count: 0 };

  return {
    sourceCount: data.length,
    targetDeleted: deleted.count,
    targetInserted: created.count,
  };
};

export const syncAccounts: SyncHandler = async ({ mongo, prisma, normalizeId }) => {
  const docs = await mongo.collection('accounts').find({}).toArray();
  const data: Prisma.AccountCreateManyInput[] = docs
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
    .filter(Boolean) as Prisma.AccountCreateManyInput[];

  const deleted = await prisma.account.deleteMany();
  const created = data.length ? await prisma.account.createMany({ data }) : { count: 0 };
  return { sourceCount: data.length, targetDeleted: deleted.count, targetInserted: created.count };
};

export const syncSessions: SyncHandler = async ({ mongo, prisma, normalizeId, toDate }) => {
  const docs = (await mongo
    .collection('sessions')
    .find({})
    .toArray()) as MongoSessionDoc[];
  const data = docs
    .map((doc: MongoSessionDoc): Prisma.SessionCreateManyInput | null => {
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
    .filter((item): item is Prisma.SessionCreateManyInput => item !== null);

  const deleted = await prisma.session.deleteMany();
  const created = data.length ? await prisma.session.createMany({ data }) : { count: 0 };
  return { sourceCount: data.length, targetDeleted: deleted.count, targetInserted: created.count };
};

export const syncVerificationTokens: SyncHandler = async ({ mongo, prisma, toDate }) => {
  const docs = (await mongo
    .collection('verification_tokens')
    .find({})
    .toArray()) as MongoVerificationTokenDoc[];
  const data = docs
    .map((doc: MongoVerificationTokenDoc): Prisma.VerificationTokenCreateManyInput | null => {
      const identifier = doc.identifier;
      const token = doc.token;
      const expires = toDate(doc.expires);
      if (!identifier || !token || !expires) return null;
      return { identifier, token, expires };
    })
    .filter((item): item is Prisma.VerificationTokenCreateManyInput => item !== null);

  const deleted = await prisma.verificationToken.deleteMany();
  const created = data.length ? await prisma.verificationToken.createMany({ data }) : { count: 0 };
  return { sourceCount: data.length, targetDeleted: deleted.count, targetInserted: created.count };
};

export const syncAuthSecurityProfiles: SyncHandler = async ({
  mongo,
  prisma,
  normalizeId,
  toDate,
}) => {
  const docs = await mongo.collection('auth_security_profiles').find({}).toArray();
  const data = docs
    .map((doc: MongoAuthSecurityProfileDoc): Prisma.AuthSecurityProfileCreateManyInput | null => {
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
    .filter((item): item is Prisma.AuthSecurityProfileCreateManyInput => item !== null);

  const deleted = await prisma.authSecurityProfile.deleteMany();
  const created = data.length
    ? await prisma.authSecurityProfile.createMany({ data })
    : { count: 0 };
  return { sourceCount: data.length, targetDeleted: deleted.count, targetInserted: created.count };
};

// --- Prisma to Mongo handlers ---

export const syncUsersPrismaToMongo: SyncHandler = async ({ mongo, prisma, toObjectIdMaybe }) => {
  const rows = await prisma.user.findMany();
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

export const syncAccountsPrismaToMongo: SyncHandler = async ({
  mongo,
  prisma,
  toObjectIdMaybe,
}) => {
  const rows = await prisma.account.findMany();
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

export const syncSessionsPrismaToMongo: SyncHandler = async ({
  mongo,
  prisma,
  toObjectIdMaybe,
}) => {
  const rows = await prisma.session.findMany();
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

export const syncVerificationTokensPrismaToMongo: SyncHandler = async ({ mongo, prisma }) => {
  const rows = await prisma.verificationToken.findMany();
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

export const syncAuthSecurityProfilesPrismaToMongo: SyncHandler = async ({ mongo, prisma }) => {
  const rows = await prisma.authSecurityProfile.findMany();
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
