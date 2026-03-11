import {
  getKangurInternalQueryParamName,
  normalizeKangurBasePath,
  readKangurUrlParam,
  resolveKangurPageKeyFromSlug,
} from '@/features/kangur/config/routing';

export type KangurRouteTransitionSkeletonVariant =
  | 'game-home'
  | 'game-session'
  | 'lessons-library'
  | 'lessons-focus'
  | 'learner-profile'
  | 'parent-dashboard'
  | 'tests';

type ResolveKangurRouteTransitionSkeletonInput = {
  basePath?: string | null;
  href?: string | null;
  pageKey?: string | null;
};

const isManagedLocalHref = (href: string): boolean => href.startsWith('/') && !href.startsWith('//');

const normalizeManagedPathname = (pathname: string): string => {
  const withoutQuery = pathname.split('?')[0] ?? pathname;
  return withoutQuery.replace(/\/+$/, '') || '/';
};

const getSlugFromPathname = (pathname: string, normalizedBasePath: string): string[] => {
  const normalizedPathname = normalizeManagedPathname(pathname);

  if (normalizedBasePath === '/') {
    return normalizedPathname
      .split('/')
      .map((segment) => segment.trim())
      .filter(Boolean);
  }

  if (
    normalizedPathname === normalizedBasePath ||
    normalizedPathname === `${normalizedBasePath}/`
  ) {
    return [];
  }

  if (!normalizedPathname.startsWith(`${normalizedBasePath}/`)) {
    return [];
  }

  return normalizedPathname
    .slice(normalizedBasePath.length + 1)
    .split('/')
    .map((segment) => segment.trim())
    .filter(Boolean);
};

const resolvePageKeyFromHref = (href: string, basePath: string): string | null => {
  if (!isManagedLocalHref(href)) {
    return null;
  }

  try {
    const parsed = new URL(href, 'https://kangur.local');
    const normalizedBasePath = normalizeKangurBasePath(basePath);

    if (
      normalizedBasePath !== '/' &&
      parsed.pathname !== normalizedBasePath &&
      !parsed.pathname.startsWith(`${normalizedBasePath}/`)
    ) {
      return null;
    }

    const slug = getSlugFromPathname(parsed.pathname, normalizedBasePath);
    return resolveKangurPageKeyFromSlug(slug[0] ?? null);
  } catch {
    return null;
  }
};

export const resolveKangurRouteTransitionSkeletonVariant = ({
  basePath,
  href,
  pageKey,
}: ResolveKangurRouteTransitionSkeletonInput): KangurRouteTransitionSkeletonVariant => {
  const normalizedBasePath = normalizeKangurBasePath(basePath);
  const resolvedPageKey =
    pageKey?.trim() || (href ? resolvePageKeyFromHref(href, normalizedBasePath) : null) || 'Game';

  let searchParams: URLSearchParams | null = null;
  if (href && isManagedLocalHref(href)) {
    try {
      searchParams = new URL(href, 'https://kangur.local').searchParams;
    } catch {
      searchParams = null;
    }
  }

  switch (resolvedPageKey) {
    case 'Lessons': {
      const focusToken = searchParams
        ? readKangurUrlParam(searchParams, 'focus', normalizedBasePath)?.trim() || null
        : null;
      return focusToken ? 'lessons-focus' : 'lessons-library';
    }
    case 'LearnerProfile':
      return 'learner-profile';
    case 'ParentDashboard':
      return 'parent-dashboard';
    case 'Tests':
      return 'tests';
    case 'Game':
    default: {
      const quickStartToken = searchParams
        ? readKangurUrlParam(searchParams, 'quickStart', normalizedBasePath)?.trim() || null
        : null;
      const explicitScreenToken = searchParams
        ? searchParams.get(getKangurInternalQueryParamName('kangur', normalizedBasePath))?.trim() ||
          null
        : null;
      return quickStartToken || explicitScreenToken ? 'game-session' : 'game-home';
    }
  }
};
