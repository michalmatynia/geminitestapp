import type { KangurScore } from '@kangur/contracts/kangur';
import { useQuery } from '@tanstack/react-query';

import { useKangurMobileAuth } from '../auth/KangurMobileAuthContext';
import { resolveKangurMobileScoreScope } from '../profile/mobileScoreScope';
import { useKangurMobileRuntime } from '../providers/KangurRuntimeContext';

type UseKangurMobileScoreHistoryOptions = {
  enabled?: boolean;
  limit?: number;
  placeholderData?: KangurScore[];
  sort?: string;
};

type UseKangurMobileScoreHistoryResult = {
  error: unknown;
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
  const limit =
    typeof options.limit === 'number' && options.limit > 0
      ? Math.round(options.limit)
      : 120;
  const sort =
    typeof options.sort === 'string' && options.sort.trim().length > 0
      ? options.sort
      : '-created_date';
  const isEnabled =
    (options.enabled ?? true) &&
    session.status === 'authenticated' &&
    Boolean(scoreScope);
  const isRestoringAuth =
    isLoadingAuth && session.status !== 'authenticated';

  const scoresQuery = useQuery({
    enabled: isEnabled,
    placeholderData: isEnabled ? options.placeholderData : undefined,
    queryKey: [
      'kangur-mobile',
      'scores',
      apiBaseUrl,
      scoreScope?.identityKey ?? 'anonymous',
      sort,
      limit,
    ],
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
  });

  return {
    error: scoresQuery.error,
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
