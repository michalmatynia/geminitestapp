import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { updateAuthSecurityProfile, getAuthSecurityProfile } from '@/features/auth/server';
import { auth } from '@/features/auth/server';
import { logAuthEvent } from '@/features/auth/utils/auth-request-logger';
import { internalError, authError, badRequestError } from '@/shared/errors/app-error';
import type { ApiHandlerContext } from '@/shared/types/api/api';

export const updateSchema = z.object({
  disabled: z.boolean().optional(),
  banned: z.boolean().optional(),
  allowedIps: z.array(z.string().trim()).optional(),
  disableMfa: z.boolean().optional(),
});

export async function GET_handler(_req: NextRequest, _ctx: ApiHandlerContext, params: { id: string }): Promise<Response> {
  const session = await auth();
  const hasAccess =
    session?.user?.isElevated ||
    session?.user?.permissions?.includes('auth.users.write');
  if (!hasAccess) {
    throw authError('Unauthorized.');
  }
  const id = params.id;
  if (!id) {
    throw internalError('Missing user id.');
  }
  const profile = await getAuthSecurityProfile(id);
  return NextResponse.json({
    userId: profile.userId,
    mfaEnabled: profile.mfaEnabled,
    allowedIps: profile.allowedIps,
    disabledAt: profile.disabledAt ? profile.disabledAt.toISOString() : null,
    bannedAt: profile.bannedAt ? profile.bannedAt.toISOString() : null,
  });
}

export async function PATCH_handler(req: NextRequest, ctx: ApiHandlerContext, params: { id: string }): Promise<Response> {
  const session = await auth();
  const hasAccess =
    session?.user?.isElevated ||
    session?.user?.permissions?.includes('auth.users.write');
  if (!hasAccess) {
    throw authError('Unauthorized.');
  }
  const { id } = params;
  if (!id) {
    throw internalError('Missing user id.');
  }
  const data = ctx.body as z.infer<typeof updateSchema> | undefined;
  if (!data) {
    throw badRequestError('Invalid payload');
  }
  await logAuthEvent({
    req,
    action: 'auth.users.security.update',
    stage: 'start',
    userId: session?.user?.id ?? null,
    body: { targetUserId: id },
  });

  const updates = data;
  const now = new Date();
  const allowedIps = updates.allowedIps
    ? updates.allowedIps.map((ip: string) => ip.trim()).filter(Boolean)
    : undefined;

  const profile = await updateAuthSecurityProfile(id, {
    ...(typeof updates.disabled === 'boolean'
      ? { disabledAt: updates.disabled ? now : null }
      : {}),
    ...(typeof updates.banned === 'boolean'
      ? { bannedAt: updates.banned ? now : null }
      : {}),
    ...(allowedIps ? { allowedIps } : {}),
    ...(updates.disableMfa
      ? { mfaEnabled: false, mfaSecret: null, recoveryCodes: [] }
      : {}),
  });

  await logAuthEvent({
    req,
    action: 'auth.users.security.update',
    stage: 'success',
    userId: session?.user?.id ?? null,
    body: { targetUserId: id },
    status: 200,
  });
  return NextResponse.json({
    userId: profile.userId,
    mfaEnabled: profile.mfaEnabled,
    allowedIps: profile.allowedIps,
    disabledAt: profile.disabledAt ? profile.disabledAt.toISOString() : null,
    bannedAt: profile.bannedAt ? profile.bannedAt.toISOString() : null,
  });
}
