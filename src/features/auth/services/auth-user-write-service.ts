import 'server-only';

import { hash } from 'bcryptjs';

import type { AuthUserRecord } from '@/shared/contracts/auth';
import { conflictError } from '@/shared/errors/app-error';
import { getAuthDataProvider, requireAuthProvider } from '@/shared/lib/auth/services/auth-provider';
import { getMongoDb } from '@/shared/lib/db/mongo-client';

import { findAuthUserByEmail, findAuthUserById, normalizeAuthEmail } from './auth-user-repository';

type MongoUserDoc = {
  email: string;
  name?: string | null;
  passwordHash?: string | null;
  emailVerified?: Date | null;
  image?: string | null;
  createdAt: Date;
  updatedAt: Date;
};

const AUTH_USERS_COLLECTION = 'users';
const AUTH_USERS_EMAIL_UNIQUE_INDEX = 'auth_users_email_unique';

const normalizeOptionalName = (value: string | null | undefined): string | null => {
  if (typeof value !== 'string') {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
};

const isMongoDuplicateKeyError = (error: unknown): boolean => {
  const code =
    typeof error === 'object' && error !== null && 'code' in error
      ? (error as { code?: unknown }).code
      : null;
  const message =
    error instanceof Error
      ? error.message.toLowerCase()
      : typeof error === 'string'
        ? error.toLowerCase()
        : '';
  return code === 11000 || message.includes('e11000') || message.includes('duplicate key');
};

const getMongoUsersCollection = async () =>
  (await getMongoDb()).collection<MongoUserDoc>(AUTH_USERS_COLLECTION);

let ensureMongoAuthUserIndexesPromise: Promise<void> | null = null;

const ensureMongoAuthUserIndexes = async (): Promise<void> => {
  if (!ensureMongoAuthUserIndexesPromise) {
    ensureMongoAuthUserIndexesPromise = (async () => {
      const collection = await getMongoUsersCollection();
      await collection.createIndex(
        { email: 1 },
        {
          name: AUTH_USERS_EMAIL_UNIQUE_INDEX,
          unique: true,
          partialFilterExpression: { email: { $type: 'string' } },
        }
      );
    })().catch((error) => {
      ensureMongoAuthUserIndexesPromise = null;
      throw error;
    });
  }

  return ensureMongoAuthUserIndexesPromise;
};

export const createAuthUserWithEmail = async (input: {
  email: string;
  name?: string | null;
  passwordHash?: string | null;
  emailVerified?: Date | null;
  duplicateErrorMessage?: string;
}): Promise<AuthUserRecord> => {
  const email = normalizeAuthEmail(input.email);
  const provider = requireAuthProvider(await getAuthDataProvider());
  const normalizedName = normalizeOptionalName(input.name);
  const passwordHash = input.passwordHash ?? null;
  const emailVerified = input.emailVerified ?? null;
  const duplicateErrorMessage = input.duplicateErrorMessage;
  void provider;

  if (!process.env['MONGODB_URI']) {
    throw new Error('MongoDB is not configured.');
  }

  const now = new Date();
  const collection = await getMongoUsersCollection();
  await ensureMongoAuthUserIndexes();
  try {
    const result = await collection.insertOne({
      email,
      name: normalizedName,
      passwordHash,
      emailVerified,
      image: null,
      createdAt: now,
      updatedAt: now,
    });

    return {
      id: result.insertedId.toString(),
      email,
      name: normalizedName,
      passwordHash,
      image: null,
      emailVerified,
    };
  } catch (error) {
    if (isMongoDuplicateKeyError(error)) {
      throw conflictError(duplicateErrorMessage ?? 'User already exists.', { email });
    }
    throw error;
  }
};

export const ensureAuthUserWithEmail = async (input: {
  email: string;
  name?: string | null;
}): Promise<{ user: AuthUserRecord; created: boolean }> => {
  const existing = await findAuthUserByEmail(input.email);
  if (existing) {
    return {
      user: existing,
      created: false,
    };
  }

  const created = await createAuthUserWithEmail({
    email: input.email,
    name: input.name,
    passwordHash: null,
    emailVerified: null,
  });

  return {
    user: created,
    created: true,
  };
};

export const markAuthUserEmailVerified = async (userId: string): Promise<AuthUserRecord | null> => {
  requireAuthProvider(await getAuthDataProvider());
  const verifiedAt = new Date();

  if (!process.env['MONGODB_URI']) {
    return null;
  }

  const mongo = await getMongoDb();
  const { ObjectId } = await import('mongodb');
  if (!ObjectId.isValid(userId)) {
    return null;
  }

  await mongo.collection<MongoUserDoc>('users').updateOne(
    { _id: new ObjectId(userId) },
    {
      $set: {
        emailVerified: verifiedAt,
        updatedAt: verifiedAt,
      },
    }
  );

  return findAuthUserById(userId);
};

export const setAuthUserPassword = async (
  userId: string,
  password: string
): Promise<AuthUserRecord | null> => {
  requireAuthProvider(await getAuthDataProvider());
  const passwordHash = await hash(password, 12);

  if (!process.env['MONGODB_URI']) {
    return null;
  }

  const mongo = await getMongoDb();
  const { ObjectId } = await import('mongodb');
  if (!ObjectId.isValid(userId)) {
    return null;
  }

  await mongo.collection<MongoUserDoc>('users').updateOne(
    { _id: new ObjectId(userId) },
    {
      $set: {
        passwordHash,
        updatedAt: new Date(),
      },
    }
  );

  return findAuthUserById(userId);
};
