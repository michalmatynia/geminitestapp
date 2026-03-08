import type { KangurScore } from '@kangur/contracts';

import { useKangurMobileScoreHistory } from '../scores/useKangurMobileScoreHistory';

type UseKangurMobileRecentResultsOptions = {
  limit?: number;
};

type UseKangurMobileRecentResultsResult = {
  error: string | null;
  isEnabled: boolean;
  isLoading: boolean;
  isRestoringAuth: boolean;
  refresh: () => Promise<void>;
  results: KangurScore[];
};

export const useKangurMobileRecentResults = (
  options: UseKangurMobileRecentResultsOptions = {},
): UseKangurMobileRecentResultsResult => {
  const limit =
    typeof options.limit === 'number' && options.limit > 0
      ? Math.round(options.limit)
      : 3;
  const resultsQuery = useKangurMobileScoreHistory({
    limit,
    sort: '-created_date',
  });

  return {
    error:
      resultsQuery.error instanceof Error
        ? 'Nie udalo sie pobrac ostatnich wynikow.'
        : null,
    isEnabled: resultsQuery.isEnabled,
    isLoading: resultsQuery.isLoading,
    isRestoringAuth: resultsQuery.isRestoringAuth,
    refresh: resultsQuery.refresh,
    results: resultsQuery.scores,
  };
};
