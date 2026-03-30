import { cookies } from 'next/headers';

import { isMissingRequestScopeError } from '@/shared/lib/auth/request-scope-error';

type RequestCookieStore = Awaited<ReturnType<typeof cookies>>;

export async function readOptionalRequestCookies(): Promise<RequestCookieStore | null> {
  try {
    return await cookies();
  } catch (error) {
    if (isMissingRequestScopeError(error)) {
      return null;
    }

    throw error;
  }
}
