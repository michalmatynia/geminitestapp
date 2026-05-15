import 'server-only';

import { hash } from 'bcryptjs';
import type { Collection, ObjectId } from 'mongodb';

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
  if (typeof error !== 'object' || error === null) return false;
  const err = error as { code?: unknown };
  if (err.code === 11000) return true;

  const message = error instanceof Error ? error.message.toLowerCase() : String(error).toLowerCase();
  return message.includes('e11000') || message.includes('duplicate key');
};

const getMongoUsersCollection = async (): Promise<Collection<MongoUserDoc>> =>
  (await getMongoDb()).collection<MongoUserDoc>(AUTH_USERS_COLLECTION);

let ensureMongoAuthUserIndexesPromise: Promise<void> | null = null;

const createIndexes = async (): Promise<void> => {
  const collection = await getMongoUsersCollection();
  await collection.createIndex(
    { email: 1 },
    {
      name: AUTH_USERS_EMAIL_UNIQUE_INDEX,
      unique: true,
      partialFilterExpression: { email: { $type: 'string' } },
    }
  );
};

const ensureMongoAuthUserIndexes = async (): Promise<void> => {
  if (ensureMongoAuthUserIndexesPromise !== null) {
    return ensureMongoAuthUserIndexesPromise;
  }

  const promise = (async () => {
    try {
      await createIndexes();
    } catch (error) {
      ensureMongoAuthUserIndexesPromise = null;
      throw error;
    }
  })();

  ensureMongoAuthUserIndexesPromise = promise;
  return promise;
};

const checkDbConfig = (mongoUri: string | null | undefined, context: string): void => {
  if (mongoUri === null || mongoUri === undefined || mongoUri === '') {
    throw new Error(`Database Configuration Error: MONGODB_URI is required ${context}.`);
  }
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

  checkDbConfig(process.env['MONGODB_URI'], 'for creating authentication users');

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
      throw conflictError(duplicateErrorMessage ?? `User with email '${email}' already exists.`, { email });
    }
    throw new Error(`Failed to create authentication user for email '${email}': ${error instanceof Error ? error.message : String(error)}`);
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

const getUserIdOrThrow = async (userId: string): Promise<ObjectId> => {
  const { ObjectId } = await import('mongodb');
  if (!ObjectId.isValid(userId)) {
    throw new Error(`Invalid User Identifier: The provided user ID '${userId}' is not a valid MongoDB ObjectId.`);
  }
  return new ObjectId(userId);
};

export const markAuthUserEmailVerified = async (userId: string): Promise<AuthUserRecord | null> => {
  const provider = await getAuthDataProvider();
  requireAuthProvider(provider);
  const verifiedAt = new Date();

  checkDbConfig(process.env['MONGODB_URI'], 'to mark user email as verified');

  const mongo = await getMongoDb();
  const id = await getUserIdOrThrow(userId);

  await mongo.collection<MongoUserDoc>('users').updateOne(
    { _id: id },
    {
      $set: {
        emailVerified: verifiedAt,
        updatedAt: verifiedAt,
      },
    }
  );

  const user = await findAuthUserById(userId);
  return user;
};

export const setAuthUserPassword = async (
  userId: string,
  password: string
): Promise<AuthUserRecord | null> => {
  const provider = await getAuthDataProvider();
  requireAuthProvider(provider);
  const passwordHash = await hash(password, 12);

  checkDbConfig(process.env['MONGODB_URI'], 'to set a user password');

  const mongo = await getMongoDb();
  const id = await getUserIdOrThrow(userId);

  await mongo.collection<MongoUserDoc>('users').updateOne(
    { _id: id },
    {
      $set: {
        passwordHash,
        updatedAt: new Date(),
      },
    }
  );

  const user = await findAuthUserById(userId);
  return user;
};
