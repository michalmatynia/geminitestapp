import type { Href } from 'expo-router';

import type { KangurMobileScoreFamily } from './mobileScoreSummary';

type CreateKangurResultsHrefOptions = {
  family?: KangurMobileScoreFamily;
  operation?: string | null;
};

export const createKangurResultsHref = (
  options: CreateKangurResultsHrefOptions = {},
): Href => {
  const operation = options.operation?.trim() ?? '';

  if (operation !== '') {
    return ({
      pathname: '/results',
      params: {
        operation,
      },
    }) as unknown as Href;
  }

  if (options.family !== undefined && options.family !== 'all') {
    return ({
      pathname: '/results',
      params: {
        family: options.family,
      },
    }) as unknown as Href;
  }

  return '/results' as Href;
};
