import { NextRequest, NextResponse } from 'next/server';
import type { Session } from 'next-auth';
import { z } from 'zod';

import {
  auth,
  getAuthDefaultRoleId,
  getAuthPermissions,
  getAuthRoles,
  getAuthUserRoles,
  invalidateAuthAccessCache,
  AUTH_SETTINGS_KEYS,
} from '@/features/auth/server';
import type { AuthRoleSettings } from '@/shared/contracts/auth';
import { authUserRoleMapSchema } from '@/shared/contracts/auth';
import type { MongoSettingRecord } from '@/shared/contracts/base';
import type { ApiHandlerContext } from '@/shared/contracts/ui/api';
import { authError, badRequestError, internalError } from '@/shared/errors/app-error';
import { getMongoDb } from '@/shared/lib/db/mongo-client';
import { serializeSetting } from '@/shared/utils/settings-json';

const updateSchema = z.object({
  userRoles: authUserRoleMapSchema,
});

const buildRoleSettingsPayload = async (): Promise<AuthRoleSettings> => {
  const [roles, permissions, userRoles, defaultRoleId] = await Promise.all([
    getAuthRoles(),
    getAuthPermissions(),
    getAuthUserRoles(),
    getAuthDefaultRoleId(),
  ]);
  return {
    roles,
    permissions,
    userRoles,
    defaultRoleId: defaultRoleId ?? null,
  };
};

const canReadRoleSettings = (session: Session | null): boolean =>
  Boolean(
    session?.user?.isElevated ||
      session?.user?.permissions?.includes('auth.users.read') ||
      session?.user?.permissions?.includes('auth.users.write')
  );

const canWriteRoleSettings = (session: Session | null): boolean =>
  Boolean(
    session?.user?.isElevated || session?.user?.permissions?.includes('auth.users.write')
  );

export async function GET_handler(_req: NextRequest, _ctx: ApiHandlerContext): Promise<Response> {
  const session = await auth();
  if (!canReadRoleSettings(session)) {
    throw authError('Unauthorized.');
  }
  const payload = await buildRoleSettingsPayload();
  return NextResponse.json(payload, {
    headers: {
      'Cache-Control': 'no-store',
    },
  });
}

export async function PATCH_handler(
  _req: NextRequest,
  ctx: ApiHandlerContext
): Promise<Response> {
  const session = await auth();
  if (!canWriteRoleSettings(session)) {
    throw authError('Unauthorized.');
  }
  const data = ctx.body as z.infer<typeof updateSchema> | undefined;
  if (!data) {
    throw badRequestError('Invalid payload.');
  }

  if (!process.env['MONGODB_URI']) {
    throw internalError('MongoDB is not configured.');
  }

  const userRoles = data.userRoles ?? {};
  const key = AUTH_SETTINGS_KEYS.userRoles;
  const mongo = await getMongoDb();
  const now = new Date();
  const settingsCollection = mongo.collection<MongoSettingRecord>('settings');

  const updateResult = await settingsCollection.findOneAndUpdate(
    { $or: [{ _id: key }, { key }] },
    {
      $set: {
        key,
        value: serializeSetting(userRoles),
        updatedAt: now,
      },
      $setOnInsert: {
        createdAt: now,
      },
    },
    { upsert: true, returnDocument: 'after' }
  );

  const updatedRecord =
    updateResult && typeof updateResult === 'object' && 'ok' in updateResult
      ? updateResult.value
      : updateResult;
  const keepId =
    updatedRecord && typeof updatedRecord === 'object' && '_id' in updatedRecord
      ? updatedRecord._id
      : null;
  if (keepId) {
    await settingsCollection.deleteMany({
      $or: [{ _id: key }, { key }],
      _id: { $ne: keepId },
    });
  }

  invalidateAuthAccessCache();

  const payload = await buildRoleSettingsPayload();
  return NextResponse.json(payload, {
    headers: {
      'Cache-Control': 'no-store',
    },
  });
}

export { updateSchema };
