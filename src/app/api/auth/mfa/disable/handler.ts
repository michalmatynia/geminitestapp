import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { auth } from '@/features/auth/server';
import { getAuthSecurityProfile, updateAuthSecurityProfile } from '@/features/auth/server';
import { decryptAuthSecret } from '@/features/auth/server';
import { hashRecoveryCode, verifyTotpToken } from '@/features/auth/server';
import { logAuthEvent } from '@/features/auth/server';
import type { ApiHandlerContext } from '@/shared/contracts/ui';
import { authError, badRequestError, validationError } from '@/shared/errors/app-error';

export const payloadSchema = z.object({
  token: z.string().trim().optional(),
  recoveryCode: z.string().trim().optional(),
});

export async function POST_handler(req: NextRequest, ctx: ApiHandlerContext): Promise<Response> {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) {
    throw authError('Unauthorized.');
  }

  const data = ctx.body as z.infer<typeof payloadSchema> | undefined;
  if (!data) {
    throw badRequestError('Invalid payload');
  }
  await logAuthEvent({
    req,
    action: 'auth.mfa.disable',
    stage: 'start',
    userId,
    body: {
      hasToken: Boolean(data?.token?.trim()),
      hasRecoveryCode: Boolean(data?.recoveryCode?.trim()),
    },
  });

  const profile = await getAuthSecurityProfile(userId);
  if (!profile.mfaEnabled) {
    return NextResponse.json({ ok: true, message: 'MFA already disabled.' });
  }

  const token = data?.token?.trim() ?? '';
  const recovery = data?.recoveryCode?.trim() ?? '';
  if (!token && !recovery) {
    throw validationError('Provide a token or recovery code.');
  }

  let valid = false;
  if (recovery) {
    const hashed = hashRecoveryCode(recovery);
    valid = profile.recoveryCodes.includes(hashed);
  }
  if (!valid && token && profile.mfaSecret) {
    const secret = decryptAuthSecret(profile.mfaSecret);
    valid = verifyTotpToken(secret, token);
  }

  if (!valid) {
    throw validationError('Invalid token or recovery code.');
  }

  await updateAuthSecurityProfile(userId, {
    mfaEnabled: false,
    mfaSecret: null,
    recoveryCodes: [],
  });

  await logAuthEvent({
    req,
    action: 'auth.mfa.disable',
    stage: 'success',
    userId,
    status: 200,
  });
  return NextResponse.json({ ok: true });
}
