'use client';

import { useRef } from 'react';
import { useEffect } from 'react';

import { safeClearTimeout, safeSetTimeout } from '@/shared/lib/timers';
import { prefetchKangurPageContentStore } from '@/features/kangur/ui/hooks/useKangurPageContent';
import { prefetchKangurLessonSections } from '@/features/kangur/ui/hooks/useKangurLessonSections';
import { preloadKangurPage } from '@/features/kangur/config/pages';
import type { KangurLessonAgeGroup, KangurLessonSubject } from '@/shared/contracts/kangur-lesson-constants';

import type { QueryClient } from '@tanstack/react-query';

type KangurPreloadPageKey = Parameters<typeof preloadKangurPage>[0];

const HOT_PAGE_CONTENT_PREFETCH_TIMEOUT_MS = 250;
const HOT_ROUTE_PRELOAD_TIMEOUT_MS = 1_500;

const HOT_ROUTE_PRELOAD_TIMEOUTS: Readonly<Partial<Record<KangurPreloadPageKey, number>>> =
  Object.freeze({ Game: 250, Lessons: 250 });

const HOT_ROUTE_PRELOADS: Readonly<
  Partial<Record<KangurPreloadPageKey, ReadonlyArray<KangurPreloadPageKey>>>
> = Object.freeze({ Game: ['Lessons'], Lessons: ['Game'] });

const KANGUR_PRELOAD_PAGE_KEYS: ReadonlyArray<KangurPreloadPageKey> = [
  'Competition', 'Game', 'GamesLibrary', 'Duels', 'LearnerProfile',
  'Lessons', 'ParentDashboard', 'SocialUpdates', 'Tests',
];

const isKangurPreloadPageKey = (value: string | null): value is KangurPreloadPageKey =>
  value !== null && KANGUR_PRELOAD_PAGE_KEYS.includes(value as KangurPreloadPageKey);

type KangurPreloadEffectsInput = {
  ageGroup: KangurLessonAgeGroup | null | undefined;
  isBootLoading: boolean;
  isThemeBootLoading: boolean;
  isNavigationTransitionActive: boolean;
  isCoarsePointer: boolean;
  isSyntheticKangurCapture: boolean;
  resolvedPageKey: string | null;
  queryClient: QueryClient;
  routeLocale: string;
  subject: KangurLessonSubject | null | undefined;
};

export function useKangurPreloadEffects(input: KangurPreloadEffectsInput): void {
  const {
    ageGroup,
    isBootLoading,
    isThemeBootLoading,
    isNavigationTransitionActive,
    isCoarsePointer,
    isSyntheticKangurCapture,
    resolvedPageKey,
    queryClient,
    routeLocale,
    subject,
  } = input;

  const preloadedHotRoutesRef = useRef<Set<string>>(new Set());
  const prefetchedPageContentLocalesRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (
      typeof window === 'undefined' ||
      isBootLoading ||
      isThemeBootLoading ||
      isNavigationTransitionActive ||
      isCoarsePointer ||
      isSyntheticKangurCapture
    ) {
      return;
    }

    if (!isKangurPreloadPageKey(resolvedPageKey)) return;

    const preloadTargets: ReadonlyArray<KangurPreloadPageKey> =
      HOT_ROUTE_PRELOADS[resolvedPageKey] ?? [];
    if (preloadTargets.length === 0) return;

    const nextTargets = preloadTargets.filter(
      (t: KangurPreloadPageKey) => !preloadedHotRoutesRef.current.has(t)
    );
    if (nextTargets.length === 0) return;

    const preloadTimeoutMs =
      HOT_ROUTE_PRELOAD_TIMEOUTS[resolvedPageKey] ?? HOT_ROUTE_PRELOAD_TIMEOUT_MS;

    const preload = (): void => {
      nextTargets.forEach((target: KangurPreloadPageKey) => {
        preloadKangurPage(target);
        preloadedHotRoutesRef.current.add(target);
      });
    };

    if (typeof window.requestIdleCallback === 'function') {
      const idleId = window.requestIdleCallback(preload, { timeout: preloadTimeoutMs });
      return () => { window.cancelIdleCallback?.(idleId); };
    }

    const timeoutId = safeSetTimeout(preload, 0);
    return () => { safeClearTimeout(timeoutId); };
  }, [
    isBootLoading, isCoarsePointer, isSyntheticKangurCapture,
    isNavigationTransitionActive, isThemeBootLoading, resolvedPageKey,
  ]);

  useEffect(() => {
    if (
      typeof window === 'undefined' ||
      isBootLoading ||
      isThemeBootLoading ||
      isNavigationTransitionActive ||
      isCoarsePointer ||
      isSyntheticKangurCapture ||
      resolvedPageKey === 'Game' ||
      prefetchedPageContentLocalesRef.current.has(routeLocale)
    ) {
      return;
    }

    const prefetch = (): void => {
      void prefetchKangurPageContentStore(queryClient, routeLocale).then((didPrefetch) => {
        if (didPrefetch) prefetchedPageContentLocalesRef.current.add(routeLocale);
      });
    };

    if (typeof window.requestIdleCallback === 'function') {
      const idleId = window.requestIdleCallback(prefetch, {
        timeout: HOT_PAGE_CONTENT_PREFETCH_TIMEOUT_MS,
      });
      return () => { window.cancelIdleCallback?.(idleId); };
    }

    const timeoutId = safeSetTimeout(prefetch, 0);
    return () => { safeClearTimeout(timeoutId); };
  }, [
    isBootLoading, isCoarsePointer, isSyntheticKangurCapture,
    isNavigationTransitionActive, isThemeBootLoading,
    queryClient, resolvedPageKey, routeLocale,
  ]);

  // Prefetch lesson sections while on the Game (home) page so Lessons page
  // renders without a loading skeleton on first navigation.
  useEffect(() => {
    if (
      typeof window === 'undefined' ||
      isBootLoading ||
      isThemeBootLoading ||
      isNavigationTransitionActive ||
      isCoarsePointer ||
      isSyntheticKangurCapture ||
      resolvedPageKey !== 'Game'
    ) {
      return;
    }

    const prefetch = (): void => {
      prefetchKangurLessonSections(queryClient, {
        subject: subject ?? undefined,
        ageGroup: ageGroup ?? undefined,
      });
    };

    if (typeof window.requestIdleCallback === 'function') {
      const idleId = window.requestIdleCallback(prefetch, { timeout: 250 });
      return () => { window.cancelIdleCallback?.(idleId); };
    }

    const timeoutId = safeSetTimeout(prefetch, 0);
    return () => { safeClearTimeout(timeoutId); };
  }, [
    ageGroup, isBootLoading, isCoarsePointer, isSyntheticKangurCapture,
    isNavigationTransitionActive, isThemeBootLoading, queryClient, resolvedPageKey, subject,
  ]);
}
