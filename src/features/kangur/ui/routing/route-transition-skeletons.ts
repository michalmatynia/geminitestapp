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

const STATIC_ROUTE_TRANSITION_SKELETON_VARIANTS: Record<
  string,
  KangurRouteTransitionSkeletonVariant
> = {
  Competition: 'game-session',
  GamesLibrary: 'lessons-library',
  LearnerProfile: 'learner-profile',
  ParentDashboard: 'parent-dashboard',
  Tests: 'lessons-library',
};

const parseRouteTransitionSearchParams = (
  href: string | null | undefined
): URLSearchParams | null => {
  if (!href || !isManagedLocalHref(href)) {
    return null;
  }

  return withKangurClientErrorSync(
    {
      source: 'kangur.route-skeleton',
      action: 'parse-search-params',
      description: 'Parses search params for route transition skeletons.',
      context: { href },
    },
    () => new URL(href, 'https://kangur.local').searchParams,
    { fallback: null }
  );
};

const readRouteTransitionParam = (
  searchParams: URLSearchParams | null,
  name: 'focus' | 'quickStart',
  normalizedBasePath: string
): string | null =>
  searchParams ? readKangurUrlParam(searchParams, name, normalizedBasePath)?.trim() || null : null;

const readRouteTransitionScreenToken = (
  searchParams: URLSearchParams | null,
  normalizedBasePath: string
): string | null =>
  searchParams
    ? searchParams.get(getKangurInternalQueryParamName('kangur', normalizedBasePath))?.trim() ||
      null
    : null;

const resolveLessonsSkeletonVariant = ({
  normalizedBasePath,
  searchParams,
}: {
  normalizedBasePath: string;
  searchParams: URLSearchParams | null;
}): KangurRouteTransitionSkeletonVariant =>
  readRouteTransitionParam(searchParams, 'focus', normalizedBasePath)
    ? 'lessons-focus'
    : 'lessons-library';

const resolveGameSkeletonVariant = ({
  normalizedBasePath,
  searchParams,
}: {
  normalizedBasePath: string;
  searchParams: URLSearchParams | null;
}): KangurRouteTransitionSkeletonVariant =>
  readRouteTransitionParam(searchParams, 'quickStart', normalizedBasePath) ||
  readRouteTransitionScreenToken(searchParams, normalizedBasePath)
    ? 'game-session'
    : 'game-home';

const resolveSkeletonVariantForPageKey = ({
  normalizedBasePath,
  pageKey,
  searchParams,
}: {
  normalizedBasePath: string;
  pageKey: string;
  searchParams: URLSearchParams | null;
}): KangurRouteTransitionSkeletonVariant => {
  const staticVariant = STATIC_ROUTE_TRANSITION_SKELETON_VARIANTS[pageKey];
  if (staticVariant) {
    return staticVariant;
  }

  return pageKey === 'Lessons'
    ? resolveLessonsSkeletonVariant({ normalizedBasePath, searchParams })
    : resolveGameSkeletonVariant({ normalizedBasePath, searchParams });
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
  const searchParams = parseRouteTransitionSearchParams(href);

  return {
    pageKey: resolvedPageKey,
    skeletonVariant: resolveSkeletonVariantForPageKey({
      normalizedBasePath,
      pageKey: resolvedPageKey,
      searchParams,
    }),
  };
};

export const resolveKangurRouteTransitionSkeletonVariant = (
  input: ResolveKangurRouteTransitionSkeletonInput
): KangurRouteTransitionSkeletonVariant =>
  resolveAccessibleKangurRouteTransitionTarget(input).skeletonVariant;
