'use client';

import { useState, useMemo } from 'react';
import { useKangurLessons, useKangurLessonDocuments, useKangurLessonTemplates } from '@/features/kangur/hooks';
import { resolveKangurAdminLocale } from '@/features/kangur/admin/utils';
import { KANGUR_ADMIN_LOCALES } from '@/features/kangur/shared/contracts/kangur';
import type { KangurLesson } from '@/features/kangur/shared/contracts/kangur';
import { useLocale } from '@/shared/lib/i18n';
import { readPersistedTreeMode } from '../constants';
import type { LessonTreeMode } from '../types';

export function useAdminLessonsManager() {
  const routeLocale = useLocale();
  const [contentLocale, setContentLocale] = useState(() => resolveKangurAdminLocale(routeLocale));
  
  const lessonsQuery = useKangurLessons();
  const lessonDocumentsQuery = useKangurLessonDocuments({ locale: contentLocale });
  const templatesQuery = useKangurLessonTemplates({ locale: contentLocale });
  
  const [treeMode, setTreeMode] = useState<LessonTreeMode>(() => readPersistedTreeMode());
  
  const lessons = useMemo((): KangurLesson[] => lessonsQuery.data ?? [], [lessonsQuery.data]);
  const lessonDocuments = useMemo(() => lessonDocumentsQuery.data ?? {}, [lessonDocumentsQuery.data]);

  const contentLocaleOptions = useMemo(() =>
    KANGUR_ADMIN_LOCALES.map((locale) => ({
      value: locale,
      label: locale === 'pl' ? 'Polish' : locale === 'uk' ? 'Ukrainian' : 'English',
    })), []);

  return {
    contentLocale,
    setContentLocale,
    lessons,
    lessonDocuments,
    templates: templatesQuery.data ?? [],
    treeMode,
    setTreeMode,
    contentLocaleOptions,
    isLoading: lessonsQuery.isLoading || lessonDocumentsQuery.isLoading || templatesQuery.isLoading,
  };
}
