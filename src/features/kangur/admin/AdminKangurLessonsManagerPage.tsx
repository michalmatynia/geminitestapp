'use client';

import { Folders, ListOrdered, Plus, Sparkles } from 'lucide-react';
import React, { useCallback, useEffect, useMemo, useState } from 'react';

import {
  ContextRegistryPageProvider,
  useRegisterContextRegistryPageSource,
} from '@/features/ai/ai-context-registry/context/page-context';
import {
  createMasterFolderTreeTransactionAdapter,
  FolderTreeViewportV2,
  useMasterFolderTreeShell,
  type FolderTreeViewportRenderNodeInput,
} from '@/features/foldertree';
import { FolderTreeSearchBar, useMasterFolderTreeSearch } from '@/features/foldertree';
import type { KangurLesson, KangurLessonComponentId } from '@/shared/contracts/kangur';
import { useUpdateSetting } from '@/shared/hooks/use-settings';
import { useSettingsStore } from '@/shared/providers/SettingsStoreProvider';
import {
  Button,
  FolderTreePanel,
  FormModal,
  Skeleton,
  useToast,
} from '@/shared/ui';
import { ConfirmModal } from '@/shared/ui/templates/modals';
import { cn } from '@/shared/utils';
import { logClientError } from '@/shared/utils/observability/client-error-logger';
import { serializeSetting } from '@/shared/utils/settings-json';

import {
  buildKangurLessonCatalogMasterNodes,
  buildKangurLessonMasterNodes,
  resolveKangurLessonOrderFromNodes,
} from './kangur-lessons-master-tree';
import { importLegacyKangurLessonDocument } from '../legacy-lesson-imports';
import {
  createDefaultKangurLessonDocument,
  createKangurLessonSvgBlock,
  createStarterKangurLessonDocument,
  hasKangurLessonDocumentContent,
  parseKangurLessonDocumentStore,
  removeKangurLessonDocument,
  resolveKangurLessonDocumentPages,
  updateKangurLessonDocumentPages,
  updateKangurLessonDocumentTimestamp,
} from '../lesson-documents';
import {
  KANGUR_LESSON_DOCUMENTS_SETTING_KEY,
  appendMissingGeometryKangurLessons,
  appendMissingLogicalThinkingKangurLessons,
  KANGUR_LESSONS_SETTING_KEY,
  KANGUR_LESSON_LIBRARY,
  KANGUR_LESSON_SORT_ORDER_GAP,
  canonicalizeKangurLessons,
  createKangurLessonId,
  parseKangurLessons,
} from '../settings';
import { KangurAdminContentShell } from './components/KangurAdminContentShell';
import { KangurAdminWorkspaceIntroCard } from './components/KangurAdminWorkspaceIntroCard';
import { LessonContentEditorDialog } from './components/LessonContentEditorDialog';
import { LessonMetadataForm } from './components/LessonMetadataForm';
import { LessonSvgQuickAddModal } from './components/LessonSvgQuickAddModal';
import { LessonTreeRow } from './components/LessonTreeRow';
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
  readPersistedTreeMode,
  sanitizeSvgMarkup,
  toLessonFormData,
  upsertLesson,
} from './utils';

