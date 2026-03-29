import type { KangurScore } from '@kangur/contracts';
import type { Href } from 'expo-router';

import { useKangurMobileRecentResults } from '../home/useKangurMobileRecentResults';
import { createKangurPracticeHref } from '../practice/practiceHref';
import { createKangurResultsHref } from '../scores/resultsHref';
import { createKangurLessonHrefForPracticeOperation } from './lessonHref';

const MOBILE_LESSONS_RECENT_RESULTS_LIMIT = 2;

export type KangurMobileLessonsRecentResultItem = {
  historyHref: Href;
  lessonHref: Href | null;
  practiceHref: Href;
  result: KangurScore;
};

type UseKangurMobileLessonsRecentResultsResult = {
  error: string | null;
  isEnabled: boolean;
  isLoading: boolean;
  isRestoringAuth: boolean;
  recentResultItems: KangurMobileLessonsRecentResultItem[];
  refresh: () => Promise<void>;
};

export const useKangurMobileLessonsRecentResults =
  (): UseKangurMobileLessonsRecentResultsResult => {
    const recentResults = useKangurMobileRecentResults({
      limit: MOBILE_LESSONS_RECENT_RESULTS_LIMIT,
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
