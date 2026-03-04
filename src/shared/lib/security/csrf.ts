import { NextRequest, NextResponse } from 'next/server';

export const CSRF_COOKIE_NAME = 'csrf-token';
export const CSRF_HEADER_NAME = 'x-csrf-token';
export const CSRF_SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

const SESSION_COOKIE_NAMES = [
  'authjs.session-token',
  '__Secure-authjs.session-token',
  'next-auth.session-token',
  '__Secure-next-auth.session-token',
];

export const hasSessionCookie = (request: NextRequest): boolean =>
  SESSION_COOKIE_NAMES.some((name: string) => Boolean(request.cookies.get(name)));

const toBase64Url = (bytes: Uint8Array): string => {
  let binary = '';
  bytes.forEach((byte: number) => {
    binary += String.fromCharCode(byte);
  });
  const base64 = typeof btoa === 'function' ? btoa(binary) : Buffer.from(bytes).toString('base64');
  return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
};

export const generateCsrfToken = (): string => {
  if (globalThis.crypto?.randomUUID) {
    return globalThis.crypto.randomUUID().replace(/-/g, '');
  }
  if (globalThis.crypto?.getRandomValues) {
    const bytes = new Uint8Array(32);
    globalThis.crypto.getRandomValues(bytes);
    return toBase64Url(bytes);
  }
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
};

export const getCsrfTokenFromRequest = (request: NextRequest): string | null =>
  request.cookies.get(CSRF_COOKIE_NAME)?.value ?? null;

export const getCsrfTokenFromHeaders = (request: NextRequest): string | null =>
  request.headers.get(CSRF_HEADER_NAME) ?? null;

export const isSameOriginRequest = (request: NextRequest): boolean => {
  const origin = request.headers.get('origin');
  const referer = request.headers.get('referer');
  const requestOrigin = request.nextUrl.origin;
  if (origin) {
    return origin === requestOrigin;
  }
  if (referer) {
    try {
      return new URL(referer).origin === requestOrigin;
    } catch {
      return false;
    }
  }
  return true;
};

export const ensureCsrfCookie = (response: NextResponse, existingToken?: string | null): string => {
  const token = existingToken && existingToken.length > 0 ? existingToken : generateCsrfToken();
  if (!existingToken) {
    response.cookies.set({
      name: CSRF_COOKIE_NAME,
      value: token,
      httpOnly: false,
      sameSite: 'lax',
      path: '/',
      secure: process.env['NODE_ENV'] === 'production',
      maxAge: 60 * 60 * 12, // 12 hours
    });
  }
  return token;
};
