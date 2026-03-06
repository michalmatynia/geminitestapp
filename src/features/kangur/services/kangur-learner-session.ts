import 'server-only';

import { createHmac, timingSafeEqual } from 'crypto';

import { NextRequest, NextResponse } from 'next/server';

type KangurLearnerSessionPayload = {
  learnerId: string;
  ownerUserId: string;
  exp: number;
};

const COOKIE_NAME = 'kangur.learner-session';
const COOKIE_TTL_MS = 1000 * 60 * 60 * 24 * 30;
const DEV_FALLBACK_SECRET = 'kangur-dev-secret-change-me';

const resolveSecret = (): string =>
  process.env['AUTH_SECRET'] ||
  process.env['NEXTAUTH_SECRET'] ||
  (process.env['NODE_ENV'] === 'development' ? DEV_FALLBACK_SECRET : '');

const base64UrlEncode = (value: string): string => Buffer.from(value).toString('base64url');

const base64UrlDecode = (value: string): string => Buffer.from(value, 'base64url').toString('utf8');

const signValue = (value: string): string =>
  createHmac('sha256', resolveSecret()).update(value).digest('base64url');

const safeEqual = (left: string, right: string): boolean => {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);
  if (leftBuffer.length !== rightBuffer.length) {
    return false;
  }
  return timingSafeEqual(leftBuffer, rightBuffer);
};

const serializePayload = (payload: KangurLearnerSessionPayload): string => {
  const body = base64UrlEncode(JSON.stringify(payload));
  const signature = signValue(body);
  return `${body}.${signature}`;
};

const parsePayload = (raw: string | undefined): KangurLearnerSessionPayload | null => {
  if (!raw) {
    return null;
  }
  const [body, signature] = raw.split('.');
  if (!body || !signature || !safeEqual(signValue(body), signature)) {
    return null;
  }

  try {
    const parsed = JSON.parse(base64UrlDecode(body)) as Partial<KangurLearnerSessionPayload>;
    if (
      typeof parsed.learnerId !== 'string' ||
      typeof parsed.ownerUserId !== 'string' ||
      typeof parsed.exp !== 'number'
    ) {
      return null;
    }
    if (parsed.exp <= Date.now()) {
      return null;
    }
    return {
      learnerId: parsed.learnerId,
      ownerUserId: parsed.ownerUserId,
      exp: parsed.exp,
    };
  } catch {
    return null;
  }
};

const buildCookieValue = (input: {
  value: string;
  maxAge: number;
}): string => {
  const parts = [
    `${COOKIE_NAME}=${input.value}`,
    'Path=/',
    'HttpOnly',
    'SameSite=Lax',
    `Max-Age=${input.maxAge}`,
  ];
  if (process.env['NODE_ENV'] === 'production') {
    parts.push('Secure');
  }
  return parts.join('; ');
};

export const readKangurLearnerSession = (
  request: NextRequest
): KangurLearnerSessionPayload | null =>
  parsePayload(request.cookies.get(COOKIE_NAME)?.value);

export const setKangurLearnerSession = (
  response: NextResponse,
  input: {
    learnerId: string;
    ownerUserId: string;
  }
): void => {
  const value = serializePayload({
    learnerId: input.learnerId,
    ownerUserId: input.ownerUserId,
    exp: Date.now() + COOKIE_TTL_MS,
  });
  const maxAge = Math.floor(COOKIE_TTL_MS / 1000);
  const cookies = (response as NextResponse & {
    cookies?: { set?: (value: Record<string, unknown>) => void };
  }).cookies;
  if (cookies?.set) {
    cookies.set({
      name: COOKIE_NAME,
      value,
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env['NODE_ENV'] === 'production',
      path: '/',
      maxAge,
    });
    return;
  }

  response.headers.append(
    'set-cookie',
    buildCookieValue({
      value,
      maxAge,
    })
  );
};

export const clearKangurLearnerSession = (response: NextResponse): void => {
  const cookies = (response as NextResponse & {
    cookies?: { set?: (value: Record<string, unknown>) => void };
  }).cookies;
  if (cookies?.set) {
    cookies.set({
      name: COOKIE_NAME,
      value: '',
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env['NODE_ENV'] === 'production',
      path: '/',
      maxAge: 0,
    });
    return;
  }

  response.headers.append(
    'set-cookie',
    buildCookieValue({
      value: '',
      maxAge: 0,
    })
  );
};
