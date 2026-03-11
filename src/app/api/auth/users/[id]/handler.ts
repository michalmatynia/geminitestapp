import { ObjectId } from 'mongodb';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { normalizeAuthEmail } from '@/features/auth/server';
import { auth } from '@/features/auth/server';
import { invalidateAuthAccessCache } from '@/features/auth/server';
import { getAuthDataProvider, requireAuthProvider } from '@/features/auth/server';
import { invalidateAuthSecurityProfileCache } from '@/features/auth/server';
import { invalidateUserPreferencesCache } from '@/features/auth/server';
import { AUTH_SETTINGS_KEYS, type AuthUserRoleMap } from '@/features/auth/server';
import { logAuthEvent } from '@/features/auth/server';
import type { AuthUser } from '@/shared/contracts/auth';
import type { MongoTimestampedSettingRecord } from '@/shared/contracts/settings';
import type { ApiHandlerContext } from '@/shared/contracts/ui';
import {
  authError,
  badRequestError,
  conflictError,
  forbiddenError,
  internalError,
  notFoundError,
} from '@/shared/errors/app-error';
import { getMongoDb } from '@/shared/lib/db/mongo-client';
import { parseJsonSetting, serializeSetting } from '@/shared/utils/settings-json';

export const updateSchema = z.object({
  name: z.string().trim().min(1).max(200).optional().nullable(),
  email: z.string().trim().email().optional().nullable(),
  emailVerified: z.boolean().optional().nullable(),
});

type MongoUserDoc = {
  _id: ObjectId | string;
  email?: string | null;
  name?: string | null;
  image?: string | null;
  emailVerified?: Date | null;
  createdAt?: Date | null;
  updatedAt?: Date | null;
};

type MongoSettingDoc = MongoTimestampedSettingRecord<string, string | null, Date>;

const USER_ROLES_SETTING_KEY = AUTH_SETTINGS_KEYS.userRoles;

const buildMongoUserIdFilter = (
  userId: string
): {
  _id: ObjectId | string | { $in: Array<ObjectId | string> };
} => {
  if (ObjectId.isValid(userId)) {
    return { _id: { $in: [new ObjectId(userId), userId] } };
  }
  return { _id: userId };
};

const buildMongoUserIdCandidates = (userId: string): Array<ObjectId | string> => {
  if (ObjectId.isValid(userId)) {
    return [new ObjectId(userId), userId];
  }
  return [userId];
};

const removeRoleMappingForUser = async (userId: string): Promise<boolean> => {
  if (!process.env['MONGODB_URI']) {
    return false;
  }
  const db = await getMongoDb();
  const settingsCollection = db.collection<MongoSettingDoc>('settings');
  const current = await settingsCollection.findOne({
    $or: [{ _id: USER_ROLES_SETTING_KEY }, { key: USER_ROLES_SETTING_KEY }],
  });
  const userRoles = parseJsonSetting<AuthUserRoleMap>(current?.value ?? null, {});
  if (!(userId in userRoles)) {
    return false;
  }

  delete userRoles[userId];
  const now = new Date();
  await settingsCollection.updateOne(
    { $or: [{ _id: USER_ROLES_SETTING_KEY }, { key: USER_ROLES_SETTING_KEY }] },
    {
      $set: {
        _id: USER_ROLES_SETTING_KEY,
        key: USER_ROLES_SETTING_KEY,
        value: serializeSetting(userRoles),
        updatedAt: now,
      },
      $setOnInsert: { createdAt: now },
    },
    { upsert: true }
  );
  return true;
};

