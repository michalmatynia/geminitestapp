'use client';

import { ArrowDown, ArrowUp, Copy, Plus, Trash2 } from 'lucide-react';
import React, { useMemo, useState } from 'react';

import type { KangurTestQuestion } from '@/shared/contracts/kangur-tests';
import { useUpdateSetting } from '@/shared/hooks/use-settings';
import { useSettingsStore } from '@/shared/providers/SettingsStoreProvider';
import { Badge, Button, FormModal, Input, useToast } from '@/shared/ui';
import { ConfirmModal } from '@/shared/ui/templates/modals';
import { logClientError } from '@/shared/utils/observability/client-error-logger';
import { serializeSetting } from '@/shared/utils/settings-json';

import {
  applyPublishedQuestionEditPolicy,
  KANGUR_TEST_QUESTIONS_SETTING_KEY,
  createKangurTestQuestion,
  createKangurTestQuestionId,
  deleteKangurTestQuestion,
  formDataToQuestion,
  getQuestionsForSuite,
  hasIllustration,
  hasRichChoiceContent,
  parseKangurTestQuestionStore,
  publishReadyQuestions,
  reorderQuestions,
  toQuestionFormData,
  upsertKangurTestQuestion,
  usesRichQuestionPresentation,
  type QuestionFormData,
} from '../test-questions';
import {
  canonicalizeKangurTestSuites,
  KANGUR_TEST_SUITES_SETTING_KEY,
  demoteKangurTestSuitesToDraft,
  demoteInvalidLiveKangurTestSuites,
  parseKangurTestSuites,
  promoteKangurTestSuitesLive,
} from '../test-suites';
import { useKangurQuestionsManagerRuntimeContext } from './context/KangurQuestionsManagerRuntimeContext';
import { KangurTestQuestionEditor } from './KangurTestQuestionEditor';
import {
  getQuestionAuthoringSummary,
  getQuestionWorkflowLabel,
} from './question-authoring-insights';
import {
  clearQuestionEditorDraft,
  QUESTION_EDITOR_NEW_DRAFT_SLOT,
  readQuestionEditorDraft,
  writeQuestionEditorDraft,
} from './question-editor-drafts';
import { getKangurTestSuiteHealth } from './test-suite-health';
import { moveItem } from './utils';

import type { QuestionListFilter, QuestionListSort } from './question-manager-view';


const QUESTION_LIST_FILTER_OPTIONS: Array<{
  value: QuestionListFilter;
  label: string;
}> = [
  { value: 'all', label: 'All' },
  { value: 'needs-review', label: 'Needs review' },
  { value: 'needs-fix', label: 'Needs fix' },
  { value: 'draft', label: 'Draft' },
  { value: 'ready', label: 'Ready to publish' },
  { value: 'published', label: 'Published' },
  { value: 'rich-ui', label: 'Rich UI' },
  { value: 'illustrated', label: 'SVG' },
];

const QUESTION_LIST_SORT_OPTIONS: Array<{
  value: QuestionListSort;
  label: string;
}> = [
  { value: 'manual', label: 'Manual order' },
  { value: 'review-queue', label: 'Review queue' },
];

const QUESTION_STATUS_PRIORITY: Record<'ready' | 'needs-review' | 'needs-fix', number> = {
  'needs-fix': 0,
  'needs-review': 1,
  ready: 2,
};

