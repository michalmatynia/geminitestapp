'use client';

import { Folders, ListOrdered, Plus, Sparkles } from 'lucide-react';
import React, { useCallback, useEffect, useMemo, useState } from 'react';

import {
  createMasterFolderTreeTransactionAdapter,
  FolderTreeViewportV2,
  useMasterFolderTreeShell,
  type FolderTreeViewportRenderNodeInput,
} from '@/features/foldertree';
import { FolderTreeSearchBar, useMasterFolderTreeSearch } from '@/features/foldertree';
import { DEFAULT_KANGUR_AGE_GROUP, KANGUR_AGE_GROUPS } from '@/features/kangur/lessons/lesson-catalog';
import type {
  KangurLesson,
  KangurLessonAgeGroup,
  KangurLessonComponentId,
} from '@/features/kangur/shared/contracts/kangur';
import {
  ContextRegistryPageProvider,
  useRegisterContextRegistryPageSource,
} from '@/shared/lib/ai-context-registry/page-context';
import {
  Badge,
  Button,
  FolderTreePanel,
  FormModal,
  Skeleton,
  useToast,
} from '@/features/kangur/shared/ui';
import { ConfirmModal } from '@/features/kangur/shared/ui/templates/modals';
import { cn } from '@/features/kangur/shared/utils';
import {
  withKangurClientError,
  withKangurClientErrorSync,
} from '@/features/kangur/observability/client';
import {
  useKangurLessonDocuments,
  useKangurLessons,
  useUpdateKangurLessonDocuments,
  useUpdateKangurLessons,
} from '@/features/kangur/ui/hooks/useKangurLessons';

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
  removeKangurLessonDocument,
  resolveKangurLessonDocumentPages,
  updateKangurLessonDocumentPages,
  updateKangurLessonDocumentTimestamp,
} from '../lesson-documents';
import {
  appendMissingKangurLessonsByComponent,
  KANGUR_GEOMETRY_LESSON_COMPONENT_IDS,
  KANGUR_LOGICAL_THINKING_LESSON_COMPONENT_IDS,
  KANGUR_LESSON_LIBRARY,
  KANGUR_LESSON_SORT_ORDER_GAP,
  canonicalizeKangurLessons,
  createKangurLessonId,
} from '../settings';
import { KangurAdminContentShell } from './components/KangurAdminContentShell';
import { KangurAdminStatusCard } from './components/KangurAdminStatusCard';
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
  const lessonsQuery = useKangurLessons();
  const lessonDocumentsQuery = useKangurLessonDocuments();
  const updateLessons = useUpdateKangurLessons();
  const updateLessonDocuments = useUpdateKangurLessonDocuments();
  const { toast } = useToast();
  const isLoading = lessonsQuery.isLoading || lessonDocumentsQuery.isLoading;

  const lessons = useMemo((): KangurLesson[] => lessonsQuery.data ?? [], [lessonsQuery.data]);
  const lessonDocuments = useMemo(
    () => lessonDocumentsQuery.data ?? {},
    [lessonDocumentsQuery.data]
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
  const [ageGroupFilter, setAgeGroupFilter] = useState<'all' | KangurLessonAgeGroup>('all');
  const isCatalogMode = treeMode === 'catalog';
  const activeTreeInstance = isCatalogMode ? CATALOG_TREE_INSTANCE : ORDERED_TREE_INSTANCE;
  const treeSearchQuery = isCatalogMode ? catalogTreeSearchQuery : orderedTreeSearchQuery;
  const isSaving = updateLessons.isPending || updateLessonDocuments.isPending;
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
    withKangurClientErrorSync(
      {
        source: 'kangur.admin.lessons-manager',
        action: 'persist-tree-mode',
        description: 'Persists the lessons manager tree mode selection.',
        context: { treeMode },
      },
      () => {
        window.localStorage.setItem(TREE_MODE_STORAGE_KEY, treeMode);
      },
      { fallback: undefined }
    );
  }, [treeMode]);

  const authoringFilteredLessons = useMemo(
    () =>
      lessons.filter((lesson) =>
        matchesKangurLessonAuthoringFilter(authoringFilter, lesson, lessonDocuments)
      ),
    [authoringFilter, lessonDocuments, lessons]
  );
  const ageGroupCounts = useMemo(() => {
    const counts = new Map<KangurLessonAgeGroup, number>();
    KANGUR_AGE_GROUPS.forEach((group) => counts.set(group.id, 0));
    authoringFilteredLessons.forEach((lesson) => {
      counts.set(lesson.ageGroup, (counts.get(lesson.ageGroup) ?? 0) + 1);
    });
    return counts;
  }, [authoringFilteredLessons]);
  const filteredLessons = useMemo(() => {
    if (ageGroupFilter === 'all') {
      return authoringFilteredLessons;
    }
    return authoringFilteredLessons.filter((lesson) => lesson.ageGroup === ageGroupFilter);
  }, [ageGroupFilter, authoringFilteredLessons]);
  const filterCounts = useMemo(
    () => getKangurLessonAuthoringFilterCounts(lessons, lessonDocuments),
    [lessonDocuments, lessons]
  );
  const filterCountMap = useMemo(
    () => new Map(filterCounts.map((filter) => [filter.id, filter])),
    [filterCounts]
  );

  const masterNodes = useMemo(
    () =>
      isCatalogMode
        ? buildKangurLessonCatalogMasterNodes(filteredLessons)
        : buildKangurLessonMasterNodes(filteredLessons),
    [filteredLessons, isCatalogMode]
  );

  const packAgeGroups = useMemo(() => {
    const uniqueAgeGroups = Array.from(new Set(lessons.map((lesson) => lesson.ageGroup)));
    return uniqueAgeGroups.length > 0 ? uniqueAgeGroups : [DEFAULT_KANGUR_AGE_GROUP];
  }, [lessons]);

  const geometryPackAddedCount = useMemo(
    () =>
      appendMissingKangurLessonsByComponent(
        lessons,
        KANGUR_GEOMETRY_LESSON_COMPONENT_IDS,
        packAgeGroups
      ).addedCount,
    [lessons, packAgeGroups]
  );
  const logicPackAddedCount = useMemo(
    () =>
      appendMissingKangurLessonsByComponent(
        lessons,
        KANGUR_LOGICAL_THINKING_LESSON_COMPONENT_IDS,
        packAgeGroups
      ).addedCount,
    [lessons, packAgeGroups]
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
          await updateLessons.mutateAsync(nextLessons);
        },
      }),
    [isCatalogMode, lessonById, lessons, updateLessons]
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
    const didSave = await withKangurClientError(
      {
        source: 'kangur.admin.lessons-manager',
        action: 'save-lesson-svg',
        description: 'Saves the SVG block into the lesson document.',
        context: { lessonId: svgModalLesson.id },
      },
      async () => {
        const sanitized = sanitizeSvgMarkup(markup);
        const existingDoc =
          lessonDocuments[svgModalLesson.id] ?? createDefaultKangurLessonDocument();
        const pages = resolveKangurLessonDocumentPages(existingDoc);
        const firstPage = pages[0];
        if (!firstPage) {
          toast('No pages in lesson document.', { variant: 'error' });
          return false;
        }

        const svgBlockIndex = firstPage.blocks.findIndex((b) => b.type === 'svg');
        const nextBlocks =
          svgBlockIndex !== -1
            ? firstPage.blocks.map((b, i) =>
              i === svgBlockIndex && b.type === 'svg' ? { ...b, markup: sanitized, viewBox } : b
            )
            : [
              { ...createKangurLessonSvgBlock(), markup: sanitized, viewBox },
              ...firstPage.blocks,
            ];

        const nextPages = pages.map((p, i) => (i === 0 ? { ...p, blocks: nextBlocks } : p));
        const nextDoc = updateKangurLessonDocumentPages(existingDoc, nextPages);
        const nextStore = { ...lessonDocuments, [svgModalLesson.id]: nextDoc };

        await updateLessonDocuments.mutateAsync(nextStore);

        if (svgModalLesson.contentMode !== 'document') {
          const nextLessonRecord: KangurLesson = { ...svgModalLesson, contentMode: 'document' };
          const nextLessons = canonicalizeKangurLessons(upsertLesson(lessons, nextLessonRecord));
          await updateLessons.mutateAsync(nextLessons);
        }

        return true;
      },
      {
        fallback: false,
        onError: () => {
          toast('Failed to save SVG.', { variant: 'error' });
        },
      }
    );

    if (didSave) {
      toast('SVG image saved.', { variant: 'success' });
      setSvgModalLesson(null);
    }
  };

  const applyTemplateForComponent = useCallback((componentId: KangurLessonComponentId): void => {
    const template = KANGUR_LESSON_LIBRARY[componentId];
    if (!template) return;
    setFormData((current) => ({
      ...current,
      componentId,
      subject: template.subject ?? 'maths',
      ageGroup: template.ageGroup ?? DEFAULT_KANGUR_AGE_GROUP,
      title: template.title,
      description: template.description,
      emoji: template.emoji,
      color: template.color,
      activeBg: template.activeBg,
    }));
  }, []);

  const handleSaveLesson = async (): Promise<void> => {
    const lessonId = editingLesson?.id ?? createKangurLessonId();
    const nextLesson: KangurLesson = {
      ...formData,
      id: lessonId,
      sortOrder: editingLesson?.sortOrder ?? lessons.length * KANGUR_LESSON_SORT_ORDER_GAP,
    };

    const didSave = await withKangurClientError(
      {
        source: 'kangur.admin.lessons-manager',
        action: 'save-lesson',
        description: 'Creates or updates a Kangur lesson entry.',
        context: {
          lessonId,
          isEdit: Boolean(editingLesson),
          contentMode: nextLesson.contentMode,
        },
      },
      async () => {
        const nextLessons = canonicalizeKangurLessons(upsertLesson(lessons, nextLesson));
        await updateLessons.mutateAsync(nextLessons);
        return true;
      },
      {
        fallback: false,
        onError: () => {
          toast('Failed to save lesson.', { variant: 'error' });
        },
      }
    );

    if (didSave) {
      toast(editingLesson ? 'Lesson updated.' : 'Lesson created.', { variant: 'success' });
      setShowModal(false);

      if (!editingLesson && nextLesson.contentMode === 'document') {
        openContentModal(nextLesson);
      }

      setEditingLesson(null);
    }
  };

  const handleDeleteLesson = async (): Promise<void> => {
    if (!lessonToDelete) return;
    const lessonId = lessonToDelete.id;
    const didDelete = await withKangurClientError(
      {
        source: 'kangur.admin.lessons-manager',
        action: 'delete-lesson',
        description: 'Deletes a Kangur lesson entry and related documents.',
        context: { lessonId },
      },
      async () => {
        const nextLessons = canonicalizeKangurLessons(
          lessons.filter((lesson) => lesson.id !== lessonId)
        );
        await updateLessons.mutateAsync(nextLessons);

        const nextLessonDocuments = removeKangurLessonDocument(lessonDocuments, lessonId);
        if (nextLessonDocuments !== lessonDocuments) {
          await updateLessonDocuments.mutateAsync(nextLessonDocuments);
        }
        clearLessonContentEditorDraft(lessonId);
        return true;
      },
      {
        fallback: false,
        onError: () => {
          toast('Failed to delete lesson.', { variant: 'error' });
        },
      }
    );

    if (didDelete) {
      toast('Lesson deleted.', { variant: 'success' });
      setLessonToDelete(null);
    }
  };

  const handleSaveLessonContent = async (): Promise<void> => {
    if (!editingContentLesson) return;
    const lessonId = editingContentLesson.id;
    const didSave = await withKangurClientError(
      {
        source: 'kangur.admin.lessons-manager',
        action: 'save-lesson-content',
        description: 'Saves the lesson document content for the editor.',
        context: { lessonId },
      },
      async () => {
        const nextDocument = updateKangurLessonDocumentTimestamp(contentDraft);
        const nextStore = {
          ...lessonDocuments,
          [lessonId]: nextDocument,
        };
        await updateLessonDocuments.mutateAsync(nextStore);

        const nextLesson: KangurLesson = { ...editingContentLesson, contentMode: 'document' };
        const nextLessons = canonicalizeKangurLessons(upsertLesson(lessons, nextLesson));
        await updateLessons.mutateAsync(nextLessons);
        clearLessonContentEditorDraft(lessonId);
        return true;
      },
      {
        fallback: false,
        onError: () => {
          toast('Failed to save lesson content.', { variant: 'error' });
        },
      }
    );

    if (didSave) {
      toast('Lesson content saved.', { variant: 'success' });
      setShowContentModal(false);
      setEditingContentLesson(null);
    }
  };

  const handleClearLessonContent = async (): Promise<void> => {
    if (!editingContentLesson) return;
    const lessonId = editingContentLesson.id;
    const didClear = await withKangurClientError(
      {
        source: 'kangur.admin.lessons-manager',
        action: 'clear-lesson-content',
        description: 'Clears custom lesson content and restores component mode.',
        context: { lessonId },
      },
      async () => {
        const nextLesson: KangurLesson = { ...editingContentLesson, contentMode: 'component' };
        const nextLessons = canonicalizeKangurLessons(upsertLesson(lessons, nextLesson));
        await updateLessons.mutateAsync(nextLessons);

        const nextStore = { ...lessonDocuments };
        delete nextStore[lessonId];
        await updateLessonDocuments.mutateAsync(nextStore);
        clearLessonContentEditorDraft(lessonId);
        return true;
      },
      {
        fallback: false,
        onError: () => {
          toast('Failed to clear content.', { variant: 'error' });
        },
      }
    );

    if (didClear) {
      toast('Custom content cleared.', { variant: 'success' });
      setContentDraft(createDefaultKangurLessonDocument());
    }
  };

  const handleImportLegacyLesson = (): void => {
    if (!editingContentLesson) return;
    let didError = false;
    const result = withKangurClientErrorSync(
      {
        source: 'kangur.admin.lessons-manager',
        action: 'import-legacy-lesson',
        description: 'Imports a legacy lesson document into the editor.',
        context: { componentId: editingContentLesson.componentId },
      },
      () => importLegacyKangurLessonDocument(editingContentLesson.componentId),
      {
        fallback: null,
        onError: () => {
          didError = true;
          toast('Failed to import legacy lesson.', { variant: 'error' });
        },
      }
    );
    if (!result) {
      if (!didError) {
        toast('No legacy importer available for this lesson type.', { variant: 'warning' });
      }
      return;
    }
    setContentDraft(result.document);
    toast('Legacy lesson imported. Review and save to apply.', { variant: 'success' });
  };

  const handleAddGeometryPack = async (): Promise<void> => {
    const didAdd = await withKangurClientError(
      {
        source: 'kangur.admin.lessons-manager',
        action: 'add-geometry-pack',
        description: 'Appends missing geometry lessons to the catalog.',
      },
      async () => {
        const result = appendMissingKangurLessonsByComponent(
          lessons,
          KANGUR_GEOMETRY_LESSON_COMPONENT_IDS,
          packAgeGroups
        );
        const nextLessons = canonicalizeKangurLessons(result.lessons);
        await updateLessons.mutateAsync(nextLessons);
        return true;
      },
      {
        fallback: false,
        onError: () => {
          toast('Failed to add geometry pack.', { variant: 'error' });
        },
      }
    );

    if (didAdd) {
      toast('Geometry lesson pack added.', { variant: 'success' });
    }
  };

  const handleAddLogicalThinkingPack = async (): Promise<void> => {
    const didAdd = await withKangurClientError(
      {
        source: 'kangur.admin.lessons-manager',
        action: 'add-logic-pack',
        description: 'Appends missing logical thinking lessons to the catalog.',
      },
      async () => {
        const result = appendMissingKangurLessonsByComponent(
          lessons,
          KANGUR_LOGICAL_THINKING_LESSON_COMPONENT_IDS,
          packAgeGroups
        );
        const nextLessons = canonicalizeKangurLessons(result.lessons);
        await updateLessons.mutateAsync(nextLessons);
        return true;
      },
      {
        fallback: false,
        onError: () => {
          toast('Failed to add logic pack.', { variant: 'error' });
        },
      }
    );

    if (didAdd) {
      toast('Logical thinking lesson pack added.', { variant: 'success' });
    }
  };

  const handleImportAllLessonsToEditor = async (): Promise<void> => {
    let updatedCount = 0;
    const didImport = await withKangurClientError(
      {
        source: 'kangur.admin.lessons-manager',
        action: 'import-all-lessons',
        description: 'Imports all legacy lessons into the modular editor.',
      },
      async () => {
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
          return false;
        }

        await updateLessonDocuments.mutateAsync(nextStore);
        return true;
      },
      {
        fallback: false,
        onError: () => {
          toast('Failed to import all lessons.', { variant: 'error' });
        },
      }
    );

    if (didImport) {
      toast(`Imported ${updatedCount} lessons to modular editor.`, { variant: 'success' });
    }
  };

  const isSaveDisabled = !formData.title.trim() || isSaving;
  const lessonsNeedingLegacyImport = countLessonsRequiringLegacyImport(lessons, lessonDocuments);
  const activeFilterLabel =
    filterCounts.find((filter) => filter.id === authoringFilter)?.label ?? 'All lessons';
  const activeAgeGroupLabel =
    ageGroupFilter === 'all'
      ? 'All ages'
      : (KANGUR_AGE_GROUPS.find((group) => group.id === ageGroupFilter)?.label ??
        ageGroupFilter);
  const needsFixesCount = filterCountMap.get('needsFixes')?.count ?? 0;
  const missingNarrationCount = filterCountMap.get('missingNarration')?.count ?? 0;
  const hiddenLessonCount = filterCountMap.get('hidden')?.count ?? 0;
  const needsAttention =
    lessonsNeedingLegacyImport > 0 || needsFixesCount > 0 || missingNarrationCount > 0;
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
        isUpdating={isSaving}
      />
    ),
    [lessonById, lessonDocuments, isSaving]
  );

  const mainWorkspace = (
    <div className='flex h-full flex-col gap-6 overflow-hidden'>
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
                    disabled={isSaving}
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
                    disabled={isSaving}
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
                  disabled={isSaving || geometryPackAddedCount === 0}
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
                  disabled={isSaving || logicPackAddedCount === 0}
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
                  disabled={isSaving || lessons.length === 0}
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
                  disabled={isSaving}
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
                        authoringFilter === filter.id
                          ? activeSegmentClassName
                          : inactiveSegmentClassName
                      )}
                      onClick={(): void => setAuthoringFilter(filter.id)}
                      disabled={isSaving}
                    >
                      {filter.label}
                      <span className='ml-1 text-[10px] text-current/75'>{filter.count}</span>
                    </Button>
                  ))}
                </div>
              </div>

              <div className='space-y-2'>
                <div className={filterSectionLabelClassName}>Age groups</div>
                <div className='flex flex-wrap items-center gap-1.5'>
                  <Button
                    type='button'
                    size='sm'
                    variant='outline'
                    className={cn(
                      'h-8 rounded-xl px-3 text-xs font-semibold',
                      ageGroupFilter === 'all' ? activeSegmentClassName : inactiveSegmentClassName
                    )}
                    onClick={(): void => setAgeGroupFilter('all')}
                    disabled={isSaving}
                  >
                    All ages
                    <span className='ml-1 text-[10px] text-current/75'>
                      {authoringFilteredLessons.length}
                    </span>
                  </Button>
                  {KANGUR_AGE_GROUPS.map((group) => (
                    <Button
                      key={group.id}
                      type='button'
                      size='sm'
                      variant='outline'
                      className={cn(
                        'h-8 rounded-xl px-3 text-xs font-semibold',
                        ageGroupFilter === group.id
                          ? activeSegmentClassName
                          : inactiveSegmentClassName
                      )}
                      onClick={(): void => setAgeGroupFilter(group.id)}
                      disabled={isSaving}
                    >
                      {group.label}
                      <span className='ml-1 text-[10px] text-current/75'>
                        {ageGroupCounts.get(group.id) ?? 0}
                      </span>
                    </Button>
                  ))}
                </div>
              </div>

              <div className='flex flex-wrap items-center gap-2'>
                <span className='text-xs text-muted-foreground'>
                  {isCatalogMode
                    ? 'Catalog mode groups lessons by visibility, age group, and lesson type.'
                    : 'Ordered mode supports drag-and-drop reordering.'}
                  {authoringFilter !== 'all'
                    ? ` Showing ${filteredLessons.length} matching lessons.`
                    : ''}
                  {ageGroupFilter !== 'all' && authoringFilter === 'all'
                    ? ` Showing ${filteredLessons.length} lessons for ${activeAgeGroupLabel}.`
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
        {isLoading ? (
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
              enableDnd={
                !isCatalogMode && authoringFilter === 'all' && ageGroupFilter === 'all' && !isSaving
              }
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
        isSaving={isSaving}
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
        isSaving={isSaving}
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
        isSaving={isSaving}
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

  const content = standalone ? (
    <div className='grid gap-6 xl:grid-cols-[minmax(0,3fr)_minmax(0,1fr)]'>
      <div className='min-h-0'>{mainWorkspace}</div>
      <KangurAdminStatusCard
        title='Status'
        statusBadge={
          <Badge variant={needsAttention ? 'warning' : 'secondary'}>
            {needsAttention ? 'Needs attention' : 'Healthy'}
          </Badge>
        }
        items={[
          {
            label: 'View mode',
            value: <Badge variant='outline'>{isCatalogMode ? 'Catalog' : 'Ordered'}</Badge>,
          },
          {
            label: 'Filter',
            value: <Badge variant='outline'>{activeFilterLabel}</Badge>,
          },
          {
            label: 'Age group',
            value: <Badge variant='outline'>{activeAgeGroupLabel}</Badge>,
          },
          {
            label: 'Lessons',
            value: <span className='text-foreground font-semibold'>{filteredLessons.length}</span>,
          },
          {
            label: 'Needs import',
            value: (
              <span className='text-foreground font-semibold'>{lessonsNeedingLegacyImport}</span>
            ),
          },
          {
            label: 'Needs fixes',
            value: <span className='text-foreground font-semibold'>{needsFixesCount}</span>,
          },
          {
            label: 'Missing narration',
            value: <span className='text-foreground font-semibold'>{missingNarrationCount}</span>,
          },
          {
            label: 'Hidden lessons',
            value: <span className='text-foreground font-semibold'>{hiddenLessonCount}</span>,
          },
        ]}
      />
    </div>
  ) : (
    mainWorkspace
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
