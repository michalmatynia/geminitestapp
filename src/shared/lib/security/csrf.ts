/**
 * CSRF Protection
 * 
 * Cross-Site Request Forgery protection for the application.
 * Provides:
 * - CSRF token generation and validation
 * - Cookie-based token storage with secure attributes
 * - Header-based token transmission
 * - Session cookie detection for protection activation
 * - Loopback origin handling for development
 * - Safe HTTP method exemption (GET, HEAD, OPTIONS)
 * 
 * This module implements double-submit cookie pattern for CSRF protection,
 * ensuring state-changing requests are authenticated and authorized.
 */

import { type NextRequest, type NextResponse } from 'next/server';
import { reportObservabilityInternalError } from '@/shared/utils/observability/internal-observability-fallback';

// CSRF protection constants
export const CSRF_COOKIE_NAME = 'csrf-token';
export const CSRF_HEADER_NAME = 'x-csrf-token';
export const CSRF_SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

/**
 * Session cookie names to detect authenticated sessions
 * Covers both secure and non-secure variants for different environments
 */
const SESSION_COOKIE_NAMES = [
  'authjs.session-token',
  '__Secure-authjs.session-token',
  'next-auth.session-token',
  '__Secure-next-auth.session-token',
];

/**
 * Check if request has an active session cookie
 * Used to determine if CSRF protection should be enforced
 */
export const hasSessionCookie = (request: NextRequest): boolean =>
  SESSION_COOKIE_NAMES.some((name: string) => Boolean(request.cookies.get(name)));

/**
 * Convert bytes to base64url encoding (URL-safe base64)
 * Used for generating cryptographically secure CSRF tokens
 */
const toBase64Url = (bytes: Uint8Array): string => {
  let binary = '';
  bytes.forEach((byte: number) => {
    binary += String.fromCharCode(byte);
  });
  const base64 = typeof btoa === 'function' ? btoa(binary) : Buffer.from(bytes).toString('base64');
  return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
};

/**
 * Generate cryptographically secure CSRF token
 * Prefers crypto.randomUUID, falls back to crypto.getRandomValues, then Math.random
 */
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

/**
 * Extract CSRF token from request cookies
 */
export const getCsrfTokenFromRequest = (request: NextRequest): string | null =>
  request.cookies.get(CSRF_COOKIE_NAME)?.value ?? null;

/**
 * Extract CSRF token from request headers
 */
export const getCsrfTokenFromHeaders = (request: NextRequest): string | null =>
  request.headers.get(CSRF_HEADER_NAME) ?? null;

// Loopback hostnames for development environment handling
const LOOPBACK_HOSTNAMES = new Set(['localhost', '127.0.0.1', '0.0.0.0', '::1', '[::1]']);

/**
 * Check if hostname is a loopback address
 */
const isLoopbackHostname = (hostname: string): boolean => LOOPBACK_HOSTNAMES.has(hostname);

/**
 * Check if two origins are equivalent loopback addresses
 * Allows CSRF protection to work across different loopback formats in development
 */
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

const resolveCsrfCookieDomain = (): string | undefined => {
  const value = process.env['KANGUR_COOKIE_DOMAIN'];
  if (!value || value.trim().length === 0) {
    return undefined;
  }
  return value.trim();
};

export const ensureCsrfCookie = (response: NextResponse, existingToken?: string | null): string => {
  const token = existingToken && existingToken.length > 0 ? existingToken : generateCsrfToken();
  if (!existingToken) {
    const domain = resolveCsrfCookieDomain();
    response.cookies.set({
      name: CSRF_COOKIE_NAME,
      value: token,
      httpOnly: false,
      sameSite: 'lax',
      path: '/',
      secure: process.env['NODE_ENV'] === 'production',
      maxAge: 60 * 60 * 12, // 12 hours
      ...(domain ? { domain } : {}),
    });
  }
  return token;
};
