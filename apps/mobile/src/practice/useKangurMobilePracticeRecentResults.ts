import type { KangurScore } from '@kangur/contracts/kangur';
import type { Href } from 'expo-router';

import { useKangurMobileRecentResults } from '../home/useKangurMobileRecentResults';
import { createKangurLessonHrefForPracticeOperation } from '../lessons/lessonHref';
import { createKangurPracticeHref } from '../practice/practiceHref';
import { createKangurResultsHref } from '../scores/resultsHref';

const PRACTICE_RECENT_RESULTS_LIMIT = 3;

export type KangurMobilePracticeRecentResultItem = {
  historyHref: Href;
  lessonHref: Href | null;
  practiceHref: Href;
  result: KangurScore;
};

type UseKangurMobilePracticeRecentResultsResult = {
  error: string | null;
  isEnabled: boolean;
  isLoading: boolean;
  isRestoringAuth: boolean;
  recentResultItems: KangurMobilePracticeRecentResultItem[];
  refresh: () => Promise<void>;
};

export const useKangurMobilePracticeRecentResults =
  (): UseKangurMobilePracticeRecentResultsResult => {
    const recentResults = useKangurMobileRecentResults({
      limit: PRACTICE_RECENT_RESULTS_LIMIT,
    });

    return {
      error: recentResults.error,
      isEnabled: recentResults.isEnabled,
      isLoading: recentResults.isLoading,
      isRestoringAuth: recentResults.isRestoringAuth,
      recentResultItems: recentResults.results.map((result) => ({
        historyHref: createKangurResultsHref({
          operation: result.operation,
        }),
        lessonHref: createKangurLessonHrefForPracticeOperation(result.operation),
        practiceHref: createKangurPracticeHref(result.operation),
        result,
      })),
      refresh: recentResults.refresh,
    };
  };
