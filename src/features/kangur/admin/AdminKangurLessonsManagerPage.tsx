'use client';

import React, { useCallback, useEffect, useMemo } from 'react';

import {
  useMasterFolderTreeSearch,
  useMasterFolderTreeShell,
  type FolderTreeViewportRenderNodeInput,
} from '@/features/foldertree/public';
import { KANGUR_AGE_GROUPS } from '@/features/kangur/lessons/lesson-catalog-metadata';
import type { KangurLesson } from '@/features/kangur/shared/contracts/kangur';
import {
  ContextRegistryPageProvider,
  useRegisterContextRegistryPageSource,
} from '@/shared/lib/ai-context-registry/page-context';
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
  KANGUR_LESSON_COMPONENT_OPTIONS,
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
import { LessonTreeRow } from './components/LessonTreeRow';
import { CATALOG_TREE_INSTANCE, ORDERED_TREE_INSTANCE, TREE_MODE_STORAGE_KEY } from './constants';
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
  sanitizeSvgMarkup,
  supportsLessonComponentContentAuthoring,
  toLocalizedLessonFormData,
  upsertLesson,
} from './utils';

import { parseKangurLessonTemplateComponentContentJson } from '../lessons/lesson-template-component-content';
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

const buildLessonsManagerErrorReport = (
  action: string,
  description: string,
  context?: Record<string, unknown>,
) => ({
  source: 'kangur-admin',
  action,
  description,
  ...(context ? { context } : {}),
});

const KANGUR_ADMIN_LESSONS_MANAGER_ROOT_IDS = [
  ...KANGUR_ADMIN_LESSONS_MANAGER_CONTEXT_ROOT_IDS,
];

