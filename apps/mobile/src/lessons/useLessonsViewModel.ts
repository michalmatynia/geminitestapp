import { useMemo } from 'react';
import { useKangurMobileI18n } from '../i18n/kangurMobileI18n';
import { useKangurMobileLessonsLessonMastery } from './useKangurMobileLessonsLessonMastery';
import { type LessonViewModel, type LessonMastery } from './lessons-types';

export function useLessonsViewModel(): LessonViewModel {
  const { copy, locale } = useKangurMobileI18n();
  const lessonMastery = useKangurMobileLessonsLessonMastery();

  const tutorContext = useMemo(() => ({
    contentId: 'lesson:list',
    focusKind: 'library' as const,
    surface: 'lesson' as const,
    title: copy({ de: 'Lektionen', en: 'Lessons', pl: 'Lekcje' }),
  }), [copy]);

  return {
    copy,
    locale,
    lessonMastery: lessonMastery as LessonMastery,
    tutorContext,
  };
}
