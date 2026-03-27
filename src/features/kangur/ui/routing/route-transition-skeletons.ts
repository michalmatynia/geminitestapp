import type { Session } from 'next-auth';

import {
  getKangurInternalQueryParamName,
  normalizeKangurBasePath,
  readKangurUrlParam,
} from '@/features/kangur/config/routing';
import {
  isManagedLocalHref,
  resolveAccessibleManagedKangurTargetPageKey,
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

export const resolveAccessibleKangurRouteTransitionTarget = ({
  basePath,
  fallbackPageKey,
  href,
  pageKey,
  session,
}: ResolveKangurRouteTransitionSkeletonInput): {
  pageKey: string;
  skeletonVariant: KangurRouteTransitionSkeletonVariant;
} => {
  const normalizedBasePath = normalizeKangurBasePath(basePath);
  const resolvedFallbackPageKey = fallbackPageKey?.trim() || 'Game';
  const resolvedPageKey = resolveAccessibleManagedKangurTargetPageKey({
    basePath: normalizedBasePath,
    fallbackPageKey: resolvedFallbackPageKey,
    href,
    pageKey: pageKey?.trim() || null,
    session,
  });

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
      return {
        pageKey: resolvedPageKey,
        skeletonVariant: 'lessons-library',
      };
    case 'Lessons': {
      const focusToken = searchParams
        ? readKangurUrlParam(searchParams, 'focus', normalizedBasePath)?.trim() || null
        : null;
      return {
        pageKey: resolvedPageKey,
        skeletonVariant: focusToken ? 'lessons-focus' : 'lessons-library',
      };
    }
    case 'Competition':
      return {
        pageKey: resolvedPageKey,
        skeletonVariant: 'game-session',
      };
    case 'LearnerProfile':
      return {
        pageKey: resolvedPageKey,
        skeletonVariant: 'learner-profile',
      };
    case 'ParentDashboard':
      return {
        pageKey: resolvedPageKey,
        skeletonVariant: 'parent-dashboard',
      };
    case 'Game':
    default: {
      const quickStartToken = searchParams
        ? readKangurUrlParam(searchParams, 'quickStart', normalizedBasePath)?.trim() || null
        : null;
      const explicitScreenToken = searchParams
        ? searchParams.get(getKangurInternalQueryParamName('kangur', normalizedBasePath))?.trim() ||
          null
        : null;
      return {
        pageKey: resolvedPageKey,
        skeletonVariant: quickStartToken || explicitScreenToken ? 'game-session' : 'game-home',
      };
    }
  }
};

export const resolveKangurRouteTransitionSkeletonVariant = (
  input: ResolveKangurRouteTransitionSkeletonInput
): KangurRouteTransitionSkeletonVariant =>
  resolveAccessibleKangurRouteTransitionTarget(input).skeletonVariant;
