import { useMemo } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useKangurMobileI18n } from '../i18n/kangurMobileI18n';
import { useKangurMobileLessons } from './useKangurMobileLessons';
import { useLessonsScreenBootState } from './useLessonsScreenBootState';
import { getKangurPortableLessonBody } from '@kangur/core';
import { type LessonBody } from './lessons-types';

export function useLessonsScreenState(): {
  copy: ReturnType<typeof useKangurMobileI18n>['copy'];
  locale: ReturnType<typeof useKangurMobileI18n>['locale'];
  router: ReturnType<typeof useRouter>;
  focusToken: string | null;
  actionError: string | null;
  lessons: ReturnType<typeof useKangurMobileLessons>['lessons'];
  saveLessonCheckpoint: ReturnType<typeof useKangurMobileLessons>['saveLessonCheckpoint'];
  selectedLesson: ReturnType<typeof useKangurMobileLessons>['selectedLesson'];
  isPreparing: boolean;
  selectedLessonBody: LessonBody | null;
} {
  const { copy, locale } = useKangurMobileI18n();
  const router = useRouter();
  const params = useLocalSearchParams<{ focus?: string | string[] }>();
  
  const rawFocusParam = Array.isArray(params.focus) ? params.focus[0] : params.focus;
  const focusToken = (typeof rawFocusParam === 'string' && rawFocusParam.trim() !== '') ? rawFocusParam.trim().toLowerCase() : null;
  
  const { actionError, lessons, saveLessonCheckpoint, selectedLesson } = useKangurMobileLessons(focusToken);
  const isPreparing = useLessonsScreenBootState(focusToken ?? 'catalog');
  
  const selectedLessonBody = useMemo(() => (!isPreparing && selectedLesson !== null) ? getKangurPortableLessonBody(selectedLesson.lesson.componentId, locale) as LessonBody : null, [isPreparing, selectedLesson, locale]);

  return {
    copy,
    locale,
    router,
    focusToken,
    actionError,
    lessons,
    saveLessonCheckpoint,
    selectedLesson,
    isPreparing,
    selectedLessonBody,
  };
}
