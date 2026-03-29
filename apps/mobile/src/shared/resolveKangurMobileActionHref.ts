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
  if (!modeToken) {
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
  if (!rawRoute) {
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

  if (leadSegment === 'competition') {
    return createKangurCompetitionHref();
  }

  if (leadSegment === 'duels') {
    return createKangurDuelsHref();
  }

  if (leadSegment === 'game' || leadSegment === 'practice') {
    return options.gameTarget === 'competition'
      ? createKangurCompetitionHref()
      : createKangurPracticeHref('mixed');
  }

  if (leadSegment === 'lessons' || leadSegment === 'lesson') {
    return createKangurLessonHref(parsedRoute.searchParams.get('focus'));
  }

  if (leadSegment === 'leaderboard') {
    return '/leaderboard' as Href;
  }

  if (leadSegment === 'plan') {
    return createKangurPlanHref();
  }

  if (
    leadSegment === 'profile' ||
    leadSegment === 'learner-profile'
  ) {
    return '/profile' as Href;
  }

  if (leadSegment === 'parent-dashboard') {
    return createKangurParentDashboardHref();
  }

  if (leadSegment === 'results' || leadSegment === 'scores') {
    return createKangurResultsHref();
  }

  if (leadSegment === 'tests' || leadSegment === 'test') {
    return createKangurTestsHref();
  }

  return null;
};
