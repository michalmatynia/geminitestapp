'use client';

import { useMemo, useState } from 'react';
import { useLocale } from 'next-intl';
import type {
  KangurLesson,
  KangurLessonAgeGroup,
} from '@/features/kangur/shared/contracts/kangur';
import {
  useKangurLessonDocuments,
  useKangurLessons,
  useUpdateKangurLessonDocuments,
  useUpdateKangurLessons,
} from '@/features/kangur/ui/hooks/useKangurLessons';
import {
  useKangurLessonTemplates,
  useUpdateKangurLessonTemplates,
} from '../ui/hooks/useKangurLessonTemplates';
import {
  KANGUR_ADMIN_LOCALES,
  resolveKangurAdminLocale,
} from './kangur-admin-locale';
import {
  createDefaultKangurLessonDocument,
} from '../lesson-documents';
import {
  createInitialLessonFormData,
  readPersistedTreeMode,
} from './utils';
import type { LessonFormData, LessonTreeMode } from './types';
import type { KangurLessonAuthoringFilter } from './content-creator-insights';

export function useAdminKangurLessonsManagerState() {
  const routeLocale = useLocale();
  const [contentLocale, setContentLocale] = useState(() => resolveKangurAdminLocale(routeLocale));
  
  const lessonsQuery = useKangurLessons();
  const lessonDocumentsQuery = useKangurLessonDocuments({ locale: contentLocale });
  const updateLessons = useUpdateKangurLessons();
  const updateLessonDocuments = useUpdateKangurLessonDocuments(contentLocale);
  const updateTemplates = useUpdateKangurLessonTemplates(contentLocale);
  const templatesQuery = useKangurLessonTemplates({ locale: contentLocale });
  
  const isLoading = lessonsQuery.isLoading || lessonDocumentsQuery.isLoading || templatesQuery.isLoading;

  const lessonTemplateMap = useMemo(
    () => new Map((templatesQuery.data ?? []).map((t) => [t.componentId, t])),
    [templatesQuery.data],
  );
  
  const contentLocaleOptions = useMemo(
    () =>
      KANGUR_ADMIN_LOCALES.map((locale) => ({
        value: locale,
        label: locale === 'pl' ? 'Polish' : locale === 'uk' ? 'Ukrainian' : 'English',
      })),
    []
  );
  const contentLocaleLabel =
    contentLocaleOptions.find((option) => option.value === contentLocale)?.label ?? contentLocale;
  
  const isPrimaryContentLocale = contentLocale === 'pl';
  const lessons = useMemo((): KangurLesson[] => lessonsQuery.data ?? [], [lessonsQuery.data]);
  const lessonDocuments = useMemo(() => lessonDocumentsQuery.data ?? {}, [lessonDocumentsQuery.data]);
  const lessonById = useMemo(() => new Map(lessons.map((lesson): [string, KangurLesson] => [lesson.id, lesson])), [lessons]);

  const [showModal, setShowModal] = useState(false);
  const [showContentModal, setShowContentModal] = useState(false);
  const [editingLesson, setEditingLesson] = useState<KangurLesson | null>(null);
  const [editingContentLesson, setEditingContentLesson] = useState<KangurLesson | null>(null);
  const [lessonToDelete, setLessonToDelete] = useState<KangurLesson | null>(null);
  const [formData, setFormData] = useState<LessonFormData>(() => createInitialLessonFormData());
  const [componentContentJson, setComponentContentJson] = useState('');
  const [contentDraft, setContentDraft] = useState(createDefaultKangurLessonDocument);
  const [treeMode, setTreeMode] = useState<LessonTreeMode>(() => readPersistedTreeMode());
  const [svgModalLesson, setSvgModalLesson] = useState<KangurLesson | null>(null);
  const [svgModalInitialMarkup, setSvgModalInitialMarkup] = useState('');
  const [orderedTreeSearchQuery, setOrderedTreeSearchQuery] = useState('');
  const [catalogTreeSearchQuery, setCatalogTreeSearchQuery] = useState('');
  const [authoringFilter, setAuthoringFilter] = useState<KangurLessonAuthoringFilter>('all');
  const [ageGroupFilter, setAgeGroupFilter] = useState<'all' | KangurLessonAgeGroup>('all');

  const isSaving = updateLessons.isPending || updateLessonDocuments.isPending || updateTemplates.isPending;

  return {
    contentLocale,
    setContentLocale,
    lessonsQuery,
    lessonDocumentsQuery,
    updateLessons,
    updateLessonDocuments,
    updateTemplates,
    templatesQuery,
    isLoading,
    lessonTemplateMap,
    contentLocaleOptions,
    contentLocaleLabel,
    isPrimaryContentLocale,
    lessons,
    lessonDocuments,
    lessonById,
    showModal,
    setShowModal,
    showContentModal,
    setShowContentModal,
    editingLesson,
    setEditingLesson,
    editingContentLesson,
    setEditingContentLesson,
    lessonToDelete,
    setLessonToDelete,
    formData,
    setFormData,
    componentContentJson,
    setComponentContentJson,
    contentDraft,
    setContentDraft,
    treeMode,
    setTreeMode,
    svgModalLesson,
    setSvgModalLesson,
    svgModalInitialMarkup,
    setSvgModalInitialMarkup,
    orderedTreeSearchQuery,
    setOrderedTreeSearchQuery,
    catalogTreeSearchQuery,
    setCatalogTreeSearchQuery,
    authoringFilter,
    setAuthoringFilter,
    ageGroupFilter,
    setAgeGroupFilter,
    isSaving,
  };
}
