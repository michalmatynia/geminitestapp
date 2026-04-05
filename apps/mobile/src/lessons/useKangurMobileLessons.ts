import {
  getKangurLessonMasteryPresentation,
  getLocalizedKangurPortableLessons,
  resolveFocusedKangurLessonId,
  type KangurLessonMasteryPresentation,
  type KangurPortableLesson,
  buildKangurLessonMasteryUpdate,
  checkKangurNewBadges,
  getKangurLessonMasteryPresentation,
  getKangurPracticeOperationForLessonComponent,
  getLocalizedKangurPortableLessons,
  resolveFocusedKangurLessonId,
  type KangurLessonMasteryPresentation,
  type KangurPortableLesson,
} from '@kangur/core';
import { createDefaultKangurProgressState } from '@kangur/contracts/kangur';
import type { Href } from 'expo-router';
import { useMemo, useState, useSyncExternalStore } from 'react';

import { useKangurMobileI18n } from '../i18n/kangurMobileI18n';
import { createKangurPracticeHref } from '../practice/practiceHref';
import { useKangurMobileRuntime } from '../providers/KangurRuntimeContext';

type KangurMobileLessonItem = {
  checkpointSummary: {
    attempts: number;
    bestScorePercent: number;
    lastCompletedAt: string;
    lastScorePercent: number;
    masteryPercent: number;
  } | null;
  isFocused: boolean;
  lesson: KangurPortableLesson;
  mastery: KangurLessonMasteryPresentation;
  practiceHref: Href | null;
};

type UseKangurMobileLessonsResult = {
  actionError: string | null;
  focusToken: string | null;
  lessons: KangurMobileLessonItem[];
  saveLessonCheckpoint: (input: {
    countsAsLessonCompletion?: boolean;
    lessonComponentId: string;
    scorePercent: number;
  }) => {
    countsAsLessonCompletion: boolean;
    newBadges: string[];
    scorePercent: number;
  } | null;
  selectedLesson: KangurMobileLessonItem | null;
};

export const useKangurMobileLessons = (
  rawFocusToken: string | null,
): UseKangurMobileLessonsResult => {
  const { copy, locale } = useKangurMobileI18n();
  const { progressStore } = useKangurMobileRuntime();
  const [actionError, setActionError] = useState<string | null>(null);
  const progress = useSyncExternalStore(
    progressStore.subscribeToProgress,
    progressStore.loadProgress,
    createDefaultKangurProgressState,
  );
  const focusToken = rawFocusToken?.trim().toLowerCase() || null;
  const portableLessons = useMemo(() => getLocalizedKangurPortableLessons(locale), [locale]);

  const selectedLessonId = useMemo(
    () =>
      focusToken
        ? resolveFocusedKangurLessonId(focusToken, portableLessons)
        : null,
    [focusToken, portableLessons],
  );

  const lessons = useMemo(
    () =>
      portableLessons.map((lesson) => {
        const checkpoint = progress.lessonMastery[lesson.componentId];
        const practiceOperation = getKangurPracticeOperationForLessonComponent(
          lesson.componentId,
        );

        return {
          checkpointSummary:
            typeof checkpoint?.lastCompletedAt === 'string'
              ? {
                  attempts: checkpoint.attempts,
                  bestScorePercent: checkpoint.bestScorePercent,
                  lastCompletedAt: checkpoint.lastCompletedAt,
                  lastScorePercent: checkpoint.lastScorePercent,
                  masteryPercent: checkpoint.masteryPercent,
                }
              : null,
          isFocused: lesson.id === selectedLessonId,
          lesson,
          mastery: getKangurLessonMasteryPresentation(lesson, progress, locale),
          practiceHref: practiceOperation
            ? createKangurPracticeHref(practiceOperation)
            : null,
        };
      }),
    [locale, portableLessons, progress, selectedLessonId],
  );

  return {
    actionError,
    focusToken,
    lessons,
    saveLessonCheckpoint: (input) => {
      const normalizedLessonComponentId = input.lessonComponentId.trim();
      if (!normalizedLessonComponentId) {
        setActionError(
          copy({
            de: 'Diese Lektion konnte lokal nicht gespeichert werden.',
            en: 'Could not save this lesson locally.',
            pl: 'Nie udało się zapisać tej lekcji lokalnie.',
          }),
        );
        return null;
      }

      try {
        const currentProgress = progressStore.loadProgress();
        const normalizedScorePercent = Math.max(
          0,
          Math.min(100, Math.round(input.scorePercent)),
        );
        const countsAsLessonCompletion = input.countsAsLessonCompletion === true;
        const updatedProgress = {
          ...currentProgress,
          lessonMastery: buildKangurLessonMasteryUpdate(
            currentProgress,
            normalizedLessonComponentId,
            normalizedScorePercent,
          ),
          lessonsCompleted: countsAsLessonCompletion
            ? currentProgress.lessonsCompleted + 1
            : currentProgress.lessonsCompleted,
        };
        const newBadges = checkKangurNewBadges(updatedProgress);

        updatedProgress.badges = Array.from(
          new Set([...updatedProgress.badges, ...newBadges]),
        );
        progressStore.saveProgress(updatedProgress);
        setActionError(null);

        return {
          countsAsLessonCompletion,
          newBadges,
          scorePercent: normalizedScorePercent,
        };
      } catch {
        setActionError(
          copy({
            de: 'Diese Lektion konnte lokal nicht gespeichert werden.',
            en: 'Could not save this lesson locally.',
            pl: 'Nie udało się zapisać tej lekcji lokalnie.',
          }),
        );
        return null;
      }
    },
    selectedLesson: lessons.find((lesson) => lesson.isFocused) ?? null,
  };
};
