import type { Session } from 'next-auth';

import { sanitizeAccessibleManagedKangurHref } from '@/features/kangur/ui/routing/managed-paths';

type KangurAliasLoginSearchParams = Record<string, string | string[] | undefined>;

export const sanitizeKangurAliasLoginSearchParams = (input: {
  searchParams?: KangurAliasLoginSearchParams;
  pathname: string;
  fallbackHref: string;
  session: Session | null;
}): KangurAliasLoginSearchParams | undefined => {
  const { searchParams, pathname, fallbackHref, session } = input;

  if (!searchParams) {
    return undefined;
  }

  const rawCallbackUrl = searchParams['callbackUrl'];
  const callbackUrl =
    typeof rawCallbackUrl === 'string'
      ? rawCallbackUrl
      : Array.isArray(rawCallbackUrl)
        ? rawCallbackUrl[0]
        : undefined;

  if (!callbackUrl) {
    return searchParams;
  }

  const sanitizedCallbackUrl =
    sanitizeAccessibleManagedKangurHref({
      href: callbackUrl,
      pathname,
      currentOrigin: null,
      canonicalizePublicAlias: true,
      basePath: '/',
      fallbackHref,
      session,
    }) ?? fallbackHref;

  if (sanitizedCallbackUrl === callbackUrl) {
    return searchParams;
  }

  return {
    ...searchParams,
    ['callbackUrl']: sanitizedCallbackUrl,
  };
};
