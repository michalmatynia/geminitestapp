import {
  KANGUR_LESSON_CATALOG,
  getKangurPracticeOperationForLessonComponent,
  getLocalizedKangurCoreLessonTitle,
} from '@kangur/core';
import {
  createDefaultKangurProgressState,
  type KangurProgressState,
} from '@kangur/contracts';
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

type LessonCheckpointEntry = [
  componentId: string,
  mastery: KangurProgressState['lessonMastery'][string],
];

const resolveTimestamp = (value: string | null): number => {
  if (!value) {
    return Number.NEGATIVE_INFINITY;
  }

  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : Number.NEGATIVE_INFINITY;
};

const compareLessonCheckpointEntries = (
  [leftComponentId, leftMastery]: LessonCheckpointEntry,
  [rightComponentId, rightMastery]: LessonCheckpointEntry,
): number => {
  const timestampDelta =
    resolveTimestamp(rightMastery.lastCompletedAt) - resolveTimestamp(leftMastery.lastCompletedAt);
  if (timestampDelta !== 0) {
    return timestampDelta;
  }

  if (rightMastery.lastScorePercent !== leftMastery.lastScorePercent) {
    return rightMastery.lastScorePercent - leftMastery.lastScorePercent;
  }

  return leftComponentId.localeCompare(rightComponentId);
};

const selectRecentCheckpointEntries = (
  lessonMastery: KangurProgressState['lessonMastery'],
  limit: number,
): LessonCheckpointEntry[] => {
  const recentEntries: LessonCheckpointEntry[] = [];

  for (const [componentId, mastery] of Object.entries(lessonMastery)) {
    if (typeof mastery.lastCompletedAt !== 'string') {
      continue;
    }

    const candidateEntry: LessonCheckpointEntry = [componentId, mastery];
    const insertIndex = recentEntries.findIndex(
      (entry) => compareLessonCheckpointEntries(candidateEntry, entry) < 0,
    );

    if (insertIndex === -1) {
      recentEntries.push(candidateEntry);
    } else {
      recentEntries.splice(insertIndex, 0, candidateEntry);
    }

    if (recentEntries.length > limit) {
      recentEntries.length = limit;
    }
  }

  return recentEntries;
};

export const getKangurMobileLessonCheckpoints = (
  progress: KangurProgressState,
  locale: string | null | undefined,
  options: UseKangurMobileLessonCheckpointsOptions = {},
): UseKangurMobileLessonCheckpointsResult => {
  const limit =
    typeof options.limit === 'number' && options.limit > 0
      ? Math.round(options.limit)
      : 2;

  return {
    recentCheckpoints: selectRecentCheckpointEntries(progress.lessonMastery, limit).map(
      ([componentId, mastery]) => {
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
          practiceHref: practiceOperation ? createKangurPracticeHref(practiceOperation) : null,
          title: getLocalizedKangurCoreLessonTitle(
            componentId,
            locale,
            lessonCatalogEntry?.title,
          ),
        };
      },
    ),
  };
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
  const recentCheckpoints = useMemo(
    () => getKangurMobileLessonCheckpoints(progress, locale, options).recentCheckpoints,
    [locale, options.limit, progress],
  );

  return {
    recentCheckpoints,
  };
};
