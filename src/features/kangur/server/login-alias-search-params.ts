import { isSuperAdminOnlyKangurPage } from '@/features/kangur/config/page-access';
import {
  resolveManagedKangurPageKeyFromHref,
  resolveRouteAwareManagedKangurHref,
  sanitizeAccessibleManagedKangurHref,
} from '@/features/kangur/ui/routing/managed-paths';
import { readOptionalServerAuthSession } from '@/shared/lib/auth/optional-server-auth';

type KangurAliasLoginSearchParams = Record<string, string | string[] | undefined>;

export const readSanitizedKangurAliasLoginSearchParams = async (input: {
  searchParams?: KangurAliasLoginSearchParams;
  pathname: string;
  fallbackHref: string;
}): Promise<KangurAliasLoginSearchParams | undefined> => {
  const { searchParams, pathname, fallbackHref } = input;

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

  const resolvedCallbackUrl =
    resolveRouteAwareManagedKangurHref({
      href: callbackUrl,
      pathname,
      currentOrigin: null,
      canonicalizePublicAlias: true,
    }) ?? callbackUrl;

  if (!isSuperAdminOnlyKangurPage(resolveManagedKangurPageKeyFromHref(resolvedCallbackUrl, '/'))) {
    if (resolvedCallbackUrl === callbackUrl) {
      return searchParams;
    }

    return {
      ...searchParams,
      ['callbackUrl']: resolvedCallbackUrl,
    };
  }

  const session = await readOptionalServerAuthSession();
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
