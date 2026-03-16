import { ObjectId } from 'mongodb';

import { AUTH_SETTINGS_KEYS } from '@/shared/lib/auth/constants';
import { getMongoClient, getMongoDb } from '@/shared/lib/db/mongo-client';
import { parseJsonSetting, serializeSetting } from '@/shared/utils/settings-json';

type UserDoc = {
  _id: ObjectId | string;
  email: string;
};

type SettingsDoc = {
  _id?: string;
  key?: string;
  value?: string | null;
};

type UserPreferencesDoc = {
  _id?: ObjectId | string;
  userId?: string;
  createdAt?: Date;
  updatedAt?: Date;
  [key: string]: unknown;
};

type AuthSecurityProfileDoc = {
  _id: ObjectId | string;
  userId?: string;
  createdAt?: Date;
  updatedAt?: Date;
  [key: string]: unknown;
};

const SOURCE_EMAIL = process.env['SOURCE_EMAIL'] ?? 'admin@example.com';
const TARGET_EMAIL = process.env['TARGET_EMAIL'] ?? 'mmatynia@gmail.com';

const toMongoId = (id: string): ObjectId | string => {
  if (ObjectId.isValid(id) && id.length === 24) return new ObjectId(id);
  return id;
};

const toUserId = (value: ObjectId | string): string => value.toString();

const findUserByEmail = async (email: string): Promise<UserDoc | null> => {
  const db = await getMongoDb();
  return db.collection<UserDoc>('users').findOne({ email });
};

const copyUserPreferences = async (sourceUserId: string, targetUserId: string): Promise<void> => {
  const db = await getMongoDb();
  const collection = db.collection<UserPreferencesDoc>('user_preferences');
  const sourceIdCandidates = [toMongoId(sourceUserId), sourceUserId];
  const source = await collection.findOne({
    $or: [{ _id: { $in: sourceIdCandidates } }, { userId: sourceUserId }],
  });
  if (!source) {
    console.warn('No user_preferences found for source user.');
    return;
  }

  const { _id, userId: _userId, createdAt: _createdAt, updatedAt: _updatedAt, ...rest } =
    source as Record<string, unknown>;
  const now = new Date();
  const targetMongoId = toMongoId(targetUserId);

  await collection.updateOne(
    { $or: [{ _id: targetMongoId }, { userId: targetUserId }] },
    {
      $set: {
        ...rest,
        userId: targetUserId,
        updatedAt: now,
      },
      $setOnInsert: {
        _id: targetMongoId,
        createdAt: now,
      },
    },
    { upsert: true }
  );
};

const copySecurityProfile = async (sourceUserId: string, targetUserId: string): Promise<void> => {
  const db = await getMongoDb();
  const collection = db.collection<AuthSecurityProfileDoc>('auth_security_profiles');
  const source = await collection.findOne({ _id: sourceUserId });
  if (!source) {
    console.warn('No auth_security_profiles entry found for source user.');
    return;
  }

  const { _id, userId: _userId, createdAt: _createdAt, updatedAt: _updatedAt, ...rest } =
    source as Record<string, unknown>;
  const now = new Date();

  await collection.updateOne(
    { _id: targetUserId },
    {
      $set: {
        _id: targetUserId,
        userId: targetUserId,
        ...rest,
        updatedAt: now,
      },
      $setOnInsert: {
        createdAt: now,
      },
    },
    { upsert: true }
  );
};

const copyRoleAssignment = async (sourceUserId: string, targetUserId: string): Promise<void> => {
  const db = await getMongoDb();
  const collection = db.collection<SettingsDoc>('settings');
  const key = AUTH_SETTINGS_KEYS.userRoles;
  const doc = await collection.findOne({ $or: [{ _id: key }, { key }] });
  const userRoles = parseJsonSetting<Record<string, string>>(doc?.value ?? null, {});
  const sourceRole = userRoles[sourceUserId];

  if (sourceRole) {
    userRoles[targetUserId] = sourceRole;
  } else if (!userRoles[targetUserId]) {
    userRoles[targetUserId] = 'admin';
  }

  const now = new Date();
  await collection.updateOne(
    { $or: [{ _id: key }, { key }] },
    {
      $set: {
        _id: key,
        key,
        value: serializeSetting(userRoles),
        updatedAt: now,
      },
      $setOnInsert: { createdAt: now },
    },
    { upsert: true }
  );
};

async function main(): Promise<void> {
  if (!process.env['MONGODB_URI']) {
    throw new Error('MONGODB_URI is required to copy user settings.');
  }

  const sourceUser = await findUserByEmail(SOURCE_EMAIL);
  if (!sourceUser) {
    throw new Error(`Source user not found: ${SOURCE_EMAIL}`);
  }
  const targetUser = await findUserByEmail(TARGET_EMAIL);
  if (!targetUser) {
    throw new Error(`Target user not found: ${TARGET_EMAIL}`);
  }

  const sourceUserId = toUserId(sourceUser._id);
  const targetUserId = toUserId(targetUser._id);

  await copyUserPreferences(sourceUserId, targetUserId);
  await copySecurityProfile(sourceUserId, targetUserId);
  await copyRoleAssignment(sourceUserId, targetUserId);

  console.log('Copied settings from', SOURCE_EMAIL, 'to', TARGET_EMAIL);
}

main().catch((error) => {
  console.error('Failed to copy user settings:', error);
  process.exitCode = 1;
}).finally(async () => {
  try {
    const client = await getMongoClient();
    await client.close();
  } catch {
    // best-effort shutdown
  }
});
