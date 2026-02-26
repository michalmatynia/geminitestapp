import bcrypt from 'bcryptjs';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { normalizeAuthEmail } from '@/features/auth/server';
import { auth } from '@/features/auth/server';
import {
  checkLoginAllowed,
  extractClientIp,
  recordLoginFailure,
  recordLoginSuccess,
} from '@/features/auth/server';
import { getAuthSecurityProfile } from '@/features/auth/server';
import { getAuthUserPageSettings } from '@/features/auth/server';
import { logAuthEvent } from '@/features/auth/server';
import type { ApiHandlerContext } from '@/shared/contracts/ui';
import { badRequestError, internalError } from '@/shared/errors/app-error';
import { getMongoDb } from '@/shared/lib/db/mongo-client';

export const payloadSchema = z.object({
  email: z.string().trim().email(),
  password: z.string().min(1),
});

type MongoUserDoc = {
  email?: string | null;
  passwordHash?: string | null;
  emailVerified?: Date | null;
};

export async function POST_handler(
  req: NextRequest,
  ctx: ApiHandlerContext,
): Promise<Response> {
  const session = await auth();
  const hasAccess =
    session?.user?.isElevated ||
    session?.user?.permissions?.includes('auth.users.write');
  if (!hasAccess) {
    return NextResponse.json(
      { ok: false, message: 'Unauthorized.' },
      { status: 401 },
    );
  }
  const data = ctx.body as z.infer<typeof payloadSchema> | undefined;
  if (!data) {
    throw badRequestError('Invalid payload');
  }
  await logAuthEvent({
    req,
    action: 'auth.mock-signin',
    stage: 'start',
    userId: session?.user?.id ?? null,
    body: { email: data.email },
  });

  if (!process.env['MONGODB_URI']) {
    throw internalError('MongoDB is not configured.');
  }

  const email = normalizeAuthEmail(data.email);
  const ip = extractClientIp(req);
  const allowed = await checkLoginAllowed({ email, ip });
  if (!allowed.allowed) {
    await logAuthEvent({
      req,
      action: 'auth.mock-signin',
      stage: 'failure',
      outcome: 'rate_limited',
      body: { email },
      status: 429,
    });
    return NextResponse.json(
      {
        ok: false,
        message: 'Too many attempts. Please try again later.',
      },
      { status: 429 },
    );
  }
  const db = await getMongoDb();
  const user = await db
    .collection<MongoUserDoc>('users')
    .findOne({ email }, { projection: { passwordHash: 1, emailVerified: 1 } });

  if (!user?.passwordHash) {
    await recordLoginFailure({ email, ip, request: req });
    await logAuthEvent({
      req,
      action: 'auth.mock-signin',
      stage: 'failure',
      outcome: 'invalid_credentials',
      body: { email },
      status: 200,
    });
    return NextResponse.json({
      ok: false,
      message: 'User not found or password is not set.',
    });
  }

  const security = await getAuthSecurityProfile(user._id.toString());
  const settings = await getAuthUserPageSettings();

  if (security.bannedAt) {
    await recordLoginFailure({ email, ip, request: req });
    await logAuthEvent({
      req,
      action: 'auth.mock-signin',
      stage: 'failure',
      outcome: 'account_banned',
      body: { email },
      status: 200,
    });
    return NextResponse.json({ ok: false, message: 'Account is banned.' });
  }
  if (security.disabledAt) {
    await recordLoginFailure({ email, ip, request: req });
    await logAuthEvent({
      req,
      action: 'auth.mock-signin',
      stage: 'failure',
      outcome: 'account_disabled',
      body: { email },
      status: 200,
    });
    return NextResponse.json({ ok: false, message: 'Account is disabled.' });
  }
  if (settings.requireEmailVerification) {
    if (!user.emailVerified) {
      await recordLoginFailure({ email, ip, request: req });
      await logAuthEvent({
        req,
        action: 'auth.mock-signin',
        stage: 'failure',
        outcome: 'email_unverified',
        body: { email },
        status: 200,
      });
      return NextResponse.json({
        ok: false,
        message: 'Email verification required.',
      });
    }
  }
  if (security.allowedIps.length > 0 && ip) {
    const allowedSet = new Set(security.allowedIps);
    if (!allowedSet.has(ip)) {
      await recordLoginFailure({ email, ip, request: req });
      await logAuthEvent({
        req,
        action: 'auth.mock-signin',
        stage: 'failure',
        outcome: 'ip_not_allowed',
        body: { email },
        status: 200,
      });
      return NextResponse.json({ ok: false, message: 'IP not allowed.' });
    }
  }
  if (security.mfaEnabled) {
    await logAuthEvent({
      req,
      action: 'auth.mock-signin',
      stage: 'failure',
      outcome: 'mfa_required',
      body: { email },
      status: 200,
    });
    return NextResponse.json({
      ok: false,
      message: 'MFA is enabled. Use MFA login.',
    });
  }

  const isValid = await bcrypt.compare(data.password, user.passwordHash);
  if (!isValid) {
    await recordLoginFailure({ email, ip, request: req });
  } else {
    await recordLoginSuccess({ email, ip, request: req });
  }
  await logAuthEvent({
    req,
    action: 'auth.mock-signin',
    stage: isValid ? 'success' : 'failure',
    outcome: isValid ? 'ok' : 'invalid_credentials',
    body: { email },
    status: 200,
  });
  return NextResponse.json({
    ok: isValid,
    message: isValid ? 'Credentials are valid.' : 'Invalid credentials.',
  });
}
