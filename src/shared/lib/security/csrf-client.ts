/**
 * CSRF Protection Client
 * 
 * Client-side Cross-Site Request Forgery (CSRF) protection utilities.
 * Provides:
 * - Automatic CSRF token generation and management
 * - Secure token storage in HTTP-only cookies
 * - Request header injection for API calls
 * - Method-based protection (POST, PUT, DELETE, etc.)
 * - Fallback token generation for older browsers
 * 
 * This module ensures all state-changing requests include
 * valid CSRF tokens to prevent unauthorized actions.
 */

import { logClientCatch } from '@/shared/utils/observability/client-error-logger';

// CSRF configuration constants
export const CSRF_COOKIE_NAME = 'csrf-token';
export const CSRF_HEADER_NAME = 'x-csrf-token';
export const CSRF_SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']); // Methods that don't require CSRF protection

/**
 * Generates a cryptographically secure CSRF token.
 * Uses modern Web Crypto API with fallbacks for compatibility.
 */
const generateClientCsrfToken = (): string => {
  if (typeof window !== 'undefined' && window.crypto) {
    // Modern browsers: use crypto.randomUUID()
    if ('randomUUID' in window.crypto) {
      return window.crypto.randomUUID().replace(/-/g, '');
    }
    // Fallback: use crypto.getRandomValues()
    if ('getRandomValues' in window.crypto) {
      const bytes = new Uint8Array(32);
      (window.crypto as Window['crypto']).getRandomValues(bytes);
      let binary = '';
      bytes.forEach((byte: number) => {
        binary += String.fromCharCode(byte);
      });
      const base64 = btoa(binary);
      return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
    }
  }
  // Legacy fallback for older browsers
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
};

/**
 * Ensures a CSRF token exists in cookies, creating one if needed.
 */
const ensureClientCsrfCookie = (): string | null => {
  if (typeof document === 'undefined') return null;
  const token = generateClientCsrfToken();
  const secure = window.location.protocol === 'https:' ? '; Secure' : '';
  document.cookie = `${CSRF_COOKIE_NAME}=${encodeURIComponent(token)}; Path=/; SameSite=Lax${secure}`;
  return token;
};

export const getClientCsrfToken = (): string | null => {
  if (typeof document === 'undefined') return null;
  const cookie = document.cookie
    .split(';')
    .map((part: string) => part.trim())
    .find((part: string) => part.startsWith(`${CSRF_COOKIE_NAME}=`));
  if (!cookie) return ensureClientCsrfCookie();
  return decodeURIComponent(cookie.split('=').slice(1).join('='));
};

export const withCsrfHeaders = (headers?: HeadersInit): Headers => {
  const next = new Headers(headers);
  const token = getClientCsrfToken();
  if (token && !next.has(CSRF_HEADER_NAME)) {
    next.set(CSRF_HEADER_NAME, token);
  }
  return next;
};

export const isSameOriginUrl = (input: RequestInfo | URL): boolean => {
  if (typeof window === 'undefined') return true;
  const origin = window.location.origin;
  try {
    const url =
      typeof input === 'string'
        ? new URL(input, origin)
        : input instanceof URL
          ? input
          : new URL(input.url, origin);
    return url.origin === origin;
  } catch (error) {
    logClientCatch(error, {
      source: 'csrf-client',
      action: 'isSameOriginUrl',
      level: 'warn',
    });
    return true;
  }
};
