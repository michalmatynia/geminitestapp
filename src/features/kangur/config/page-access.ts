import type { Session } from 'next-auth';

import {
  KANGUR_MAIN_PAGE_KEY,
  normalizeKangurRequestedPath,
  resolveKangurFeaturePageRoute,
  resolveKangurPageKeyFromSlug,
} from '@/features/kangur/config/routing';
import { isSuperAdminSession } from '@/shared/lib/auth/elevated-session-user';

const SUPER_ADMIN_ONLY_KANGUR_PAGE_KEYS = new Set(['GamesLibrary']);

export const isSuperAdminOnlyKangurPage = (
  pageKey: string | null | undefined
): boolean => {
  const normalizedPageKey = pageKey?.trim();
  return normalizedPageKey ? SUPER_ADMIN_ONLY_KANGUR_PAGE_KEYS.has(normalizedPageKey) : false;
};

export const canAccessKangurPage = (
  pageKey: string | null | undefined,
  session: Session | null | undefined
): boolean => !isSuperAdminOnlyKangurPage(pageKey) || isSuperAdminSession(session);

export const canAccessKangurSlugSegments = (
  slugSegments: readonly string[] = [],
  session: Session | null | undefined
): boolean => {
  const leadSlug = slugSegments[0]?.trim() || null;
  const pageKey = resolveKangurPageKeyFromSlug(leadSlug);
  return canAccessKangurPage(pageKey, session);
};

export const resolveAccessibleKangurPageKey = <TPageKey extends string>(
  pageKey: TPageKey | null | undefined,
  session: Session | null | undefined,
  fallbackPageKey: TPageKey
): TPageKey => {
  const normalizedPageKey = pageKey?.trim() as TPageKey | undefined;
  if (!normalizedPageKey) {
    return fallbackPageKey;
  }

  return canAccessKangurPage(normalizedPageKey, session)
    ? normalizedPageKey
    : fallbackPageKey;
};

export const resolveAccessibleKangurRouteState = <TPageKey extends string>(input: {
  normalizedBasePath: string;
  pageKey: TPageKey | null | undefined;
  requestedPath: string;
  session: Session | null | undefined;
  slugSegments?: readonly string[];
  fallbackPageKey?: TPageKey;
}): {
  pageKey: TPageKey;
  requestedPath: string;
} => {
  const {
    normalizedBasePath,
    pageKey,
    requestedPath,
    session,
    slugSegments = [],
    fallbackPageKey = KANGUR_MAIN_PAGE_KEY as TPageKey,
  } = input;

  const accessiblePageKey = resolveAccessibleKangurPageKey(pageKey, session, fallbackPageKey);
  const accessibleRequestedPath = canAccessKangurSlugSegments(slugSegments, session)
    ? requestedPath
    : normalizeKangurRequestedPath([], normalizedBasePath);

  return {
    pageKey: accessiblePageKey,
    requestedPath: accessibleRequestedPath,
  };
};

export const resolveAccessibleKangurFeaturePageRoute = <TPageKey extends string = string>(input: {
  slug?: string[];
  basePath?: string;
  session: Session | null | undefined;
  fallbackPageKey?: TPageKey;
}): {
  normalizedBasePath: string;
  pageKey: TPageKey;
  requestedPath: string;
} => {
  const { slug = [], basePath, session, fallbackPageKey = KANGUR_MAIN_PAGE_KEY as TPageKey } =
    input;
  const resolvedRoute = resolveKangurFeaturePageRoute(slug, basePath);
  const accessibleRoute = resolveAccessibleKangurRouteState({
    normalizedBasePath: resolvedRoute.normalizedBasePath,
    pageKey: resolvedRoute.pageKey as TPageKey,
    requestedPath: resolvedRoute.requestedPath,
    session,
    slugSegments: slug,
    fallbackPageKey,
  });

  return {
    normalizedBasePath: resolvedRoute.normalizedBasePath,
    pageKey: accessibleRoute.pageKey,
    requestedPath: accessibleRoute.requestedPath,
  };
};
