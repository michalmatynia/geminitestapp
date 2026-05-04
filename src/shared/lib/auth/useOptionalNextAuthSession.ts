/**
 * Optional NextAuth Session Hook
 * 
 * Optional session hook that gracefully handles missing SessionProvider.
 * Provides:
 * - Optional session context access
 * - Fallback session values
 * - Graceful degradation without provider
 * - Client-side session management
 * - NextAuth React integration
 */

'use client';

import * as React from 'react';
import * as NextAuthReact from 'next-auth/react';
import type { SessionContextValue } from 'next-auth/react';

const FALLBACK_SESSION_CONTEXT: SessionContextValue<false> = {
  data: null,
  status: 'unauthenticated',
  update: (): Promise<null> => Promise.resolve(null),
};

export function useOptionalNextAuthSession(): SessionContextValue<false> {
  const sessionContext =
    'SessionContext' in NextAuthReact
      ? (NextAuthReact.SessionContext as
          | React.Context<SessionContextValue<false> | null>
          | undefined)
      : undefined;

  if (sessionContext) {
    return React.useContext(sessionContext) ?? FALLBACK_SESSION_CONTEXT;
  }

  if ('useSession' in NextAuthReact && typeof NextAuthReact.useSession === 'function') {
    return (NextAuthReact.useSession as () => SessionContextValue<false>)();
  }

  return FALLBACK_SESSION_CONTEXT;
}
