import { useMemo } from 'react';

import {
  buildKangurMobileOperationPerformance,
  buildKangurMobileScoreSummary,
  filterKangurMobileScores,
  listKangurMobileScoreOperations,
  type KangurMobileOperationPerformance,
  type KangurMobileScoreFamily,
  type KangurMobileScoreSummary,
} from './mobileScoreSummary';
import { useKangurMobileScoreHistory } from './useKangurMobileScoreHistory';

type UseKangurMobileResultsOptions = {
  family?: KangurMobileScoreFamily;
  operation?: string | null;
};

type UseKangurMobileResultsResult = {
  availableOperations: string[];
  error: string | null;
  isEnabled: boolean;
  isLoading: boolean;
  isRestoringAuth: boolean;
  operationPerformance: KangurMobileOperationPerformance[];
  refresh: () => Promise<void>;
  scores: ReturnType<typeof useKangurMobileScoreHistory>['scores'];
  summary: KangurMobileScoreSummary;
};

export const useKangurMobileResults = (
  options: UseKangurMobileResultsOptions = {},
): UseKangurMobileResultsResult => {
  const scoresQuery = useKangurMobileScoreHistory({
    limit: 40,
    sort: '-created_date',
  });
  const availableOperations = useMemo(
    () => listKangurMobileScoreOperations(scoresQuery.scores),
    [scoresQuery.scores],
  );
  const filteredScores = useMemo(
    () =>
      filterKangurMobileScores(scoresQuery.scores, {
        family: options.family,
        operation: options.operation,
      }),
    [options.family, options.operation, scoresQuery.scores],
  );
  const summary = useMemo(
    () => buildKangurMobileScoreSummary(filteredScores),
    [filteredScores],
  );
  const operationPerformance = useMemo(
    () => buildKangurMobileOperationPerformance(filteredScores),
    [filteredScores],
  );

  return {
    availableOperations,
    error:
      scoresQuery.error instanceof Error
        ? 'Nie udalo sie pobrac historii wynikow.'
        : null,
    isEnabled: scoresQuery.isEnabled,
    isLoading: scoresQuery.isLoading,
    isRestoringAuth: scoresQuery.isRestoringAuth,
    operationPerformance,
    refresh: scoresQuery.refresh,
    scores: filteredScores,
    summary,
  };
};
