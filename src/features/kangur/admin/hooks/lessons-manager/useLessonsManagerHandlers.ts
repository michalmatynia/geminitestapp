import { useCallback } from 'react';
import type { KangurLesson } from '@/features/kangur/shared/contracts/kangur';
import type {
  KangurLessonTemplate,
  KangurLessonTemplateComponentContent,
} from '@/shared/contracts/kangur-lesson-templates';
import { useToast } from '@/features/kangur/shared/ui';
import { withKangurClientError } from '@/features/kangur/observability/client';
import { buildLessonsManagerErrorReport } from '../../AdminKangurLessonsManagerPage.shared';
import { 
  upsertLesson, 
  sanitizeSvgMarkup, 
  toLocalizedLessonFormData, 
  resolveLessonComponentContentJson,
  createInitialLessonFormData,
} from '../../utils';
import { 
  createStarterKangurLessonDocument, 
  removeKangurLessonDocument, 
  resolveKangurLessonDocumentPages, 
  updateKangurLessonDocumentPages, 
  updateKangurLessonDocumentTimestamp, 
  createDefaultKangurLessonDocument, 
  createKangurLessonSvgBlock, 
  hasKangurLessonDocumentContent 
} from '../../../lesson-documents';
import { 
  createKangurLessonId,
  KANGUR_LESSON_SORT_ORDER_GAP, 
  parseKangurLessonTemplateComponentContentJson, 
  canonicalizeKangurLessons, 
  appendMissingKangurLessonsByComponent, 
  KANGUR_LESSON_COMPONENT_OPTIONS, 
  appendMissingGeometryKangurLessons, 
  appendMissingLogicalThinkingKangurLessons 
} from '../../../settings';
import { importLegacyKangurLessonDocument } from '../../../lessons/import-legacy';
import { clearLessonContentEditorDraft } from '../../lesson-content-editor-drafts';
import type { LessonFormData } from '../../types';
import type { UseLessonsUiStateReturn } from './useLessonsUiState';
import type { UseMutationResult } from '@tanstack/react-query';

