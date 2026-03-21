import {
  getKangurLessonMasteryPresentation,
  getLocalizedKangurPortableLessons,
  resolveFocusedKangurLessonId,
  type KangurLessonMasteryPresentation,
  type KangurPortableLesson,
} from '@kangur/core';
import { createDefaultKangurProgressState } from '@kangur/contracts';
import { useMemo, useSyncExternalStore } from 'react';

import { useKangurMobileI18n } from '../i18n/kangurMobileI18n';
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
  const { locale } = useKangurMobileI18n();
  const { progressStore } = useKangurMobileRuntime();
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
      portableLessons.map((lesson) => ({
        isFocused: lesson.id === selectedLessonId,
        lesson,
        mastery: getKangurLessonMasteryPresentation(lesson, progress, locale),
      })),
    [locale, portableLessons, progress, selectedLessonId],
  );

  return {
    focusToken,
    lessons,
    selectedLesson: lessons.find((lesson) => lesson.isFocused) ?? null,
  };
};
