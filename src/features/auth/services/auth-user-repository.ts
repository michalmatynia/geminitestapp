import { ObjectId } from 'mongodb';

import type { AuthUserRecord } from '@/shared/contracts/auth';
import { getAuthDataProvider, requireAuthProvider } from '@/shared/lib/auth/services/auth-provider';
import { getMongoDb } from '@/shared/lib/db/mongo-client';
import { logSystemEvent } from '@/shared/lib/observability/system-logger';

type MongoUserDoc = {
  _id: ObjectId;
  email?: string | null;
  name?: string | null;
  passwordHash?: string | null;
  image?: string | null;
  emailVerified?: Date | null;
  createdAt?: Date | null;
  updatedAt?: Date | null;
};

export const normalizeAuthEmail = (email: string): string => email.trim().toLowerCase();

const checkMongoConfig = async (normalized: string, provider: string): Promise<boolean> => {
  const uri = process.env['MONGODB_URI'];
  if (uri !== undefined && uri.length > 0) return true;

  await logSystemEvent({
    level: 'error',
    message: '[AUTH-REPO] Database configuration error: MONGODB_URI is not defined.',
    context: { email: normalized, provider },
  });
  return false;
};

const mapDocDates = (doc: MongoUserDoc): { createdAt: string; updatedAt: string } => ({
  createdAt: doc.createdAt?.toISOString() ?? new Date().toISOString(),
  updatedAt: doc.updatedAt?.toISOString() ?? new Date().toISOString(),
});

const mapDocToAuthUser = (doc: MongoUserDoc): AuthUserRecord => {
  const userEmail = typeof doc.email === 'string' ? doc.email : '';
  const { createdAt, updatedAt } = mapDocDates(doc);
  return {
    id: doc._id.toString(),
    email: userEmail,
    name: doc.name ?? null,
    passwordHash: doc.passwordHash ?? null,
    image: doc.image ?? null,
    emailVerified: doc.emailVerified ?? null,
    createdAt,
    updatedAt,
  };
};

export const findAuthUserByEmail = async (email: string): Promise<AuthUserRecord | null> => {
  const normalized = normalizeAuthEmail(email);
  const provider = requireAuthProvider(await getAuthDataProvider());
  await logSystemEvent({
    level: 'info',
    message: `[AUTH-REPO] Finding user ${normalized} using ${provider}`,
    context: { email: normalized, provider },
  });

  if (!(await checkMongoConfig(normalized, provider))) return null;

  const db = await getMongoDb();
  const user = await db.collection<MongoUserDoc>('users').findOne({ email: normalized });
  if (user === null || typeof user.email !== 'string' || user.email.length === 0) {
    await logSystemEvent({
      level: 'info',
      message: '[AUTH-REPO] MongoDB user not found',
      context: { email: normalized },
    });
    return null;
  }
  return mapDocToAuthUser(user);
};

export const findAuthUserById = async (userId: string): Promise<AuthUserRecord | null> => {
  requireAuthProvider(await getAuthDataProvider());
  const uri = process.env['MONGODB_URI'];
  if (uri === undefined || uri.length === 0) {
    throw new Error('Database Configuration Error: MONGODB_URI is required to find auth user by ID.');
  }

  if (!ObjectId.isValid(userId)) {
    throw new Error(
      `Invalid User Identifier: The provided user ID '${userId}' is not a valid MongoDB ObjectId.`
    );
  }

  const db = await getMongoDb();
  const user = await db.collection<MongoUserDoc>('users').findOne({ _id: new ObjectId(userId) });
  if (user === null || typeof user.email !== 'string' || user.email.length === 0) return null;

  return mapDocToAuthUser(user);
};

export const listAuthUsers = async (limit = 500): Promise<AuthUserRecord[]> => {
  const provider = await getAuthDataProvider();
  requireAuthProvider(provider);
  const uri = process.env['MONGODB_URI'];
  if (uri === undefined || uri.length === 0) {
    throw new Error('Database Configuration Error: MONGODB_URI is required to list auth users.');
  }
  const db = await getMongoDb();
  const docs = await db
    .collection<MongoUserDoc>('users')
    .find({})
    .sort({ createdAt: -1 })
    .limit(limit)
    .toArray();

  return docs.map(mapDocToAuthUser);
};
