import { buildKangurLessonDocumentNarrationScript } from '@/features/kangur/tts/script';
import type {
  ContextRegistryResolutionBundle,
  ContextRegistryRef,
  ContextRuntimeDocument,
} from '@/shared/contracts/ai-context-registry';
import type { KangurLesson, KangurLessonDocument } from '@/features/kangur/shared/contracts/kangur';
import { PAGE_CONTEXT_ENGINE_VERSION } from '@/shared/lib/ai-context-registry/page-context-shared';

export const KANGUR_ADMIN_LESSONS_MANAGER_CONTEXT_ROOT_IDS = [
  'page:kangur-admin-lessons-manager',
  'collection:kangur-lessons',
] as const;

const KANGUR_ADMIN_LESSONS_MANAGER_PROVIDER_ID = 'kangur-admin';
const KANGUR_ADMIN_LESSONS_MANAGER_ENTITY_TYPE = 'kangur_admin_lessons_manager_workspace';

const truncate = (value: string, maxLength: number): string =>
  value.length > maxLength ? `${value.slice(0, maxLength - 3)}...` : value;

const countBlocksByType = (document: KangurLessonDocument): Record<string, number> =>
  document.blocks.reduce<Record<string, number>>((counts, block) => {
    counts[block.type] = (counts[block.type] ?? 0) + 1;
    return counts;
  }, {});

const createRuntimeRef = (lessonId: string): ContextRegistryRef => ({
  id: `runtime:kangur-admin:lesson-editor:${encodeURIComponent(lessonId)}`,
  kind: 'runtime_document',
  providerId: KANGUR_ADMIN_LESSONS_MANAGER_PROVIDER_ID,
  entityType: KANGUR_ADMIN_LESSONS_MANAGER_ENTITY_TYPE,
});

export const buildKangurAdminLessonsManagerContextBundle = (input: {
  lessonCount: number;
  lesson: Pick<KangurLesson, 'id' | 'title' | 'description' | 'componentId' | 'contentMode'> | null;
  document: KangurLessonDocument | null;
  isEditorOpen: boolean;
  isSaving: boolean;
}): ContextRegistryResolutionBundle | null => {
  const lesson = input.lesson;
  const document = input.document;
  if (!input.isEditorOpen || !lesson || !document) {
    return null;
  }

  const ref = createRuntimeRef(lesson.id);
  const script = buildKangurLessonDocumentNarrationScript({
    lessonId: lesson.id,
    title: lesson.title,
    description: lesson.description ?? '',
    document,
  });
  const blockCounts = countBlocksByType(document);
  const documentNode: ContextRuntimeDocument = {
    id: ref.id,
    kind: 'runtime_document',
    entityType: KANGUR_ADMIN_LESSONS_MANAGER_ENTITY_TYPE,
    title: `Kangur lesson editor: ${lesson.title}`,
    summary:
      'Active admin lesson editor draft used for lesson narration previews, document authoring, and content persistence.',
    status: input.isSaving ? 'saving' : 'editing',
    tags: ['kangur', 'admin', 'lessons', 'editor', 'tts'],
    relatedNodeIds: [
      'page:kangur-admin-lessons-manager',
      'component:kangur-lesson-narration-panel',
      'action:kangur-lesson-tts',
      'collection:kangur-lessons',
    ],
    timestamps: {
      updatedAt: document.updatedAt ?? null,
    },
    facts: {
      lessonId: lesson.id,
      lessonTitle: lesson.title,
      componentId: lesson.componentId,
      contentMode: lesson.contentMode,
      lessonCount: input.lessonCount,
      pageCount: document.pages?.length ?? 0,
      blockCount: document.blocks.length,
      blockCounts,
      narrationVoice: document.narration?.voice ?? null,
      narrationLocale: document.narration?.locale ?? null,
      scriptLocale: script.locale,
      scriptSegmentCount: script.segments.length,
      isSaving: input.isSaving,
    },
    sections: [
      {
        kind: 'items',
        title: 'Narration segment preview',
        summary: 'First narration segments derived from the current lesson draft.',
        items: script.segments.slice(0, 6).map((segment) => ({
          id: segment.id,
          textPreview: truncate(segment.text, 180),
        })),
      },
    ],
    provenance: {
      source: 'client',
      feature: 'kangur-admin-lessons-manager',
    },
  };

  return {
    refs: [ref],
    nodes: [],
    documents: [documentNode],
    truncated: false,
    engineVersion: PAGE_CONTEXT_ENGINE_VERSION,
  };
};
