import { resolvePreferredKangurPracticeOperation } from '@kangur/core';
import type { Href } from 'expo-router';

import { createKangurCompetitionHref } from '../competition/competitionHref';
import { createKangurDuelsHref } from '../duels/duelsHref';
import { createKangurLessonHref } from '../lessons/lessonHref';
import { createKangurParentDashboardHref } from '../parent/parentHref';
import { createKangurPlanHref } from '../plan/planHref';
import { createKangurPracticeHref } from '../practice/practiceHref';
import { createKangurResultsHref } from '../scores/resultsHref';
import { createKangurTestsHref } from '../tests/testsHref';

type KangurMobileActionPage =
  | 'Duels'
  | 'Game'
  | 'LearnerProfile'
  | 'Lessons'
  | 'ParentDashboard';

type KangurMobileActionLike = {
  page: KangurMobileActionPage;
  query?: Record<string, string> | undefined;
};

type ResolveKangurMobileActionHrefOptions = {
  gameTarget?: 'competition' | 'practice';
};

type KangurMobileWebsiteHelpTargetLike = {
  route?: string | null | undefined;
};

const COMPETITION_MODE_HINTS = ['2024', '3pt', '4pt', '5pt', 'full', 'kangur', 'original'];

type ResolveWebsiteHelpHrefArgs = {
  options: ResolveKangurMobileActionHrefOptions;
  parsedRoute: URL;
};

const normalizeQueryToken = (value: string | null | undefined): string | null => {
  if (typeof value !== 'string') {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
};

const prefersCompetitionGameTarget = (
  query: Record<string, string> | undefined,
  options: ResolveKangurMobileActionHrefOptions,
): boolean => {
  if (options.gameTarget === 'competition') {
    return true;
  }

  const modeToken =
    normalizeQueryToken(query?.['mode']) ?? normalizeQueryToken(query?.['focus']);
  if (modeToken === null) {
    return false;
  }

  const normalizedModeToken = modeToken.toLowerCase();
  return COMPETITION_MODE_HINTS.some((hint) => normalizedModeToken.includes(hint));
};

export const resolveKangurMobileActionHref = (
  action: KangurMobileActionLike,
  options: ResolveKangurMobileActionHrefOptions = {},
): Href | null => {
  if (action.page === 'Lessons') {
    return createKangurLessonHref(action.query?.['focus']);
  }

  if (action.page === 'Game') {
    if (prefersCompetitionGameTarget(action.query, options)) {
      return createKangurCompetitionHref(
        normalizeQueryToken(action.query?.['mode']) ??
          normalizeQueryToken(action.query?.['focus']),
      );
    }

    const resolvedOperation =
      resolvePreferredKangurPracticeOperation(action.query?.['operation']) ??
      resolvePreferredKangurPracticeOperation(action.query?.['focus']) ??
      'mixed';
    return createKangurPracticeHref(resolvedOperation);
  }

  if (action.page === 'LearnerProfile') {
    return '/profile' as Href;
  }

  if (action.page === 'ParentDashboard') {
    return createKangurParentDashboardHref();
  }

  if (action.page === 'Duels') {
    return createKangurDuelsHref({
      joinSessionId: normalizeQueryToken(action.query?.['join']),
      sessionId: normalizeQueryToken(action.query?.['sessionId']),
      spectate: action.query?.['spectate'] === '1',
    });
  }

  return null;
};

export const resolveKangurMobileWebsiteHelpHref = (
  target: KangurMobileWebsiteHelpTargetLike,
  options: ResolveKangurMobileActionHrefOptions = {},
): Href | null => {
  const rawRoute = normalizeQueryToken(target.route);
  if (rawRoute === null) {
    return null;
  }

  const parsedRoute = new URL(
    rawRoute.startsWith('/') ? rawRoute : `/${rawRoute}`,
    'https://kangur.local',
  );
  const segments = parsedRoute.pathname
    .split('/')
    .map((segment) => segment.trim().toLowerCase())
    .filter(Boolean);
  const leadSegment = segments[0] ?? '';

  if (leadSegment === '') {
    return '/' as Href;
  }

  const routeResolvers: Partial<
    Record<string, (args: ResolveWebsiteHelpHrefArgs) => Href | null>
  > = {
    competition: () => createKangurCompetitionHref(),
    duels: () => createKangurDuelsHref(),
    game: ({ options: resolverOptions }) =>
      resolverOptions.gameTarget === 'competition'
        ? createKangurCompetitionHref()
        : createKangurPracticeHref('mixed'),
    practice: ({ options: resolverOptions }) =>
      resolverOptions.gameTarget === 'competition'
        ? createKangurCompetitionHref()
        : createKangurPracticeHref('mixed'),
    lesson: ({ parsedRoute: route }) =>
      createKangurLessonHref(route.searchParams.get('focus')),
    lessons: ({ parsedRoute: route }) =>
      createKangurLessonHref(route.searchParams.get('focus')),
    leaderboard: () => '/leaderboard' as Href,
    'learner-profile': () => '/profile' as Href,
    'parent-dashboard': () => createKangurParentDashboardHref(),
    plan: () => createKangurPlanHref(),
    profile: () => '/profile' as Href,
    results: () => createKangurResultsHref(),
    scores: () => createKangurResultsHref(),
    test: () => createKangurTestsHref(),
    tests: () => createKangurTestsHref(),
  };

  return routeResolvers[leadSegment]?.({ options, parsedRoute }) ?? null;
};
