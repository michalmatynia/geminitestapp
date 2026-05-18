import 'server-only';

import type { NextRequest, NextResponse } from 'next/server';

import {
  parsePayload,
  serializePayload,
  buildCookieOptions,
  COOKIE_NAME,
  type KangurLearnerSessionPayload,
} from '@/features/kangur/services/session';

const COOKIE_TTL_MS = 1000 * 60 * 60 * 24 * 30;

export const readKangurLearnerSession = (
  request: NextRequest
): KangurLearnerSessionPayload | null => {
  const cookieHeader = request.headers.get('cookie');
  const cookieValue =
    request.cookies.get(COOKIE_NAME)?.value ??
    (cookieHeader !== null ? readCookieFromHeader(cookieHeader, COOKIE_NAME) : undefined);
  return parsePayload(cookieValue);
};

const serializeCookieHeader = (name: string, value: string, maxAge: number): string => {
  const opts = buildCookieOptions(maxAge);
  const parts = [
    `${name}=${value}`,
    `Path=${opts.path}`,
    `Max-Age=${opts.maxAge}`,
    `SameSite=${opts.sameSite === 'lax' ? 'Lax' : opts.sameSite}`,
    ...(opts.httpOnly ? ['HttpOnly'] : []),
    ...(opts.secure ? ['Secure'] : []),
    ...(opts.domain !== undefined ? [`Domain=${opts.domain}`] : []),
  ];
  return parts.join('; ');
};

export const setKangurLearnerSession = (
  response: NextResponse,
  input: { learnerId: string; ownerUserId: string }
): void => {
  const value = serializePayload({
    learnerId: input.learnerId,
    ownerUserId: input.ownerUserId,
    exp: Date.now() + COOKIE_TTL_MS,
  });
  const maxAge = Math.floor(COOKIE_TTL_MS / 1000);
  response.headers.append('Set-Cookie', serializeCookieHeader(COOKIE_NAME, value, maxAge));
};

export const clearKangurLearnerSession = (response: NextResponse): void => {
  response.headers.append('Set-Cookie', serializeCookieHeader(COOKIE_NAME, '', 0));
};

const readCookieFromHeader = (cookieHeader: string, name: string): string | undefined => {
  const prefix = `${name}=`;
  for (const entry of cookieHeader.split(';')) {
    const trimmed = entry.trim();
    if (trimmed.startsWith(prefix)) return trimmed.slice(prefix.length);
  }
  return undefined;
};
