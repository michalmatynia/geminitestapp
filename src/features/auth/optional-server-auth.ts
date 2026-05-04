/**
 * Optional Server Authentication
 * 
 * Fault-tolerant server-side authentication utilities.
 * Provides:
 * - Optional authentication that gracefully handles failures
 * - Error tolerance for missing request scope
 * - Fallback mechanisms for authentication errors
 * - Server-side session management with error recovery
 */

import { isMissingRequestScopeError } from '@/shared/lib/auth/request-scope-error';
import { auth } from './auth';

import type { Session } from 'next-auth';

type ServerAuthSession = Session | null;

type TolerantServerAuthSessionOptions = {
  onError?: (error: unknown) => unknown;
};

export { isMissingRequestScopeError } from '@/shared/lib/auth/request-scope-error';

export async function readOptionalServerAuthSession(): Promise<ServerAuthSession | null> {
  try {
    return await auth();
  } catch (error) {
    if (isMissingRequestScopeError(error)) {
      return null;
    }

    throw error;
  }
}

export async function readTolerantServerAuthSession(
  options: TolerantServerAuthSessionOptions = {}
): Promise<ServerAuthSession | null> {
  try {
    return await auth();
  } catch (error) {
    if (!isMissingRequestScopeError(error)) {
      void options.onError?.(error);
    }

    return null;
  }
}
