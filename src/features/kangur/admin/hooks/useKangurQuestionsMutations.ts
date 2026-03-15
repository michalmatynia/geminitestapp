import { useCallback, useState } from 'react';

import type { KangurTestQuestion } from '@/shared/contracts/kangur-tests';
import { useUpdateSetting } from '@/shared/hooks/use-settings';
import { useToast } from '@/shared/ui';
import { logClientError } from '@/shared/utils/observability/client-error-logger';
import { serializeSetting } from '@/shared/utils/settings-json';

import {
  applyPublishedQuestionEditPolicy,
  KANGUR_TEST_QUESTIONS_SETTING_KEY,
  createKangurTestQuestion,
  deleteKangurTestQuestion,
  formDataToQuestion,
  parseKangurTestQuestionStore,
  publishReadyQuestions,
  reorderQuestions,
  toQuestionFormData,
  upsertKangurTestQuestion,
  type QuestionFormData,
} from '../../test-questions';
import {
  canonicalizeKangurTestSuites,
  KANGUR_TEST_SUITES_SETTING_KEY,
  demoteKangurTestSuitesToDraft,
  promoteKangurTestSuitesLive,
} from '../../test-suites';
import {
  clearQuestionEditorDraft,
  QUESTION_EDITOR_NEW_DRAFT_SLOT,
} from '../question-editor-drafts';
import type { KangurTestSuite } from '@/shared/contracts/kangur-tests';

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
    try {
      const { store: nextStore, publishedQuestionIds } = publishReadyQuestions(questionStore, {
        suiteId: suite.id,
        questionIds: currentPublishableQuestionIds,
      });
      await updateSetting.mutateAsync({
        key: KANGUR_TEST_QUESTIONS_SETTING_KEY,
        value: serializeSetting(nextStore),
      });
      toast(
        `Published ${publishedQuestionIds.length} ready question${publishedQuestionIds.length === 1 ? '' : 's'}.`,
        { variant: 'success' }
      );
    } catch (error) {
      logClientError(error);
      logClientError(error, {
        context: {
          source: 'KangurQuestionsManagerPanel',
          action: 'publishReadyForCurrentSuite',
          suiteId: suite.id,
        },
      });
      toast('Failed to publish ready questions.', { variant: 'error' });
    }
  }, [currentPublishableQuestionIds, questionStore, suite.id, toast, updateSetting]);

  const handlePublishAndGoLiveCurrentSuite = useCallback(async (): Promise<void> => {
    try {
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
      toast(
        `Published ${publishedQuestionIds.length} ready question and marked live.`,
        { variant: 'success' }
      );
    } catch (error) {
      logClientError(error);
      logClientError(error, {
        context: {
          source: 'KangurQuestionsManagerPanel',
          action: 'publishAndGoLiveCurrentSuite',
          suiteId: suite.id,
        },
      });
      toast('Failed to publish and go live.', { variant: 'error' });
    }
  }, [currentPublishableQuestionIds, questionStore, suite.id, suites, toast, updateSetting]);

  const handleGoLiveCurrentSuite = useCallback(async (): Promise<void> => {
    try {
      const { suites: nextSuites } = promoteKangurTestSuitesLive(suites, {
        suiteIds: [suite.id],
      });
      await updateSetting.mutateAsync({
        key: KANGUR_TEST_SUITES_SETTING_KEY,
        value: serializeSetting(canonicalizeKangurTestSuites(nextSuites)),
      });
      toast(
        `Suite is now live.`,
        { variant: 'success' }
      );
    } catch (error) {
      logClientError(error);
      logClientError(error, {
        context: {
          source: 'KangurQuestionsManagerPanel',
          action: 'goLiveCurrentSuite',
          suiteId: suite.id,
        },
      });
      toast('Failed to mark suite live.', { variant: 'error' });
    }
  }, [suite.id, suites, toast, updateSetting]);

  const handleTakeCurrentSuiteOffline = useCallback(async (): Promise<void> => {
    try {
      const { suites: nextSuites } = demoteKangurTestSuitesToDraft(suites, {
        suiteIds: [suite.id],
      });
      await updateSetting.mutateAsync({
        key: KANGUR_TEST_SUITES_SETTING_KEY,
        value: serializeSetting(canonicalizeKangurTestSuites(nextSuites)),
      });
      toast(
        `Suite is now offline.`,
        { variant: 'success' }
      );
    } catch (error) {
      logClientError(error);
      logClientError(error, {
        context: {
          source: 'KangurQuestionsManagerPanel',
          action: 'takeCurrentSuiteOffline',
          suiteId: suite.id,
        },
      });
      toast('Failed to take suite offline.', { variant: 'error' });
    }
  }, [suite.id, suites, toast, updateSetting]);

  const handleSave = async (): Promise<void> => {
    if (!editingQuestion || !formData) return;
    try {
      const savedDraft = formDataToQuestion(
        formData,
        editingQuestion.id,
        suite.id,
        editingQuestion.sortOrder
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
      const activeDraftQuestionId = isNewQuestion ? QUESTION_EDITOR_NEW_DRAFT_SLOT : editingQuestion.id;
      clearQuestionEditorDraft(suite.id, activeDraftQuestionId);
      await maybeTakeSuiteOfflineAfterQuestionMutation(nextStore);
      toast('Question saved.', { variant: 'success' });
      closeEditor();
    } catch (error) {
      logClientError(error);
      logClientError(error, { context: { source: 'KangurQuestionsManagerPanel', action: 'save' } });
      toast('Failed to save question.', { variant: 'error' });
    }
  };

  const handleDelete = async (): Promise<void> => {
    if (!questionToDelete) return;
    try {
      const nextStore = deleteKangurTestQuestion(questionStore, questionToDelete.id);
      await updateSetting.mutateAsync({
        key: KANGUR_TEST_QUESTIONS_SETTING_KEY,
        value: serializeSetting(nextStore),
      });
      clearQuestionEditorDraft(suite.id, questionToDelete.id);
      await maybeTakeSuiteOfflineAfterQuestionMutation(nextStore);
      toast('Question deleted.', { variant: 'success' });
      setQuestionToDelete(null);
    } catch (error) {
      logClientError(error);
      logClientError(error, {
        context: { source: 'KangurQuestionsManagerPanel', action: 'delete' },
      });
      toast('Failed to delete question.', { variant: 'error' });
    }
  };

  const handleDuplicate = async (q: KangurTestQuestion): Promise<void> => {
    try {
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
      await maybeTakeSuiteOfflineAfterQuestionMutation(nextStore);
      toast('Question duplicated.', { variant: 'success' });
    } catch (error) {
      logClientError(error);
      logClientError(error, {
        context: { source: 'KangurQuestionsManagerPanel', action: 'duplicate' },
      });
      toast('Failed to duplicate question.', { variant: 'error' });
    }
  };

  const handleMove = async (fromIndex: number, toIndex: number): Promise<void> => {
    try {
      const moved = reorderQuestions(moveItem(questions, fromIndex, toIndex));
      let nextStore = { ...questionStore };
      for (const q of moved) {
        nextStore = upsertKangurTestQuestion(nextStore, q);
      }
      await updateSetting.mutateAsync({
        key: KANGUR_TEST_QUESTIONS_SETTING_KEY,
        value: serializeSetting(nextStore),
      });
    } catch (error) {
      logClientError(error);
      logClientError(error, { context: { source: 'KangurQuestionsManagerPanel', action: 'move' } });
      toast('Failed to reorder questions.', { variant: 'error' });
    }
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
