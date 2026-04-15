import { type NextRequest, type NextResponse } from 'next/server';
import { reportObservabilityInternalError } from '@/shared/utils/observability/internal-observability-fallback';

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

const LOOPBACK_HOSTNAMES = new Set(['localhost', '127.0.0.1', '0.0.0.0', '::1', '[::1]']);

const isLoopbackHostname = (hostname: string): boolean => LOOPBACK_HOSTNAMES.has(hostname);

const isEquivalentLoopbackOrigin = (candidateOrigin: string, requestOrigin: string): boolean => {
  try {
    const candidate = new URL(candidateOrigin);
    const request = new URL(requestOrigin);
    return (
      candidate.protocol === request.protocol &&
      candidate.port === request.port &&
      isLoopbackHostname(candidate.hostname) &&
      isLoopbackHostname(request.hostname)
    );
  } catch (error) {
    reportObservabilityInternalError(error, {
      source: 'csrf',
      action: 'isEquivalentLoopbackOrigin',
      service: 'security.csrf',
    });
    return false;
  }
};

const isAllowedOrigin = (candidateOrigin: string, requestOrigin: string): boolean =>
  candidateOrigin === requestOrigin || isEquivalentLoopbackOrigin(candidateOrigin, requestOrigin);

const getRequestOrigin = (request: NextRequest): string => {
  const forwardedHost = request.headers.get('x-forwarded-host');
  const forwardedProto = request.headers.get('x-forwarded-proto');
  const host = forwardedHost ?? request.headers.get('host');

  if (host) {
    const protocol = forwardedProto ?? request.nextUrl.protocol.replace(/:$/, '');
    return `${protocol}://${host}`;
  }

  return request.nextUrl.origin;
};

const normalizeOrigin = (value: string): string | null => {
  try {
    return new URL(value).origin;
  } catch {
    return null;
  }
};

const resolveCandidateOrigin = (request: NextRequest): string | null => {
  const origin = request.headers.get('origin');
  if (origin) {
    return normalizeOrigin(origin);
  }

  const referer = request.headers.get('referer');
  if (!referer) {
    return null;
  }

  try {
    return new URL(referer).origin;
  } catch (error) {
    reportObservabilityInternalError(error, {
      source: 'csrf',
      action: 'resolveCandidateOrigin',
      service: 'security.csrf',
    });
    return null;
  }
};

export const isSameOriginRequest = (request: NextRequest): boolean => {
  const candidateOrigin = resolveCandidateOrigin(request);
  if (!candidateOrigin) {
    return true;
  }

  const requestOrigin = getRequestOrigin(request);
  return isAllowedOrigin(candidateOrigin, requestOrigin);
};

export const isTrustedOriginRequest = (
  request: NextRequest,
  allowedOrigins?: readonly string[] | null
): boolean => {
  if (!allowedOrigins || allowedOrigins.length === 0) {
    return false;
  }

  const candidateOrigin = resolveCandidateOrigin(request);
  if (!candidateOrigin) {
    return false;
  }

  return allowedOrigins.some((allowedOrigin) => {
    const normalizedAllowedOrigin = normalizeOrigin(allowedOrigin);
    return normalizedAllowedOrigin
      ? isAllowedOrigin(candidateOrigin, normalizedAllowedOrigin)
      : false;
  });
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
