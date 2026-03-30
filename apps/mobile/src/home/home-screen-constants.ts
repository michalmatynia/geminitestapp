import type { Href } from 'expo-router';

import { createKangurCompetitionHref } from '../competition/competitionHref';
import { createKangurDuelsHref } from '../duels/duelsHref';
import { createKangurParentDashboardHref } from '../parent/parentHref';
import { createKangurPlanHref } from '../plan/planHref';
import { createKangurPracticeHref } from '../practice/practiceHref';
import { createKangurTestsHref } from '../tests/testsHref';

export const RESULTS_ROUTE = '/results' as Href;
export const PROFILE_ROUTE = '/profile' as Href;
export const LEADERBOARD_ROUTE = '/leaderboard' as Href;
export const LESSONS_ROUTE = '/lessons' as Href;
export const PRACTICE_ROUTE = createKangurPracticeHref('mixed');
export const TESTS_ROUTE = createKangurTestsHref();
export const COMPETITION_ROUTE = createKangurCompetitionHref();
export const PLAN_ROUTE = createKangurPlanHref();
export const DUELS_ROUTE = createKangurDuelsHref();
export const PARENT_ROUTE = createKangurParentDashboardHref();

export const HOME_DUEL_PANEL_SEQUENCE = [
  'home:duels',
  'home:duels:secondary',
  'home:duels:invites',
  'home:duels:advanced',
] as const;
export const HOME_INSIGHT_SCORE_REFRESH_SEQUENCE = [
  'home:insights',
  'home:insights:scores',
] as const;
export const HOME_PRIMARY_SURFACE_PANEL_GROUP = [
  'home:hero:intro',
  'home:hero:details',
  'home:account:summary',
] as const;
export const HOME_SCORE_DETAILS_PANEL_GROUP = [
  'home:hero:scores',
  'home:training-focus:details',
] as const;
export const HOME_ACCOUNT_DETAILS_PANEL_GROUP = [
  'home:account:details',
  'home:account:sign-in',
] as const;
export const HOME_NAVIGATION_PANEL_SEQUENCE = [
  'home:navigation:secondary',
  'home:navigation:extended',
] as const;
export const HOME_INSIGHTS_SECTION_PANEL_GROUP = [
  'home:insights:lessons',
  'home:insights:extras',
] as const;
export const HOME_INSIGHTS_EXTRAS_PANEL_GROUP = [
  'home:insights:extras:details',
  'home:insights:extras:results',
] as const;
export const HOME_BADGES_PANEL_SEQUENCE = [
  'home:insights:extras:badges',
  'home:insights:extras:badges:details',
] as const;
export const HOME_PLAN_PANEL_SEQUENCE = [
  'home:insights:extras:plan',
  'home:insights:extras:plan:details',
  'home:insights:extras:plan:assignments',
] as const;
export const HOME_RESULTS_HUB_PANEL_SEQUENCE = [
  'home:insights:results',
  'home:insights:results:actions',
  'home:insights:results:cards',
] as const;
