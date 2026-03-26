import type { Session } from 'next-auth';

import {
  getKangurInternalQueryParamName,
  normalizeKangurBasePath,
  readKangurUrlParam,
} from '@/features/kangur/config/routing';
import { resolveAccessibleKangurPageKey } from '@/features/kangur/config/page-access';
import {
  isManagedLocalHref,
  resolveAccessibleManagedKangurPageKeyFromHref,
} from '@/features/kangur/ui/routing/managed-paths';
import { withKangurClientErrorSync } from '@/features/kangur/observability/client';
export type KangurRouteTransitionSkeletonVariant =
  | 'game-home'
  | 'game-session'
  | 'lessons-library'
  | 'lessons-focus'
  | 'learner-profile'
  | 'parent-dashboard';

type ResolveKangurRouteTransitionSkeletonInput = {
  basePath?: string | null;
  fallbackPageKey?: string | null;
  href?: string | null;
  pageKey?: string | null;
  session?: Session | null;
};

export const resolveKangurRouteTransitionSkeletonVariant = ({
  basePath,
  fallbackPageKey,
  href,
  pageKey,
  session,
}: ResolveKangurRouteTransitionSkeletonInput): KangurRouteTransitionSkeletonVariant => {
  const normalizedBasePath = normalizeKangurBasePath(basePath);
  const resolvedFallbackPageKey = fallbackPageKey?.trim() || 'Game';
  const resolvedPageKey =
    resolveAccessibleKangurPageKey(
      pageKey?.trim() || null,
      session,
      href
        ? resolveAccessibleManagedKangurPageKeyFromHref({
            href,
            basePath: normalizedBasePath,
            session,
            fallbackPageKey: resolvedFallbackPageKey,
          })
        : resolvedFallbackPageKey
    ) || resolvedFallbackPageKey;

  let searchParams: URLSearchParams | null = null;
  if (href && isManagedLocalHref(href)) {
    searchParams = withKangurClientErrorSync(
      {
        source: 'kangur.route-skeleton',
        action: 'parse-search-params',
        description: 'Parses search params for route transition skeletons.',
        context: { href },
      },
      () => new URL(href, 'https://kangur.local').searchParams,
      { fallback: null }
    );
  }

  switch (resolvedPageKey) {
    case 'Tests':
    case 'GamesLibrary':
      return 'lessons-library';
    case 'Lessons': {
      const focusToken = searchParams
        ? readKangurUrlParam(searchParams, 'focus', normalizedBasePath)?.trim() || null
        : null;
      return focusToken ? 'lessons-focus' : 'lessons-library';
    }
    case 'Competition':
      return 'game-session';
    case 'LearnerProfile':
      return 'learner-profile';
    case 'ParentDashboard':
      return 'parent-dashboard';
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
