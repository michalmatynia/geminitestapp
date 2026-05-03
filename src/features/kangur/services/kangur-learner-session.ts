import 'server-only';

import { createHmac, timingSafeEqual } from 'crypto';

import { type NextRequest, type NextResponse } from 'next/server';
import { ErrorSystem } from '@/features/kangur/shared/utils/observability/error-system';


type KangurLearnerSessionPayload = {
  learnerId: string;
  ownerUserId: string;
  exp: number;
};

const COOKIE_NAME = 'kangur.learner-session';
const COOKIE_TTL_MS = 1000 * 60 * 60 * 24 * 30;
const DEV_FALLBACK_SIGNING_KEY = 'kangur-dev-signing-key-change-me';

const resolveCookieDomain = (): string | undefined => {
  const value = process.env['KANGUR_COOKIE_DOMAIN'];
  if (!value || value.trim().length === 0) {
    return undefined;
  }
  return value.trim();
};

const resolveSigningKey = (): string =>
  process.env['AUTH_SECRET'] ||
  process.env['NEXTAUTH_SECRET'] ||
  (process.env['NODE_ENV'] === 'development' ? DEV_FALLBACK_SIGNING_KEY : '');

const base64UrlEncode = (value: string): string => Buffer.from(value).toString('base64url');

const base64UrlDecode = (value: string): string => Buffer.from(value, 'base64url').toString('utf8');

const signValue = (value: string): string =>
  createHmac('sha256', resolveSigningKey()).update(value).digest('base64url');

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

const readSignedPayloadBody = (raw: string | undefined): string | null => {
  if (!raw) {
    return null;
  }
  const [body, signature] = raw.split('.');
  if (!body || !signature) {
    return null;
  }
  if (!safeEqual(signValue(body), signature)) {
    return null;
  }
  return body;
};

const normalizePayload = (
  parsed: Partial<KangurLearnerSessionPayload>
): KangurLearnerSessionPayload | null => {
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
};

const parsePayload = (raw: string | undefined): KangurLearnerSessionPayload | null => {
  const body = readSignedPayloadBody(raw);
  if (!body) {
    return null;
  }

  try {
    const parsed = JSON.parse(base64UrlDecode(body)) as Partial<KangurLearnerSessionPayload>;
    return normalizePayload(parsed);
  } catch (error) {
    void ErrorSystem.captureException(error);
    return null;
  }
};

const readCookieFromHeader = (cookieHeader: string | null, name: string): string | undefined => {
  if (!cookieHeader) {
    return undefined;
  }

  const prefix = `${name}=`;
  const entries = cookieHeader.split(';');
  for (const entry of entries) {
    const trimmed = entry.trim();
    if (trimmed.startsWith(prefix)) {
      return trimmed.slice(prefix.length);
    }
  }

  return undefined;
};

const buildCookieValue = (input: { value: string; maxAge: number }): string => {
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
  const domain = resolveCookieDomain();
  if (domain) {
    parts.push(`Domain=${domain}`);
  }
  return parts.join('; ');
};

export const readKangurLearnerSession = (
  request: NextRequest
): KangurLearnerSessionPayload | null => {
  const cookies = (
    request as NextRequest & {
      cookies?: { get?: (name: string) => { value?: string } | undefined };
    }
  ).cookies;
  const cookieValue =
    cookies?.get?.(COOKIE_NAME)?.value ??
    readCookieFromHeader(request.headers.get('cookie'), COOKIE_NAME);
  return parsePayload(cookieValue);
};

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
  const domain = resolveCookieDomain();
  const cookies = (
    response as NextResponse & {
      cookies?: { set?: (value: Record<string, unknown>) => void };
    }
  ).cookies;
  if (cookies?.set) {
    cookies.set({
      name: COOKIE_NAME,
      value,
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env['NODE_ENV'] === 'production',
      path: '/',
      maxAge,
      ...(domain ? { domain } : {}),
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
  const domain = resolveCookieDomain();
  const cookies = (
    response as NextResponse & {
      cookies?: { set?: (value: Record<string, unknown>) => void };
    }
  ).cookies;
  if (cookies?.set) {
    cookies.set({
      name: COOKIE_NAME,
      value: '',
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env['NODE_ENV'] === 'production',
      path: '/',
      maxAge: 0,
      ...(domain ? { domain } : {}),
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
