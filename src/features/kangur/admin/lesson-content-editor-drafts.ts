import type { KangurLesson, KangurLessonDocument } from '@/features/kangur/shared/contracts/kangur';
import { withKangurClientErrorSync } from '@/features/kangur/observability/client';

const LESSON_CONTENT_EDITOR_DRAFT_STORAGE_PREFIX = 'kangur-lesson-editor-draft:v1:';

type LessonContentEditorLocalDraft = {
  version: 1;
  lesson: KangurLesson;
  document: KangurLessonDocument;
  savedAt: string;
};

const getLessonContentEditorDraftStorageKey = (lessonId: string): string =>
  `${LESSON_CONTENT_EDITOR_DRAFT_STORAGE_PREFIX}${lessonId}`;

export const readLessonContentEditorDraft = (
  lessonId: string
): LessonContentEditorLocalDraft | null => {
  if (typeof window === 'undefined') return null;

  return withKangurClientErrorSync(
    {
      source: 'kangur.admin.lesson-content-editor-drafts',
      action: 'read',
      description: 'Reads the lesson content editor draft from local storage.',
      context: { lessonId },
    },
    () => {
      const raw = window.localStorage.getItem(getLessonContentEditorDraftStorageKey(lessonId));
      if (!raw) return null;
      const parsed = JSON.parse(raw) as LessonContentEditorLocalDraft;
      if (
        parsed?.version !== 1 ||
        !parsed.lesson ||
        !parsed.document ||
        typeof parsed.savedAt !== 'string'
      ) {
        return null;
      }
      return parsed;
    },
    { fallback: null }
  );
};

export const writeLessonContentEditorDraft = ({
  lesson,
  document,
  savedAt = new Date().toISOString(),
}: {
  lesson: KangurLesson;
  document: KangurLessonDocument;
  savedAt?: string;
}): string | null => {
  if (typeof window === 'undefined') return null;

  return withKangurClientErrorSync(
    {
      source: 'kangur.admin.lesson-content-editor-drafts',
      action: 'write',
      description: 'Persists the lesson content editor draft in local storage.',
      context: { lessonId: lesson.id },
    },
    () => {
      window.localStorage.setItem(
        getLessonContentEditorDraftStorageKey(lesson.id),
        JSON.stringify({
          version: 1,
          lesson,
          document,
          savedAt,
        } satisfies LessonContentEditorLocalDraft)
      );
      return savedAt;
    },
    { fallback: null }
  );
};

export const clearLessonContentEditorDraft = (lessonId: string): void => {
  if (typeof window === 'undefined') return;

  withKangurClientErrorSync(
    {
      source: 'kangur.admin.lesson-content-editor-drafts',
      action: 'clear',
      description: 'Clears the lesson content editor draft from local storage.',
      context: { lessonId },
    },
    () => {
      window.localStorage.removeItem(getLessonContentEditorDraftStorageKey(lessonId));
    },
    { fallback: undefined }
  );
};
