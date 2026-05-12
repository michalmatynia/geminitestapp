import 'server-only';

import type { ObjectId } from 'mongodb';

import { getMongoDb } from '@/shared/lib/db/mongo-client';

import { normalizeAuthEmail } from './access';

type MongoUserDoc = {
  _id?: ObjectId;
  email: string;
  name?: string | null;
  image?: string | null;
  passwordHash?: string | null;
  emailVerified?: Date | boolean | null;
  createdAt?: Date;
  updatedAt?: Date;
};

export type AuthUserRecord = {
  id: string;
  email: string;
  name: string | null;
  image: string | null;
  passwordHash: string | null;
  emailVerified: boolean | null;
};

const toRecord = (doc: MongoUserDoc & { _id: ObjectId }): AuthUserRecord => ({
  id: doc._id.toString(),
  email: doc.email,
  name: doc.name ?? null,
  image: doc.image ?? null,
  passwordHash: doc.passwordHash ?? null,
  emailVerified: getEmailVerifiedFlag(doc.emailVerified),
});

function getEmailVerifiedFlag(emailVerified: Date | boolean | null | undefined): boolean | null {
  if (typeof emailVerified === 'boolean') {
    return emailVerified;
  }
  return emailVerified instanceof Date ? true : null;
}

export const findAuthUserByEmail = async (email: string): Promise<AuthUserRecord | null> => {
  const db = await getMongoDb();
  const normalized = normalizeAuthEmail(email);
  const doc = await db
    .collection<MongoUserDoc & { _id: ObjectId }>('users')
    .findOne({ email: normalized });
  if (!doc?._id) return null;
  return toRecord(doc);
};

export const createAuthUser = async (input: {
  email: string;
  name?: string | null;
  passwordHash: string;
  emailVerified?: boolean;
}): Promise<AuthUserRecord> => {
  const db = await getMongoDb();
  const now = new Date();
  const verifiedNow = input.emailVerified === true;
  const doc: MongoUserDoc = {
    email: normalizeAuthEmail(input.email),
    name: input.name ?? null,
    image: null,
    passwordHash: input.passwordHash,
    emailVerified: verifiedNow ? now : null,
    createdAt: now,
    updatedAt: now,
  };
  const result = await db.collection<MongoUserDoc>('users').insertOne(doc);
  return {
    id: result.insertedId.toString(),
    email: doc.email,
    name: doc.name ?? null,
    image: null,
    passwordHash: doc.passwordHash ?? null,
    emailVerified: verifiedNow,
  };
};
