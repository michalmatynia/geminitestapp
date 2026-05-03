import { useMemo } from 'react';
import { createKangurLessonHrefForPracticeOperation } from '../lessons/lessonHref';
import { createKangurPracticeHref } from '../practice/practiceHref';
import { createKangurResultsHref } from '../scores/resultsHref';
import { type KangurMobileParentRecentResultItem } from './parent-dashboard-types';

export function useParentDashboardResults(recentResults: { scores: any[] }) {
  return useMemo(
    (): KangurMobileParentRecentResultItem[] =>
      recentResults.scores.map((result) => ({
        historyHref: createKangurResultsHref({ operation: result.operation }),
        lessonHref: createKangurLessonHrefForPracticeOperation(result.operation),
        practiceHref: createKangurPracticeHref(result.operation),
        result,
      })),
    [recentResults.scores],
  );
}
