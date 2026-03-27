import { auth } from '@/features/auth/server';

import type { Session } from 'next-auth';

type ServerAuthSession = Session | null;

type TolerantServerAuthSessionOptions = {
  onError?: (error: unknown) => unknown;
};

export const isMissingRequestScopeError = (error: unknown): boolean =>
  error instanceof Error && error.message.includes('outside a request scope');

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
