'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';

import {
  useMasterFolderTreeShell,
} from '@/features/foldertree/public';
import { KANGUR_AGE_GROUPS } from '@/features/kangur/lessons/lesson-catalog-metadata';
import type {
  KangurLesson,
} from '@/features/kangur/shared/contracts/kangur';
import {
  ContextRegistryPageProvider,
  useRegisterContextRegistryPageSource,
} from '@/shared/lib/ai-context-registry/page-context';
import { AdminFavoriteBreadcrumbRow } from '@/shared/ui/admin-favorite-breadcrumb-row';
import { Badge, FormModal, SelectSimple, useToast } from '@/features/kangur/shared/ui';
import { ConfirmModal } from '@/features/kangur/shared/ui/templates/modals';
import { KangurButton } from '@/features/kangur/ui/design/primitives';
import {
  withKangurClientError,
  withKangurClientErrorSync,
} from '@/features/kangur/observability/client';

import {
  buildKangurLessonCatalogMasterNodes,
  buildKangurLessonMasterNodes,
} from './kangur-lessons-master-tree';
import { importLegacyKangurLessonDocument } from '../legacy-lesson-imports';
import {
  createDefaultKangurLessonDocument,
  createKangurLessonSvgBlock,
  createStarterKangurLessonDocument,
  removeKangurLessonDocument,
  resolveKangurLessonDocumentPages,
  updateKangurLessonDocumentPages,
  updateKangurLessonDocumentTimestamp,
} from '../lesson-documents';
import {
  appendMissingKangurLessonsByComponent,
  KANGUR_LESSON_SORT_ORDER_GAP,
  canonicalizeKangurLessons,
  createKangurLessonId,
} from '../settings';
import { KangurAdminContentShell } from './components/KangurAdminContentShell';
import { AdminKangurLessonsManagerTreePanel } from './components/AdminKangurLessonsManagerTreePanel';
import { AdminKangurLessonSectionsPanel } from './components/AdminKangurLessonSectionsPanel';
import { LessonContentEditorDialog } from './components/LessonContentEditorDialog';
import { LessonMetadataForm } from './components/LessonMetadataForm';
import { LessonSvgQuickAddModal } from './components/LessonSvgQuickAddModal';
import { TREE_MODE_STORAGE_KEY, CATALOG_TREE_INSTANCE, ORDERED_TREE_INSTANCE } from './constants';
import {
  getKangurLessonAuthoringFilterCounts,
  getKangurLessonAuthoringStatus,
  matchesKangurLessonAuthoringFilter,
  type KangurLessonAuthoringFilter,
} from './content-creator-insights';
import { LessonSvgQuickAddRuntimeProvider } from './context/LessonSvgQuickAddRuntimeContext';
import {
  buildKangurAdminLessonsManagerContextBundle,
  KANGUR_ADMIN_LESSONS_MANAGER_CONTEXT_ROOT_IDS,
} from './context-registry/lessons-manager';
import { clearLessonContentEditorDraft } from './lesson-content-editor-drafts';
import {
  countLessonsRequiringLegacyImport,
  createInitialLessonFormData,
  resolveLessonComponentContentJson,
  supportsLessonComponentContentAuthoring,
  toLocalizedLessonFormData,
  upsertLesson,
  sanitizeSvgMarkup,
} from './utils';

import {
  parseKangurLessonTemplateComponentContentJson,
} from '../lessons/lesson-template-component-content';
import type { KangurLessonTemplateComponentContent } from '@/shared/contracts/kangur-lesson-templates';
import type { LessonFormData, LessonTreeMode } from './types';
import { useAdminKangurLessonsManagerState } from './AdminKangurLessonsManagerPage.hooks';

function AdminKangurLessonsManagerRegistrySource({
  registrySource,
}: {
  registrySource:
    | {
        label: string;
        resolved: ReturnType<typeof buildKangurAdminLessonsManagerContextBundle>;
      }
    | null;
}): null {
  useRegisterContextRegistryPageSource('kangur-admin-lessons-manager-workspace', registrySource);
  return null;
}

