'use client';

import * as React from 'react';
import * as NextAuthReact from 'next-auth/react';
import type { SessionContextValue } from 'next-auth/react';

const FALLBACK_SESSION_CONTEXT: SessionContextValue<false> = {
  data: null,
  status: 'unauthenticated',
  update: async () => null,
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
