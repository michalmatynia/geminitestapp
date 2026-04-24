import {
  getKangurLessonMasteryPresentation,
  getLocalizedKangurPortableLessons,
  resolveFocusedKangurLessonId,
  type KangurLessonMasteryPresentation,
  type KangurPortableLesson,
  getKangurPracticeOperationForLessonComponent,
  type KangurProgressState,
} from '@kangur/core';
import { createDefaultKangurProgressState } from '@kangur/contracts/kangur';
import type { Href } from 'expo-router';
import { useMemo, useState, useSyncExternalStore, useCallback } from 'react';

import { useKangurMobileI18n } from '../i18n/kangurMobileI18n';
import { createKangurPracticeHref } from '../practice/practiceHref';
import { useKangurMobileRuntime } from '../providers/KangurRuntimeContext';
import { saveLessonCheckpoint, type SaveLessonCheckpointInput } from './lesson-checkpoint-service';
import type { KangurMobileLocale } from '../i18n/kangurMobileI18n';

export type KangurMobileLessonItem = {
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
  saveLessonCheckpoint: (input: SaveLessonCheckpointInput) => {
    countsAsLessonCompletion: boolean;
    newBadges: string[];
    scorePercent: number;
  } | null;
  selectedLesson: KangurMobileLessonItem | null;
};

const transformLesson = (
  lesson: KangurPortableLesson,
  progress: KangurProgressState,
  locale: KangurMobileLocale,
  selectedLessonId: string | null
): KangurMobileLessonItem => {
  const checkpoint = progress.lessonMastery[lesson.componentId];
  const practiceOperation = getKangurPracticeOperationForLessonComponent(lesson.componentId);

  return {
    checkpointSummary: checkpoint !== undefined && typeof checkpoint.lastCompletedAt === 'string'
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
    practiceHref: practiceOperation ? createKangurPracticeHref(practiceOperation) : null,
  };
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
  const focusToken = rawFocusToken !== null ? rawFocusToken.trim().toLowerCase() : null;
  const portableLessons = useMemo(() => getLocalizedKangurPortableLessons(locale), [locale]);

  const selectedLessonId = useMemo(
    () =>
      focusToken !== null
        ? resolveFocusedKangurLessonId(focusToken, portableLessons)
        : null,
    [focusToken, portableLessons],
  );

  const lessons = useMemo(
    () => portableLessons.map((lesson) => transformLesson(lesson, progress, locale, selectedLessonId)),
    [locale, portableLessons, progress, selectedLessonId],
  );

  const handleSaveLessonCheckpoint = useCallback((input: SaveLessonCheckpointInput) => {
    const normalizedLessonComponentId = input.lessonComponentId.trim();
    if (normalizedLessonComponentId === '') {
      setActionError(copy({ de: 'Diese Lektion konnte lokal nicht gespeichert werden.', en: 'Could not save this lesson locally.', pl: 'Nie udało się zapisać tej lekcji lokalnie.' }));
      return null;
    }
    try {
      const result = saveLessonCheckpoint(input, progress, progressStore);
      setActionError(null);
      return result;
    } catch {
      setActionError(copy({ de: 'Diese Lektion konnte lokal nicht gespeichert werden.', en: 'Could not save this lesson locally.', pl: 'Nie udało się zapisać tej lekcji lokalnie.' }));
      return null;
    }
  }, [copy, progress, progressStore]);

  return {
    actionError,
    focusToken,
    lessons,
    saveLessonCheckpoint: handleSaveLessonCheckpoint,
    selectedLesson: lessons.find((lesson) => lesson.isFocused) ?? null,
  };
};
