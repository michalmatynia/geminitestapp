import {
  buildLessonMasteryInsights,
  getKangurPracticeOperationForLessonComponent,
  type KangurLessonMasteryInsight,
} from '@kangur/core';
import { createDefaultKangurProgressState } from '@kangur/contracts';
import type { Href } from 'expo-router';
import { useMemo, useSyncExternalStore } from 'react';

import { useKangurMobileI18n } from '../i18n/kangurMobileI18n';
import { createKangurLessonHref } from '../lessons/lessonHref';
import { createKangurPracticeHref } from '../practice/practiceHref';
import { useKangurMobileRuntime } from '../providers/KangurRuntimeContext';

export type KangurMobileHomeLessonMasteryItem = KangurLessonMasteryInsight & {
  lessonHref: Href;
  practiceHref: Href | null;
};

type UseKangurMobileHomeLessonMasteryResult = {
  masteredLessons: number;
  strongest: KangurMobileHomeLessonMasteryItem[];
  trackedLessons: number;
  weakest: KangurMobileHomeLessonMasteryItem[];
  lessonsNeedingPractice: number;
};

const mapInsightToHomeItem = (
  insight: KangurLessonMasteryInsight,
): KangurMobileHomeLessonMasteryItem => {
  const practiceOperation = getKangurPracticeOperationForLessonComponent(
    insight.componentId as Parameters<
      typeof getKangurPracticeOperationForLessonComponent
    >[0],
  );

  return {
    ...insight,
    lessonHref: createKangurLessonHref(insight.componentId),
    practiceHref: practiceOperation
      ? createKangurPracticeHref(practiceOperation)
      : null,
  };
};

export const useKangurMobileHomeLessonMastery =
  (): UseKangurMobileHomeLessonMasteryResult => {
    const { locale } = useKangurMobileI18n();
    const { progressStore } = useKangurMobileRuntime();
    const progress = useSyncExternalStore(
      progressStore.subscribeToProgress,
      progressStore.loadProgress,
      createDefaultKangurProgressState,
    );

    const masteryInsights = useMemo(
      () => buildLessonMasteryInsights(progress, 2, locale),
      [locale, progress],
    );

    return {
      masteredLessons: masteryInsights.masteredLessons,
      strongest: masteryInsights.strongest.map(mapInsightToHomeItem),
      trackedLessons: masteryInsights.trackedLessons,
      weakest: masteryInsights.weakest.map(mapInsightToHomeItem),
      lessonsNeedingPractice: masteryInsights.lessonsNeedingPractice,
    };
  };
