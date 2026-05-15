import type { KangurScore } from '@kangur/contracts/kangur';

import { useKangurMobileAuth } from '../auth/KangurMobileAuthContext';
import { resolveKangurMobileScoreScope } from '../profile/mobileScoreScope';
import { useKangurMobileRuntime } from '../providers/KangurRuntimeContext';
import { useKangurMobileQueryV2 } from '../query/kangurMobileQueryFactories';

type UseKangurMobileScoreHistoryOptions = {
  enabled?: boolean;
  limit?: number;
  placeholderData?: KangurScore[];
  sort?: string;
};

export type UseKangurMobileScoreHistoryResult = {
  error: Error | null;
  isEnabled: boolean;
  isLoadingAuth: boolean;
  isLoading: boolean;
  isPlaceholderData: boolean;
  isRestoringAuth: boolean;
  refresh: () => Promise<void>;
  scores: KangurScore[];
};

export const useKangurMobileScoreHistory = (
  options: UseKangurMobileScoreHistoryOptions = {},
): UseKangurMobileScoreHistoryResult => {
  const { isLoadingAuth, session } = useKangurMobileAuth();
  const { apiBaseUrl, apiClient } = useKangurMobileRuntime();
  const scoreScope = resolveKangurMobileScoreScope(session.user);

  const limit = getLimit(options.limit);
  const sort = getSort(options.sort);
  const isEnabled = checkIsEnabled(options.enabled, session.status, scoreScope);
  const isRestoringAuth = isLoadingAuth && session.status !== 'authenticated';

  const queryKey = [
    'kangur-mobile',
    'scores',
    apiBaseUrl,
    scoreScope?.identityKey ?? 'anonymous',
    sort,
    limit,
  ] as const;

  const scoresQuery = useKangurMobileQueryV2({
    enabled: isEnabled,
    placeholderData: isEnabled ? options.placeholderData : undefined,
    queryKey,
    queryFn: async () =>
      apiClient.listScores(
        {
          ...scoreScope?.query,
          sort,
          limit,
        },
        {
          cache: 'no-store',
        },
      ),
    staleTime: 30_000,
    meta: {
      source: 'kangur.mobile.scores.history',
      operation: 'list',
      resource: 'kangur.mobile.scores.history',
      queryKey,
      description: 'Loads Kangur mobile score history.',
      tags: ['kangur-mobile', 'scores'],
    },
  });

  return {
    error: scoresQuery.error instanceof Error ? scoresQuery.error : null,
    isEnabled,
    isLoading: isRestoringAuth || scoresQuery.isLoading,
    isLoadingAuth,
    isPlaceholderData: scoresQuery.isPlaceholderData,
    isRestoringAuth,
    refresh: async () => {
      await scoresQuery.refetch();
    },
    scores: scoresQuery.data ?? [],
  };
};

function getLimit(limit?: number): number {
  return typeof limit === 'number' && limit > 0 ? Math.round(limit) : 120;
}

function getSort(sort?: string): string {
  return typeof sort === 'string' && sort.trim().length > 0 ? sort : '-created_date';
}

function checkIsEnabled(enabled: boolean | undefined, status: string, scoreScope: object | null | undefined): boolean {
  return (enabled ?? true) && status === 'authenticated' && Boolean(scoreScope);
}