export async function patchAuthUserHandler(
  req: NextRequest,
  ctx: ApiHandlerContext,
  params: { id: string }
): Promise<Response> {
  const session = await auth();
  const hasAccess =
    session?.user?.isElevated || session?.user?.permissions?.includes('auth.users.write');
  if (!hasAccess) {
    throw authError('Unauthorized.');
  }
  const data = ctx.body as z.infer<typeof updateSchema> | undefined;
  if (!data) {
    throw badRequestError('Invalid payload');
  }
  await logAuthEvent({
    req,
    action: 'auth.users.update',
    stage: 'start',
    userId: session?.user?.id ?? null,
    body: { targetUserId: params.id },
  });

  const { name, email, emailVerified } = data;
  if (name === undefined && email === undefined && emailVerified === undefined) {
    throw badRequestError('No updates provided.');
  }

  const { id: userId } = params;
  requireAuthProvider(await getAuthDataProvider());

  if (!process.env['MONGODB_URI']) {
    throw internalError('MongoDB is not configured.');
  }
  const db = await getMongoDb();
  const userIdFilter = buildMongoUserIdFilter(userId);
  const existing = await db.collection<MongoUserDoc>('users').findOne(userIdFilter);
  if (!existing) {
    throw notFoundError('User not found.');
  }

  const nextEmail = typeof email === 'string' ? normalizeAuthEmail(email) : undefined;
  if (nextEmail && nextEmail !== existing.email) {
    const conflict = await db.collection<MongoUserDoc>('users').findOne({ email: nextEmail });
    if (conflict && conflict._id.toString() !== userId) {
      throw conflictError('Email already in use.');
    }
  }

  const updateDoc: Partial<MongoUserDoc> = {
    ...(typeof name === 'string' ? { name } : {}),
    ...(typeof nextEmail === 'string' ? { email: nextEmail } : {}),
    ...(typeof emailVerified === 'boolean'
      ? { emailVerified: emailVerified ? new Date() : null }
      : {}),
    updatedAt: new Date(),
  };

  await db.collection<MongoUserDoc>('users').updateOne(userIdFilter, { $set: updateDoc });

  const updated = await db.collection<MongoUserDoc>('users').findOne(userIdFilter);
  if (!updated) {
    throw notFoundError('User not found.');
  }

  const payload: AuthUser = {
    id: updated._id.toString(),
    email: updated.email ?? null,
    name: updated.name ?? null,
    image: updated.image ?? null,
    emailVerified: updated.emailVerified ? updated.emailVerified.toISOString() : null,
    provider: 'mongodb',
    createdAt: updated.createdAt?.toISOString() ?? new Date().toISOString(),
    updatedAt: updated.updatedAt?.toISOString() ?? new Date().toISOString(),
  };
  await logAuthEvent({
    req,
    action: 'auth.users.update',
    stage: 'success',
    userId: session?.user?.id ?? null,
    body: { targetUserId: params.id },
    status: 200,
  });
  return NextResponse.json(payload);
}

export async function deleteAuthUserHandler(
  req: NextRequest,
  _ctx: ApiHandlerContext,
  params: { id: string }
): Promise<Response> {
  const session = await auth();
  const hasAccess =
    session?.user?.isElevated || session?.user?.permissions?.includes('auth.users.write');
  if (!hasAccess) {
    throw authError('Unauthorized.');
  }

  const { id: userId } = params;
  if (!userId) {
    throw badRequestError('Missing user id.');
  }
  if (session?.user?.id === userId) {
    throw forbiddenError('You cannot delete your own account while signed in.');
  }

  await logAuthEvent({
    req,
    action: 'auth.users.delete',
    stage: 'start',
    userId: session?.user?.id ?? null,
    body: { targetUserId: userId },
  });

  requireAuthProvider(await getAuthDataProvider());

  if (!process.env['MONGODB_URI']) {
    throw internalError('MongoDB is not configured.');
  }

  const db = await getMongoDb();
  const userIdFilter = buildMongoUserIdFilter(userId);
  const existing = await db.collection<MongoUserDoc>('users').findOne(userIdFilter);
  if (!existing) {
    throw notFoundError('User not found.');
  }
  const userIdCandidates = buildMongoUserIdCandidates(userId);
  const objectIdCandidates = userIdCandidates.filter(
    (candidate: ObjectId | string): candidate is ObjectId => candidate instanceof ObjectId
  );
  const authSecurityProfileFilters: Array<Record<string, unknown>> = [
    { userId: { $in: userIdCandidates } },
  ];
  if (objectIdCandidates.length > 0) {
    authSecurityProfileFilters.unshift({ _id: { $in: objectIdCandidates } });
  }

  await Promise.all([
    db.collection<MongoUserDoc>('users').deleteOne(userIdFilter),
    db.collection('accounts').deleteMany({ userId: { $in: userIdCandidates } }),
    db.collection('sessions').deleteMany({ userId: { $in: userIdCandidates } }),
    db.collection('auth_security_profiles').deleteMany({
      $or: authSecurityProfileFilters,
    }),
    db.collection('user_preferences').deleteMany({
      userId: { $in: userIdCandidates },
    }),
  ]);

  const roleMappingRemoved = await removeRoleMappingForUser(userId);
  invalidateAuthAccessCache(userId);
  invalidateAuthSecurityProfileCache(userId);
  invalidateUserPreferencesCache(userId);

  await logAuthEvent({
    req,
    action: 'auth.users.delete',
    stage: 'success',
    userId: session?.user?.id ?? null,
    body: { targetUserId: userId, roleMappingRemoved },
    status: 200,
  });
  return NextResponse.json({ id: userId, deleted: true });
}
