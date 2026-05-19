/**
 * Session Registry
 * 
 * Centralized session resolution for server-side handlers.
 * Provides:
 * - Decoupled session resolution via resolvers
 * - Fast-path session extraction from internal headers
 * - Unified SessionUser type for cross-feature usage
 * - Circular dependency prevention for auth context
 */

import { headers } from 'next/headers';

import {
  ADMIN_LAYOUT_SESSION_HEADER,
  parseAdminLayoutSessionHeaderValue,
} from '@/shared/lib/auth/admin-layout-session';
import { isMissingRequestScopeError } from '@/shared/lib/auth/request-scope-error';
import { logger } from '@/shared/utils/logger';

/**
 * Basic user information extracted from a session.
 */
export type SessionUser = { 
  /** Unique user identifier. */
  id?: string | null; 
  /** List of user permission strings. */
  permissions?: string[]; 
  /** Whether the user has elevated privileges. */
  isElevated?: boolean 
} | null;

/**
 * A function that resolves the current session user.
 */
export type SessionResolver = () => Promise<SessionUser | null>;

/**
 * Global storage for the registered session resolver.
 */
let currentResolver: SessionResolver | null = null;

/**
 * Register a global session resolver (e.g. from auth feature).
 * This allows features to provide session context to shared handlers
 * without creating circular dependencies.
 * 
 * @param resolver - The resolver function to register.
 */
export function registerSessionResolver(resolver: SessionResolver): void {
  currentResolver = resolver;
}

/**
 * Attempts to resolve the current session user.
 * 
 * Resolution order:
 * 1. Internal header (injected by middleware/proxy).
 * 2. Registered resolver (e.g. NextAuth auth() function).
 * 
 * @returns A promise resolving to the session user or null.
 */
export async function getSessionUser(): Promise<SessionUser | null> {
  // Fast path: attempt to resolve session from the internal header injected by middleware
  // This is highly efficient as it avoids extra DB calls if the session was already verified.
  try {
    const requestHeaders = await headers();
    const sessionHeader = requestHeaders.get(ADMIN_LAYOUT_SESSION_HEADER);
    if (sessionHeader) {
      const session = parseAdminLayoutSessionHeaderValue(sessionHeader);
      // Header-based sessions must have a user ID to be considered valid and prevent null propagation.
      if (session?.user?.id) {
        return session.user;
      }
    }
  } catch (error) {
    // ignore request scope errors (e.g. calling outside a request)
    // These are expected when getSessionUser is called outside request context and do not indicate failures.
    if (!isMissingRequestScopeError(error)) {
      logger.warn('[SessionRegistry] Header-based session resolution failed', { error });
    }
  }

  // Fallback to the registered resolver (e.g. NextAuth auth() function)
  // This is used when the header is missing or in environments where the proxy is bypassed.
  if (!currentResolver) return null;
  try {
    return await currentResolver();
  } catch (error) {
    if (!isMissingRequestScopeError(error)) {
      logger.error('[SessionRegistry] Session resolution failed', error);
    }
    return null;
  }
}
