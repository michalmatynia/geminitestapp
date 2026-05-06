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

const resolveLessonsPage = (query: Record<string, string> | undefined): Href | null => 
    createKangurLessonHref(query?.['focus']);

const getCompetitionHref = (
    query: Record<string, string> | undefined
): Href => {
    return createKangurCompetitionHref(
        normalizeQueryToken(query?.['mode']) ??
          normalizeQueryToken(query?.['focus']),
    );
};

const getPracticeHref = (
    query: Record<string, string> | undefined
): Href => {
    const resolvedOperation =
      resolvePreferredKangurPracticeOperation(query?.['operation']) ??
      resolvePreferredKangurPracticeOperation(query?.['focus']) ??
      'mixed';
    return createKangurPracticeHref(resolvedOperation);
};

const resolveGamePage = (
    query: Record<string, string> | undefined,
    options: ResolveKangurMobileActionHrefOptions
): Href | null => {
    if (prefersCompetitionGameTarget(query, options)) {
        return getCompetitionHref(query);
    }
    return getPracticeHref(query);
};

const resolveDuelsPage = (query: Record<string, string> | undefined): Href | null =>
    createKangurDuelsHref({
      joinSessionId: normalizeQueryToken(query?.['join']),
      sessionId: normalizeQueryToken(query?.['sessionId']),
      spectate: query?.['spectate'] === '1',
    });

export const resolveKangurMobileActionHref = (
  action: KangurMobileActionLike,
  options: ResolveKangurMobileActionHrefOptions = {},
): Href | null => {
  switch (action.page) {
    case 'Lessons': return resolveLessonsPage(action.query);
    case 'Game': return resolveGamePage(action.query, options);
    case 'LearnerProfile': return '/profile' as Href;
    case 'ParentDashboard': return createKangurParentDashboardHref();
    case 'Duels': return resolveDuelsPage(action.query);
    default: return null;
  }
};

const resolveHelpRouteMedia = (leadSegment: string, args: ResolveWebsiteHelpHrefArgs): Href | null => {
    switch (leadSegment) {
        case 'competition': return createKangurCompetitionHref();
        case 'duels': return createKangurDuelsHref();
        case 'game':
        case 'practice':
            return args.options.gameTarget === 'competition'
                ? createKangurCompetitionHref()
                : createKangurPracticeHref('mixed');
        default: return null;
    }
};

const resolveHelpRouteContent = (leadSegment: string, args: ResolveWebsiteHelpHrefArgs): Href | null => {
    switch (leadSegment) {
        case 'lesson':
        case 'lessons':
            return createKangurLessonHref(args.parsedRoute.searchParams.get('focus'));
        case 'leaderboard': return '/leaderboard' as Href;
        case 'parent-dashboard': return createKangurParentDashboardHref();
        case 'plan': return createKangurPlanHref();
        default: return null;
    }
};

const resolveHelpRouteProfile = (leadSegment: string): Href | null => {
    switch (leadSegment) {
        case 'learner-profile':
        case 'profile': return '/profile' as Href;
        case 'results':
        case 'scores': return createKangurResultsHref();
        case 'test':
        case 'tests': return createKangurTestsHref();
        default: return null;
    }
};

const resolveWebsiteHelpRoute = (
    leadSegment: string,
    args: ResolveWebsiteHelpHrefArgs
): Href | null => {
    const media = resolveHelpRouteMedia(leadSegment, args);
    if (media !== null) return media;
    
    const content = resolveHelpRouteContent(leadSegment, args);
    if (content !== null) return content;
    
    return resolveHelpRouteProfile(leadSegment);
};

export const resolveKangurMobileWebsiteHelpHref = (
  target: KangurMobileWebsiteHelpTargetLike,
  options: ResolveKangurMobileActionHrefOptions = {},
): Href | null => {
  const rawRoute = normalizeQueryToken(target.route);
  if (rawRoute === null) return null;

  const parsedRoute = new URL(
    rawRoute.startsWith('/') ? rawRoute : `/${rawRoute}`,
    'https://kangur.local',
  );
  const segments = parsedRoute.pathname
    .split('/')
    .map((segment) => segment.trim().toLowerCase())
    .filter(Boolean);
  const leadSegment = segments[0] ?? '';

  if (leadSegment === '') return '/' as Href;

  return resolveWebsiteHelpRoute(leadSegment, { options, parsedRoute });
};
