import bcrypt from 'bcryptjs';
import { NextRequest, NextResponse } from 'next/server';

import { findAuthUserByEmail } from '@/features/auth/server';
import { getAuthSecurityProfile } from '@/features/auth/server';
import { checkLoginAllowed, extractClientIp, recordLoginFailure } from '@/features/auth/server';
import { getAuthUserPageSettings } from '@/features/auth/server';
import { createLoginChallenge } from '@/features/auth/server';
import { logAuthEvent } from '@/features/auth/server';
import {
  verifyCredentialsPayloadSchema,
  type VerifyCredentialsPayload,
} from '@/shared/contracts/auth';
import type { ApiHandlerContext } from '@/shared/contracts/ui/api';
import { badRequestError } from '@/shared/errors/app-error';
import { getSiteTranslator } from '@/shared/lib/i18n/server-translator';

export const payloadSchema = verifyCredentialsPayloadSchema;

export async function POST_handler(req: NextRequest, ctx: ApiHandlerContext): Promise<Response> {
  const { t } = await getSiteTranslator({ request: req });
  const data = ctx.body as VerifyCredentialsPayload | undefined;
  if (!data) throw badRequestError(t('AuthApi.invalidPayload'));

  const email = data.email;
  const password = data.password;
  const authFlow = data.authFlow?.trim() ?? '';
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
        message: t('AuthApi.tooManyAttempts'),
        lockedUntil: allowed.lockedUntil?.toISOString() ?? null,
      },
      { status: 429 }
    );
  }

  const user = await findAuthUserByEmail(email);
  if (!user) {
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
      message: t('AuthApi.invalidCredentials'),
    });
  }

  if (!user.passwordHash && authFlow === 'kangur_parent' && !user.emailVerified) {
    await recordLoginFailure({ email, ip, request: req });
    await logAuthEvent({
      req,
      action: 'auth.verify-credentials',
      stage: 'failure',
      outcome: 'password_setup_required',
      body: { email },
      status: 200,
    });
    return NextResponse.json({
      ok: false,
      code: 'PASSWORD_SETUP_REQUIRED',
      message: t('AuthApi.passwordSetupRequired'),
    });
  }

  if (!user.passwordHash) {
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
      message: t('AuthApi.invalidCredentials'),
    });
  }

  const security = await getAuthSecurityProfile(user.id);
  const settings = await getAuthUserPageSettings();
  const requiresVerifiedEmail = settings.requireEmailVerification || authFlow === 'kangur_parent';

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
      message: t('AuthApi.accountBanned'),
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
      message: t('AuthApi.accountDisabled'),
    });
  }
  if (requiresVerifiedEmail && !user.emailVerified) {
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
      message: t('AuthApi.emailVerificationRequired'),
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
        message: t('AuthApi.ipNotAllowed'),
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
      message: t('AuthApi.invalidCredentials'),
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