export function AdminKangurLessonsManagerPage({
  standalone = true,
}: {
  standalone?: boolean;
} = {}): React.JSX.Element {
  const state: ReturnType<typeof useAdminKangurLessonsManagerState> = useAdminKangurLessonsManagerState();
  const { toast } = useToast();
  const {
    contentLocale,
    setContentLocale,
    updateLessons,
    updateLessonDocuments,
    updateTemplates,
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
    templatesQuery,
  } = state;

  const isCatalogMode = treeMode === 'catalog';
  const isSectionsMode = treeMode === 'sections';
  const showComponentContentEditor = supportsLessonComponentContentAuthoring(formData.componentId);
  const activeTreeInstance = isCatalogMode ? CATALOG_TREE_INSTANCE : ORDERED_TREE_INSTANCE;
  const treeSearchQuery = isCatalogMode ? catalogTreeSearchQuery : orderedTreeSearchQuery;

  const registrySource = useMemo(
    () => ({
      label: 'Kangur admin lessons manager workspace',
      resolved: buildKangurAdminLessonsManagerContextBundle({
        lessonCount: lessons.length,
        lesson: editingContentLesson,
        document: showContentModal ? contentDraft : null,
        isEditorOpen: showContentModal,
        isSaving,
      }),
    }),
    [contentDraft, editingContentLesson, isSaving, lessons.length, showContentModal]
  );

  const buildPersistedLessonRecord = useCallback(
    (
      lessonId: string,
      source: Pick<
        KangurLesson,
        | 'componentId'
        | 'contentMode'
        | 'subject'
        | 'ageGroup'
        | 'title'
        | 'description'
        | 'emoji'
        | 'color'
        | 'activeBg'
        | 'enabled'
      >,
      sortOrder: number,
    ): KangurLesson => {
      const existingLesson = lessonById.get(lessonId);
      const shouldPersistLocalizedFields = isPrimaryContentLocale || !existingLesson;

      return {
        id: lessonId,
        componentId: source.componentId,
        contentMode: source.contentMode,
        subject: source.subject,
        ageGroup: source.ageGroup,
        title: shouldPersistLocalizedFields ? source.title : existingLesson?.title ?? source.title,
        description: shouldPersistLocalizedFields
          ? source.description
          : existingLesson?.description ?? source.description,
        emoji: shouldPersistLocalizedFields ? source.emoji : existingLesson?.emoji ?? source.emoji,
        color: shouldPersistLocalizedFields ? source.color : existingLesson?.color ?? source.color,
        activeBg: shouldPersistLocalizedFields
          ? source.activeBg
          : existingLesson?.activeBg ?? source.activeBg,
        sortOrder,
        enabled: source.enabled,
        sectionId: existingLesson?.sectionId,
        subsectionId: existingLesson?.subsectionId,
      };
    },
    [isPrimaryContentLocale, lessonById]
  );

  const saveLocalizedLessonTemplate = useCallback(
    async (
      source: Pick<
        KangurLesson,
        | 'componentId'
        | 'subject'
        | 'ageGroup'
        | 'title'
        | 'description'
        | 'emoji'
        | 'color'
        | 'activeBg'
      >,
      componentContent?: KangurLessonTemplateComponentContent
    ): Promise<void> => {
      const existingTemplate = lessonTemplateMap.get(source.componentId);
      const nextTemplate = {
        componentId: source.componentId,
        subject: source.subject,
        ageGroup: source.ageGroup,
        label: existingTemplate?.label ?? source.title,
        title: source.title,
        description: source.description,
        emoji: source.emoji,
        color: source.color,
        activeBg: source.activeBg,
        sortOrder: existingTemplate?.sortOrder ?? 0,
        componentContent:
          componentContent === undefined
            ? existingTemplate?.componentContent
            : componentContent,
      };
      const nextTemplates = [...(templatesQuery.data ?? [])]
        .filter((template) => template.componentId !== source.componentId)
        .concat(nextTemplate)
        .sort((left, right) =>
          left.sortOrder === right.sortOrder
            ? left.componentId.localeCompare(right.componentId)
            : left.sortOrder - right.sortOrder
        );
      await updateTemplates.mutateAsync(nextTemplates);
    },
    [lessonTemplateMap, templatesQuery.data, updateTemplates]
  );

  const handleTreeSearchChange = useCallback(
    (nextQuery: string): void => {
      if (isCatalogMode) {
        setCatalogTreeSearchQuery(nextQuery);
        return;
      }
      setOrderedTreeSearchQuery(nextQuery);
    },
    [isCatalogMode, setCatalogTreeSearchQuery, setOrderedTreeSearchQuery]
  );

  useEffect(() => {
    if (typeof window === 'undefined') return;
    withKangurClientErrorSync(
      { source: 'kangur-admin', action: 'lessons-manager-init' },
      () => {
        const stored = window.localStorage.getItem(TREE_MODE_STORAGE_KEY);
        if (stored === 'catalog' || stored === 'ordered' || stored === 'sections') {
          setTreeMode(stored);
        }
      }
    );
  }, [setTreeMode]);

  const handleToggleTreeMode = useCallback((): void => {
    setTreeMode((prev) => {
      const next: LessonTreeMode = prev === 'sections' ? 'ordered' : prev === 'ordered' ? 'catalog' : 'sections';
      window.localStorage.setItem(TREE_MODE_STORAGE_KEY, next);
      return next;
    });
  }, [setTreeMode]);

  const handleCloseModal = (): void => {
    setShowModal(false);
    setEditingLesson(null);
    setFormData(createInitialLessonFormData());
    setComponentContentJson('');
  };

  const handleCreate = (): void => {
    setFormData(createInitialLessonFormData());
    setComponentContentJson('');
    setEditingLesson(null);
    setShowModal(true);
  };

  const handleEdit = (lesson: KangurLesson): void => {
    const template = lessonTemplateMap.get(lesson.componentId);
    setFormData(toLocalizedLessonFormData(lesson, template));
    setComponentContentJson(resolveLessonComponentContentJson(template));
    setEditingLesson(lesson);
    setShowModal(true);
  };

  const handleEditContent = (lesson: KangurLesson): void => {
    const document = lessonDocuments[lesson.id];
    setContentDraft(document ?? createStarterKangurLessonDocument(lesson));
    setEditingContentLesson(lesson);
    setShowContentModal(true);
  };

  const handleSave = async (): Promise<void> => {
    await withKangurClientError(
      { source: 'kangur-admin', action: 'lesson-save', context: { lessonId: editingLesson?.id, componentId: formData.componentId } },
      async () => {
        const lessonId = editingLesson?.id || createKangurLessonId(formData.componentId);
        const sortOrder = editingLesson?.sortOrder ?? (lessons.length > 0 ? Math.max(...lessons.map(l => l.sortOrder)) + KANGUR_LESSON_SORT_ORDER_GAP : 0);
        const nextLesson = buildPersistedLessonRecord(lessonId, formData, sortOrder);
        const nextLessons = upsertLesson(lessons, nextLesson);
        await updateLessons.mutateAsync(nextLessons);

        if (isPrimaryContentLocale) {
          const componentContent = showComponentContentEditor ? parseKangurLessonTemplateComponentContentJson(componentContentJson) : undefined;
          await saveLocalizedLessonTemplate(formData, componentContent);
        }

        toast('Lesson saved', { variant: 'success' });
        handleCloseModal();
      }
    );
  };

  const handleDelete = async (): Promise<void> => {
    if (!lessonToDelete) return;
    await withKangurClientError(
      { source: 'kangur-admin', action: 'lesson-delete', context: { lessonId: lessonToDelete.id } },
      async () => {
        const nextLessons = lessons.filter((l) => l.id !== lessonToDelete.id);
        await updateLessons.mutateAsync(nextLessons);
        // Clean up documents in current session
        const nextDocuments = removeKangurLessonDocument(lessonDocuments, lessonToDelete.id);
        await updateLessonDocuments.mutateAsync(nextDocuments);
        toast('Lesson deleted', { variant: 'success' });
        setLessonToDelete(null);
      }
    );
  };

  const handleSaveContent = async (): Promise<void> => {
    if (!editingContentLesson) return;
    await withKangurClientError(
      { source: 'kangur-admin', action: 'lesson-content-save', context: { lessonId: editingContentLesson.id } },
      async () => {
        const pages = resolveKangurLessonDocumentPages(contentDraft);
        const nextDocument = updateKangurLessonDocumentPages(contentDraft, pages);
        await updateLessonDocuments.mutateAsync({ [editingContentLesson.id]: nextDocument });
        clearLessonContentEditorDraft(editingContentLesson.id, contentLocale);
        toast('Content saved', { variant: 'success' });
        setShowContentModal(false);
        setEditingContentLesson(null);
      }
    );
  };

  const handleCanonicalize = async (): Promise<void> => {
    await withKangurClientError(
      { source: 'kangur-admin', action: 'lessons-canonicalize' },
      async () => {
        const nextLessons = canonicalizeKangurLessons(lessons);
        await updateLessons.mutateAsync(nextLessons);
        toast('Lessons canonicalized', { variant: 'success' });
      }
    );
  };

  const handleImportLegacy = async (lesson: KangurLesson): Promise<void> => {
    await withKangurClientError(
      { source: 'kangur-admin', action: 'lesson-legacy-import', context: { lessonId: lesson.id } },
      async () => {
        const result = importLegacyKangurLessonDocument(lesson.componentId);
        if (!result) {
          toast('Legacy importer not found', { variant: 'error' });
          return;
        }
        await updateLessonDocuments.mutateAsync({ [lesson.id]: result.document });
        toast('Legacy content imported', { variant: 'success' });
      }
    );
  };

  const handleQuickAddSvg = (lesson: KangurLesson, markup: string): void => {
    setSvgModalLesson(lesson);
    setSvgModalInitialMarkup(sanitizeSvgMarkup(markup));
  };

  const handleSaveQuickSvg = async (markup: string): Promise<void> => {
    if (!svgModalLesson) return;
    await withKangurClientError(
      { source: 'kangur-admin', action: 'lesson-quick-svg-save', context: { lessonId: svgModalLesson.id } },
      async () => {
        const block = createKangurLessonSvgBlock(markup);
        const document = lessonDocuments[svgModalLesson.id] ?? createDefaultKangurLessonDocument();
        const pages = resolveKangurLessonDocumentPages(document);
        const firstPage = pages[0] || { id: 'p1', blocks: [] };
        const nextPages = [
          { ...firstPage, blocks: [...firstPage.blocks, block] },
          ...pages.slice(1),
        ];
        const nextDocument = updateKangurLessonDocumentTimestamp(updateKangurLessonDocumentPages(document, nextPages));
        await updateLessonDocuments.mutateAsync({ [svgModalLesson.id]: nextDocument });
        toast('SVG added to lesson', { variant: 'success' });
        setSvgModalLesson(null);
      }
    );
  };

  const handleAppendMissing = async (): Promise<void> => {
    await withKangurClientError(
      { source: 'kangur-admin', action: 'lessons-append-missing' },
      async () => {
        const nextLessons = appendMissingKangurLessonsByComponent(lessons);
        await updateLessons.mutateAsync(nextLessons);
        toast('Missing lessons added', { variant: 'success' });
      }
    );
  };

  const masterNodes = useMemo(
    () => (isCatalogMode ? buildKangurLessonCatalogMasterNodes(lessons) : buildKangurLessonMasterNodes(lessons)),
    [isCatalogMode, lessons]
  );

  const filteredLessons = useMemo(
    () =>
      lessons.filter((lesson) => {
        const doc = lessonDocuments[lesson.id];
        const status = getKangurLessonAuthoringStatus(lesson, doc);
        if (!matchesKangurLessonAuthoringFilter(status, authoringFilter)) return false;
        if (ageGroupFilter !== 'all' && lesson.ageGroup !== ageGroupFilter) return false;
        return true;
      }),
    [ageGroupFilter, authoringFilter, lessonDocuments, lessons]
  );

  const authoringFilterCounts = useMemo(
    () => getKangurLessonAuthoringFilterCounts(lessons, lessonDocuments),
    [lessonDocuments, lessons]
  );

  const legacyImportCount = useMemo(
    () => countLessonsRequiringLegacyImport(lessons, lessonDocuments),
    [lessonDocuments, lessons]
  );

  return (
    <ContextRegistryPageProvider rootIds={KANGUR_ADMIN_LESSONS_MANAGER_ROOT_IDS}>
      <AdminKangurLessonsManagerRegistrySource registrySource={registrySource} />
      <LessonSvgQuickAddRuntimeProvider
        lesson={svgModalLesson}
        initialMarkup={svgModalInitialMarkup}
        isOpen={!!svgModalLesson}
        isSaving={isSaving}
        onClose={() => setSvgModalLesson(null)}
        onSave={(markup, _viewBox) => { void handleSaveQuickSvg(markup); }}
      >
        <KangurAdminContentShell
          title='Lessons Manager'
          headerActions={
            <div className='flex items-center gap-3'>
              <SelectSimple
                value={contentLocale}
                onChange={(val) => setContentLocale(val as 'en' | 'pl' | 'uk')}
                options={contentLocaleOptions}
                className='w-40'
              />
              <Badge variant='outline'>{contentLocaleLabel}</Badge>
              <SelectSimple
                value={ageGroupFilter}
                onChange={(val) => setAgeGroupFilter(val as 'six_year_old' | 'ten_year_old' | 'grown_ups' | 'all')}
                options={[{ value: 'all', label: 'All Ages' }, ...KANGUR_AGE_GROUPS.map(g => ({ value: g.id, label: g.id }))]}
                className='w-40'
              />
              <SelectSimple
                value={authoringFilter}
                onChange={(val) => setAuthoringFilter(val as KangurLessonAuthoringFilter)}
                options={[
                  { value: 'all', label: `All (${authoringFilterCounts.all})` },
                  { value: 'draft', label: `Draft (${authoringFilterCounts.draft})` },
                  { value: 'ready', label: `Ready (${authoringFilterCounts.ready})` },
                  { value: 'live', label: `Live (${authoringFilterCounts.live})` },
                ]}
                className='w-40'
              />
              <KangurButton variant='primary' onClick={handleCreate}>Create Lesson</KangurButton>
            </div>
          }
        >
          <AdminFavoriteBreadcrumbRow docId='kangur_lessons_manager' />
          <div className='mt-4 flex flex-col kangur-panel-gap'>
            <div className='flex items-center justify-between'>
              <div className='flex items-center gap-2'>
                <KangurButton variant='surface' size='sm' onClick={handleToggleTreeMode}>
                  Mode: {treeMode.toUpperCase()}
                </KangurButton>
                {legacyImportCount > 0 && (
                  <Badge variant='warning'>{legacyImportCount} Legacy</Badge>
                )}
              </div>
              <div className='flex items-center gap-2'>
                <KangurButton variant='ghost' size='sm' onClick={() => { void handleCanonicalize(); }}>Canonicalize</KangurButton>
                <KangurButton variant='ghost' size='sm' onClick={() => { void handleAppendMissing(); }}>Add Missing</KangurButton>
              </div>            </div>

            {isSectionsMode ? (
              <AdminKangurLessonSectionsPanel
                lessons={filteredLessons}
                onEdit={handleEdit}
                onEditContent={handleEditContent}
                onDelete={setLessonToDelete}
                onImportLegacy={handleImportLegacy}
              />
            ) : (
              <AdminKangurLessonsManagerTreePanel
                instanceId={activeTreeInstance}
                nodes={masterNodes}
                onSearchChange={handleTreeSearchChange}
                searchQuery={treeSearchQuery}
                onEdit={handleEdit}
                onEditContent={handleEditContent}
                onDelete={setLessonToDelete}
                onImportLegacy={handleImportLegacy}
              />
            )}
          </div>

          <FormModal
            title={editingLesson ? 'Edit Lesson' : 'Create Lesson'}
            isOpen={showModal}
            onClose={handleCloseModal}
            onSave={() => { void handleSave(); }}
            isSaving={isSaving}
          >
            <LessonMetadataForm
              data={formData}
              onChange={setFormData}
              componentContentJson={componentContentJson}
              onComponentContentJsonChange={setComponentContentJson}
              showComponentContentEditor={showComponentContentEditor}
              isPrimaryLocale={isPrimaryContentLocale}
            />
          </FormModal>

          <ConfirmModal
            isOpen={!!lessonToDelete}
            onClose={() => setLessonToDelete(null)}
            onConfirm={() => { void handleDelete(); }}
            title='Delete Lesson'
            message={`Are you sure you want to delete "${lessonToDelete?.title}"? This will also remove its content document.`}
            confirmLabel='Delete'
            variant='danger'
          />

          {editingContentLesson && (
            <LessonContentEditorDialog
              isOpen={showContentModal}
              onClose={() => {
                setShowContentModal(false);
                setEditingContentLesson(null);
              }}
              lesson={editingContentLesson}
              document={contentDraft}
              onSave={() => { void handleSaveContent(); }}
              isSaving={isSaving}
              locale={contentLocale}
            />
          )}

          <LessonSvgQuickAddModal />
        </KangurAdminContentShell>
      </LessonSvgQuickAddRuntimeProvider>
    </ContextRegistryPageProvider>
  );
}

const KANGUR_ADMIN_LESSONS_MANAGER_ROOT_IDS = [
  ...KANGUR_ADMIN_LESSONS_MANAGER_CONTEXT_ROOT_IDS,
];

export default AdminKangurLessonsManagerPage;
AdminKangurLessonsManagerPage;
