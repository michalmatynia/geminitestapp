'use client';

import { useCallback, useState } from 'react';

import type { KangurTestQuestion } from '@/features/kangur/shared/contracts/kangur-tests';
import { useUpdateSetting } from '@/shared/hooks/use-settings';
import { useToast } from '@/features/kangur/shared/ui';
import { serializeSetting } from '@/features/kangur/shared/utils/settings-json';
import { withKangurClientError } from '@/features/kangur/observability/client';

import {
  applyPublishedQuestionEditPolicy,
  KANGUR_TEST_QUESTIONS_SETTING_KEY,
  createKangurTestQuestion,
  deleteKangurTestQuestion,
  formDataToQuestion,
  type parseKangurTestQuestionStore,
  publishReadyQuestions,
  reorderQuestions,
  shouldDemotePublishedQuestionAfterEdit,
  toQuestionFormData,
  upsertKangurTestQuestion,
  type QuestionFormData,
} from '../../test-suites/questions';
import {
  canonicalizeKangurTestSuites,
  KANGUR_TEST_SUITES_SETTING_KEY,
  demoteInvalidLiveKangurTestSuites,
  demoteKangurTestSuitesToDraft,
  promoteKangurTestSuitesLive,
} from '../../test-suites';
import {
  clearQuestionEditorDraft,
  QUESTION_EDITOR_NEW_DRAFT_SLOT,
} from '../question-editor-drafts';
import { moveItem } from '../utils';
import type { KangurTestSuite } from '@/features/kangur/shared/contracts/kangur-tests';

const buildQuestionEditorSnapshot = (
  question: KangurTestQuestion,
  formData: QuestionFormData
): string =>
  JSON.stringify({
    question,
    formData,
  });

