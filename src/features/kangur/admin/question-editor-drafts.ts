'use client';

import type { KangurTestQuestion } from '@/shared/contracts/kangur-tests';

import type { QuestionFormData } from '../test-questions';

const QUESTION_EDITOR_DRAFT_STORAGE_PREFIX = 'kangur-question-editor-draft:v1:';

export const QUESTION_EDITOR_NEW_DRAFT_SLOT = '__new__';

type QuestionEditorLocalDraft = {
  version: 1;
  suiteId: string;
  questionId: string;
  isNewQuestion: boolean;
  question: KangurTestQuestion;
  formData: QuestionFormData;
  savedAt: string;
};

const getQuestionEditorDraftStorageKey = (suiteId: string, questionId: string): string =>
  `${QUESTION_EDITOR_DRAFT_STORAGE_PREFIX}${suiteId}:${questionId}`;

export const readQuestionEditorDraft = (
  suiteId: string,
  questionId: string
): QuestionEditorLocalDraft | null => {
  if (typeof window === 'undefined') return null;

  try {
    const raw = window.localStorage.getItem(getQuestionEditorDraftStorageKey(suiteId, questionId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as QuestionEditorLocalDraft;
    if (
      parsed?.version !== 1 ||
      parsed.suiteId !== suiteId ||
      parsed.questionId !== questionId ||
      typeof parsed.isNewQuestion !== 'boolean' ||
      !parsed.question ||
      !parsed.formData ||
      typeof parsed.savedAt !== 'string'
    ) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
};

export const writeQuestionEditorDraft = ({
  suiteId,
  questionId,
  isNewQuestion,
  question,
  formData,
  savedAt = new Date().toISOString(),
}: {
  suiteId: string;
  questionId: string;
  isNewQuestion: boolean;
  question: KangurTestQuestion;
  formData: QuestionFormData;
  savedAt?: string;
}): string | null => {
  if (typeof window === 'undefined') return null;

  try {
    window.localStorage.setItem(
      getQuestionEditorDraftStorageKey(suiteId, questionId),
      JSON.stringify({
        version: 1,
        suiteId,
        questionId,
        isNewQuestion,
        question,
        formData,
        savedAt,
      } satisfies QuestionEditorLocalDraft)
    );
    return savedAt;
  } catch {
    return null;
  }
};

export const clearQuestionEditorDraft = (suiteId: string, questionId: string): void => {
  if (typeof window === 'undefined') return;

  try {
    window.localStorage.removeItem(getQuestionEditorDraftStorageKey(suiteId, questionId));
  } catch {
    // Ignore storage failures.
  }
};
