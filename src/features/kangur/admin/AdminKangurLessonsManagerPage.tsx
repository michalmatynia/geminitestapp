'use client';

import {
  ChevronDown,
  ChevronRight,
  Folder,
  FolderOpen,
  Folders,
  GripVertical,
  ListOrdered,
  Pencil,
  Plus,
  Sparkles,
  Trash2,
} from 'lucide-react';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import {
  createMasterFolderTreeTransactionAdapter,
  FolderTreeViewportV2,
  useMasterFolderTreeShell,
  type FolderTreeViewportRenderNodeInput,
} from '@/features/foldertree/v2';
import { FolderTreeSearchBar, useMasterFolderTreeSearch } from '@/features/foldertree/v2/search';
import type { KangurLesson, KangurLessonComponentId } from '@/shared/contracts/kangur';
import { useUpdateSetting } from '@/shared/hooks/use-settings';
import { useSettingsStore } from '@/shared/providers/SettingsStoreProvider';
import {
  Badge,
  Breadcrumbs,
  Button,
  FolderTreePanel,
  FormField,
  FormModal,
  Input,
  SectionHeader,
  SelectSimple,
  Skeleton,
  Switch,
  Textarea,
  TreeRow,
  useToast,
} from '@/shared/ui';
import { ConfirmModal } from '@/shared/ui/templates/modals';
import { cn } from '@/shared/utils';
import { logClientError } from '@/shared/utils/observability/client-error-logger';
import { serializeSetting } from '@/shared/utils/settings-json';

import {
  buildKangurLessonCatalogMasterNodes,
  buildKangurLessonMasterNodes,
  fromKangurLessonNodeId,
  resolveKangurLessonOrderFromNodes,
} from './kangur-lessons-master-tree';
import {
  appendMissingGeometryKangurLessons,
  KANGUR_LESSONS_SETTING_KEY,
  KANGUR_LESSON_COMPONENT_OPTIONS,
  KANGUR_LESSON_SORT_ORDER_GAP,
  canonicalizeKangurLessons,
  createKangurLessonDraft,
  createKangurLessonId,
  parseKangurLessons,
} from '../settings';

type LessonTreeMode = 'ordered' | 'catalog';
const ORDERED_TREE_INSTANCE = 'kangur_lessons_manager';
const CATALOG_TREE_INSTANCE = 'kangur_lessons_manager_catalog';
const TREE_MODE_STORAGE_KEY = 'kangur_lessons_manager_tree_mode_v1';

type LessonFormData = {
  componentId: KangurLessonComponentId;
  title: string;
  description: string;
  emoji: string;
  color: string;
  activeBg: string;
  enabled: boolean;
};

const toLessonFormData = (lesson: KangurLesson): LessonFormData => ({
  componentId: lesson.componentId,
  title: lesson.title,
  description: lesson.description,
  emoji: lesson.emoji,
  color: lesson.color,
  activeBg: lesson.activeBg,
  enabled: lesson.enabled,
});

const createInitialLessonFormData = (): LessonFormData => createKangurLessonDraft('clock');

const readLessonGroupCount = (metadata: unknown): number | null => {
  if (!metadata || typeof metadata !== 'object' || Array.isArray(metadata)) return null;
  const groupValue = (metadata as Record<string, unknown>)['kangurLessonGroup'];
  if (!groupValue || typeof groupValue !== 'object' || Array.isArray(groupValue)) return null;
  const rawCount = (groupValue as Record<string, unknown>)['lessonCount'];
  if (typeof rawCount !== 'number' || !Number.isFinite(rawCount)) return null;
  return rawCount;
};

const readPersistedTreeMode = (): LessonTreeMode => {
  if (typeof window === 'undefined') return 'ordered';
  try {
    const storedValue = window.localStorage.getItem(TREE_MODE_STORAGE_KEY);
    return storedValue === 'catalog' ? 'catalog' : 'ordered';
  } catch {
    return 'ordered';
  }
};

