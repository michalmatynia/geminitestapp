import { resolveKangurLessonFocusForPracticeOperation } from '@kangur/core';
import { useMemo } from 'react';

import {
  buildKangurMobileTrainingFocus,
  type KangurMobileOperationPerformance,
} from '../scores/mobileScoreSummary';
import { useKangurMobileResults } from '../scores/useKangurMobileResults';

type UseKangurMobileTrainingFocusResult = {
  error: string | null;
  isEnabled: boolean;
  isLoading: boolean;
  isRestoringAuth: boolean;
  refresh: () => Promise<void>;
  strongestLessonFocus: string | null;
  strongestOperation: KangurMobileOperationPerformance | null;
  weakestLessonFocus: string | null;
  weakestOperation: KangurMobileOperationPerformance | null;
};

export const useKangurMobileTrainingFocus =
  (): UseKangurMobileTrainingFocusResult => {
    const results = useKangurMobileResults();
    const focus = useMemo(
      () => buildKangurMobileTrainingFocus(results.operationPerformance),
      [results.operationPerformance],
    );

    return {
      error: results.error,
      isEnabled: results.isEnabled,
      isLoading: results.isLoading,
      isRestoringAuth: results.isRestoringAuth,
      refresh: results.refresh,
      strongestLessonFocus: focus.strongestOperation
        ? resolveKangurLessonFocusForPracticeOperation(
            focus.strongestOperation.operation,
          )
        : null,
      strongestOperation: focus.strongestOperation,
      weakestLessonFocus: focus.weakestOperation
        ? resolveKangurLessonFocusForPracticeOperation(
            focus.weakestOperation.operation,
          )
        : null,
      weakestOperation: focus.weakestOperation,
    };
  };
