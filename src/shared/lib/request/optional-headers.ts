import { headers } from 'next/headers';

import { isMissingRequestScopeError } from '@/shared/lib/auth/optional-server-auth';

export async function readOptionalRequestHeaders(): Promise<Headers | null> {
  try {
    return await headers();
  } catch (error) {
    if (isMissingRequestScopeError(error)) {
      return null;
    }

    throw error;
  }
}