export function useKangurQuestionsMutations(
  suite: KangurTestSuite,
  suites: KangurTestSuite[],
  questionStore: Record<string, KangurTestQuestion>,
  questions: KangurTestQuestion[],
  currentPublishableQuestionIds: string[]
) {
  const updateSetting = useUpdateSetting();
  const { toast } = useToast();

  const [editingQuestion, setEditingQuestion] = useState<KangurTestQuestion | null>(null);
  const [isNewQuestion, setIsNewQuestion] = useState(false);
  const [formData, setFormData] = useState<QuestionFormData | null>(null);
  const [showEditor, setShowEditor] = useState(false);
  const [questionToDelete, setQuestionToDelete] = useState<KangurTestQuestion | null>(null);
  const [discardConfirmOpen, setDiscardConfirmOpen] = useState(false);
  const [initialEditorSnapshot, setInitialEditorSnapshot] = useState<string | null>(null);
  const [localDraftSavedAt, setLocalDraftSavedAt] = useState<string | null>(null);
  const [restorableDraftSavedAt, setRestorableDraftSavedAt] = useState<string | null>(null);

  const openEditor = useCallback(
    (question: KangurTestQuestion, nextIsNewQuestion: boolean): void => {
      const nextFormData = toQuestionFormData(question);
      setEditingQuestion(question);
      setFormData(nextFormData);
      setIsNewQuestion(nextIsNewQuestion);
      setShowEditor(true);
      setDiscardConfirmOpen(false);
      setLocalDraftSavedAt(null);
      setRestorableDraftSavedAt(null);
      setInitialEditorSnapshot(buildQuestionEditorSnapshot(question, nextFormData));
    },
    []
  );

  const closeEditor = useCallback((): void => {
    setShowEditor(false);
    setEditingQuestion(null);
    setFormData(null);
    setIsNewQuestion(false);
    setDiscardConfirmOpen(false);
    setInitialEditorSnapshot(null);
    setLocalDraftSavedAt(null);
    setRestorableDraftSavedAt(null);
  }, []);

  const openCreate = (): void => {
    openEditor(createKangurTestQuestion(suite.id, (questions.length + 1) * 1000), true);
  };

  const openEdit = (q: KangurTestQuestion): void => {
    openEditor(q, false);
  };

  const maybeTakeSuiteOfflineAfterQuestionMutation = useCallback(
    async (nextQuestionStore: ReturnType<typeof parseKangurTestQuestionStore>): Promise<boolean> => {
      const demotion = demoteInvalidLiveKangurTestSuites(suites, nextQuestionStore, {
        suiteIds: [suite.id],
      });

      if (demotion.draftSuiteIds.length === 0) {
        return false;
      }

      await updateSetting.mutateAsync({
        key: KANGUR_TEST_SUITES_SETTING_KEY,
        value: serializeSetting(demotion.suites),
      });

      return true;
    },
    [suite.id, suites, updateSetting]
  );

  const handlePublishReadyForCurrentSuite = useCallback(async (): Promise<void> => {
    const publishResult = await withKangurClientError(
      {
        source: 'kangur.admin.questions',
        action: 'publish-ready-questions',
        description: 'Publishes ready questions for the current test suite.',
        context: { suiteId: suite.id },
      },
      async () => {
        const { store: nextStore, publishedQuestionIds } = publishReadyQuestions(questionStore, {
          suiteId: suite.id,
          questionIds: currentPublishableQuestionIds,
        });
        await updateSetting.mutateAsync({
          key: KANGUR_TEST_QUESTIONS_SETTING_KEY,
          value: serializeSetting(nextStore),
        });
        return { questionCount: publishedQuestionIds.length };
      },
      {
        fallback: null,
        onError: () => {
          toast('Failed to publish ready questions.', { variant: 'error' });
        },
      }
    );

    if (publishResult) {
      const questionCount = publishResult.questionCount;
      toast(
        `Published ${questionCount} ready question${questionCount === 1 ? '' : 's'} in ${suite.title}.`,
        { variant: 'success' }
      );
    }
  }, [currentPublishableQuestionIds, questionStore, suite.id, toast, updateSetting]);

  const handlePublishAndGoLiveCurrentSuite = useCallback(async (): Promise<void> => {
    const publishResult = await withKangurClientError(
      {
        source: 'kangur.admin.questions',
        action: 'publish-and-go-live',
        description: 'Publishes ready questions and marks the suite live.',
        context: { suiteId: suite.id },
      },
      async () => {
        const { store: nextStore, publishedQuestionIds } = publishReadyQuestions(questionStore, {
          suiteId: suite.id,
          questionIds: currentPublishableQuestionIds,
        });
        await updateSetting.mutateAsync({
          key: KANGUR_TEST_QUESTIONS_SETTING_KEY,
          value: serializeSetting(nextStore),
        });

        const { suites: nextSuites } = promoteKangurTestSuitesLive(suites, {
          suiteIds: [suite.id],
        });
        await updateSetting.mutateAsync({
          key: KANGUR_TEST_SUITES_SETTING_KEY,
          value: serializeSetting(canonicalizeKangurTestSuites(nextSuites)),
        });

        return { questionCount: publishedQuestionIds.length };
      },
      {
        fallback: null,
        onError: () => {
          toast('Failed to publish and go live.', { variant: 'error' });
        },
      }
    );

    if (publishResult) {
      const questionCount = publishResult.questionCount;
      toast(
        `Published ${questionCount} ready question${questionCount === 1 ? '' : 's'} and marked ${suite.title} live for learners (1 suite updated).`,
        { variant: 'success' }
      );
    }
  }, [currentPublishableQuestionIds, questionStore, suite.id, suites, toast, updateSetting]);

  const handleGoLiveCurrentSuite = useCallback(async (): Promise<void> => {
    const didGoLive = await withKangurClientError(
      {
        source: 'kangur.admin.questions',
        action: 'go-live-suite',
        description: 'Marks the current suite as live.',
        context: { suiteId: suite.id },
      },
      async () => {
        const { suites: nextSuites } = promoteKangurTestSuitesLive(suites, {
          suiteIds: [suite.id],
        });
        await updateSetting.mutateAsync({
          key: KANGUR_TEST_SUITES_SETTING_KEY,
          value: serializeSetting(canonicalizeKangurTestSuites(nextSuites)),
        });
        return true;
      },
      {
        fallback: false,
        onError: () => {
          toast('Failed to mark suite live.', { variant: 'error' });
        },
      }
    );

    if (didGoLive) {
      toast(`Suite ${suite.title} is now live for learners (1 suite updated).`, {
        variant: 'success',
      });
    }
  }, [suite.id, suites, toast, updateSetting]);

  const handleTakeCurrentSuiteOffline = useCallback(async (): Promise<void> => {
    const didTakeOffline = await withKangurClientError(
      {
        source: 'kangur.admin.questions',
        action: 'take-suite-offline',
        description: 'Demotes the current suite to draft status.',
        context: { suiteId: suite.id },
      },
      async () => {
        const { suites: nextSuites } = demoteKangurTestSuitesToDraft(suites, {
          suiteIds: [suite.id],
        });
        await updateSetting.mutateAsync({
          key: KANGUR_TEST_SUITES_SETTING_KEY,
          value: serializeSetting(canonicalizeKangurTestSuites(nextSuites)),
        });
        return true;
      },
      {
        fallback: false,
        onError: () => {
          toast('Failed to take suite offline.', { variant: 'error' });
        },
      }
    );

    if (didTakeOffline) {
      toast(`Suite ${suite.title} is now offline for learners (1 suite updated).`, {
        variant: 'success',
      });
    }
  }, [suite.id, suites, toast, updateSetting]);

  const handleSave = async (): Promise<void> => {
    if (!editingQuestion || !formData) return;
    const saveResult = await withKangurClientError(
      {
        source: 'kangur.admin.questions',
        action: 'save-question',
        description: 'Saves the current test question draft.',
        context: { suiteId: suite.id, questionId: editingQuestion.id, isNewQuestion },
      },
      async () => {
        const savedDraft = formDataToQuestion(
          formData,
          editingQuestion.id,
          suite.id,
          editingQuestion.sortOrder
        );
        const wasDemotedByPolicy = shouldDemotePublishedQuestionAfterEdit(
          editingQuestion,
          savedDraft
        );
        const saved = applyPublishedQuestionEditPolicy(
          isNewQuestion ? null : editingQuestion,
          savedDraft
        );
        const nextStore = upsertKangurTestQuestion(questionStore, saved);
        await updateSetting.mutateAsync({
          key: KANGUR_TEST_QUESTIONS_SETTING_KEY,
          value: serializeSetting(nextStore),
        });
        const activeDraftQuestionId = isNewQuestion
          ? QUESTION_EDITOR_NEW_DRAFT_SLOT
          : editingQuestion.id;
        clearQuestionEditorDraft(suite.id, activeDraftQuestionId);
        const suiteWasDemoted = await maybeTakeSuiteOfflineAfterQuestionMutation(nextStore);
        return { wasDemotedByPolicy, suiteWasDemoted };
      },
      {
        fallback: null,
        onError: () => {
          toast('Failed to save question.', { variant: 'error' });
        },
      }
    );

    if (saveResult) {
      if (saveResult.wasDemotedByPolicy) {
        toast(
          'Question updated. Learner-facing changes moved this published question back to draft.',
          { variant: 'warning' }
        );
      } else if (saveResult.suiteWasDemoted) {
        toast(
          'Question saved. The live suite was taken offline because its published question set changed.',
          { variant: 'warning' }
        );
      } else {
        toast('Question saved.', { variant: 'success' });
      }
      closeEditor();
    }
  };

  const handleDelete = async (): Promise<void> => {
    if (!questionToDelete) return;
    const deleteResult = await withKangurClientError(
      {
        source: 'kangur.admin.questions',
        action: 'delete-question',
        description: 'Deletes the selected test question.',
        context: { suiteId: suite.id, questionId: questionToDelete.id },
      },
      async () => {
        const nextStore = deleteKangurTestQuestion(questionStore, questionToDelete.id);
        await updateSetting.mutateAsync({
          key: KANGUR_TEST_QUESTIONS_SETTING_KEY,
          value: serializeSetting(nextStore),
        });
        clearQuestionEditorDraft(suite.id, questionToDelete.id);
        const suiteWasDemoted = await maybeTakeSuiteOfflineAfterQuestionMutation(nextStore);
        return { suiteWasDemoted };
      },
      {
        fallback: null,
        onError: () => {
          toast('Failed to delete question.', { variant: 'error' });
        },
      }
    );

    if (deleteResult) {
      if (deleteResult.suiteWasDemoted) {
        toast(
          'Question deleted. The live suite was taken offline because its published question set changed.',
          { variant: 'warning' }
        );
      } else {
        toast('Question deleted.', { variant: 'success' });
      }
      setQuestionToDelete(null);
    }
  };

  const handleDuplicate = async (q: KangurTestQuestion): Promise<void> => {
    const duplicateResult = await withKangurClientError(
      {
        source: 'kangur.admin.questions',
        action: 'duplicate-question',
        description: 'Creates a duplicate of the selected test question.',
        context: { suiteId: suite.id, questionId: q.id },
      },
      async () => {
        const duped: KangurTestQuestion = {
          ...q,
          id: Math.random().toString(36).slice(2, 9), // Fallback if no helper
          sortOrder: q.sortOrder + 500,
          prompt: `${q.prompt} (copy)`,
          editorial: {
            ...q.editorial,
            workflowStatus: 'draft',
            publishedAt: undefined,
          },
        };
        const nextStore = upsertKangurTestQuestion(questionStore, duped);
        await updateSetting.mutateAsync({
          key: KANGUR_TEST_QUESTIONS_SETTING_KEY,
          value: serializeSetting(nextStore),
        });
        const suiteWasDemoted = await maybeTakeSuiteOfflineAfterQuestionMutation(nextStore);
        return { suiteWasDemoted };
      },
      {
        fallback: null,
        onError: () => {
          toast('Failed to duplicate question.', { variant: 'error' });
        },
      }
    );

    if (duplicateResult) {
      if (duplicateResult.suiteWasDemoted) {
        toast(
          'Question duplicated. The live suite was taken offline because its published question set changed.',
          { variant: 'warning' }
        );
      } else {
        toast('Question duplicated.', { variant: 'success' });
      }
    }
  };

  const handleMove = async (fromIndex: number, toIndex: number): Promise<void> => {
    await withKangurClientError(
      {
        source: 'kangur.admin.questions',
        action: 'reorder-questions',
        description: 'Reorders test questions within the suite.',
        context: { suiteId: suite.id, fromIndex, toIndex },
      },
      async () => {
        const moved = reorderQuestions(moveItem(questions, fromIndex, toIndex));
        let nextStore = { ...questionStore };
        for (const q of moved) {
          nextStore = upsertKangurTestQuestion(nextStore, q);
        }
        await updateSetting.mutateAsync({
          key: KANGUR_TEST_QUESTIONS_SETTING_KEY,
          value: serializeSetting(nextStore),
        });
      },
      {
        fallback: undefined,
        onError: () => {
          toast('Failed to reorder questions.', { variant: 'error' });
        },
      }
    );
  };

  return {
    editingQuestion,
    setEditingQuestion,
    isNewQuestion,
    setIsNewQuestion,
    formData,
    setFormData,
    showEditor,
    setShowEditor,
    questionToDelete,
    setQuestionToDelete,
    discardConfirmOpen,
    setDiscardConfirmOpen,
    initialEditorSnapshot,
    setInitialEditorSnapshot,
    localDraftSavedAt,
    setLocalDraftSavedAt,
    restorableDraftSavedAt,
    setRestorableDraftSavedAt,
    openEditor,
    closeEditor,
    openCreate,
    openEdit,
    handlePublishReadyForCurrentSuite,
    handlePublishAndGoLiveCurrentSuite,
    handleGoLiveCurrentSuite,
    handleTakeCurrentSuiteOffline,
    handleSave,
    handleDelete,
    handleDuplicate,
    handleMove,
    isSaving: updateSetting.isPending,
  };
}
