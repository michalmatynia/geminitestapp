import { useMemo } from 'react';
import type { KangurScore } from '@kangur/contracts/kangur';
import { createKangurLessonHrefForPracticeOperation } from '../lessons/lessonHref';
import { createKangurPracticeHref } from '../practice/practiceHref';
import { createKangurResultsHref } from '../scores/resultsHref';
import { type KangurMobileParentRecentResultItem } from './parent-dashboard-types';

export function useParentDashboardResults(recentResults: { scores: KangurScore[] }): KangurMobileParentRecentResultItem[] {
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
