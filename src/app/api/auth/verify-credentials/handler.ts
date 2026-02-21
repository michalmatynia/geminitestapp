import bcrypt from 'bcryptjs';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { findAuthUserByEmail } from '@/features/auth/server';
import { getAuthSecurityProfile } from '@/features/auth/server';
import {
  checkLoginAllowed,
  extractClientIp,
  recordLoginFailure,
} from '@/features/auth/server';
import { getAuthUserPageSettings } from '@/features/auth/server';
import { createLoginChallenge } from '@/features/auth/server';
import { logAuthEvent } from '@/features/auth/server';
import type { ApiHandlerContext } from '@/shared/contracts/ui';
import { badRequestError } from '@/shared/errors/app-error';


export const payloadSchema = z.object({
  email: z.string().trim().email(),
  password: z.string().min(1),
});

export async function POST_handler(req: NextRequest, ctx: ApiHandlerContext): Promise<Response> {
  const data = ctx.body as z.infer<typeof payloadSchema> | undefined;
  if (!data) throw badRequestError('Invalid payload');

  const email = data.email;
  const password = data.password;
  const ip = extractClientIp(req);
  await logAuthEvent({
    req,
    action: 'auth.verify-credentials',
    stage: 'start',
    body: { email },
  });

  const allowed = await checkLoginAllowed({ email, ip });
  if (!allowed.allowed) {
    await logAuthEvent({
      req,
      action: 'auth.verify-credentials',
      stage: 'failure',
      outcome: 'rate_limited',
      body: { email },
      status: 429,
    });
    return NextResponse.json(
      {
        ok: false,
        code: allowed.reason,
        message: 'Too many attempts. Please try again later.',
        lockedUntil: allowed.lockedUntil?.toISOString() ?? null,
      },
      { status: 429 }
    );
  }

  const user = await findAuthUserByEmail(email);
  if (!user?.passwordHash) {
    await recordLoginFailure({ email, ip, request: req });
    await logAuthEvent({
      req,
      action: 'auth.verify-credentials',
      stage: 'failure',
      outcome: 'invalid_credentials',
      body: { email },
      status: 200,
    });
    return NextResponse.json({
      ok: false,
      code: 'INVALID_CREDENTIALS',
      message: 'Invalid email or password.',
    });
  }

  const security = await getAuthSecurityProfile(user.id);
  const settings = await getAuthUserPageSettings();

  if (security.bannedAt) {
    await recordLoginFailure({ email, ip, request: req });
    await logAuthEvent({
      req,
      action: 'auth.verify-credentials',
      stage: 'failure',
      outcome: 'account_banned',
      body: { email },
      status: 200,
    });
    return NextResponse.json({
      ok: false,
      code: 'ACCOUNT_BANNED',
      message: 'This account is banned.',
    });
  }
  if (security.disabledAt) {
    await recordLoginFailure({ email, ip, request: req });
    await logAuthEvent({
      req,
      action: 'auth.verify-credentials',
      stage: 'failure',
      outcome: 'account_disabled',
      body: { email },
      status: 200,
    });
    return NextResponse.json({
      ok: false,
      code: 'ACCOUNT_DISABLED',
      message: 'This account is disabled.',
    });
  }
  if (settings.requireEmailVerification && !user.emailVerified) {
    await recordLoginFailure({ email, ip, request: req });
    await logAuthEvent({
      req,
      action: 'auth.verify-credentials',
      stage: 'failure',
      outcome: 'email_unverified',
      body: { email },
      status: 200,
    });
    return NextResponse.json({
      ok: false,
      code: 'EMAIL_UNVERIFIED',
      message: 'Email verification is required.',
    });
  }
  if (security.allowedIps.length > 0 && ip) {
    const allowedSet = new Set(security.allowedIps);
    if (!allowedSet.has(ip)) {
      await recordLoginFailure({ email, ip, request: req });
      await logAuthEvent({
        req,
        action: 'auth.verify-credentials',
        stage: 'failure',
        outcome: 'ip_not_allowed',
        body: { email },
        status: 200,
      });
      return NextResponse.json({
        ok: false,
        code: 'IP_NOT_ALLOWED',
        message: 'This IP is not allowed for the account.',
      });
    }
  }

  const isValid = await bcrypt.compare(password, user.passwordHash);
  if (!isValid) {
    await recordLoginFailure({ email, ip, request: req });
    await logAuthEvent({
      req,
      action: 'auth.verify-credentials',
      stage: 'failure',
      outcome: 'invalid_credentials',
      body: { email },
      status: 200,
    });
    return NextResponse.json({
      ok: false,
      code: 'INVALID_CREDENTIALS',
      message: 'Invalid email or password.',
    });
  }

  const challenge = await createLoginChallenge({
    userId: user.id,
    email: user.email,
    ip,
    mfaRequired: Boolean(security.mfaEnabled),
  });
  await logAuthEvent({
    req,
    action: 'auth.verify-credentials',
    stage: 'success',
    userId: user.id,
    body: { email },
    status: 200,
    outcome: security.mfaEnabled ? 'mfa_required' : 'ok',
  });

  return NextResponse.json({
    ok: true,
    mfaRequired: Boolean(security.mfaEnabled),
    challengeId: challenge.id,
    expiresAt: challenge.expiresAt.toISOString(),
  });
}

