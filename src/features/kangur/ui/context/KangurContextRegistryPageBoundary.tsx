'use client';

import React, { useMemo } from 'react';

import { KANGUR_MAIN_PAGE } from '@/features/kangur/config/pages';
import { resolveKangurPageKey } from '@/features/kangur/config/routing';
import { KANGUR_CONTEXT_ROOT_IDS } from '@/features/kangur/context-registry/refs';
import { ContextRegistryPageProvider } from '@/shared/lib/ai-context-registry/page-context';
import { useKangurDeferredHomeTutorContextReady } from '@/features/kangur/ui/hooks/useKangurDeferredHomeTutorContextReady';

import { useKangurRouting } from './KangurRoutingContext';

const KANGUR_PAGE_CONTEXT_ROOTS: Record<string, string[]> = {
  Competition: [
    'page:kangur-game',
    'action:kangur-ai-tutor-chat',
    ...KANGUR_CONTEXT_ROOT_IDS.learnerSnapshot,
    ...KANGUR_CONTEXT_ROOT_IDS.assignmentContext,
  ],
  Game: [
    'page:kangur-game',
    'action:kangur-ai-tutor-chat',
    ...KANGUR_CONTEXT_ROOT_IDS.learnerSnapshot,
    ...KANGUR_CONTEXT_ROOT_IDS.assignmentContext,
  ],
  GamesLibrary: [
    'page:kangur-games-library',
    'action:kangur-ai-tutor-chat',
    ...KANGUR_CONTEXT_ROOT_IDS.gameLibraryContext,
  ],
  Lessons: [
    'page:kangur-lessons',
    'action:kangur-ai-tutor-chat',
    ...KANGUR_CONTEXT_ROOT_IDS.lessonContext,
    ...KANGUR_CONTEXT_ROOT_IDS.learnerSnapshot,
  ],
  Tests: [
    ...KANGUR_CONTEXT_ROOT_IDS.testContext,
    ...KANGUR_CONTEXT_ROOT_IDS.learnerSnapshot,
  ],
  LearnerProfile: [
    'page:kangur-learner-profile',
    'action:kangur-ai-tutor-chat',
    ...KANGUR_CONTEXT_ROOT_IDS.learnerSnapshot,
    ...KANGUR_CONTEXT_ROOT_IDS.loginActivity,
  ],
  ParentDashboard: [
    'page:kangur-parent-dashboard',
    'action:kangur-ai-tutor-chat',
    ...KANGUR_CONTEXT_ROOT_IDS.learnerSnapshot,
    ...KANGUR_CONTEXT_ROOT_IDS.assignmentContext,
    ...KANGUR_CONTEXT_ROOT_IDS.loginActivity,
  ],
};

const KANGUR_PAGE_TITLES: Record<string, string> = {
  Competition: 'Kangur Competition',
  Game: 'Kangur Game',
  GamesLibrary: 'Kangur Games Library',
  Lessons: 'Kangur Lessons',
  Tests: 'Kangur Tests',
  LearnerProfile: 'Kangur Learner Profile',
  ParentDashboard: 'Kangur Parent Dashboard',
};

type KangurContextPageKey = keyof typeof KANGUR_PAGE_CONTEXT_ROOTS;

const KANGUR_PAGE_KEY_LOOKUP: Record<KangurContextPageKey, true> = {
  Competition: true,
  Game: true,
  GamesLibrary: true,
  Lessons: true,
  Tests: true,
  LearnerProfile: true,
  ParentDashboard: true,
};

const KANGUR_FALLBACK_PAGE_KEY = KANGUR_MAIN_PAGE as KangurContextPageKey;

const dedupeRootIds = (ids: string[]): string[] => [...new Set(ids.filter(Boolean))];
const isKangurContextPageKey = (value: string | null | undefined): value is KangurContextPageKey =>
  typeof value === 'string' && value in KANGUR_PAGE_CONTEXT_ROOTS;

export function KangurContextRegistryPageBoundary({
  children,
}: {
  children: React.ReactNode;
}): React.JSX.Element {
  const isTutorContextReady = useKangurDeferredHomeTutorContextReady();
  const { pageKey } = useKangurRouting();
  const resolvedPageKey = resolveKangurPageKey(pageKey, KANGUR_PAGE_KEY_LOOKUP, KANGUR_FALLBACK_PAGE_KEY);
  const effectivePageKey = isKangurContextPageKey(resolvedPageKey)
    ? resolvedPageKey
    : KANGUR_FALLBACK_PAGE_KEY;

  const rootNodeIds = useMemo(
    () => dedupeRootIds(KANGUR_PAGE_CONTEXT_ROOTS[effectivePageKey] ?? []),
    [effectivePageKey]
  );

  if (!isTutorContextReady) {
    return <>{children}</>;
  }

  return (
    <ContextRegistryPageProvider
      pageId={`kangur:${effectivePageKey}`}
      title={KANGUR_PAGE_TITLES[effectivePageKey] ?? 'Kangur'}
      rootNodeIds={rootNodeIds}
    >
      {children}
    </ContextRegistryPageProvider>
  );
}
