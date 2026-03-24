import { logger } from '@/shared/utils/logger';

export type SessionUser = { id?: string | null } | null;
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
  if (!currentResolver) return null;
  try {
    return await currentResolver();
  } catch (error) {
    logger.error('[SessionRegistry] Session resolution failed', error);
    return null;
  }
}
