import React, { useCallback, useEffect, useMemo } from 'react';
import { useLocale } from '@/shared/lib/i18n';
import { useLessonsState } from './useLessonsState';
import { useLessonsUiState } from './useLessonsUiState';
import { resolveKangurAdminLocale } from '../../kangur-admin-locale';
import type { KangurLesson, KangurLessonComponentId } from '@/features/kangur/shared/contracts/kangur';
import { TREE_MODE_STORAGE_KEY } from '../../constants';
import { 
  countLessonsRequiringLegacyImport,
  supportsLessonComponentContentAuthoring,
} from '../../utils';
import { getKangurLessonAuthoringStatus } from '../../content-creator-insights';
import type { FolderTreeViewportRenderNodeInput } from '@/shared/lib/foldertree/public';
import type { LessonTreeMode } from '../../types';
import { LessonTreeRow } from '../../components/LessonTreeRow';
import { useLessonsManagerFiltering } from './useLessonsManagerFiltering';
import { useLessonsManagerTree } from './useLessonsManagerTree';
import { useLessonsManagerHandlers } from './useLessonsManagerHandlers';
import type { KangurAdminLocale } from '../../kangur-admin-locale';
import {
  KANGUR_GEOMETRY_LESSON_COMPONENT_IDS,
  KANGUR_LOGICAL_THINKING_LESSON_COMPONENT_IDS,
} from '../../../settings';

const formatLocaleLabel = (l: string): string => {
  if (l === 'pl') {
    return 'Polish';
  }

  if (l === 'uk') {
    return 'Ukrainian';
  }

  return 'English';
};

const countMissingLessonComponents = (
  lessons: readonly KangurLesson[],
  componentIds: readonly KangurLessonComponentId[]
): number => {
  const existingComponentIds = new Set(lessons.map((lesson) => lesson.componentId));
  return componentIds.filter((componentId) => !existingComponentIds.has(componentId)).length;
};

export type UseAdminKangurLessonsManagerLogicReturn = ReturnType<typeof useAdminKangurLessonsManagerLogic>;

export function useAdminKangurLessonsManagerLogic() {
  const routeLocale = useLocale();
  const structuralContentLocale = useMemo(() => resolveKangurAdminLocale(routeLocale), [routeLocale]);
  const [contentLocale, setContentLocale] = React.useState<KangurAdminLocale>(() => resolveKangurAdminLocale(routeLocale));
  
  const state = useLessonsState(contentLocale);
  const ui = useLessonsUiState();
  
  const contentLocaleOptions = useMemo(() => ['en', 'pl', 'uk'].map((l) => ({ value: l, label: formatLocaleLabel(l) })), []);
  const contentLocaleLabel = useMemo(() => formatLocaleLabel(contentLocale), [contentLocale]);
  const isPrimaryContentLocale = contentLocale === structuralContentLocale;
  const isSaving = state.lessonsQuery.isPending || state.lessonDocumentsQuery.isPending || state.templatesQuery.isPending;
  const legacyImportCount = useMemo(
    () => countLessonsRequiringLegacyImport(state.lessons, state.lessonDocuments),
    [state.lessonDocuments, state.lessons]
  );
  const geometryPackAddedCount = useMemo(
    () => countMissingLessonComponents(state.lessons, KANGUR_GEOMETRY_LESSON_COMPONENT_IDS),
    [state.lessons]
  );
  const logicPackAddedCount = useMemo(
    () => countMissingLessonComponents(state.lessons, KANGUR_LOGICAL_THINKING_LESSON_COMPONENT_IDS),
    [state.lessons]
  );

  const filtering = useLessonsManagerFiltering(state.lessons, state.lessonDocuments);
  const tree = useLessonsManagerTree({
    filteredLessons: filtering.filteredLessons,
    lessons: state.lessons,
    lessonById: state.lessonById,
    treeMode: ui.treeMode,
    onPersistLessons: state.updateLessons.mutateAsync,
  });
  
  const showComponentContentEditor = supportsLessonComponentContentAuthoring(ui.formData.componentId);

  const handlers = useLessonsManagerHandlers({
    ...state,
    templatesQueryData: state.templatesQuery.data,
    ui,
    isPrimaryContentLocale,
    showComponentContentEditor
  });

  const setTreeModeAndPersist = useCallback(
    (nextMode: LessonTreeMode): void => {
      ui.setTreeMode(nextMode);
      if (typeof window !== 'undefined') {
        window.localStorage.setItem(TREE_MODE_STORAGE_KEY, nextMode);
      }
    },
    [ui]
  );

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const stored = window.localStorage.getItem(TREE_MODE_STORAGE_KEY);
    if (stored === 'catalog' || stored === 'ordered' || stored === 'sections') {
      ui.setTreeMode(stored as LessonTreeMode);
    }
  }, [ui]);

  const handleToggleTreeMode = useCallback((): void => {
    let nextMode: LessonTreeMode = 'ordered';
    if (ui.treeMode === 'sections') nextMode = 'ordered';
    else if (ui.treeMode === 'ordered') nextMode = 'catalog';
    else nextMode = 'sections';
    setTreeModeAndPersist(nextMode);
  }, [setTreeModeAndPersist, ui.treeMode]);

  const getAuthoringStatus = useCallback((lesson: KangurLesson) => getKangurLessonAuthoringStatus(lesson, state.lessonDocuments), [state.lessonDocuments]);

  const renderTreeNode = useCallback(
    (input: FolderTreeViewportRenderNodeInput): React.ReactNode => (
      <LessonTreeRow
        input={input} lessonById={state.lessonById} authoringStatus={getAuthoringStatus}
        onEdit={handlers.handleEdit} onEditContent={handlers.handleEditContent}
        onQuickSvg={handlers.handleQuickAddSvg ?? (() => undefined)} onDelete={ui.setLessonToDelete} isUpdating={isSaving}
      />
    ),
    [getAuthoringStatus, handlers, isSaving, state.lessonById, ui.setLessonToDelete]
  );

  return {
    ...state, ...ui, ...filtering, ...tree, ...handlers,
    contentLocale, setContentLocale, contentLocaleOptions, contentLocaleLabel, isSaving,
    legacyImportCount, geometryPackAddedCount, logicPackAddedCount,
    showComponentContentEditor, setTreeModeAndPersist, handleToggleTreeMode, renderTreeNode,
    isCatalogMode: ui.treeMode === 'catalog',
    isSectionsMode: ui.treeMode === 'sections'
  };
}