export function AdminKangurLessonsManagerPage({
  standalone = true,
}: {
  standalone?: boolean;
} = {}): React.JSX.Element {
  const state = useAdminKangurLessonsManagerState();
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

  const setTreeModeAndPersist = useCallback(
    (nextMode: LessonTreeMode): void => {
      setTreeMode(nextMode);
      if (typeof window !== 'undefined') {
        window.localStorage.setItem(TREE_MODE_STORAGE_KEY, nextMode);
      }
    },
    [setTreeMode]
  );

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
      componentContent?: KangurLessonTemplateComponentContent,
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
      buildLessonsManagerErrorReport(
        'lessons-manager-init',
        'Loads persisted lessons manager tree mode.',
      ),
      () => {
        const stored = window.localStorage.getItem(TREE_MODE_STORAGE_KEY);
        if (stored === 'catalog' || stored === 'ordered' || stored === 'sections') {
          setTreeMode(stored);
        }
      }
    );
  }, [setTreeMode]);

  const handleToggleTreeMode = useCallback((): void => {
    const nextMode: LessonTreeMode =
      treeMode === 'sections'
        ? 'ordered'
        : treeMode === 'ordered'
          ? 'catalog'
          : 'sections';
    setTreeModeAndPersist(nextMode);
  }, [setTreeModeAndPersist, treeMode]);

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

  const handleEdit = useCallback(
    (lesson: KangurLesson): void => {
      const template = lessonTemplateMap.get(lesson.componentId);
      setFormData(toLocalizedLessonFormData(lesson, template));
      setComponentContentJson(resolveLessonComponentContentJson(lesson.componentId, template));
      setEditingLesson(lesson);
      setShowModal(true);
    },
    [lessonTemplateMap, setComponentContentJson, setEditingLesson, setFormData, setShowModal]
  );

  const handleEditContent = useCallback(
    (lesson: KangurLesson): void => {
      const document = lessonDocuments[lesson.id];
      setContentDraft(document ?? createStarterKangurLessonDocument(lesson.componentId));
      setEditingContentLesson(lesson);
      setShowContentModal(true);
    },
    [lessonDocuments, setContentDraft, setEditingContentLesson, setShowContentModal]
  );

  const handleComponentChange = useCallback(
    (componentId: string): void => {
      const nextComponentId = componentId as LessonFormData['componentId'];
      setFormData((current) => ({ ...current, componentId: nextComponentId }));
      setComponentContentJson(
        resolveLessonComponentContentJson(
          nextComponentId,
          lessonTemplateMap.get(nextComponentId)
        )
      );
    },
    [lessonTemplateMap, setComponentContentJson, setFormData]
  );

  const handleSave = async (): Promise<void> => {
    await withKangurClientError(
      buildLessonsManagerErrorReport('lesson-save', 'Saves lesson metadata.', {
        lessonId: editingLesson?.id,
        componentId: formData.componentId,
      }),
      async () => {
        const lessonId = editingLesson?.id ?? createKangurLessonId(formData.componentId);
        const sortOrder =
          editingLesson?.sortOrder ??
          (lessons.length > 0
            ? Math.max(...lessons.map((lesson) => lesson.sortOrder)) +
              KANGUR_LESSON_SORT_ORDER_GAP
            : 0);
        const nextLesson = buildPersistedLessonRecord(lessonId, formData, sortOrder);
        const nextLessons = upsertLesson(lessons, nextLesson);
        await updateLessons.mutateAsync(nextLessons);

        if (isPrimaryContentLocale) {
          const componentContent = showComponentContentEditor
            ? parseKangurLessonTemplateComponentContentJson(
                formData.componentId,
                componentContentJson,
              )
            : undefined;
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
      buildLessonsManagerErrorReport(
        'lesson-delete',
        'Deletes a lesson and its content document.',
        { lessonId: lessonToDelete.id },
      ),
      async () => {
        const nextLessons = lessons.filter((lesson) => lesson.id !== lessonToDelete.id);
        await updateLessons.mutateAsync(nextLessons);
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
      buildLessonsManagerErrorReport(
        'lesson-content-save',
        'Saves the lesson document editor content.',
        { lessonId: editingContentLesson.id },
      ),
      async () => {
        const pages = resolveKangurLessonDocumentPages(contentDraft);
        const nextDocument = updateKangurLessonDocumentPages(contentDraft, pages);
        await updateLessonDocuments.mutateAsync({
          ...lessonDocuments,
          [editingContentLesson.id]: nextDocument,
        });
        clearLessonContentEditorDraft(editingContentLesson.id);
        toast('Content saved', { variant: 'success' });
        setShowContentModal(false);
        setEditingContentLesson(null);
      }
    );
  };

  const handleCanonicalize = async (): Promise<void> => {
    await withKangurClientError(
      buildLessonsManagerErrorReport(
        'lessons-canonicalize',
        'Canonicalizes lesson ordering and identifiers.',
      ),
      async () => {
        const nextLessons = canonicalizeKangurLessons(lessons);
        await updateLessons.mutateAsync(nextLessons);
        toast('Lessons canonicalized', { variant: 'success' });
      }
    );
  };

  const handleImportLegacy = useCallback(
    async (lesson: KangurLesson): Promise<void> => {
      await withKangurClientError(
        buildLessonsManagerErrorReport(
          'lesson-legacy-import',
          'Imports legacy lesson content into the editor.',
          { lessonId: lesson.id, componentId: lesson.componentId },
        ),
        async () => {
          const result = importLegacyKangurLessonDocument(lesson.componentId);
          if (!result) {
            toast('Legacy importer not found', { variant: 'error' });
            return;
          }
          await updateLessonDocuments.mutateAsync({
            ...lessonDocuments,
            [lesson.id]: result.document,
          });
          if (editingContentLesson?.id === lesson.id) {
            setContentDraft(result.document);
          }
          toast('Legacy content imported', { variant: 'success' });
        }
      );
    },
    [
      editingContentLesson?.id,
      lessonDocuments,
      setContentDraft,
      toast,
      updateLessonDocuments,
    ]
  );

  const handleQuickAddSvg = useCallback(
    (lesson: KangurLesson): void => {
      setSvgModalLesson(lesson);
      setSvgModalInitialMarkup('');
    },
    [setSvgModalInitialMarkup, setSvgModalLesson]
  );

  const handleSaveQuickSvg = async (markup: string): Promise<void> => {
    if (!svgModalLesson) return;
    await withKangurClientError(
      buildLessonsManagerErrorReport(
        'lesson-quick-svg-save',
        'Adds a quick SVG block to the lesson document.',
        { lessonId: svgModalLesson.id },
      ),
      async () => {
        const block = {
          ...createKangurLessonSvgBlock(),
          markup: sanitizeSvgMarkup(markup),
        };
        const document =
          lessonDocuments[svgModalLesson.id] ?? createDefaultKangurLessonDocument();
        const pages = resolveKangurLessonDocumentPages(document);
        const firstPage = pages[0] ?? { id: 'p1', sectionKey: '', title: '', description: '', blocks: [] };
        const nextPages = [
          { ...firstPage, blocks: [...firstPage.blocks, block] },
          ...pages.slice(1),
        ];
        const nextDocument = updateKangurLessonDocumentTimestamp(
          updateKangurLessonDocumentPages(document, nextPages)
        );
        await updateLessonDocuments.mutateAsync({
          ...lessonDocuments,
          [svgModalLesson.id]: nextDocument,
        });
        toast('SVG added to lesson', { variant: 'success' });
        setSvgModalLesson(null);
        setSvgModalInitialMarkup('');
      }
    );
  };

  const handleAppendMissing = async (): Promise<void> => {
    await withKangurClientError(
      buildLessonsManagerErrorReport(
        'lessons-append-missing',
        'Adds missing lessons for the known component catalog.',
      ),
      async () => {
        const result = appendMissingKangurLessonsByComponent(
          lessons,
          KANGUR_LESSON_COMPONENT_OPTIONS.map((option) => option.value),
        );
        await updateLessons.mutateAsync(result.lessons);
        toast(`Added ${result.addedCount} missing lessons`, { variant: 'success' });
      }
    );
  };

  const authoringFilteredLessons = useMemo(
    () =>
      lessons.filter((lesson) =>
        matchesKangurLessonAuthoringFilter(authoringFilter, lesson, lessonDocuments)
      ),
    [authoringFilter, lessonDocuments, lessons]
  );

  const filteredLessons = useMemo(
    () =>
      authoringFilteredLessons.filter((lesson) =>
        ageGroupFilter === 'all' ? true : lesson.ageGroup === ageGroupFilter
      ),
    [ageGroupFilter, authoringFilteredLessons]
  );

  const masterNodes = useMemo(
    () =>
      isCatalogMode
        ? buildKangurLessonCatalogMasterNodes(filteredLessons)
        : buildKangurLessonMasterNodes(filteredLessons),
    [filteredLessons, isCatalogMode]
  );

  const {
    controller,
    capabilities,
    appearance: { rootDropUi },
    viewport: { scrollToNodeRef },
  } = useMasterFolderTreeShell({
    instance: activeTreeInstance,
    nodes: masterNodes,
  });

  const searchState = useMasterFolderTreeSearch(masterNodes, treeSearchQuery, {
    config: capabilities.search,
  });

  const getLessonAuthoringStatus = useCallback(
    (lesson: KangurLesson) => getKangurLessonAuthoringStatus(lesson, lessonDocuments),
    [lessonDocuments]
  );

  const authoringFilterCounts = useMemo(
    () => getKangurLessonAuthoringFilterCounts(lessons, lessonDocuments),
    [lessonDocuments, lessons]
  );

  const ageGroupCounts = useMemo(
    () =>
      new Map(
        KANGUR_AGE_GROUPS.map((group) => [
          group.id,
          authoringFilteredLessons.filter((lesson) => lesson.ageGroup === group.id).length,
        ])
      ),
    [authoringFilteredLessons]
  );

  const activeAgeGroupLabel =
    ageGroupFilter === 'all'
      ? 'All ages'
      : KANGUR_AGE_GROUPS.find((group) => group.id === ageGroupFilter)?.label ?? ageGroupFilter;

  const legacyImportCount = useMemo(
    () => countLessonsRequiringLegacyImport(lessons, lessonDocuments),
    [lessonDocuments, lessons]
  );

  const breadcrumbs = useMemo(
    () => [
      { label: 'Admin', href: '/admin' },
      { label: 'Kangur', href: '/admin/kangur' },
      { label: 'Lessons Manager' },
    ],
    []
  );

  const renderTreeNode = useCallback(
    (input: FolderTreeViewportRenderNodeInput): React.ReactNode => (
      <LessonTreeRow
        input={input}
        lessonById={lessonById}
        authoringStatus={getLessonAuthoringStatus}
        onEdit={handleEdit}
        onEditContent={handleEditContent}
        onQuickSvg={handleQuickAddSvg}
        onDelete={setLessonToDelete}
        isUpdating={isSaving}
      />
    ),
    [
      getLessonAuthoringStatus,
      handleEdit,
      handleEditContent,
      handleQuickAddSvg,
      isSaving,
      lessonById,
      setLessonToDelete,
    ]
  );

  return (
    <ContextRegistryPageProvider
      pageId='page:kangur-admin-lessons-manager'
      title='Kangur Lessons Manager'
      rootNodeIds={KANGUR_ADMIN_LESSONS_MANAGER_ROOT_IDS}
    >
      <AdminKangurLessonsManagerRegistrySource registrySource={registrySource} />
      <LessonSvgQuickAddRuntimeProvider
        lesson={svgModalLesson}
        initialMarkup={svgModalInitialMarkup}
        isOpen={Boolean(svgModalLesson)}
        isSaving={isSaving}
        onClose={() => setSvgModalLesson(null)}
        onSave={(markup, _viewBox) => {
          void handleSaveQuickSvg(markup);
        }}
      >
        <KangurAdminContentShell
          title='Lessons Manager'
          description='Manage lesson metadata, localized content, section structure, and legacy imports.'
          breadcrumbs={breadcrumbs}
          headerActions={
            <div className='flex items-center gap-3'>
              <SelectSimple
                value={contentLocale}
                onChange={(value) => setContentLocale(value as 'en' | 'pl' | 'uk')}
                options={contentLocaleOptions}
                className='w-40'
              />
              <Badge variant='outline'>{contentLocaleLabel}</Badge>
              <SelectSimple
                value={ageGroupFilter}
                onChange={(value) =>
                  setAgeGroupFilter(
                    value as 'all' | 'six_year_old' | 'ten_year_old' | 'grown_ups'
                  )
                }
                options={[
                  { value: 'all', label: 'All Ages' },
                  ...KANGUR_AGE_GROUPS.map((group) => ({
                    value: group.id,
                    label: group.label,
                  })),
                ]}
                className='w-40'
              />
              <SelectSimple
                value={authoringFilter}
                onChange={(value) => setAuthoringFilter(value as KangurLessonAuthoringFilter)}
                options={authoringFilterCounts.map(({ id, label, count }) => ({
                  value: id,
                  label: `${label} (${count})`,
                }))}
                className='w-52'
              />
              <KangurButton variant='primary' onClick={handleCreate}>
                Create Lesson
              </KangurButton>
            </div>
          }
        >
          <div className='mt-4 flex flex-col kangur-panel-gap'>
            <div className='flex items-center justify-between'>
              <div className='flex items-center gap-2'>
                <KangurButton variant='surface' size='sm' onClick={handleToggleTreeMode}>
                  Mode: {treeMode.toUpperCase()}
                </KangurButton>
                {legacyImportCount > 0 ? (
                  <Badge variant='warning'>{legacyImportCount} Legacy</Badge>
                ) : null}
              </div>
              <div className='flex items-center gap-2'>
                <KangurButton
                  variant='ghost'
                  size='sm'
                  onClick={() => {
                    void handleCanonicalize();
                  }}
                >
                  Canonicalize
                </KangurButton>
                <KangurButton
                  variant='ghost'
                  size='sm'
                  onClick={() => {
                    void handleAppendMissing();
                  }}
                >
                  Add Missing
                </KangurButton>
              </div>
            </div>

            {isSectionsMode ? (
              <AdminKangurLessonSectionsPanel standalone={standalone} />
            ) : (
              <AdminKangurLessonsManagerTreePanel
                standalone={standalone}
                isCatalogMode={isCatalogMode}
                isSaving={isSaving}
                isLoading={isLoading}
                lessonsCount={lessons.length}
                lessonsNeedingLegacyImport={legacyImportCount}
                geometryPackAddedCount={0}
                logicPackAddedCount={0}
                filterCounts={authoringFilterCounts}
                authoringFilter={authoringFilter}
                onAuthoringFilterChange={setAuthoringFilter}
                authoringFilteredLessonCount={authoringFilteredLessons.length}
                ageGroupFilter={ageGroupFilter}
                onAgeGroupFilterChange={setAgeGroupFilter}
                ageGroupCounts={ageGroupCounts}
                filteredLessonCount={filteredLessons.length}
                activeAgeGroupLabel={activeAgeGroupLabel}
                treeSearchQuery={treeSearchQuery}
                onTreeSearchChange={handleTreeSearchChange}
                searchEnabled={capabilities.search.enabled}
                searchState={searchState}
                controller={controller}
                scrollToNodeRef={scrollToNodeRef}
                rootDropUi={rootDropUi}
                renderNode={renderTreeNode}
                onAddGeometryPack={() => {
                  toast('Geometry pack shortcuts are unavailable in this workspace.', {
                    variant: 'warning',
                  });
                }}
                onAddLogicalThinkingPack={() => {
                  toast('Logical thinking pack shortcuts are unavailable in this workspace.', {
                    variant: 'warning',
                  });
                }}
                onImportAllLessonsToEditor={() => {
                  toast('Bulk lesson import is unavailable in this workspace.', {
                    variant: 'warning',
                  });
                }}
                onAddLesson={handleCreate}
                onSelectOrderedView={() => setTreeModeAndPersist('ordered')}
                onSelectCatalogView={() => setTreeModeAndPersist('catalog')}
                onSelectSectionsView={() => setTreeModeAndPersist('sections')}
              />
            )}
          </div>

          <FormModal
            title={editingLesson ? 'Edit Lesson' : 'Create Lesson'}
            isOpen={showModal}
            onClose={handleCloseModal}
            onSave={() => {
              void handleSave();
            }}
            isSaving={isSaving}
          >
            <LessonMetadataForm
              formData={formData}
              setFormData={setFormData}
              componentContentJson={componentContentJson}
              setComponentContentJson={setComponentContentJson}
              showComponentContentEditor={showComponentContentEditor}
              onComponentChange={handleComponentChange}
            />
          </FormModal>

          <ConfirmModal
            isOpen={Boolean(lessonToDelete)}
            onClose={() => setLessonToDelete(null)}
            onConfirm={() => {
              void handleDelete();
            }}
            title='Delete Lesson'
            message={`Are you sure you want to delete "${lessonToDelete?.title}"? This will also remove its content document.`}
            confirmLabel='Delete'
            variant='danger'
          />

          {editingContentLesson ? (
            <LessonContentEditorDialog
              isOpen={showContentModal}
              onClose={() => {
                setShowContentModal(false);
                setEditingContentLesson(null);
              }}
              lesson={editingContentLesson}
              document={contentDraft}
              onLessonChange={setEditingContentLesson}
              onChange={setContentDraft}
              onSave={() => {
                void handleSaveContent();
              }}
              isSaving={isSaving}
              onImportLegacy={() => {
                void handleImportLegacy(editingContentLesson);
              }}
              onClearContent={() => {
                setContentDraft(createDefaultKangurLessonDocument());
              }}
            />
          ) : null}

          <LessonSvgQuickAddModal />
        </KangurAdminContentShell>
      </LessonSvgQuickAddRuntimeProvider>
    </ContextRegistryPageProvider>
  );
}

export default AdminKangurLessonsManagerPage;
