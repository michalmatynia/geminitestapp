import { useMemo } from 'react';
import {
  useKangurLessonDocuments,
  useKangurLessonTemplates,
  useKangurLessons,
  useUpdateKangurLessonDocuments,
  useUpdateKangurLessonTemplates,
  useUpdateKangurLessons,
} from '@/features/kangur/hooks';
import type { KangurLesson } from '@/features/kangur/shared/contracts/kangur';

export function useLessonsState(contentLocale: string) {
  const lessonsQuery = useKangurLessons();
  const lessonDocumentsQuery = useKangurLessonDocuments({ locale: contentLocale });
  const templatesQuery = useKangurLessonTemplates({ locale: contentLocale });
  const updateLessons = useUpdateKangurLessons();
  const updateLessonDocuments = useUpdateKangurLessonDocuments(contentLocale);
  const updateTemplates = useUpdateKangurLessonTemplates(contentLocale);

  const isLoading = lessonsQuery.isLoading || lessonDocumentsQuery.isLoading || templatesQuery.isLoading;

  const lessonTemplateMap = useMemo(
    () => new Map((templatesQuery.data ?? []).map((t) => [t.componentId, t])),
    [templatesQuery.data],
  );
  
  const lessons = useMemo((): KangurLesson[] => lessonsQuery.data ?? [], [lessonsQuery.data]);
  const lessonDocuments = useMemo(() => lessonDocumentsQuery.data ?? {}, [lessonDocumentsQuery.data]);
  const lessonById = useMemo(() => new Map(lessons.map((lesson): [string, KangurLesson] => [lesson.id, lesson])), [lessons]);

  return {
    lessonsQuery,
    lessonDocumentsQuery,
    templatesQuery,
    updateLessons,
    updateLessonDocuments,
    updateTemplates,
    isLoading,
    lessonTemplateMap,
    lessons,
    lessonDocuments,
    lessonById,
  };
}
