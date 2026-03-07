'use client';

import {
  Folders,
  ListOrdered,
  Plus,
  Sparkles,
} from 'lucide-react';
import React, { useCallback, useEffect, useMemo, useState } from 'react';

import {
  createMasterFolderTreeTransactionAdapter,
  FolderTreeViewportV2,
  useMasterFolderTreeShell,
  type FolderTreeViewportRenderNodeInput,
} from '@/features/foldertree/v2';
import { FolderTreeSearchBar, useMasterFolderTreeSearch } from '@/features/foldertree/v2/search';
import type {
  KangurLesson,
  KangurLessonComponentId,
} from '@/shared/contracts/kangur';
import { useUpdateSetting } from '@/shared/hooks/use-settings';
import { useSettingsStore } from '@/shared/providers/SettingsStoreProvider';
import {
  Breadcrumbs,
  Button,
  FolderTreePanel,
  FormModal,
  Skeleton,
  SectionHeader,
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
import {
  createDefaultKangurLessonDocument,
  createKangurLessonSvgBlock,
  hasKangurLessonDocumentContent,
  parseKangurLessonDocumentStore,
  removeKangurLessonDocument,
  resolveKangurLessonDocumentPages,
  updateKangurLessonDocumentPages,
  updateKangurLessonDocumentTimestamp,
} from '../lesson-documents';
import { importLegacyKangurLessonDocument } from '../legacy-lesson-imports';
import { KangurLessonDocumentEditor } from './KangurLessonDocumentEditor';
import { KangurLessonNarrationPanel } from './KangurLessonNarrationPanel';

import { LessonMetadataForm } from './components/LessonMetadataForm';
import { LessonSvgQuickAddModal } from './components/LessonSvgQuickAddModal';
import { LessonTreeRow } from './components/LessonTreeRow';
import { TREE_MODE_STORAGE_KEY, CATALOG_TREE_INSTANCE, ORDERED_TREE_INSTANCE } from './constants';
import type { LessonFormData, LessonTreeMode } from './types';
import {
  countLessonsRequiringLegacyImport,
  createInitialLessonFormData,
  readPersistedTreeMode,
  sanitizeSvgMarkup,
  toLessonFormData,
  upsertLesson,
} from './utils';

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
  const isCatalogMode = treeMode === 'catalog';
  const activeTreeInstance = isCatalogMode ? CATALOG_TREE_INSTANCE : ORDERED_TREE_INSTANCE;
  const treeSearchQuery = isCatalogMode ? catalogTreeSearchQuery : orderedTreeSearchQuery;
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

  const masterNodes = useMemo(
    () =>
      isCatalogMode ? buildKangurLessonCatalogMasterNodes(lessons) : buildKangurLessonMasterNodes(lessons),
    [isCatalogMode, lessons]
  );

  const adapter = useMemo(
    () =>
      createMasterFolderTreeTransactionAdapter({
        onApply: async (transaction): Promise<void> => {
          if (isCatalogMode) return;
          
          const internalAdapter = createMasterFolderTreeTransactionAdapter({ onApply: () => {} });
          const applied = await internalAdapter.apply(transaction, { tx: transaction, preparedAt: Date.now() });
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
    setContentDraft(existing ?? createDefaultKangurLessonDocument());
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
            i === svgBlockIndex && b.type === 'svg'
              ? { ...b, markup: sanitized, viewBox }
              : b
          )
          : [
            { ...createKangurLessonSvgBlock(), markup: sanitized, viewBox },
            ...firstPage.blocks,
          ];

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
      setEditingLesson(null);
    } catch (error) {
      logClientError(error, { context: { source: 'AdminKangurLessonsManagerPage', action: 'saveLesson' } });
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

      toast('Lesson deleted.', { variant: 'success' });
      setLessonToDelete(null);
    } catch (error) {
      logClientError(error, { context: { source: 'AdminKangurLessonsManagerPage', action: 'deleteLesson' } });
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

      toast('Lesson content saved.', { variant: 'success' });
      setShowContentModal(false);
      setEditingContentLesson(null);
    } catch (error) {
      logClientError(error, { context: { source: 'AdminKangurLessonsManagerPage', action: 'saveContent' } });
      toast('Failed to save lesson content.', { variant: 'error' });
    }
  };

  const handleClearLessonContent = async (): Promise<void> => {
    if (!editingContentLesson) return;
    try {
      const nextStore = { ...lessonDocuments };
      delete nextStore[editingContentLesson.id];
      await updateSetting.mutateAsync({
        key: KANGUR_LESSON_DOCUMENTS_SETTING_KEY,
        value: serializeSetting(nextStore),
      });

      toast('Custom content cleared.', { variant: 'success' });
      setContentDraft(createDefaultKangurLessonDocument());
    } catch (error) {
      logClientError(error, { context: { source: 'AdminKangurLessonsManagerPage', action: 'clearContent' } });
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
      toast('Legacy lesson imported. Review and save to apply.', { variant: 'info' });
    } catch (error) {
      logClientError(error, { context: { source: 'AdminKangurLessonsManagerPage', action: 'importLegacy' } });
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
      logClientError(error, { context: { source: 'AdminKangurLessonsManagerPage', action: 'addGeometryPack' } });
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
      logClientError(error, { context: { source: 'AdminKangurLessonsManagerPage', action: 'addLogicPack' } });
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
      logClientError(error, { context: { source: 'AdminKangurLessonsManagerPage', action: 'importAll' } });
      toast('Failed to import all lessons.', { variant: 'error' });
    }
  };

  const isSaveDisabled = !formData.title.trim() || updateSetting.isPending;
  const lessonsNeedingLegacyImport = countLessonsRequiringLegacyImport(lessons, lessonDocuments);

  const renderNode = useCallback(
    (input: FolderTreeViewportRenderNodeInput): React.ReactNode => (
      <LessonTreeRow
        input={input}
        lessonById={lessonById}
        hasContent={(id): boolean => hasKangurLessonDocumentContent(lessonDocuments[id])}
        onEdit={openEditModal}
        onEditContent={openContentModal}
        onQuickSvg={openSvgModal}
        onDelete={setLessonToDelete}
        isUpdating={updateSetting.isPending}
      />
    ),
    [lessonById, lessonDocuments, updateSetting.isPending]
  );

  return (
    <div className='flex h-full flex-col gap-4 overflow-hidden'>
      {standalone ? (
        <SectionHeader
          title='Kangur Lessons'
          description='Manage lesson library, order, and interactive content.'
        >
          <Breadcrumbs
            items={[
              { label: 'Admin', href: '/admin' },
              { label: 'Kangur', href: '/admin/kangur' },
              { label: 'Lessons' },
            ]}
          />
        </SectionHeader>
      ) : null}

      <FolderTreePanel
        className='min-h-0 flex-1'
        header={
          <div className='flex flex-col gap-3'>
            <div className='flex flex-wrap items-center justify-between gap-2'>
              <div>
                <div className='text-sm font-semibold text-white'>Lesson Library</div>
                <div className='text-xs text-muted-foreground'>
                  Lessons are automatically synced to the mobile app.
                </div>
              </div>
              <div className='flex items-center gap-1'>
                <Button
                  onClick={handleAddGeometryPack}
                  size='sm'
                  variant='outline'
                  className='h-7 border px-2 text-[11px] font-semibold tracking-wide text-cyan-200 hover:bg-cyan-900/30'
                  disabled={updateSetting.isPending}
                >
                  <Sparkles className='mr-1 size-3.5' />
                  Add geometry pack
                </Button>
                <Button
                  onClick={handleAddLogicalThinkingPack}
                  size='sm'
                  variant='outline'
                  className='h-7 border px-2 text-[11px] font-semibold tracking-wide text-violet-200 hover:bg-violet-900/30'
                  disabled={updateSetting.isPending}
                >
                  <Sparkles className='mr-1 size-3.5' />
                  Add logic pack
                </Button>
                <Button
                  onClick={handleImportAllLessonsToEditor}
                  size='sm'
                  variant='outline'
                  className='h-7 border px-2 text-[11px] font-semibold tracking-wide text-emerald-200 hover:bg-emerald-900/30'
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
                  className='h-7 border px-2 text-[11px] font-semibold tracking-wide text-gray-200 hover:bg-muted/50'
                  disabled={updateSetting.isPending}
                >
                  <Plus className='mr-1 size-3.5' />
                  Add lesson
                </Button>
              </div>
            </div>
            <div className='flex flex-wrap items-center gap-1'>
              <Button
                type='button'
                size='sm'
                variant='outline'
                className={cn(
                  'h-7 border px-2 text-[11px] font-semibold tracking-wide',
                  !isCatalogMode
                    ? 'border-sky-300/70 bg-sky-500/20 text-sky-100'
                    : 'text-gray-300 hover:bg-muted/40'
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
                  'h-7 border px-2 text-[11px] font-semibold tracking-wide',
                  isCatalogMode
                    ? 'border-sky-300/70 bg-sky-500/20 text-sky-100'
                    : 'text-gray-300 hover:bg-muted/40'
                )}
                onClick={(): void => setTreeMode('catalog')}
                disabled={updateSetting.isPending}
              >
                <Folders className='mr-1 size-3.5' />
                Catalog
              </Button>
              <span className='text-[11px] text-muted-foreground/80'>
                {isCatalogMode
                  ? 'Catalog mode groups lessons by visibility and type.'
                  : 'Ordered mode supports drag-and-drop reordering.'}
              </span>
            </div>
            {capabilities.search.enabled ? (
              <>
                <FolderTreeSearchBar
                  value={treeSearchQuery}
                  onChange={handleTreeSearchChange}
                  placeholder='Search lessons...'
                />
                {searchState.isActive ? (
                  <div className='text-[11px] text-muted-foreground/80'>
                    {searchState.matchNodeIds.size} results
                  </div>
                ) : null}
              </>
            ) : null}
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
              enableDnd={!isCatalogMode && !updateSetting.isPending}
              emptyLabel='No lessons yet. Add the first lesson to start.'
            />
          </div>
        )}
      </FolderTreePanel>

      <LessonSvgQuickAddModal
        lesson={svgModalLesson}
        initialMarkup={svgModalInitialMarkup}
        isOpen={Boolean(svgModalLesson)}
        onClose={(): void => setSvgModalLesson(null)}
        onSave={(markup, viewBox): void => {
          void handleSaveLessonSvg(markup, viewBox);
        }}
        isSaving={updateSetting.isPending}
      />

      <ConfirmModal
        isOpen={Boolean(lessonToDelete)}
        onClose={(): void => setLessonToDelete(null)}
        onConfirm={handleDeleteLesson}
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
        onSave={handleSaveLesson}
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

      <FormModal
        isOpen={showContentModal}
        onClose={(): void => {
          setShowContentModal(false);
          setEditingContentLesson(null);
        }}
        title={editingContentLesson ? `Edit Content: ${editingContentLesson.title}` : 'Edit Lesson Content'}
        titleTestId='mock-doc-editor-title'
        subtitle='Author lesson pages with text, SVG blocks, SVG image references, activity widgets, and responsive grid layouts. You can also import the current legacy lesson structure into modular pages.'
        onSave={handleSaveLessonContent}        isSaving={updateSetting.isPending}
        saveText='Save Content'
        size='xl'
        actions={
          editingContentLesson ? (
            <div className='flex flex-wrap items-center gap-2'>
              <Button
                type='button'
                variant='outline'
                className='text-sky-200 hover:bg-sky-500/10 hover:text-sky-100'
                onClick={handleImportLegacyLesson}
                disabled={updateSetting.isPending}
              >
                <Sparkles className='mr-1 size-3.5' />
                Import legacy lesson
              </Button>
              {hasKangurLessonDocumentContent(contentDraft) ? (
                <Button
                  type='button'
                  variant='outline'
                  className='text-rose-300 hover:bg-rose-500/10 hover:text-rose-200'
                  onClick={(): void => {
                    void handleClearLessonContent();
                  }}
                  disabled={updateSetting.isPending}
                >
                  Clear custom content
                </Button>
              ) : null}
            </div>
          ) : undefined
        }
      >
        {editingContentLesson ? (
          <div className='space-y-6'>
            <KangurLessonNarrationPanel
              lesson={editingContentLesson}
              document={contentDraft}
              onChange={setContentDraft}
            />
            <KangurLessonDocumentEditor value={contentDraft} onChange={setContentDraft} />
          </div>
        ) : null}
      </FormModal>
    </div>
  );
}
