import {
  KANGUR_PORTABLE_LESSONS,
  getKangurLessonMasteryPresentation,
  resolveFocusedKangurLessonId,
  type KangurLessonMasteryPresentation,
  type KangurPortableLesson,
} from '@kangur/core';
import { createDefaultKangurProgressState } from '@kangur/contracts';
import { useMemo, useSyncExternalStore } from 'react';

import { useKangurMobileRuntime } from '../providers/KangurRuntimeContext';

type KangurMobileLessonItem = {
  isFocused: boolean;
  lesson: KangurPortableLesson;
  mastery: KangurLessonMasteryPresentation;
};

type UseKangurMobileLessonsResult = {
  focusToken: string | null;
  lessons: KangurMobileLessonItem[];
  selectedLesson: KangurMobileLessonItem | null;
};

export const useKangurMobileLessons = (
  rawFocusToken: string | null,
): UseKangurMobileLessonsResult => {
  const { progressStore } = useKangurMobileRuntime();
  const progress = useSyncExternalStore(
    progressStore.subscribeToProgress,
    progressStore.loadProgress,
    createDefaultKangurProgressState,
  );
  const focusToken = rawFocusToken?.trim().toLowerCase() || null;

  const selectedLessonId = useMemo(
    () =>
      focusToken
        ? resolveFocusedKangurLessonId(focusToken, KANGUR_PORTABLE_LESSONS)
        : null,
    [focusToken],
  );

  const lessons = useMemo(
    () =>
      KANGUR_PORTABLE_LESSONS.map((lesson) => ({
        isFocused: lesson.id === selectedLessonId,
        lesson,
        mastery: getKangurLessonMasteryPresentation(lesson, progress),
      })),
    [progress, selectedLessonId],
  );

  return {
    focusToken,
    lessons,
    selectedLesson: lessons.find((lesson) => lesson.isFocused) ?? null,
  };
};
