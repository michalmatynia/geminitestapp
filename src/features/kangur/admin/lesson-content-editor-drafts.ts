import type { KangurLesson, KangurLessonDocument } from '@/features/kangur/shared/contracts/kangur';
import { logClientError } from '@/features/kangur/shared/utils/observability/client-error-logger';


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

  try {
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
  } catch (error) {
    logClientError(error);
    return null;
  }
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

  try {
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
  } catch (error) {
    logClientError(error);
    return null;
  }
};

export const clearLessonContentEditorDraft = (lessonId: string): void => {
  if (typeof window === 'undefined') return;

  try {
    window.localStorage.removeItem(getLessonContentEditorDraftStorageKey(lessonId));
  } catch (error) {
    logClientError(error);
  
    // Ignore storage failures.
  }
};
