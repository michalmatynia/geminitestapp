import type { KangurScore } from '@kangur/contracts';

import { useKangurMobileI18n } from '../i18n/kangurMobileI18n';
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

const MOBILE_SHARED_RECENT_RESULTS_QUERY_LIMIT = 40;

export const useKangurMobileRecentResults = (
  options: UseKangurMobileRecentResultsOptions = {},
): UseKangurMobileRecentResultsResult => {
  const { copy } = useKangurMobileI18n();
  const limit =
    typeof options.limit === 'number' && options.limit > 0
      ? Math.round(options.limit)
      : 3;
  const queryLimit = Math.max(limit, MOBILE_SHARED_RECENT_RESULTS_QUERY_LIMIT);
  const resultsQuery = useKangurMobileScoreHistory({
    limit: queryLimit,
    sort: '-created_date',
  });

  return {
    error:
      resultsQuery.error instanceof Error
        ? copy({
            de: 'Die letzten Ergebnisse konnten nicht geladen werden.',
            en: 'Could not load the recent results.',
            pl: 'Nie udało się pobrać ostatnich wyników.',
          })
        : null,
    isEnabled: resultsQuery.isEnabled,
    isLoading: resultsQuery.isLoading,
    isRestoringAuth: resultsQuery.isRestoringAuth,
    refresh: resultsQuery.refresh,
    results: resultsQuery.scores.slice(0, limit),
  };
};
