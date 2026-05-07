import { registerSessionResolver } from '@/shared/lib/api/session-registry';
import { isMissingRequestScopeError } from '@/shared/lib/auth/request-scope-error';

import { auth } from './auth';

if (typeof auth === 'function') {
  registerSessionResolver(async () => {
    try {
      const session = await auth();
      return session?.user ?? null;
    } catch (error) {
      if (isMissingRequestScopeError(error)) return null;
      throw error;
    }
  });
}

export * from './access';
export * from './auth';
export type { AuthUserRecord } from './user-repository';