const formatDraftTimestamp = (value: string | null): string | null => {
  if (!value) return null;

  try {
    return new Intl.DateTimeFormat('pl-PL', {
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(new Date(value));
  } catch {
    return value;
  }
};

const buildQuestionEditorSnapshot = (
  question: KangurTestQuestion,
  formData: QuestionFormData
): string =>
  JSON.stringify({
    question,
    formData,
  });

export function KangurQuestionsManagerPanel(): React.JSX.Element {
  const { suite, onClose, initialView } = useKangurQuestionsManagerRuntimeContext();
  const settingsStore = useSettingsStore();
  const updateSetting = useUpdateSetting();
  const { toast } = useToast();

  const rawQuestions = settingsStore.get(KANGUR_TEST_QUESTIONS_SETTING_KEY);
  const rawSuites = settingsStore.get(KANGUR_TEST_SUITES_SETTING_KEY);
  const questionStore = useMemo(() => parseKangurTestQuestionStore(rawQuestions), [rawQuestions]);
  const suites = useMemo(() => parseKangurTestSuites(rawSuites), [rawSuites]);
  const currentSuite = useMemo(
    () => suites.find((candidate) => candidate.id === suite.id) ?? suite,
    [suite, suites]
  );
  const questions = useMemo(
    () => getQuestionsForSuite(questionStore, suite.id),
    [questionStore, suite.id]
  );
  const allQuestions = useMemo(() => Object.values(questionStore), [questionStore]);
  const currentSuiteHealth = useMemo(
    () => getKangurTestSuiteHealth(currentSuite, allQuestions),
    [allQuestions, currentSuite]
  );
  const currentPublishableQuestionIds = useMemo(
    () =>
      questions
        .filter((question) => {
          const summary = getQuestionAuthoringSummary(question);
          return question.editorial.workflowStatus === 'ready' && summary.status === 'ready';
        })
        .map((question) => question.id),
    [questions]
  );
  const canPublishReadyForCurrentSuite = currentPublishableQuestionIds.length > 0;
  const canPublishAndGoLiveCurrentSuite = useMemo(
    () =>
      !currentSuiteHealth.isLive &&
      currentSuite.enabled &&
      currentSuiteHealth.status === 'ready' &&
      currentSuiteHealth.questionCount > 0 &&
      currentPublishableQuestionIds.length > 0 &&
      currentSuiteHealth.publishedQuestionCount + currentPublishableQuestionIds.length ===
        currentSuiteHealth.questionCount &&
      currentSuiteHealth.draftQuestionCount === 0,
    [
      currentPublishableQuestionIds.length,
      currentSuite.enabled,
      currentSuiteHealth.draftQuestionCount,
      currentSuiteHealth.isLive,
      currentSuiteHealth.publishedQuestionCount,
      currentSuiteHealth.questionCount,
      currentSuiteHealth.status,
    ]
  );

  const [editingQuestion, setEditingQuestion] = useState<KangurTestQuestion | null>(null);
  const [isNewQuestion, setIsNewQuestion] = useState(false);
  const [formData, setFormData] = useState<QuestionFormData | null>(null);
  const [showEditor, setShowEditor] = useState(false);
  const [questionToDelete, setQuestionToDelete] = useState<KangurTestQuestion | null>(null);
  const [discardConfirmOpen, setDiscardConfirmOpen] = useState(false);
  const [listFilter, setListFilter] = useState<QuestionListFilter>(
    initialView?.listFilter ?? 'all'
  );
  const [sortMode, setSortMode] = useState<QuestionListSort>(
    initialView?.sortMode ?? 'manual'
  );
  const [searchQuery, setSearchQuery] = useState(initialView?.searchQuery ?? '');
  const [didAutoOpenQuestion, setDidAutoOpenQuestion] = useState(false);
  const [initialEditorSnapshot, setInitialEditorSnapshot] = useState<string | null>(null);
  const [restorableDraftSavedAt, setRestorableDraftSavedAt] = useState<string | null>(null);
  const [localDraftSavedAt, setLocalDraftSavedAt] = useState<string | null>(null);

  const openEditor = React.useCallback(
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

  const closeEditor = React.useCallback((): void => {
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

  const activeDraftQuestionId =
    editingQuestion ? (isNewQuestion ? QUESTION_EDITOR_NEW_DRAFT_SLOT : editingQuestion.id) : null;
  const currentEditorSnapshot =
    editingQuestion && formData ? buildQuestionEditorSnapshot(editingQuestion, formData) : null;
  const isEditorDirty =
    showEditor &&
    Boolean(initialEditorSnapshot) &&
    Boolean(currentEditorSnapshot) &&
    currentEditorSnapshot !== initialEditorSnapshot;

  const maybeTakeSuiteOfflineAfterQuestionMutation = React.useCallback(
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

  const handlePublishReadyForCurrentSuite = React.useCallback(async (): Promise<void> => {
    if (!canPublishReadyForCurrentSuite) {
      toast('No structurally ready questions are waiting to publish in this suite.', {
        variant: 'info',
      });
      return;
    }

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
        `Published ${publishedQuestionIds.length} ready question${publishedQuestionIds.length === 1 ? '' : 's'} in ${currentSuite.title}.`,
        { variant: 'success' }
      );
    } catch (error) {
      logClientError(error, {
        context: {
          source: 'KangurQuestionsManagerPanel',
          action: 'publishReadyForCurrentSuite',
          suiteId: suite.id,
        },
      });
      toast('Failed to publish ready questions.', { variant: 'error' });
    }
  }, [
    canPublishReadyForCurrentSuite,
    currentPublishableQuestionIds,
    currentSuite.title,
    questionStore,
    suite.id,
    toast,
    updateSetting,
  ]);

  const handlePublishAndGoLiveCurrentSuite = React.useCallback(async (): Promise<void> => {
    if (!canPublishAndGoLiveCurrentSuite) {
      toast('This suite must be fully clean and publish-ready before it can go live in one step.', {
        variant: 'info',
      });
      return;
    }

    try {
      const { store: nextStore, publishedQuestionIds } = publishReadyQuestions(questionStore, {
        suiteId: suite.id,
        questionIds: currentPublishableQuestionIds,
      });
      await updateSetting.mutateAsync({
        key: KANGUR_TEST_QUESTIONS_SETTING_KEY,
        value: serializeSetting(nextStore),
      });

      try {
        const { suites: nextSuites, publishedSuiteIds } = promoteKangurTestSuitesLive(suites, {
          suiteIds: [suite.id],
        });
        await updateSetting.mutateAsync({
          key: KANGUR_TEST_SUITES_SETTING_KEY,
          value: serializeSetting(canonicalizeKangurTestSuites(nextSuites)),
        });
        toast(
          `Published ${publishedQuestionIds.length} ready question${publishedQuestionIds.length === 1 ? '' : 's'} and marked ${currentSuite.title} live for learners (${publishedSuiteIds.length} suite updated).`,
          { variant: 'success' }
        );
      } catch (error) {
        logClientError(error, {
          context: {
            source: 'KangurQuestionsManagerPanel',
            action: 'publishAndGoLiveCurrentSuite',
            phase: 'suite-live',
            suiteId: suite.id,
          },
        });
        toast('Ready questions were published, but failed to mark the suite live.', {
          variant: 'warning',
        });
      }
    } catch (error) {
      logClientError(error, {
        context: {
          source: 'KangurQuestionsManagerPanel',
          action: 'publishAndGoLiveCurrentSuite',
          phase: 'publish-questions',
          suiteId: suite.id,
        },
      });
      toast('Failed to publish ready questions.', { variant: 'error' });
    }
  }, [
    canPublishAndGoLiveCurrentSuite,
    currentPublishableQuestionIds,
    currentSuite.title,
    questionStore,
    suite.id,
    suites,
    toast,
    updateSetting,
  ]);

  const handleGoLiveCurrentSuite = React.useCallback(async (): Promise<void> => {
    if (!currentSuiteHealth.canGoLive) {
      toast('This suite must be enabled and fully published before it can go live.', {
        variant: 'info',
      });
      return;
    }

    try {
      const { suites: nextSuites, publishedSuiteIds } = promoteKangurTestSuitesLive(suites, {
        suiteIds: [suite.id],
      });
      await updateSetting.mutateAsync({
        key: KANGUR_TEST_SUITES_SETTING_KEY,
        value: serializeSetting(canonicalizeKangurTestSuites(nextSuites)),
      });
      toast(
        `Suite ${currentSuite.title} is now live for learners (${publishedSuiteIds.length} suite updated).`,
        { variant: 'success' }
      );
    } catch (error) {
      logClientError(error, {
        context: {
          source: 'KangurQuestionsManagerPanel',
          action: 'goLiveCurrentSuite',
          suiteId: suite.id,
        },
      });
      toast('Failed to mark suite live.', { variant: 'error' });
    }
  }, [currentSuite.title, currentSuiteHealth.canGoLive, suite.id, suites, toast, updateSetting]);

  const handleTakeCurrentSuiteOffline = React.useCallback(async (): Promise<void> => {
    if (!currentSuiteHealth.isLive) {
      toast('This suite is already offline for learners.', { variant: 'info' });
      return;
    }

    try {
      const { suites: nextSuites, draftSuiteIds } = demoteKangurTestSuitesToDraft(suites, {
        suiteIds: [suite.id],
      });
      await updateSetting.mutateAsync({
        key: KANGUR_TEST_SUITES_SETTING_KEY,
        value: serializeSetting(canonicalizeKangurTestSuites(nextSuites)),
      });
      toast(
        `Suite ${currentSuite.title} is now offline for learners (${draftSuiteIds.length} suite updated).`,
        { variant: 'success' }
      );
    } catch (error) {
      logClientError(error, {
        context: {
          source: 'KangurQuestionsManagerPanel',
          action: 'takeCurrentSuiteOffline',
          suiteId: suite.id,
        },
      });
      toast('Failed to take suite offline.', { variant: 'error' });
    }
  }, [currentSuite.title, currentSuiteHealth.isLive, suite.id, suites, toast, updateSetting]);

  const handleSave = async (): Promise<void> => {
    if (!editingQuestion || !formData || !activeDraftQuestionId) return;
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
      const questionReturnedToDraft =
        !isNewQuestion &&
        editingQuestion.editorial.workflowStatus === 'published' &&
        saved.editorial.workflowStatus === 'draft';
      const nextStore = upsertKangurTestQuestion(questionStore, saved);
      await updateSetting.mutateAsync({
        key: KANGUR_TEST_QUESTIONS_SETTING_KEY,
        value: serializeSetting(nextStore),
      });
      clearQuestionEditorDraft(suite.id, activeDraftQuestionId);
      let suiteTakenOffline = false;
      try {
        suiteTakenOffline = await maybeTakeSuiteOfflineAfterQuestionMutation(nextStore);
      } catch (error) {
        logClientError(error, {
          context: {
            source: 'KangurQuestionsManagerPanel',
            action: 'demote-live-suite-after-save',
          },
        });
        toast('Question saved, but failed to take the live suite offline.', {
          variant: 'error',
        });
        closeEditor();
        return;
      }
      toast(
        suiteTakenOffline
          ? 'Question saved. The live suite was taken offline because its published question set changed.'
          : questionReturnedToDraft
            ? 'Question updated. Learner-facing changes moved this published question back to draft.'
            : isNewQuestion
              ? 'Question created.'
              : 'Question updated.',
        {
          variant:
            suiteTakenOffline || questionReturnedToDraft ? 'warning' : 'success',
        }
      );
      closeEditor();
    } catch (error) {
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
      let suiteTakenOffline = false;
      try {
        suiteTakenOffline = await maybeTakeSuiteOfflineAfterQuestionMutation(nextStore);
      } catch (error) {
        logClientError(error, {
          context: {
            source: 'KangurQuestionsManagerPanel',
            action: 'demote-live-suite-after-delete',
          },
        });
        toast('Question deleted, but failed to take the live suite offline.', {
          variant: 'error',
        });
        setQuestionToDelete(null);
        return;
      }
      toast(
        suiteTakenOffline
          ? 'Question deleted. The live suite was taken offline because its published question set changed.'
          : 'Question deleted.',
        { variant: suiteTakenOffline ? 'warning' : 'success' }
      );
      setQuestionToDelete(null);
    } catch (error) {
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
        id: createKangurTestQuestionId(),
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
      let suiteTakenOffline = false;
      try {
        suiteTakenOffline = await maybeTakeSuiteOfflineAfterQuestionMutation(nextStore);
      } catch (error) {
        logClientError(error, {
          context: {
            source: 'KangurQuestionsManagerPanel',
            action: 'demote-live-suite-after-duplicate',
          },
        });
        toast('Question duplicated, but failed to take the live suite offline.', {
          variant: 'error',
        });
        return;
      }
      toast(
        suiteTakenOffline
          ? 'Question duplicated. The live suite was taken offline because its published question set changed.'
          : 'Question duplicated.',
        { variant: suiteTakenOffline ? 'warning' : 'success' }
      );
    } catch (error) {
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
      logClientError(error, { context: { source: 'KangurQuestionsManagerPanel', action: 'move' } });
      toast('Failed to reorder questions.', { variant: 'error' });
    }
  };

  const isSaving = updateSetting.isPending;
  const currentQuestionAuthoring = formData ? getQuestionAuthoringSummary(formData) : null;
  const isSaveDisabled =
    !isEditorDirty ||
    !formData?.prompt.trim() ||
    Boolean(currentQuestionAuthoring?.blockers.length) ||
    isSaving;
  const questionSummaries = useMemo(
    () =>
      new Map(
        questions.map((question) => [question.id, getQuestionAuthoringSummary(question)] as const)
      ),
    [questions]
  );
  const readyCount = questions.filter(
    (question) => questionSummaries.get(question.id)?.status === 'ready'
  ).length;
  const needsFixCount = questions.filter(
    (question) => questionSummaries.get(question.id)?.status === 'needs-fix'
  ).length;
  const needsReviewCount = questions.filter(
    (question) => questionSummaries.get(question.id)?.status === 'needs-review'
  ).length;
  const reviewQueueCount = needsFixCount + needsReviewCount;
  const draftCount = questions.filter(
    (question) => question.editorial.workflowStatus === 'draft'
  ).length;
  const readyToPublishCount = questions.filter(
    (question) => question.editorial.workflowStatus === 'ready'
  ).length;
  const publishedCount = questions.filter(
    (question) => question.editorial.workflowStatus === 'published'
  ).length;
  const richQuestionCount = questions.filter(
    (question) => hasRichChoiceContent(question) || usesRichQuestionPresentation(question)
  ).length;
  const illustratedCount = questions.filter((question) => hasIllustration(question)).length;
  const searchedQuestions = useMemo(() => {
    const trimmedQuery = searchQuery.trim().toLowerCase();
    if (!trimmedQuery) {
      return questions;
    }

    return questions.filter((question) => {
      const summary = questionSummaries.get(question.id);
      const searchableText = [
        question.prompt,
        question.explanation ?? '',
        question.correctChoiceLabel,
        ...question.choices.flatMap((choice) => [
          choice.label,
          choice.text,
          choice.description ?? '',
        ]),
        ...question.editorial.auditFlags,
        ...question.editorial.auditFlags.map((flag) => flag.replaceAll('_', ' ')),
        question.editorial.note ?? '',
        summary?.nextAction ?? '',
        summary?.status ?? '',
      ]
        .join(' ')
        .toLowerCase();

      return searchableText.includes(trimmedQuery);
    });
  }, [questionSummaries, questions, searchQuery]);
  const filteredQuestions = useMemo(() => {
    switch (listFilter) {
      case 'needs-review':
        return searchedQuestions.filter(
          (question) => questionSummaries.get(question.id)?.status === 'needs-review'
        );
      case 'needs-fix':
        return searchedQuestions.filter(
          (question) => questionSummaries.get(question.id)?.status === 'needs-fix'
        );
      case 'rich-ui':
        return searchedQuestions.filter(
          (question) => hasRichChoiceContent(question) || usesRichQuestionPresentation(question)
        );
      case 'illustrated':
        return searchedQuestions.filter((question) => hasIllustration(question));
      case 'draft':
        return searchedQuestions.filter((question) => question.editorial.workflowStatus === 'draft');
      case 'ready':
        return searchedQuestions.filter((question) => question.editorial.workflowStatus === 'ready');
      case 'published':
        return searchedQuestions.filter(
          (question) => question.editorial.workflowStatus === 'published'
        );
      default:
        return searchedQuestions;
    }
  }, [listFilter, questionSummaries, searchedQuestions]);
  const visibleQuestions = useMemo(() => {
    if (sortMode === 'manual') {
      return filteredQuestions;
    }

    return [...filteredQuestions].sort((left, right) => {
      const leftSummary = questionSummaries.get(left.id);
      const rightSummary = questionSummaries.get(right.id);
      const statusDelta =
        QUESTION_STATUS_PRIORITY[leftSummary?.status ?? 'ready'] -
        QUESTION_STATUS_PRIORITY[rightSummary?.status ?? 'ready'];
      if (statusDelta !== 0) {
        return statusDelta;
      }

      const blockerDelta =
        (rightSummary?.blockers.length ?? 0) - (leftSummary?.blockers.length ?? 0);
      if (blockerDelta !== 0) {
        return blockerDelta;
      }

      const warningDelta =
        (rightSummary?.warnings.length ?? 0) - (leftSummary?.warnings.length ?? 0);
      if (warningDelta !== 0) {
        return warningDelta;
      }

      return left.sortOrder - right.sortOrder;
    });
  }, [filteredQuestions, questionSummaries, sortMode]);

  const emptyFilterLabel =
    searchQuery.trim().length > 0
      ? `No questions match "${searchQuery.trim()}".`
      : listFilter === 'all'
        ? 'No questions yet. Add the first question to start.'
        : `No questions match the "${QUESTION_LIST_FILTER_OPTIONS.find((option) => option.value === listFilter)?.label ?? listFilter}" filter.`;

  React.useEffect(() => {
    if (didAutoOpenQuestion) {
      return;
    }

    const autoOpenQuestionId = initialView?.autoOpenQuestionId;
    if (!autoOpenQuestionId) {
      setDidAutoOpenQuestion(true);
      return;
    }

    const question = questions.find((candidate) => candidate.id === autoOpenQuestionId);
    if (!question) {
      setDidAutoOpenQuestion(true);
      return;
    }

    openEditor(question, false);
    setDidAutoOpenQuestion(true);
  }, [didAutoOpenQuestion, initialView?.autoOpenQuestionId, openEditor, questions]);

  React.useEffect(() => {
    if (!showEditor || !activeDraftQuestionId || !initialEditorSnapshot) {
      setRestorableDraftSavedAt(null);
      return;
    }

    const draft = readQuestionEditorDraft(suite.id, activeDraftQuestionId);
    if (
      draft &&
      buildQuestionEditorSnapshot(draft.question, draft.formData) !== initialEditorSnapshot
    ) {
      setRestorableDraftSavedAt(draft.savedAt);
      return;
    }

    setRestorableDraftSavedAt(null);
  }, [activeDraftQuestionId, initialEditorSnapshot, showEditor, suite.id]);

  React.useEffect(() => {
    if (!showEditor || !editingQuestion || !formData || !activeDraftQuestionId || !currentEditorSnapshot) {
      return;
    }

    if (!isEditorDirty) {
      setLocalDraftSavedAt(null);
      const draft = readQuestionEditorDraft(suite.id, activeDraftQuestionId);
      const hasRestorableDraft =
        draft && buildQuestionEditorSnapshot(draft.question, draft.formData) !== currentEditorSnapshot;
      if (!hasRestorableDraft) {
        clearQuestionEditorDraft(suite.id, activeDraftQuestionId);
      }
      return;
    }

    const timeoutId = window.setTimeout(() => {
      const savedAt = writeQuestionEditorDraft({
        suiteId: suite.id,
        questionId: activeDraftQuestionId,
        isNewQuestion,
        question: editingQuestion,
        formData,
      });
      if (savedAt) {
        setLocalDraftSavedAt(savedAt);
        setRestorableDraftSavedAt(null);
      }
    }, 300);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [
    activeDraftQuestionId,
    currentEditorSnapshot,
    editingQuestion,
    formData,
    isEditorDirty,
    isNewQuestion,
    showEditor,
    suite.id,
  ]);

  const handleRestoreDraft = React.useCallback((): void => {
    if (!activeDraftQuestionId) return;
    const draft = readQuestionEditorDraft(suite.id, activeDraftQuestionId);
    if (!draft) {
      setRestorableDraftSavedAt(null);
      return;
    }

    setEditingQuestion(draft.question);
    setFormData(draft.formData);
    setIsNewQuestion(draft.isNewQuestion);
    setLocalDraftSavedAt(draft.savedAt);
    setRestorableDraftSavedAt(null);
  }, [activeDraftQuestionId, suite.id]);

  const handleDismissDraft = React.useCallback((): void => {
    if (!activeDraftQuestionId) return;
    clearQuestionEditorDraft(suite.id, activeDraftQuestionId);
    setLocalDraftSavedAt(null);
    setRestorableDraftSavedAt(null);
  }, [activeDraftQuestionId, suite.id]);

  const handleRequestClose = React.useCallback((): void => {
    if (isSaving) return;
    if (isEditorDirty) {
      setDiscardConfirmOpen(true);
      return;
    }
    closeEditor();
  }, [closeEditor, isEditorDirty, isSaving]);

  return (
    <>
      <div className='flex h-full flex-col gap-4 overflow-hidden'>
        {/* Header */}
        <div className='flex flex-wrap items-center justify-between gap-2 border-b border-border/50 pb-3'>
          <div>
            <div className='text-sm font-semibold text-white'>{currentSuite.title}</div>
            <div className='text-xs text-muted-foreground'>
              {questions.length} {questions.length === 1 ? 'question' : 'questions'}
              {currentSuite.year ? ` · ${currentSuite.year}` : ''}
              {currentSuite.gradeLevel ? ` · ${currentSuite.gradeLevel}` : ''}
            </div>
            <div className='mt-2 flex flex-wrap gap-1.5'>
              <Badge
                variant='outline'
                className='h-5 px-2 text-[10px] text-emerald-300 border-emerald-400/40'
              >
                Ready {readyCount}
              </Badge>
              <Badge variant='outline' className='h-5 px-2 text-[10px]'>
                Rich UI {richQuestionCount}
              </Badge>
              <Badge
                variant='outline'
                className='h-5 px-2 text-[10px] text-amber-300 border-amber-400/40'
              >
                Needs review {needsReviewCount}
              </Badge>
              <Badge
                variant='outline'
                className='h-5 px-2 text-[10px] text-rose-300 border-rose-400/40'
              >
                Needs fix {needsFixCount}
              </Badge>
              <Badge
                variant='outline'
                className='h-5 px-2 text-[10px] text-violet-300 border-violet-400/40'
              >
                SVG {illustratedCount}
              </Badge>
              <Badge
                variant='outline'
                className='h-5 px-2 text-[10px] text-cyan-300 border-cyan-400/40'
              >
                Review queue {reviewQueueCount}
              </Badge>
              <Badge
                variant='outline'
                className='h-5 px-2 text-[10px] text-slate-300 border-slate-400/40'
              >
                Draft {draftCount}
              </Badge>
              <Badge
                variant='outline'
                className='h-5 px-2 text-[10px] text-sky-300 border-sky-400/40'
              >
                Ready to publish {readyToPublishCount}
              </Badge>
              <Badge
                variant='outline'
                className='h-5 px-2 text-[10px] text-emerald-300 border-emerald-400/40'
              >
                Published {publishedCount}
              </Badge>
              {currentSuiteHealth.publishStatus === 'partial' ? (
                <Badge
                  variant='outline'
                  className='h-5 px-2 text-[10px] text-cyan-300 border-cyan-400/40'
                >
                  Published {currentSuiteHealth.publishedQuestionCount}/{currentSuiteHealth.questionCount}
                </Badge>
              ) : null}
              {currentSuiteHealth.publishStatus === 'unpublished' && currentSuiteHealth.questionCount > 0 ? (
                <Badge
                  variant='outline'
                  className='h-5 px-2 text-[10px] text-slate-300 border-slate-400/40'
                >
                  Not published
                </Badge>
              ) : null}
              {currentSuiteHealth.canGoLive ? (
                <Badge
                  variant='outline'
                  className='h-5 px-2 text-[10px] text-emerald-300 border-emerald-400/40'
                >
                  Ready for live
                </Badge>
              ) : null}
              {canPublishAndGoLiveCurrentSuite ? (
                <Badge
                  variant='outline'
                  className='h-5 px-2 text-[10px] text-cyan-300 border-cyan-400/40'
                >
                  Go live after publish
                </Badge>
              ) : null}
              {currentSuiteHealth.isLive ? (
                <Badge
                  variant='outline'
                  className='h-5 px-2 text-[10px] border-emerald-400/40 bg-emerald-500/10 text-emerald-200'
                >
                  Live
                </Badge>
              ) : null}
              {currentSuiteHealth.liveNeedsAttention ? (
                <Badge
                  variant='outline'
                  className='h-5 px-2 text-[10px] border-rose-400/40 bg-rose-500/10 text-rose-200'
                >
                  Live needs attention
                </Badge>
              ) : null}
            </div>
          </div>
          <div className='flex items-center gap-1'>
            {canPublishAndGoLiveCurrentSuite ? (
              <Button
                type='button'
                size='sm'
                className='h-7 px-2 text-[11px]'
                onClick={(): void => {
                  void handlePublishAndGoLiveCurrentSuite();
                }}
                disabled={isSaving}
              >
                Publish and go live
              </Button>
            ) : null}
            <Button
              type='button'
              size='sm'
              variant='outline'
              className='h-7 px-2 text-[11px]'
              onClick={(): void => {
                void handlePublishReadyForCurrentSuite();
              }}
              disabled={isSaving || !canPublishReadyForCurrentSuite}
            >
              Publish ready questions
            </Button>
            <Button
              type='button'
              size='sm'
              variant='outline'
              className='h-7 px-2 text-[11px]'
              onClick={(): void => {
                void handleGoLiveCurrentSuite();
              }}
              disabled={isSaving || !currentSuiteHealth.canGoLive}
            >
              Go live for learners
            </Button>
            <Button
              type='button'
              size='sm'
              variant='outline'
              className='h-7 px-2 text-[11px]'
              onClick={(): void => {
                void handleTakeCurrentSuiteOffline();
              }}
              disabled={isSaving || !currentSuiteHealth.isLive}
            >
              Take suite offline
            </Button>
            <Button
              type='button'
              size='sm'
              variant='outline'
              className='h-7 px-2 text-[11px]'
              onClick={openCreate}
              disabled={isSaving}
            >
              <Plus className='mr-1 size-3.5' />
              Add question
            </Button>
            <Button
              type='button'
              size='sm'
              variant='outline'
              className='h-7 px-2 text-[11px] text-gray-300'
              onClick={onClose}
            >
              ← Back to suites
            </Button>
          </div>
        </div>

        {currentSuiteHealth.liveNeedsAttention ? (
          <div className='rounded-xl border border-rose-400/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-100'>
            This suite is still marked live, but its published question set is incomplete or needs review.
            Learner runtime will keep it offline until you repair and republish it.
          </div>
        ) : currentSuiteHealth.isLive ? (
          <div className='rounded-xl border border-emerald-400/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-100'>
            This suite is live for learners. Draft edits, deletions, or unpublished duplicates will
            take it offline until the published set is complete again.
          </div>
        ) : currentSuiteHealth.canGoLive ? (
          <div className='rounded-xl border border-cyan-400/30 bg-cyan-500/10 px-4 py-3 text-sm text-cyan-100'>
            This suite is fully published and ready to go live for learners.
          </div>
        ) : canPublishAndGoLiveCurrentSuite ? (
          <div className='rounded-xl border border-cyan-400/30 bg-cyan-500/10 px-4 py-3 text-sm text-cyan-100'>
            This suite can publish its ready queue and go live for learners in one step.
          </div>
        ) : null}

        <div className='flex flex-col gap-3'>
          <Input
            type='search'
            value={searchQuery}
            onChange={(event): void => setSearchQuery(event.target.value)}
            placeholder='Search prompts, answers, or audit flags...'
            aria-label='Search questions'
            className='h-8 text-sm'
          />
          <div className='flex flex-wrap items-center gap-2'>
            {QUESTION_LIST_SORT_OPTIONS.map((option) => {
              const isActive = option.value === sortMode;
              return (
                <Button
                  key={option.value}
                  type='button'
                  size='sm'
                  variant='outline'
                  className={
                    isActive
                      ? 'h-7 border-cyan-400/50 bg-cyan-500/15 px-2 text-[11px] text-cyan-100'
                      : 'h-7 px-2 text-[11px]'
                  }
                  onClick={(): void => setSortMode(option.value)}
                >
                  {option.label}
                </Button>
              );
            })}
          </div>
          <div className='flex flex-wrap items-center gap-2'>
            {QUESTION_LIST_FILTER_OPTIONS.map((option) => {
              const isActive = option.value === listFilter;
              return (
                <Button
                  key={option.value}
                  type='button'
                  size='sm'
                  variant='outline'
                  className={
                    isActive
                      ? 'h-7 border-sky-400/50 bg-sky-500/15 px-2 text-[11px] text-sky-100'
                      : 'h-7 px-2 text-[11px]'
                  }
                  onClick={(): void => setListFilter(option.value)}
                >
                  {option.label}
                </Button>
              );
            })}
          </div>
          {listFilter !== 'all' || sortMode !== 'manual' ? (
            <div className='self-center text-[11px] text-muted-foreground'>
              Reorder questions in the Manual order / All view.
            </div>
          ) : null}
        </div>

        {/* Question list */}
        <div className='flex-1 overflow-auto space-y-2 pr-1'>
          {visibleQuestions.length === 0 ? (
            <div className='rounded-xl border border-dashed border-border/60 p-6 text-center text-sm text-muted-foreground'>
              {emptyFilterLabel}
            </div>
          ) : (
            visibleQuestions.map((q, index) => {
              const absoluteIndex = questions.findIndex((question) => question.id === q.id);
              const canReorder = listFilter === 'all' && sortMode === 'manual';
              const questionSummary = questionSummaries.get(q.id);
              const workflowLabel = getQuestionWorkflowLabel(q.editorial.workflowStatus);

              return (
                <div
                  key={q.id}
                  className='flex items-start gap-3 rounded-xl border border-border/50 bg-card/30 p-3'
                >
                  <div className='flex flex-col gap-0.5 shrink-0'>
                    <Button
                      type='button'
                      size='sm'
                      variant='ghost'
                      className='h-5 px-1'
                      onClick={(): void => {
                        if (canReorder) {
                          void handleMove(absoluteIndex, absoluteIndex - 1);
                        }
                      }}
                      disabled={!canReorder || absoluteIndex === 0 || isSaving}
                      aria-label='Move up'
                    >
                      <ArrowUp className='size-3' />
                    </Button>
                    <Button
                      type='button'
                      size='sm'
                      variant='ghost'
                      className='h-5 px-1'
                      onClick={(): void => {
                        if (canReorder) {
                          void handleMove(absoluteIndex, absoluteIndex + 1);
                        }
                      }}
                      disabled={!canReorder || absoluteIndex === questions.length - 1 || isSaving}
                      aria-label='Move down'
                    >
                      <ArrowDown className='size-3' />
                    </Button>
                  </div>

                  <div className='min-w-0 flex-1'>
                    <div className='flex flex-wrap items-center gap-1.5 mb-1'>
                      <span className='text-xs font-semibold text-gray-400'>#{index + 1}</span>
                      {listFilter !== 'all' && absoluteIndex >= 0 ? (
                        <Badge variant='outline' className='h-4 px-1 text-[9px] text-slate-300'>
                        Order {absoluteIndex + 1}
                        </Badge>
                      ) : null}
                      {sortMode === 'review-queue' ? (
                        <Badge
                          variant='outline'
                          className='h-4 px-1 text-[9px] text-cyan-300 border-cyan-400/40'
                        >
                        Queue {index + 1}
                        </Badge>
                      ) : null}
                      <Badge variant='outline' className='h-4 px-1 text-[9px]'>
                        {q.pointValue}pt
                      </Badge>
                      <Badge
                        variant='outline'
                        className='h-4 px-1 text-[9px] text-emerald-300 border-emerald-400/40'
                      >
                      ✓ {q.correctChoiceLabel}
                      </Badge>
                      {hasIllustration(q) ? (
                        <Badge
                          variant='outline'
                          className='h-4 px-1 text-[9px] text-violet-300 border-violet-400/40'
                        >
                        SVG
                        </Badge>
                      ) : null}
                      {hasRichChoiceContent(q) ? (
                        <Badge
                          variant='outline'
                          className='h-4 px-1 text-[9px] text-sky-300 border-sky-400/40'
                        >
                        Choice UI
                        </Badge>
                      ) : null}
                      {usesRichQuestionPresentation(q) ? (
                        <Badge
                          variant='outline'
                          className='h-4 px-1 text-[9px] text-cyan-300 border-cyan-400/40'
                        >
                        Layout
                        </Badge>
                      ) : null}
                      {questionSummary?.status === 'needs-review' ? (
                        <Badge
                          variant='outline'
                          className='h-4 px-1 text-[9px] text-amber-300 border-amber-400/40'
                        >
                        Review
                        </Badge>
                      ) : null}
                      {questionSummary?.status === 'needs-fix' ? (
                        <Badge
                          variant='outline'
                          className='h-4 px-1 text-[9px] text-rose-300 border-rose-400/40'
                        >
                        Fix
                        </Badge>
                      ) : null}
                      <Badge
                        variant='outline'
                        className={
                          q.editorial.workflowStatus === 'published'
                            ? 'h-4 px-1 text-[9px] text-emerald-300 border-emerald-400/40'
                            : q.editorial.workflowStatus === 'ready'
                              ? 'h-4 px-1 text-[9px] text-cyan-300 border-cyan-400/40'
                              : 'h-4 px-1 text-[9px] text-slate-300 border-slate-400/40'
                        }
                      >
                        {workflowLabel}
                      </Badge>
                    </div>
                    <p className='text-sm text-gray-200 line-clamp-2'>
                      {q.prompt || '(empty prompt)'}
                    </p>
                  </div>

                  <div className='flex shrink-0 items-center gap-1'>
                    <button
                      type='button'
                      className='inline-flex items-center justify-center rounded p-1 text-gray-400 hover:bg-sky-500/20 hover:text-sky-200'
                      onClick={(): void => openEdit(q)}
                      title='Edit question'
                      disabled={isSaving}
                    >
                      <span className='sr-only'>Edit</span>
                      <svg className='size-3.5' fill='none' viewBox='0 0 24 24' stroke='currentColor'>
                        <path
                          strokeLinecap='round'
                          strokeLinejoin='round'
                          strokeWidth={2}
                          d='M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z'
                        />
                      </svg>
                    </button>
                    <button
                      type='button'
                      className='inline-flex items-center justify-center rounded p-1 text-gray-400 hover:bg-gray-700/60 hover:text-white'
                      onClick={(): void => {
                        void handleDuplicate(q);
                      }}
                      title='Duplicate question'
                      disabled={isSaving}
                    >
                      <Copy className='size-3.5' />
                    </button>
                    <button
                      type='button'
                      className='inline-flex items-center justify-center rounded p-1 text-gray-400 hover:bg-red-500/20 hover:text-red-300'
                      onClick={(): void => setQuestionToDelete(q)}
                      title='Delete question'
                      disabled={isSaving}
                    >
                      <Trash2 className='size-3.5' />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Question editor modal */}
      <FormModal
        isOpen={showEditor}
        onClose={handleRequestClose}
        title={isNewQuestion ? 'Add Question' : 'Edit Question'}
        subtitle={`${suite.title}`}
        onSave={(): void => {
          void handleSave();
        }}
        isSaving={isSaving}
        isSaveDisabled={isSaveDisabled}
        hasUnsavedChanges={isEditorDirty}
        saveText={isNewQuestion ? 'Add Question' : 'Save Question'}
        size='xl'
      >
        {formData ? (
          <div className='space-y-4'>
            {restorableDraftSavedAt ? (
              <div className='rounded-xl border border-cyan-400/20 bg-cyan-500/10 px-4 py-3'>
                <div className='flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between'>
                  <div>
                    <div className='text-sm font-semibold text-cyan-100'>Recovered local draft</div>
                    <div className='mt-1 text-xs text-cyan-50/80'>
                      A newer local draft is available from{' '}
                      {formatDraftTimestamp(restorableDraftSavedAt)}.
                    </div>
                  </div>
                  <div className='flex items-center gap-2'>
                    <Button type='button' size='sm' variant='outline' onClick={handleDismissDraft}>
                      Dismiss draft
                    </Button>
                    <Button type='button' size='sm' onClick={handleRestoreDraft}>
                      Restore draft
                    </Button>
                  </div>
                </div>
              </div>
            ) : null}
            <KangurTestQuestionEditor
              formData={formData}
              onChange={setFormData}
              isDirty={isEditorDirty}
              localDraftSavedAtLabel={formatDraftTimestamp(localDraftSavedAt)}
            />
          </div>
        ) : null}
      </FormModal>

      {/* Delete confirm */}
      <ConfirmModal
        isOpen={Boolean(questionToDelete)}
        onClose={(): void => setQuestionToDelete(null)}
        onConfirm={handleDelete}
        title='Delete Question'
        message={`Delete question "${questionToDelete?.prompt.slice(0, 60) ?? ''}"? This cannot be undone.`}
        confirmText='Delete'
        isDangerous={true}
      />

      <ConfirmModal
        isOpen={discardConfirmOpen}
        onClose={(): void => setDiscardConfirmOpen(false)}
        onConfirm={(): void => {
          setDiscardConfirmOpen(false);
          if (activeDraftQuestionId) {
            clearQuestionEditorDraft(suite.id, activeDraftQuestionId);
          }
          closeEditor();
        }}
        title='Discard question changes?'
        subtitle='You have unsaved changes in this question draft.'
        message='Close the editor without saving? Your current question edits will be lost.'
        confirmText='Discard changes'
        cancelText='Keep editing'
        isDangerous={true}
      />
    </>
  );
}
