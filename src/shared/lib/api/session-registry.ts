import { headers } from 'next/headers';

import {
  ADMIN_LAYOUT_SESSION_HEADER,
  parseAdminLayoutSessionHeaderValue,
} from '@/shared/lib/auth/admin-layout-session';
import { isMissingRequestScopeError } from '@/shared/lib/auth/request-scope-error';
import { logger } from '@/shared/utils/logger';

export type SessionUser = { id?: string | null; permissions?: string[]; isElevated?: boolean } | null;
export type SessionResolver = () => Promise<SessionUser | null>;

let currentResolver: SessionResolver | null = null;

/**
 * Register a global session resolver (e.g. from auth feature).
 * This allows features to provide session context to shared handlers
 * without creating circular dependencies.
 */
export function registerSessionResolver(resolver: SessionResolver): void {
  currentResolver = resolver;
}

export async function getSessionUser(): Promise<SessionUser | null> {
  // Fast path: attempt to resolve session from the internal header injected by middleware
  try {
    const requestHeaders = await headers();
    const sessionHeader = requestHeaders.get(ADMIN_LAYOUT_SESSION_HEADER);
    if (sessionHeader) {
      const session = parseAdminLayoutSessionHeaderValue(sessionHeader);
      if (session?.user?.id) {
        return session.user;
      }
    }
  } catch (error) {
    if (!isMissingRequestScopeError(error)) {
      logger.warn('[SessionRegistry] Header-based session resolution failed', { error });
    }
  }

  // Fallback to the registered resolver (e.g. NextAuth auth() function)
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