import type { LessonFormData, LessonTreeMode } from './types';

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
  const settingsStore = useSettingsStore();
  const updateSetting = useUpdateSetting();
  const { toast } = useToast();

  const rawLessons = settingsStore.get(KANGUR_LESSONS_SETTING_KEY);
  const rawLessonDocuments = settingsStore.get(KANGUR_LESSON_DOCUMENTS_SETTING_KEY);
  const lessons = useMemo((): KangurLesson[] => parseKangurLessons(rawLessons), [rawLessons]);
  const lessonDocuments = useMemo(
    () => parseKangurLessonDocumentStore(rawLessonDocuments),
    [rawLessonDocuments]
  );
  const lessonById = useMemo(
    () => new Map(lessons.map((lesson): [string, KangurLesson] => [lesson.id, lesson])),
    [lessons]
  );

  const [showModal, setShowModal] = useState(false);
  const [showContentModal, setShowContentModal] = useState(false);
  const [editingLesson, setEditingLesson] = useState<KangurLesson | null>(null);
  const [editingContentLesson, setEditingContentLesson] = useState<KangurLesson | null>(null);
  const [lessonToDelete, setLessonToDelete] = useState<KangurLesson | null>(null);
  const [formData, setFormData] = useState<LessonFormData>(() => createInitialLessonFormData());
  const [contentDraft, setContentDraft] = useState(createDefaultKangurLessonDocument);
  const [treeMode, setTreeMode] = useState<LessonTreeMode>(() => readPersistedTreeMode());
  const [svgModalLesson, setSvgModalLesson] = useState<KangurLesson | null>(null);
  const [svgModalInitialMarkup, setSvgModalInitialMarkup] = useState('');
  const [orderedTreeSearchQuery, setOrderedTreeSearchQuery] = useState('');
  const [catalogTreeSearchQuery, setCatalogTreeSearchQuery] = useState('');
  const [authoringFilter, setAuthoringFilter] = useState<KangurLessonAuthoringFilter>('all');
  const isCatalogMode = treeMode === 'catalog';
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
        isSaving: updateSetting.isPending,
      }),
    }),
    [contentDraft, editingContentLesson, lessons.length, showContentModal, updateSetting.isPending]
  );
  const handleTreeSearchChange = useCallback(
    (nextQuery: string): void => {
      if (isCatalogMode) {
        setCatalogTreeSearchQuery(nextQuery);
        return;
      }
      setOrderedTreeSearchQuery(nextQuery);
    },
    [isCatalogMode]
  );
  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      window.localStorage.setItem(TREE_MODE_STORAGE_KEY, treeMode);
    } catch {
      // Ignore storage errors.
    }
  }, [treeMode]);

  const filteredLessons = useMemo(
    () =>
      lessons.filter((lesson) =>
        matchesKangurLessonAuthoringFilter(authoringFilter, lesson, lessonDocuments)
      ),
    [authoringFilter, lessonDocuments, lessons]
  );
  const filterCounts = useMemo(
    () => getKangurLessonAuthoringFilterCounts(lessons, lessonDocuments),
    [lessonDocuments, lessons]
  );

  const masterNodes = useMemo(
    () =>
      isCatalogMode
        ? buildKangurLessonCatalogMasterNodes(filteredLessons)
        : buildKangurLessonMasterNodes(filteredLessons),
    [filteredLessons, isCatalogMode]
  );

  const geometryPackAddedCount = useMemo(
    () => appendMissingGeometryKangurLessons(lessons).addedCount,
    [lessons]
  );
  const logicPackAddedCount = useMemo(
    () => appendMissingLogicalThinkingKangurLessons(lessons).addedCount,
    [lessons]
  );

  const adapter = useMemo(
    () =>
      createMasterFolderTreeTransactionAdapter({
        onApply: async (transaction): Promise<void> => {
          if (isCatalogMode) return;

          const internalAdapter = createMasterFolderTreeTransactionAdapter({ onApply: () => {} });
          const applied = await internalAdapter.apply(transaction, {
            tx: transaction,
            preparedAt: Date.now(),
          });
          if (!applied || !applied.nodes) return;

          const nextLessonOrder = resolveKangurLessonOrderFromNodes(applied.nodes, lessonById);
          const nextLessons = canonicalizeKangurLessons(
            lessons.map((lesson) => ({
              ...lesson,
              sortOrder:
                nextLessonOrder.findIndex((l) => l.id === lesson.id) * KANGUR_LESSON_SORT_ORDER_GAP,
            }))
          );
          await updateSetting.mutateAsync({
            key: KANGUR_LESSONS_SETTING_KEY,
            value: serializeSetting(nextLessons),
          });
        },
      }),
    [isCatalogMode, lessonById, lessons, updateSetting]
  );

  const {
    controller,
    capabilities,
    appearance: { rootDropUi },
    viewport: { scrollToNodeRef },
  } = useMasterFolderTreeShell({
    instance: activeTreeInstance,
    nodes: masterNodes,
    adapter,
  });

  const searchState = useMasterFolderTreeSearch(masterNodes, treeSearchQuery, {
    config: capabilities.search,
  });

  const openCreateModal = (): void => {
    setEditingLesson(null);
    setFormData(createInitialLessonFormData());
    setShowModal(true);
  };

  const openEditModal = (lesson: KangurLesson): void => {
    setEditingLesson(lesson);
    setFormData(toLessonFormData(lesson));
    setShowModal(true);
  };

  const openContentModal = (lesson: KangurLesson): void => {
    setEditingContentLesson(lesson);
    const existing = lessonDocuments[lesson.id];
    const starter = createStarterKangurLessonDocument(lesson.componentId);
    setContentDraft(existing ?? starter);
    setShowContentModal(true);
  };

  const openSvgModal = (lesson: KangurLesson): void => {
    const doc = lessonDocuments[lesson.id];
    const pages = doc ? resolveKangurLessonDocumentPages(doc) : [];
    const firstSvgBlock = pages.flatMap((p) => p.blocks).find((b) => b.type === 'svg');
    setSvgModalLesson(lesson);
    setSvgModalInitialMarkup(firstSvgBlock?.type === 'svg' ? firstSvgBlock.markup : '');
  };

  const handleSaveLessonSvg = async (markup: string, viewBox: string): Promise<void> => {
    if (!svgModalLesson) return;
    try {
      const sanitized = sanitizeSvgMarkup(markup);
      const existingDoc = lessonDocuments[svgModalLesson.id] ?? createDefaultKangurLessonDocument();
      const pages = resolveKangurLessonDocumentPages(existingDoc);
      const firstPage = pages[0];
      if (!firstPage) {
        toast('No pages in lesson document.', { variant: 'error' });
        return;
      }

      const svgBlockIndex = firstPage.blocks.findIndex((b) => b.type === 'svg');
      const nextBlocks =
        svgBlockIndex !== -1
          ? firstPage.blocks.map((b, i) =>
            i === svgBlockIndex && b.type === 'svg' ? { ...b, markup: sanitized, viewBox } : b
          )
          : [{ ...createKangurLessonSvgBlock(), markup: sanitized, viewBox }, ...firstPage.blocks];

      const nextPages = pages.map((p, i) => (i === 0 ? { ...p, blocks: nextBlocks } : p));
      const nextDoc = updateKangurLessonDocumentPages(existingDoc, nextPages);
      const nextStore = { ...lessonDocuments, [svgModalLesson.id]: nextDoc };

      await updateSetting.mutateAsync({
        key: KANGUR_LESSON_DOCUMENTS_SETTING_KEY,
        value: serializeSetting(nextStore),
      });

      if (svgModalLesson.contentMode !== 'document') {
        const nextLessonRecord: KangurLesson = { ...svgModalLesson, contentMode: 'document' };
        const nextLessons = canonicalizeKangurLessons(upsertLesson(lessons, nextLessonRecord));
        await updateSetting.mutateAsync({
          key: KANGUR_LESSONS_SETTING_KEY,
          value: serializeSetting(nextLessons),
        });
      }

      toast('SVG image saved.', { variant: 'success' });
      setSvgModalLesson(null);
    } catch (error) {
      logClientError(error, {
        context: { source: 'AdminKangurLessonsManagerPage', action: 'saveLessonSvg' },
      });
      toast('Failed to save SVG.', { variant: 'error' });
    }
  };

  const applyTemplateForComponent = useCallback((componentId: KangurLessonComponentId): void => {
    const template = KANGUR_LESSON_LIBRARY[componentId];
    if (!template) return;
    setFormData((current) => ({
      ...current,
      componentId,
      title: template.title,
      description: template.description,
      emoji: template.emoji,
      color: template.color,
      activeBg: template.activeBg,
    }));
  }, []);

  const handleSaveLesson = async (): Promise<void> => {
    try {
      const lessonId = editingLesson?.id ?? createKangurLessonId();
      const nextLesson: KangurLesson = {
        ...formData,
        id: lessonId,
        sortOrder: editingLesson?.sortOrder ?? lessons.length * KANGUR_LESSON_SORT_ORDER_GAP,
      };

      const nextLessons = canonicalizeKangurLessons(upsertLesson(lessons, nextLesson));
      await updateSetting.mutateAsync({
        key: KANGUR_LESSONS_SETTING_KEY,
        value: serializeSetting(nextLessons),
      });

      toast(editingLesson ? 'Lesson updated.' : 'Lesson created.', { variant: 'success' });
      setShowModal(false);

      if (!editingLesson && nextLesson.contentMode === 'document') {
        openContentModal(nextLesson);
      }

      setEditingLesson(null);
    } catch (error) {
      logClientError(error, {
        context: { source: 'AdminKangurLessonsManagerPage', action: 'saveLesson' },
      });
      toast('Failed to save lesson.', { variant: 'error' });
    }
  };

  const handleDeleteLesson = async (): Promise<void> => {
    if (!lessonToDelete) return;
    try {
      const nextLessons = canonicalizeKangurLessons(
        lessons.filter((lesson) => lesson.id !== lessonToDelete.id)
      );
      await updateSetting.mutateAsync({
        key: KANGUR_LESSONS_SETTING_KEY,
        value: serializeSetting(nextLessons),
      });

      const nextLessonDocuments = removeKangurLessonDocument(lessonDocuments, lessonToDelete.id);
      if (nextLessonDocuments !== lessonDocuments) {
        await updateSetting.mutateAsync({
          key: KANGUR_LESSON_DOCUMENTS_SETTING_KEY,
          value: serializeSetting(nextLessonDocuments),
        });
      }
      clearLessonContentEditorDraft(lessonToDelete.id);

      toast('Lesson deleted.', { variant: 'success' });
      setLessonToDelete(null);
    } catch (error) {
      logClientError(error, {
        context: { source: 'AdminKangurLessonsManagerPage', action: 'deleteLesson' },
      });
      toast('Failed to delete lesson.', { variant: 'error' });
    }
  };

  const handleSaveLessonContent = async (): Promise<void> => {
    if (!editingContentLesson) return;
    try {
      const nextDocument = updateKangurLessonDocumentTimestamp(contentDraft);
      const nextStore = {
        ...lessonDocuments,
        [editingContentLesson.id]: nextDocument,
      };
      await updateSetting.mutateAsync({
        key: KANGUR_LESSON_DOCUMENTS_SETTING_KEY,
        value: serializeSetting(nextStore),
      });

      const nextLesson: KangurLesson = { ...editingContentLesson, contentMode: 'document' };
      const nextLessons = canonicalizeKangurLessons(upsertLesson(lessons, nextLesson));
      await updateSetting.mutateAsync({
        key: KANGUR_LESSONS_SETTING_KEY,
        value: serializeSetting(nextLessons),
      });
      clearLessonContentEditorDraft(editingContentLesson.id);

      toast('Lesson content saved.', { variant: 'success' });
      setShowContentModal(false);
      setEditingContentLesson(null);
    } catch (error) {
      logClientError(error, {
        context: { source: 'AdminKangurLessonsManagerPage', action: 'saveContent' },
      });
      toast('Failed to save lesson content.', { variant: 'error' });
    }
  };

  const handleClearLessonContent = async (): Promise<void> => {
    if (!editingContentLesson) return;
    try {
      const nextLesson: KangurLesson = { ...editingContentLesson, contentMode: 'component' };
      const nextLessons = canonicalizeKangurLessons(upsertLesson(lessons, nextLesson));
      await updateSetting.mutateAsync({
        key: KANGUR_LESSONS_SETTING_KEY,
        value: serializeSetting(nextLessons),
      });

      const nextStore = { ...lessonDocuments };
      delete nextStore[editingContentLesson.id];
      await updateSetting.mutateAsync({
        key: KANGUR_LESSON_DOCUMENTS_SETTING_KEY,
        value: serializeSetting(nextStore),
      });
      clearLessonContentEditorDraft(editingContentLesson.id);

      toast('Custom content cleared.', { variant: 'success' });
      setContentDraft(createDefaultKangurLessonDocument());
    } catch (error) {
      logClientError(error, {
        context: { source: 'AdminKangurLessonsManagerPage', action: 'clearContent' },
      });
      toast('Failed to clear content.', { variant: 'error' });
    }
  };

  const handleImportLegacyLesson = (): void => {
    if (!editingContentLesson) return;
    try {
      const result = importLegacyKangurLessonDocument(editingContentLesson.componentId);
      if (!result) {
        toast('No legacy importer available for this lesson type.', { variant: 'warning' });
        return;
      }
      setContentDraft(result.document);
      toast('Imported legacy lesson. Review and save to apply.', { variant: 'success' });
    } catch (error) {
      logClientError(error, {
        context: { source: 'AdminKangurLessonsManagerPage', action: 'importLegacy' },
      });
      toast('Failed to import legacy lesson.', { variant: 'error' });
    }
  };

  const handleAddGeometryPack = async (): Promise<void> => {
    try {
      const result = appendMissingGeometryKangurLessons(lessons);
      const nextLessons = canonicalizeKangurLessons(result.lessons);
      await updateSetting.mutateAsync({
        key: KANGUR_LESSONS_SETTING_KEY,
        value: serializeSetting(nextLessons),
      });
      toast('Geometry lesson pack added.', { variant: 'success' });
    } catch (error) {
      logClientError(error, {
        context: { source: 'AdminKangurLessonsManagerPage', action: 'addGeometryPack' },
      });
      toast('Failed to add geometry pack.', { variant: 'error' });
    }
  };

  const handleAddLogicalThinkingPack = async (): Promise<void> => {
    try {
      const result = appendMissingLogicalThinkingKangurLessons(lessons);
      const nextLessons = canonicalizeKangurLessons(result.lessons);
      await updateSetting.mutateAsync({
        key: KANGUR_LESSONS_SETTING_KEY,
        value: serializeSetting(nextLessons),
      });
      toast('Logical thinking lesson pack added.', { variant: 'success' });
    } catch (error) {
      logClientError(error, {
        context: { source: 'AdminKangurLessonsManagerPage', action: 'addLogicPack' },
      });
      toast('Failed to add logic pack.', { variant: 'error' });
    }
  };

  const handleImportAllLessonsToEditor = async (): Promise<void> => {
    try {
      let updatedCount = 0;
      const nextStore = { ...lessonDocuments };
      lessons.forEach((lesson) => {
        if (!hasKangurLessonDocumentContent(nextStore[lesson.id])) {
          const result = importLegacyKangurLessonDocument(lesson.componentId);
          if (result) {
            nextStore[lesson.id] = result.document;
            updatedCount += 1;
          }
        }
      });

      if (updatedCount === 0) {
        toast('All lessons already have editor content.', { variant: 'info' });
        return;
      }

      await updateSetting.mutateAsync({
        key: KANGUR_LESSON_DOCUMENTS_SETTING_KEY,
        value: serializeSetting(nextStore),
      });
      toast(`Imported ${updatedCount} lessons to modular editor.`, { variant: 'success' });
    } catch (error) {
      logClientError(error, {
        context: { source: 'AdminKangurLessonsManagerPage', action: 'importAll' },
      });
      toast('Failed to import all lessons.', { variant: 'error' });
    }
  };

  const isSaveDisabled = !formData.title.trim() || updateSetting.isPending;
  const lessonsNeedingLegacyImport = countLessonsRequiringLegacyImport(lessons, lessonDocuments);
  const toolbarButtonClassName =
    'h-8 rounded-xl border-border/60 bg-background/60 px-3 text-xs font-semibold text-foreground shadow-sm hover:bg-card/80';
  const activeSegmentClassName = 'border-primary/30 bg-primary/15 text-foreground shadow-sm';
  const inactiveSegmentClassName =
    'border-border/60 bg-background/40 text-muted-foreground hover:bg-card/70 hover:text-foreground';
  const filterSectionLabelClassName =
    'text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground';

  const renderNode = useCallback(
    (input: FolderTreeViewportRenderNodeInput): React.ReactNode => (
      <LessonTreeRow
        input={input}
        lessonById={lessonById}
        authoringStatus={(lesson) => getKangurLessonAuthoringStatus(lesson, lessonDocuments)}
        onEdit={openEditModal}
        onEditContent={openContentModal}
        onQuickSvg={openSvgModal}
        onDelete={setLessonToDelete}
        isUpdating={updateSetting.isPending}
      />
    ),
    [lessonById, lessonDocuments, updateSetting.isPending]
  );

  const content = (
    <div className='flex h-full flex-col gap-4 overflow-hidden'>
      {standalone ? (
        <KangurAdminWorkspaceIntroCard
          title='Lessons workspace'
          description='Manage the Kangur lesson library, focus the tree by editorial state, and open lesson editing from the same surface used across the rest of Kangur admin.'
          badge='Library surface'
        />
      ) : null}

      <FolderTreePanel
        className='min-h-0 flex-1 rounded-2xl border border-border/60 bg-card/35 shadow-sm'
        bodyClassName='min-h-0 overflow-hidden'
        header={
          <div className='border-b border-border/60 p-4'>
            <div className='space-y-4'>
              <div className='flex flex-wrap items-start justify-between gap-3'>
                <div>
                  <div className='flex flex-wrap items-center gap-2'>
                    <div className='text-sm font-semibold text-foreground'>Lesson library</div>
                    <span className='rounded-full border border-border/60 bg-background/70 px-2.5 py-1 text-[11px] font-medium text-muted-foreground'>
                      {isCatalogMode ? 'Catalog view' : 'Ordered view'}
                    </span>
                  </div>
                  <div className='mt-1 text-sm text-muted-foreground'>
                    Lessons stay synced to the learner app, while this workspace keeps authoring,
                    filtering, and ordering in one place.
                  </div>
                </div>
                <div className='flex flex-wrap items-center gap-2'>
                  <Button
                    type='button'
                    size='sm'
                    variant='outline'
                    className={cn(
                      'h-8 rounded-lg px-3 text-xs font-semibold',
                      !isCatalogMode ? activeSegmentClassName : inactiveSegmentClassName
                    )}
                    onClick={(): void => setTreeMode('ordered')}
                    disabled={updateSetting.isPending}
                  >
                    <ListOrdered className='mr-1 size-3.5' />
                    Ordered
                  </Button>
                  <Button
                    type='button'
                    size='sm'
                    variant='outline'
                    className={cn(
                      'h-8 rounded-lg px-3 text-xs font-semibold',
                      isCatalogMode ? activeSegmentClassName : inactiveSegmentClassName
                    )}
                    onClick={(): void => setTreeMode('catalog')}
                    disabled={updateSetting.isPending}
                  >
                    <Folders className='mr-1 size-3.5' />
                    Catalog
                  </Button>
                </div>
              </div>

              <div className='flex flex-wrap items-center gap-2'>
                <Button
                  onClick={() => {
                    void handleAddGeometryPack();
                  }}
                  size='sm'
                  variant='outline'
                  className={toolbarButtonClassName}
                  disabled={updateSetting.isPending || geometryPackAddedCount === 0}
                >
                  <Sparkles className='mr-1 size-3.5' />
                  Add geometry pack
                </Button>
                <Button
                  onClick={() => {
                    void handleAddLogicalThinkingPack();
                  }}
                  size='sm'
                  variant='outline'
                  className={toolbarButtonClassName}
                  disabled={updateSetting.isPending || logicPackAddedCount === 0}
                >
                  <Sparkles className='mr-1 size-3.5' />
                  Add logic pack
                </Button>
                <Button
                  onClick={() => {
                    void handleImportAllLessonsToEditor();
                  }}
                  size='sm'
                  variant='outline'
                  className={toolbarButtonClassName}
                  disabled={updateSetting.isPending || lessons.length === 0}
                >
                  <Sparkles className='mr-1 size-3.5' />
                  Import all to editor
                  {lessonsNeedingLegacyImport > 0 ? ` (${lessonsNeedingLegacyImport})` : ''}
                </Button>
                <Button
                  onClick={openCreateModal}
                  size='sm'
                  variant='outline'
                  className={toolbarButtonClassName}
                  disabled={updateSetting.isPending}
                >
                  <Plus className='mr-1 size-3.5' />
                  Add lesson
                </Button>
              </div>

              <div className='space-y-2'>
                <div className={filterSectionLabelClassName}>Editorial filters</div>
                <div className='flex flex-wrap items-center gap-1.5'>
                  {filterCounts.map((filter) => (
                    <Button
                      key={filter.id}
                      type='button'
                      size='sm'
                      variant='outline'
                      className={cn(
                        'h-8 rounded-xl px-3 text-xs font-semibold',
                        authoringFilter === filter.id ? activeSegmentClassName : inactiveSegmentClassName
                      )}
                      onClick={(): void => setAuthoringFilter(filter.id)}
                      disabled={updateSetting.isPending}
                    >
                      {filter.label}
                      <span className='ml-1 text-[10px] text-current/75'>{filter.count}</span>
                    </Button>
                  ))}
                </div>
              </div>

              <div className='flex flex-wrap items-center gap-2'>
                <span className='text-xs text-muted-foreground'>
                  {isCatalogMode
                    ? 'Catalog mode groups lessons by visibility and lesson type.'
                    : 'Ordered mode supports drag-and-drop reordering.'}
                  {authoringFilter !== 'all'
                    ? ` Showing ${filteredLessons.length} matching lessons.`
                    : ''}
                </span>
              </div>

              {capabilities.search.enabled ? (
                <div className='space-y-2'>
                  <div className={filterSectionLabelClassName}>Search</div>
                  <FolderTreeSearchBar
                    value={treeSearchQuery}
                    onChange={handleTreeSearchChange}
                    placeholder={
                      isCatalogMode
                        ? 'Search catalog groups and lessons...'
                        : 'Search lessons, ids, or component types...'
                    }
                  />
                  {searchState.isActive ? (
                    <div className='text-[11px] text-muted-foreground/80'>
                      {searchState.matchNodeIds.size} results
                    </div>
                  ) : null}
                </div>
              ) : null}
            </div>
          </div>
        }
      >
        {settingsStore.isLoading ? (
          <div className='space-y-2 p-3'>
            <Skeleton className='h-10 w-full' />
            <Skeleton className='h-10 w-full' />
            <Skeleton className='h-10 w-full' />
          </div>
        ) : (
          <div className='min-h-0 flex-1 overflow-auto p-2'>
            <FolderTreeViewportV2
              controller={controller}
              scrollToNodeRef={scrollToNodeRef}
              searchState={searchState}
              rootDropUi={isCatalogMode ? { ...rootDropUi, enabled: false } : rootDropUi}
              renderNode={renderNode}
              enableDnd={!isCatalogMode && authoringFilter === 'all' && !updateSetting.isPending}
              emptyLabel={
                authoringFilter === 'all'
                  ? 'No lessons yet. Add the first lesson to start.'
                  : 'No lessons match the current authoring filter.'
              }
            />
          </div>
        )}
      </FolderTreePanel>

      <LessonSvgQuickAddRuntimeProvider
        lesson={svgModalLesson}
        initialMarkup={svgModalInitialMarkup}
        isOpen={Boolean(svgModalLesson)}
        onClose={(): void => setSvgModalLesson(null)}
        onSave={(markup: string, viewBox: string): void => {
          void handleSaveLessonSvg(markup, viewBox);
        }}
        isSaving={updateSetting.isPending}
      >
        <LessonSvgQuickAddModal />
      </LessonSvgQuickAddRuntimeProvider>

      <ConfirmModal
        isOpen={Boolean(lessonToDelete)}
        onClose={(): void => setLessonToDelete(null)}
        onConfirm={(): void => {
          void handleDeleteLesson();
        }}
        title='Delete Lesson'
        message={`Delete lesson "${lessonToDelete?.title ?? ''}"? This action cannot be undone.`}
        confirmText='Delete'
        isDangerous={true}
      />

      <FormModal
        isOpen={showModal}
        onClose={(): void => {
          setShowModal(false);
          setEditingLesson(null);
        }}
        title={editingLesson ? 'Edit Lesson' : 'Create Lesson'}
        subtitle='Manage lessons visible in Kangur app.'
        onSave={(): void => {
          void handleSaveLesson();
        }}
        isSaving={updateSetting.isPending}
        isSaveDisabled={isSaveDisabled}
        saveText={editingLesson ? 'Save Lesson' : 'Create Lesson'}
      >
        <LessonMetadataForm
          formData={formData}
          setFormData={setFormData}
          onComponentChange={applyTemplateForComponent as (id: string) => void}
        />
      </FormModal>

      <LessonContentEditorDialog
        lesson={editingContentLesson}
        document={contentDraft}
        isOpen={showContentModal}
        isSaving={updateSetting.isPending}
        onClose={(): void => {
          setShowContentModal(false);
          setEditingContentLesson(null);
        }}
        onLessonChange={(nextLesson): void => setEditingContentLesson(nextLesson)}
        onChange={setContentDraft}
        onSave={(): void => {
          void handleSaveLessonContent();
        }}
        onImportLegacy={handleImportLegacyLesson}
        onClearContent={(): void => {
          void handleClearLessonContent();
        }}
      />
    </div>
  );

  return (
    <ContextRegistryPageProvider
      pageId='admin:kangur-lessons-manager'
      title='Kangur Lessons Manager'
      rootNodeIds={[...KANGUR_ADMIN_LESSONS_MANAGER_CONTEXT_ROOT_IDS]}
    >
      <AdminKangurLessonsManagerRegistrySource registrySource={registrySource} />
      {standalone ? (
        <KangurAdminContentShell
          title='Kangur Lessons'
          description='Manage lesson library, order, and interactive content.'
          breadcrumbs={[
            { label: 'Admin', href: '/admin' },
            { label: 'Kangur', href: '/admin/kangur' },
            { label: 'Lessons' },
          ]}
          className='h-full'
          panelClassName='flex h-full min-h-0 flex-col'
          contentClassName='flex min-h-0 flex-1 flex-col'
        >
          {content}
        </KangurAdminContentShell>
      ) : (
        content
      )}
    </ContextRegistryPageProvider>
  );
}
