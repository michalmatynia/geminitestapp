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

  response.cookies.set({ name: COOKIE_NAME, value, ...buildCookieOptions(maxAge) });
};

export const clearKangurLearnerSession = (response: NextResponse): void => {
  response.cookies.set({ name: COOKIE_NAME, value: '', ...buildCookieOptions(0) });
};

const readCookieFromHeader = (cookieHeader: string, name: string): string | undefined => {
  const prefix = `${name}=`;
  for (const entry of cookieHeader.split(';')) {
    const trimmed = entry.trim();
    if (trimmed.startsWith(prefix)) return trimmed.slice(prefix.length);
  }
  return undefined;
};
