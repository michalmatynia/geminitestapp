import { useMemo } from 'react';

import { useKangurMobileI18n } from '../i18n/kangurMobileI18n';
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
  enabled?: boolean;
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
  const { copy } = useKangurMobileI18n();
  const scoresQuery = useKangurMobileScoreHistory({
    enabled: options.enabled,
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
        ? copy({
            de: 'Die Ergebnisse konnten nicht geladen werden.',
            en: 'Could not load the results.',
            pl: 'Nie udało się pobrać wyników.',
          })
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
