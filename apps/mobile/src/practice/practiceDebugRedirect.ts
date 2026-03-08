import type { Href } from 'expo-router';

import { createKangurPlanHref } from '../plan/planHref';
import { createKangurResultsHref } from '../scores/resultsHref';

export type KangurPracticeDebugRedirectTarget =
  | 'home'
  | 'leaderboard'
  | 'plan'
  | 'profile'
  | 'results';

export const resolveKangurPracticeDebugRedirectTarget = (
  value: string | string[] | null | undefined,
): KangurPracticeDebugRedirectTarget | null => {
  const rawValue = Array.isArray(value) ? value[0] : value;
  if (
    rawValue === 'results' ||
    rawValue === 'home' ||
    rawValue === 'leaderboard' ||
    rawValue === 'plan' ||
    rawValue === 'profile'
  ) {
    return rawValue;
  }

  return null;
};

export const createKangurPracticeDebugRedirectHref = ({
  operation,
  target,
}: {
  operation: string;
  target: KangurPracticeDebugRedirectTarget;
}): Href => {
  if (target === 'results') {
    return createKangurResultsHref({
      operation,
    });
  }

  if (target === 'leaderboard') {
    return '/leaderboard' as Href;
  }

  if (target === 'home') {
    return {
      pathname: '/',
      params: {
        debugProofOperation: operation,
      },
    };
  }

  if (target === 'profile') {
    return '/profile' as Href;
  }

  return createKangurPlanHref();
};
