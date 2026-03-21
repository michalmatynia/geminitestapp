import {
  KANGUR_LESSON_CATALOG,
  getKangurPracticeOperationForLessonComponent,
  getLocalizedKangurCoreLessonTitle,
} from '@kangur/core';
import { createDefaultKangurProgressState } from '@kangur/contracts';
import type { Href } from 'expo-router';
import { useMemo, useSyncExternalStore } from 'react';

import { useKangurMobileI18n } from '../i18n/kangurMobileI18n';
import { createKangurLessonHref } from './lessonHref';
import { createKangurPracticeHref } from '../practice/practiceHref';
import { useKangurMobileRuntime } from '../providers/KangurRuntimeContext';

export type KangurMobileLessonCheckpointItem = {
  attempts: number;
  bestScorePercent: number;
  componentId: string;
  emoji: string;
  lastCompletedAt: string;
  lastScorePercent: number;
  lessonHref: Href;
  masteryPercent: number;
  practiceHref: Href | null;
  title: string;
};

type UseKangurMobileLessonCheckpointsOptions = {
  limit?: number;
};

type UseKangurMobileLessonCheckpointsResult = {
  recentCheckpoints: KangurMobileLessonCheckpointItem[];
};

const resolveTimestamp = (value: string | null): number => {
  if (!value) {
    return Number.NEGATIVE_INFINITY;
  }

  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : Number.NEGATIVE_INFINITY;
};

export const useKangurMobileLessonCheckpoints = (
  options: UseKangurMobileLessonCheckpointsOptions = {},
): UseKangurMobileLessonCheckpointsResult => {
  const { locale } = useKangurMobileI18n();
  const { progressStore } = useKangurMobileRuntime();
  const progress = useSyncExternalStore(
    progressStore.subscribeToProgress,
    progressStore.loadProgress,
    createDefaultKangurProgressState,
  );
  const limit =
    typeof options.limit === 'number' && options.limit > 0
      ? Math.round(options.limit)
      : 2;

  const recentCheckpoints = useMemo(
    () =>
      Object.entries(progress.lessonMastery)
        .filter(([, mastery]) => typeof mastery.lastCompletedAt === 'string')
        .sort(([leftComponentId, leftMastery], [rightComponentId, rightMastery]) => {
          const timestampDelta =
            resolveTimestamp(rightMastery.lastCompletedAt) -
            resolveTimestamp(leftMastery.lastCompletedAt);
          if (timestampDelta !== 0) {
            return timestampDelta;
          }

          if (rightMastery.lastScorePercent !== leftMastery.lastScorePercent) {
            return rightMastery.lastScorePercent - leftMastery.lastScorePercent;
          }

          return leftComponentId.localeCompare(rightComponentId);
        })
        .slice(0, limit)
        .map(([componentId, mastery]) => {
          const lessonCatalogEntry = KANGUR_LESSON_CATALOG[componentId];
          const practiceOperation = getKangurPracticeOperationForLessonComponent(
            componentId as Parameters<
              typeof getKangurPracticeOperationForLessonComponent
            >[0],
          );

          return {
            attempts: mastery.attempts,
            bestScorePercent: mastery.bestScorePercent,
            componentId,
            emoji: lessonCatalogEntry?.emoji ?? '📘',
            lastCompletedAt: mastery.lastCompletedAt as string,
            lastScorePercent: mastery.lastScorePercent,
            lessonHref: createKangurLessonHref(componentId),
            masteryPercent: mastery.masteryPercent,
            practiceHref: practiceOperation
              ? createKangurPracticeHref(practiceOperation)
              : null,
            title: getLocalizedKangurCoreLessonTitle(
              componentId,
              locale,
              lessonCatalogEntry?.title,
            ),
          };
        }),
    [limit, locale, progress.lessonMastery],
  );

  return {
    recentCheckpoints,
  };
};
