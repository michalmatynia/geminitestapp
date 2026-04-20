import { useMemo, useState } from 'react';
import { useKangurLessons, useKangurLessonDocuments, useKangurLessonTemplates } from '@/features/kangur/hooks';
import { resolveKangurAdminLocale } from '@/features/kangur/admin/utils';
import { KANGUR_ADMIN_LOCALES } from '@/features/kangur/shared/contracts/kangur';
import type { KangurLesson } from '@/features/kangur/shared/contracts/kangur';
import { useLocale } from '@/shared/lib/i18n';

export function useLessonsState(contentLocale: string) {
  const lessonsQuery = useKangurLessons();
  const lessonDocumentsQuery = useKangurLessonDocuments({ locale: contentLocale });
  const templatesQuery = useKangurLessonTemplates({ locale: contentLocale });
  
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
    isLoading,
    lessonTemplateMap,
    lessons,
    lessonDocuments,
    lessonById,
  };
}