export function AdminKangurLessonsManagerPage(): React.JSX.Element {
  const settingsStore = useSettingsStore();
  const updateSetting = useUpdateSetting();
  const { toast } = useToast();

  const rawLessons = settingsStore.get(KANGUR_LESSONS_SETTING_KEY);
  const lessons = useMemo((): KangurLesson[] => parseKangurLessons(rawLessons), [rawLessons]);
  const lessonById = useMemo(
    () => new Map(lessons.map((lesson): [string, KangurLesson] => [lesson.id, lesson])),
    [lessons]
  );

  const [showModal, setShowModal] = useState(false);
  const [editingLesson, setEditingLesson] = useState<KangurLesson | null>(null);
  const [lessonToDelete, setLessonToDelete] = useState<KangurLesson | null>(null);
  const [formData, setFormData] = useState<LessonFormData>(() => createInitialLessonFormData());
  const [treeMode, setTreeMode] = useState<LessonTreeMode>(() => readPersistedTreeMode());
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
      // Ignore storage errors (private mode / blocked storage) and keep in-memory mode only.
    }
  }, [treeMode]);

  const persistLessons = useCallback(
    async (nextLessons: KangurLesson[], options?: { successMessage?: string }): Promise<void> => {
      const normalizedLessons = canonicalizeKangurLessons(nextLessons);
      try {
        await updateSetting.mutateAsync({
          key: KANGUR_LESSONS_SETTING_KEY,
          value: serializeSetting(normalizedLessons),
        });
        if (options?.successMessage) {
          toast(options.successMessage, { variant: 'success' });
        }
      } catch (error: unknown) {
        logClientError(error, {
          context: {
            source: 'AdminKangurLessonsManagerPage',
            action: 'persistLessons',
            lessonCount: normalizedLessons.length,
          },
        });
        throw error instanceof Error ? error : new Error('Failed to persist lessons.');
      }
    },
    [toast, updateSetting]
  );

  const lessonByIdRef = useRef(lessonById);
  useEffect(() => {
    lessonByIdRef.current = lessonById;
  }, [lessonById]);

  const persistLessonsRef = useRef(persistLessons);
  useEffect(() => {
    persistLessonsRef.current = persistLessons;
  }, [persistLessons]);

  const adapter = useMemo(
    () =>
      createMasterFolderTreeTransactionAdapter({
        onApply: async (tx) => {
          const reorderedLessons = resolveKangurLessonOrderFromNodes(tx.nextNodes, lessonByIdRef.current);
          await persistLessonsRef.current(reorderedLessons);
          return tx.nextNodes;
        },
      }),
    []
  );

  const masterNodes = useMemo(
    () =>
      isCatalogMode ? buildKangurLessonCatalogMasterNodes(lessons) : buildKangurLessonMasterNodes(lessons),
    [isCatalogMode, lessons]
  );

  const {
    capabilities,
    appearance: { rootDropUi },
    controller,
    viewport: { scrollToNodeRef },
  } = useMasterFolderTreeShell({
    instance: activeTreeInstance,
    nodes: masterNodes,
    adapter,
  });
  const searchState = useMasterFolderTreeSearch(masterNodes, treeSearchQuery, {
    config: capabilities.search,
  });

  const openCreateModal = useCallback((): void => {
    setEditingLesson(null);
    setFormData(createInitialLessonFormData());
    setShowModal(true);
  }, []);

  const openEditModal = useCallback((lesson: KangurLesson): void => {
    setEditingLesson(lesson);
    setFormData(toLessonFormData(lesson));
    setShowModal(true);
  }, []);

  const applyTemplateForComponent = useCallback((componentId: KangurLessonComponentId): void => {
    const template = createKangurLessonDraft(componentId);
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

  const handleSaveLesson = useCallback(async (): Promise<void> => {
    const normalizedTitle = formData.title.trim();
    const normalizedDescription = formData.description.trim();
    if (!normalizedTitle) {
      toast('Lesson title is required.', { variant: 'error' });
      return;
    }
    if (!normalizedDescription) {
      toast('Lesson description is required.', { variant: 'error' });
      return;
    }

    const normalizedEmoji = formData.emoji.trim() || '📚';

    const nextSortOrder =
      lessons.reduce((maxSortOrder, lesson) => Math.max(maxSortOrder, lesson.sortOrder), 0) +
      KANGUR_LESSON_SORT_ORDER_GAP;

    const nextLesson: KangurLesson = editingLesson
      ? {
        ...editingLesson,
        componentId: formData.componentId,
        title: normalizedTitle,
        description: normalizedDescription,
        emoji: normalizedEmoji,
        color: formData.color,
        activeBg: formData.activeBg,
        enabled: formData.enabled,
      }
      : {
        id: createKangurLessonId(normalizedTitle),
        componentId: formData.componentId,
        title: normalizedTitle,
        description: normalizedDescription,
        emoji: normalizedEmoji,
        color: formData.color,
        activeBg: formData.activeBg,
        enabled: formData.enabled,
        sortOrder: nextSortOrder,
      };

    const nextLessons = editingLesson
      ? lessons.map((lesson) => (lesson.id === editingLesson.id ? nextLesson : lesson))
      : [...lessons, nextLesson];

    try {
      await persistLessons(nextLessons, {
        successMessage: editingLesson ? 'Lesson updated.' : 'Lesson created.',
      });
      setShowModal(false);
      setEditingLesson(null);
    } catch (error: unknown) {
      toast(error instanceof Error ? error.message : 'Failed to save lesson.', {
        variant: 'error',
      });
    }
  }, [editingLesson, formData, lessons, persistLessons, toast]);

  const handleDeleteLesson = useCallback(async (): Promise<void> => {
    if (!lessonToDelete) return;

    const nextLessons = lessons.filter((lesson) => lesson.id !== lessonToDelete.id);

    try {
      await persistLessons(nextLessons, { successMessage: 'Lesson removed.' });
    } catch (error: unknown) {
      toast(error instanceof Error ? error.message : 'Failed to remove lesson.', {
        variant: 'error',
      });
    } finally {
      setLessonToDelete(null);
    }
  }, [lessonToDelete, lessons, persistLessons, toast]);

  const geometryPackResult = useMemo(
    () => appendMissingGeometryKangurLessons(lessons),
    [lessons]
  );

  const handleAddGeometryPack = useCallback(async (): Promise<void> => {
    if (geometryPackResult.addedCount === 0) {
      toast('Geometry lesson pack is already present.', { variant: 'info' });
      return;
    }

    try {
      await persistLessons(geometryPackResult.lessons, {
        successMessage: `Added ${geometryPackResult.addedCount} geometry lesson${geometryPackResult.addedCount === 1 ? '' : 's'}.`,
      });
    } catch (error: unknown) {
      toast(error instanceof Error ? error.message : 'Failed to add geometry lessons.', {
        variant: 'error',
      });
    }
  }, [geometryPackResult, persistLessons, toast]);

  const renderNode = useCallback(
    (input: FolderTreeViewportRenderNodeInput): React.ReactNode => {
      const lessonId = fromKangurLessonNodeId(input.node.id);
      const lesson = lessonId ? lessonById.get(lessonId) ?? null : null;
      if (!lesson) {
        const lessonCount = readLessonGroupCount(input.node.metadata);
        return (
          <TreeRow
            depth={input.depth}
            baseIndent={8}
            indent={12}
            tone='subtle'
            selected={input.isSelected}
            selectedClassName='bg-muted text-white hover:bg-muted'
            className={cn(
              'h-9 text-xs',
              input.isDragging && 'opacity-50',
              input.isSearchMatch && !input.isSelected && 'ring-1 ring-cyan-400/40'
            )}
          >
            <div
              className='flex h-full w-full min-w-0 items-center gap-2 text-left'
              onClick={input.select}
              role='button'
              tabIndex={0}
              onKeyDown={(event: React.KeyboardEvent<HTMLDivElement>): void => {
                if (event.key !== 'Enter' && event.key !== ' ') return;
                event.preventDefault();
                input.select();
              }}
            >
              <button
                type='button'
                className='inline-flex size-5 shrink-0 items-center justify-center rounded text-gray-400 hover:bg-muted/40 hover:text-gray-200'
                onClick={(event): void => {
                  event.preventDefault();
                  event.stopPropagation();
                  input.toggleExpand();
                }}
                aria-label={input.isExpanded ? 'Collapse group' : 'Expand group'}
              >
                {input.hasChildren ? (
                  input.isExpanded ? (
                    <ChevronDown className='size-3.5' />
                  ) : (
                    <ChevronRight className='size-3.5' />
                  )
                ) : (
                  <span className='text-[10px] opacity-60'>•</span>
                )}
              </button>
              {input.isExpanded ? (
                <FolderOpen className='size-4 shrink-0 text-sky-300/90' />
              ) : (
                <Folder className='size-4 shrink-0 text-sky-300/70' />
              )}
              <div className='min-w-0 flex-1 truncate text-[12px] font-medium text-gray-200'>
                {input.node.name}
              </div>
              {lessonCount !== null ? (
                <Badge variant='outline' className='h-5 px-1.5 text-[10px]'>
                  {lessonCount}
                </Badge>
              ) : null}
            </div>
          </TreeRow>
        );
      }

      return (
        <TreeRow
          depth={input.depth}
          baseIndent={8}
          indent={12}
          tone='subtle'
          selected={input.isSelected}
          selectedClassName='bg-muted text-white hover:bg-muted'
          className={cn('h-11 text-xs', input.isDragging && 'opacity-50')}
        >
          <div
            className='flex h-full w-full min-w-0 items-center gap-2 text-left'
            onClick={input.select}
            role='button'
            tabIndex={0}
            onKeyDown={(event: React.KeyboardEvent<HTMLDivElement>): void => {
              if (event.key !== 'Enter' && event.key !== ' ') return;
              event.preventDefault();
              input.select();
            }}
          >
            <span className='inline-flex h-4 w-4 shrink-0 items-center justify-center opacity-0 transition-opacity group-hover:opacity-100'>
              <GripVertical className='size-3.5 cursor-grab text-gray-500' />
            </span>

            <span className='text-base leading-none'>{lesson.emoji}</span>

            <div className='min-w-0 flex-1'>
              <div className='truncate font-medium text-gray-100'>{lesson.title}</div>
              <div className='truncate text-[11px] text-gray-400'>{lesson.description}</div>
            </div>

            <Badge variant='outline' className='h-5 px-1.5 text-[10px] uppercase tracking-wide'>
              {lesson.componentId}
            </Badge>
            {!lesson.enabled ? (
              <Badge
                variant='outline'
                className='h-5 px-1.5 text-[10px] border-amber-400/40 text-amber-300'
              >
                Hidden
              </Badge>
            ) : null}

            <div className='inline-flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100'>
              <button
                type='button'
                className='inline-flex items-center justify-center rounded p-1 text-gray-400 hover:bg-gray-700/60 hover:text-white'
                onMouseDown={(event): void => event.stopPropagation()}
                onClick={(event): void => {
                  event.stopPropagation();
                  openEditModal(lesson);
                }}
                title='Edit lesson'
                aria-label='Edit lesson'
                disabled={updateSetting.isPending}
              >
                <Pencil className='size-3.5' />
              </button>
              <button
                type='button'
                className='inline-flex items-center justify-center rounded p-1 text-gray-400 hover:bg-red-500/20 hover:text-red-300'
                onMouseDown={(event): void => event.stopPropagation()}
                onClick={(event): void => {
                  event.stopPropagation();
                  setLessonToDelete(lesson);
                }}
                title='Delete lesson'
                aria-label='Delete lesson'
                disabled={updateSetting.isPending}
              >
                <Trash2 className='size-3.5' />
              </button>
            </div>
          </div>
        </TreeRow>
      );
    },
    [lessonById, openEditModal, updateSetting.isPending]
  );

  const isSaveDisabled = !formData.title.trim() || !formData.description.trim();
  const lessonCountLabel = `${lessons.length} lesson${lessons.length === 1 ? '' : 's'} configured`;
  const searchResultCountLabel = `${searchState.results.length} match${searchState.results.length === 1 ? '' : 'es'}`;
  const searchPlaceholder = isCatalogMode
    ? 'Search catalog groups and lessons…'
    : 'Search lessons, IDs, or component types…';

  return (
    <div className='container mx-auto space-y-6 py-8'>
      <SectionHeader
        title='Kangur Lessons Manager'
        subtitle={
          <Breadcrumbs
            items={[
              { label: 'Admin', href: '/admin' },
              { label: 'Kangur', href: '/admin/kangur' },
              { label: 'Lessons Manager' },
            ]}
          />
        }
      />

      <FolderTreePanel
        masterInstance={activeTreeInstance}
        className='h-[500px] rounded-lg border border-border bg-gray-900'
        bodyClassName='flex min-h-0 flex-1 flex-col'
        header={
          <div className='space-y-2 border-b border-border/60 px-2 py-2'>
            <div className='flex items-start justify-between gap-2'>
              <div className='min-w-0'>
                <div className='truncate text-sm font-semibold text-gray-100'>Lessons</div>
                <div className='mt-0.5 text-xs text-muted-foreground/80'>{lessonCountLabel}</div>
              </div>
              <div className='flex items-center gap-1'>
                <Button
                  onClick={(): void => {
                    void handleAddGeometryPack();
                  }}
                  size='sm'
                  variant='outline'
                  className='h-7 border px-2 text-[11px] font-semibold tracking-wide text-cyan-200 hover:bg-cyan-900/30'
                  disabled={updateSetting.isPending || geometryPackResult.addedCount === 0}
                >
                  <Sparkles className='mr-1 size-3.5' />
                  Add geometry pack
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
                  placeholder={searchPlaceholder}
                />
                {searchState.isActive ? (
                  <div className='text-[11px] text-muted-foreground/80'>{searchResultCountLabel}</div>
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
              rootDropUi={
                isCatalogMode
                  ? { ...rootDropUi, enabled: false }
                  : rootDropUi
              }
              renderNode={renderNode}
              enableDnd={!isCatalogMode && !updateSetting.isPending}
              emptyLabel='No lessons yet. Add the first lesson to start.'
            />
          </div>
        )}
      </FolderTreePanel>

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
        <div className='space-y-4'>
          <FormField label='Lesson Type'>
            <SelectSimple
              size='sm'
              value={formData.componentId}
              onValueChange={(value: string): void => {
                const matched = KANGUR_LESSON_COMPONENT_OPTIONS.find((option) => option.value === value);
                if (!matched) return;
                applyTemplateForComponent(matched.value);
              }}
              options={KANGUR_LESSON_COMPONENT_OPTIONS}
              triggerClassName='h-9'
            />
          </FormField>

          <FormField label='Title'>
            <Input
              value={formData.title}
              onChange={(event: React.ChangeEvent<HTMLInputElement>): void => {
                setFormData((current) => ({ ...current, title: event.target.value }));
              }}
              placeholder='Lesson title'
              className='h-9'
            />
          </FormField>

          <FormField label='Description'>
            <Textarea
              value={formData.description}
              onChange={(event: React.ChangeEvent<HTMLTextAreaElement>): void => {
                setFormData((current) => ({ ...current, description: event.target.value }));
              }}
              placeholder='Short lesson description'
              className='min-h-[90px]'
            />
          </FormField>

          <FormField label='Emoji'>
            <Input
              value={formData.emoji}
              onChange={(event: React.ChangeEvent<HTMLInputElement>): void => {
                setFormData((current) => ({ ...current, emoji: event.target.value }));
              }}
              placeholder='📚'
              className='h-9'
              maxLength={12}
            />
          </FormField>

          <div className='flex items-center justify-between rounded-md border border-border/50 bg-card/40 p-3'>
            <div>
              <div className='text-sm font-medium text-white'>Visible in lessons view</div>
              <div className='text-xs text-gray-400'>Disabled lessons are hidden from users.</div>
            </div>
            <Switch
              checked={formData.enabled}
              onCheckedChange={(checked: boolean): void => {
                setFormData((current) => ({ ...current, enabled: checked }));
              }}
            />
          </div>
        </div>
      </FormModal>
    </div>
  );
}