export function useLessonsManagerHandlers(params: {
  lessons: KangurLesson[];
  lessonDocuments: Record<string, any>;
  lessonById: Map<string, KangurLesson>;
  lessonTemplateMap: Map<string, KangurLessonTemplate>;
  templatesQueryData: KangurLessonTemplate[] | undefined;
  updateLessons: UseMutationResult<any, any, any>;
  updateLessonDocuments: UseMutationResult<any, any, any>;
  updateTemplates: UseMutationResult<any, any, any>;
  ui: UseLessonsUiStateReturn;
  isPrimaryContentLocale: boolean;
  showComponentContentEditor: boolean;
}) {
  const { toast } = useToast();
  const { 
    lessons, lessonDocuments, lessonById, lessonTemplateMap, templatesQueryData, 
    updateLessons, updateLessonDocuments, updateTemplates, ui, isPrimaryContentLocale, showComponentContentEditor 
  } = params;

  const handleCloseModal = (): void => {
    ui.setShowModal(false);
    ui.setEditingLesson(null);
    ui.setFormData(createInitialLessonFormData());
    ui.setComponentContentJson('');
  };

  const handleCreate = (): void => {
    ui.setFormData(createInitialLessonFormData());
    ui.setComponentContentJson('');
    ui.setEditingLesson(null);
    ui.setShowModal(true);
  };

  const handleEdit = useCallback(
    (lesson: KangurLesson): void => {
      const template = lessonTemplateMap.get(lesson.componentId);
      ui.setFormData(toLocalizedLessonFormData(lesson, template));
      ui.setComponentContentJson(resolveLessonComponentContentJson(lesson.componentId, template));
      ui.setEditingLesson(lesson);
      ui.setShowModal(true);
    },
    [lessonTemplateMap, ui]
  );

  const handleEditContent = useCallback(
    (lesson: KangurLesson): void => {
      const document = lessonDocuments[lesson.id];
      ui.setContentDraft(document ?? createStarterKangurLessonDocument(lesson.componentId));
      ui.setEditingContentLesson(lesson);
      ui.setShowContentModal(true);
    },
    [lessonDocuments, ui]
  );

  const openLessonContentEditor = useCallback(
    (lesson: KangurLesson, document?: any): void => {
      ui.setContentDraft(document ?? lessonDocuments[lesson.id] ?? createStarterKangurLessonDocument(lesson.componentId));
      ui.setEditingContentLesson(lesson);
      ui.setShowContentModal(true);
    },
    [lessonDocuments, ui]
  );

  const handleComponentChange = useCallback(
    (componentId: string): void => {
      const nextComponentId = componentId as LessonFormData['componentId'];
      ui.setFormData((current: LessonFormData) => ({ ...current, componentId: nextComponentId }));
      ui.setComponentContentJson(resolveLessonComponentContentJson(nextComponentId, lessonTemplateMap.get(nextComponentId)));
    },
    [lessonTemplateMap, ui]
  );

  const buildPersistedLessonRecord = useCallback(
    (lessonId: string, source: LessonFormData | KangurLesson, sortOrder: number): KangurLesson => {
      const existingLesson = lessonById.get(lessonId);
      const useExisting = !isPrimaryContentLocale && Boolean(existingLesson);

      const pick = <K extends keyof KangurLesson>(key: K): KangurLesson[K] =>
        useExisting && existingLesson?.[key] !== undefined
          ? existingLesson[key]
          : (source as KangurLesson)[key];

      return {
        id: lessonId,
        componentId: source.componentId,
        contentMode: source.contentMode,
        subject: source.subject,
        ageGroup: source.ageGroup,
        title: pick('title'),
        description: pick('description'),
        emoji: pick('emoji'),
        color: pick('color'),
        activeBg: pick('activeBg'),
        sortOrder,
        enabled: source.enabled,
        sectionId: existingLesson?.sectionId,
        subsectionId: existingLesson?.subsectionId,
      };
    },
    [isPrimaryContentLocale, lessonById]
  );

  const saveLocalizedLessonTemplate = useCallback(
    async (source: LessonFormData | KangurLesson, componentContent?: KangurLessonTemplateComponentContent): Promise<void> => {
      const existingTemplate = lessonTemplateMap.get(source.componentId);
      const nextTemplate: KangurLessonTemplate = {
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
        componentContent: componentContent === undefined ? existingTemplate?.componentContent : componentContent,
      };
      const nextTemplates = [...(templatesQueryData ?? [])]
        .filter((template) => template.componentId !== source.componentId)
        .concat(nextTemplate)
        .sort((left, right) =>
          left.sortOrder === right.sortOrder
            ? left.componentId.localeCompare(right.componentId)
            : left.sortOrder - right.sortOrder
        );
      await updateTemplates.mutateAsync(nextTemplates);
    },
    [lessonTemplateMap, templatesQueryData, updateTemplates]
  );

  const handleSave = async (): Promise<void> => {
    await withKangurClientError(
      buildLessonsManagerErrorReport('lesson-save', 'Saves lesson metadata.', {
        lessonId: ui.editingLesson?.id,
        componentId: ui.formData.componentId,
      }),
      async () => {
        const lessonId = ui.editingLesson?.id ?? createKangurLessonId(ui.formData.componentId);
        const sortOrder = ui.editingLesson?.sortOrder ?? (lessons.length > 0 ? Math.max(...lessons.map((l) => l.sortOrder)) + KANGUR_LESSON_SORT_ORDER_GAP : 0);
        const nextLesson = buildPersistedLessonRecord(lessonId, ui.formData, sortOrder);
        const nextLessons = upsertLesson(lessons, nextLesson);
        const shouldOpenContentEditor = ui.formData.contentMode === 'document' && ui.editingLesson?.contentMode !== 'document';
        await updateLessons.mutateAsync(nextLessons);

        const componentContent = showComponentContentEditor ? parseKangurLessonTemplateComponentContentJson(ui.formData.componentId, ui.componentContentJson) : undefined;
        await saveLocalizedLessonTemplate(ui.formData, componentContent);

        toast('Lesson saved', { variant: 'success' });
        handleCloseModal();
        if (shouldOpenContentEditor) {
          openLessonContentEditor(nextLesson, lessonDocuments[lessonId] ?? createStarterKangurLessonDocument(nextLesson.componentId));
        }
      }
    );
  };

  const handleDelete = async (): Promise<void> => {
    const lessonToDelete = ui.lessonToDelete;
    if (!lessonToDelete) return;
    await withKangurClientError(
      buildLessonsManagerErrorReport('lesson-delete', 'Deletes a lesson and its content document.', { lessonId: lessonToDelete.id }),
      async () => {
        const nextLessons = lessons.filter((lesson) => lesson.id !== lessonToDelete.id);
        await updateLessons.mutateAsync(nextLessons);
        const nextDocuments = removeKangurLessonDocument(lessonDocuments, lessonToDelete.id);
        await updateLessonDocuments.mutateAsync(nextDocuments);
        toast('Lesson deleted', { variant: 'success' });
        ui.setLessonToDelete(null);
      }
    );
  };

  const handleSaveContent = async (): Promise<void> => {
    const editingContentLesson = ui.editingContentLesson;
    if (!editingContentLesson) return;
    await withKangurClientError(
      buildLessonsManagerErrorReport('lesson-content-save', 'Saves the lesson document editor content.', { lessonId: editingContentLesson.id }),
      async () => {
        const pages = resolveKangurLessonDocumentPages(ui.contentDraft);
        const nextDocument = updateKangurLessonDocumentPages(ui.contentDraft, pages);
        const nextLesson = buildPersistedLessonRecord(editingContentLesson.id, editingContentLesson, editingContentLesson.sortOrder);
        const baseLessons = lessonById.has(editingContentLesson.id) ? lessons : upsertLesson(lessons, editingContentLesson);
        const nextLessons = upsertLesson(baseLessons, nextLesson);
        await updateLessons.mutateAsync(nextLessons);
        await saveLocalizedLessonTemplate(nextLesson);
        await updateLessonDocuments.mutateAsync({ ...lessonDocuments, [editingContentLesson.id]: nextDocument });
        clearLessonContentEditorDraft(editingContentLesson.id);
        toast('Content saved', { variant: 'success' });
        ui.setShowContentModal(false);
        ui.setEditingContentLesson(null);
      }
    );
  };

  const handleClearContent = async (): Promise<void> => {
    const editingContentLesson = ui.editingContentLesson;
    if (!editingContentLesson) return;
    await withKangurClientError(
      buildLessonsManagerErrorReport('lesson-content-clear', 'Clears the lesson document and restores component mode.', { lessonId: editingContentLesson.id }),
      async () => {
        const nextLesson = buildPersistedLessonRecord(editingContentLesson.id, { ...editingContentLesson, contentMode: 'component' }, editingContentLesson.sortOrder);
        const nextLessons = upsertLesson(lessons, nextLesson);
        const nextDocuments = removeKangurLessonDocument(lessonDocuments, editingContentLesson.id);
        await updateLessons.mutateAsync(nextLessons);
        await updateLessonDocuments.mutateAsync(nextDocuments);
        clearLessonContentEditorDraft(editingContentLesson.id);
        ui.setContentDraft(createDefaultKangurLessonDocument());
        toast('Content cleared', { variant: 'success' });
        ui.setShowContentModal(false);
        ui.setEditingContentLesson(null);
      }
    );
  };

  const handleCanonicalize = async (): Promise<void> => {
    await withKangurClientError(
      buildLessonsManagerErrorReport('lessons-canonicalize', 'Canonicalizes lesson ordering and identifiers.'),
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
        buildLessonsManagerErrorReport('lesson-legacy-import', 'Imports legacy lesson content into the editor.', { lessonId: lesson.id, componentId: lesson.componentId }),
        async () => {
          const result = importLegacyKangurLessonDocument(lesson.componentId);
          if (!result) {
            toast('Legacy importer not found', { variant: 'error' });
            return;
          }
          await updateLessonDocuments.mutateAsync({ ...lessonDocuments, [lesson.id]: result.document });
          if (ui.editingContentLesson?.id === lesson.id) {
            ui.setContentDraft(result.document);
          }
          toast('Legacy content imported', { variant: 'success' });
        }
      );
    },
    [lessons, lessonDocuments, ui, toast, updateLessonDocuments]
  );

  const handleSaveQuickSvg = async (markup: string): Promise<void> => {
    const svgModalLesson = ui.svgModalLesson;
    if (!svgModalLesson) return;
    await withKangurClientError(
      buildLessonsManagerErrorReport('lesson-quick-svg-save', 'Adds a quick SVG block to the lesson document.', { lessonId: svgModalLesson.id }),
      async () => {
        const block = { ...createKangurLessonSvgBlock(), markup: sanitizeSvgMarkup(markup) };
        const document = lessonDocuments[svgModalLesson.id] ?? createDefaultKangurLessonDocument();
        const pages = resolveKangurLessonDocumentPages(document);
        const firstPage = pages[0] ?? { id: 'p1', sectionKey: '', title: '', description: '', blocks: [] };
        const nextPages = [{ ...firstPage, blocks: [...firstPage.blocks, block] }, ...pages.slice(1)];
        const nextDocument = updateKangurLessonDocumentTimestamp(updateKangurLessonDocumentPages(document, nextPages));
        await updateLessonDocuments.mutateAsync({ ...lessonDocuments, [svgModalLesson.id]: nextDocument });
        toast('SVG added to lesson', { variant: 'success' });
        ui.setSvgModalLesson(null);
        ui.setSvgModalInitialMarkup('');
      }
    );
  };

  const handleAppendMissing = async (): Promise<void> => {
    await withKangurClientError(
      buildLessonsManagerErrorReport('lessons-append-missing', 'Adds missing lessons for the known component catalog.'),
      async () => {
        const result = appendMissingKangurLessonsByComponent(lessons, KANGUR_LESSON_COMPONENT_OPTIONS.map((o) => o.value));
        await updateLessons.mutateAsync(result.lessons);
        toast(`Added ${result.addedCount} missing lessons`, { variant: 'success' });
      }
    );
  };

  const handleAddGeometryPack = async (): Promise<void> => {
    await withKangurClientError(
      buildLessonsManagerErrorReport('lessons-append-geometry', 'Adds missing geometry lessons from the Kangur lesson catalog.'),
      async () => {
        const result = appendMissingGeometryKangurLessons(lessons);
        await updateLessons.mutateAsync(result.lessons);
        toast(`Added ${result.addedCount} geometry lessons`, { variant: 'success' });
      }
    );
  };

  const handleAddLogicalThinkingPack = async (): Promise<void> => {
    await withKangurClientError(
      buildLessonsManagerErrorReport('lessons-append-logical-thinking', 'Adds missing logical thinking lessons from the Kangur lesson catalog.'),
      async () => {
        const result = appendMissingLogicalThinkingKangurLessons(lessons);
        await updateLessons.mutateAsync(result.lessons);
        toast(`Added ${result.addedCount} logical thinking lessons`, { variant: 'success' });
      }
    );
  };

  const handleImportAllLessonsToEditor = async (): Promise<void> => {
    await withKangurClientError(
      buildLessonsManagerErrorReport('lessons-import-all', 'Imports all eligible lessons into modular editor drafts.'),
      async () => {
        const nextDocuments = { ...lessonDocuments };
        const importedLessonIds = new Set<string>();

        lessons.forEach((lesson) => {
          const needsImport = lesson.contentMode !== 'document' && !hasKangurLessonDocumentContent(lessonDocuments[lesson.id]);
          if (!needsImport) return;
          const result = importLegacyKangurLessonDocument(lesson.componentId);
          if (!result) return;
          nextDocuments[lesson.id] = result.document;
          importedLessonIds.add(lesson.id);
        });

        if (importedLessonIds.size === 0) {
          toast('No lessons need importing right now.', { variant: 'info' });
          return;
        }

        const nextLessons = lessons.map((lesson) => importedLessonIds.has(lesson.id) ? { ...lesson, contentMode: 'document' as const } : lesson);
        await updateLessonDocuments.mutateAsync(nextDocuments);
        await updateLessons.mutateAsync(nextLessons);
        toast(`Imported ${importedLessonIds.size} lessons to modular editor.`, { variant: 'success' });
      }
    );
  };

  return {
    handleCloseModal, handleCreate, handleEdit, handleEditContent, openLessonContentEditor,
    handleComponentChange, handleSave, handleDelete, handleSaveContent, handleClearContent,
    handleCanonicalize, handleImportLegacy, handleQuickAddSvg: ui.setSvgModalLesson, handleSaveQuickSvg,
    handleAppendMissing, handleAddGeometryPack, handleAddLogicalThinkingPack, handleImportAllLessonsToEditor
  };
}
