import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { auth } from '@/features/auth/server';
import { getAuthSecurityProfile, updateAuthSecurityProfile } from '@/features/auth/server';
import { decryptAuthSecret } from '@/features/auth/server';
import { generateRecoveryCodes, hashRecoveryCode, verifyTotpToken } from '@/features/auth/server';
import { logAuthEvent } from '@/features/auth/utils/auth-request-logger';
import { badRequestError, conflictError, authError, validationError } from '@/shared/errors/app-error';
import { apiHandler } from '@/shared/lib/api/api-handler';
import type { ApiHandlerContext } from '@/shared/types/api';

export const runtime = 'nodejs';

const payloadSchema = z.object({
  token: z.string().trim().min(4),
});

async function POST_handler(req: NextRequest, ctx: ApiHandlerContext): Promise<Response> {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) {
    throw authError('Unauthorized.');
  }

  const parsed = ctx.body as z.infer<typeof payloadSchema> | undefined;
  if (!parsed) throw badRequestError('Invalid payload');
  await logAuthEvent({
    req,
    action: 'auth.mfa.verify',
    stage: 'start',
    userId,
    body: { hasToken: Boolean(parsed.token) },
  });

  const profile = await getAuthSecurityProfile(userId);
  if (!profile.mfaSecret) {
    throw conflictError('MFA setup has not been started.');
  }
  if (profile.mfaEnabled) {
    throw conflictError('MFA is already enabled.');
  }

  const secret = decryptAuthSecret(profile.mfaSecret);
  const ok = verifyTotpToken(secret, parsed.token);
  if (!ok) {
    throw validationError('Invalid MFA token.');
  }

  const recoveryCodes = generateRecoveryCodes(8);
  const hashedCodes = recoveryCodes.map(hashRecoveryCode);
  await updateAuthSecurityProfile(userId, {
    mfaEnabled: true,
    recoveryCodes: hashedCodes,
  });

  await logAuthEvent({
    req,
    action: 'auth.mfa.verify',
    stage: 'success',
    userId,
    status: 200,
  });
  return NextResponse.json({
    ok: true,
    recoveryCodes,
  });
}

export const POST = apiHandler(
  async (req: NextRequest, ctx: ApiHandlerContext): Promise<Response> => POST_handler(req, ctx),
  {
    source: 'auth.mfa.verify.POST',
    parseJsonBody: true,
    bodySchema: payloadSchema,
    rateLimitKey: 'auth',
    maxBodyBytes: 10_000,
    allowedMethods: ['POST'],
    requireCsrf: false,
  });
