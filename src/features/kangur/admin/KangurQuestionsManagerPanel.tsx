'use client';

import React, { useMemo, useState } from 'react';
import { ArrowDown, ArrowUp, Copy, Plus, Trash2 } from 'lucide-react';

import { Badge, Button, FormModal, Input, useToast } from '@/shared/ui';
import { ConfirmModal } from '@/shared/ui/templates/modals';
import { useUpdateSetting } from '@/shared/hooks/use-settings';
import { useSettingsStore } from '@/shared/providers/SettingsStoreProvider';
import { serializeSetting } from '@/shared/utils/settings-json';
import { logClientError } from '@/shared/utils/observability/client-error-logger';
import type { KangurTestQuestion } from '@/shared/contracts/kangur-tests';
import { useKangurQuestionsManagerRuntimeContext } from './context/KangurQuestionsManagerRuntimeContext';

import {
  KANGUR_TEST_QUESTIONS_SETTING_KEY,
  createKangurTestQuestion,
  createKangurTestQuestionId,
  deleteKangurTestQuestion,
  formDataToQuestion,
  getQuestionsForSuite,
  hasIllustration,
  hasRichChoiceContent,
  parseKangurTestQuestionStore,
  reorderQuestions,
  toQuestionFormData,
  upsertKangurTestQuestion,
  usesRichQuestionPresentation,
  type QuestionFormData,
} from '../test-questions';

import { moveItem } from './utils';
import { KangurTestQuestionEditor } from './KangurTestQuestionEditor';
import { getQuestionAuthoringSummary } from './question-authoring-insights';
import type { QuestionListFilter, QuestionListSort } from './question-manager-view';
import {
  clearQuestionEditorDraft,
  QUESTION_EDITOR_NEW_DRAFT_SLOT,
  readQuestionEditorDraft,
  writeQuestionEditorDraft,
} from './question-editor-drafts';

const QUESTION_LIST_FILTER_OPTIONS: Array<{
  value: QuestionListFilter;
  label: string;
}> = [
  { value: 'all', label: 'All' },
  { value: 'needs-review', label: 'Needs review' },
  { value: 'needs-fix', label: 'Needs fix' },
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
  const questionStore = useMemo(() => parseKangurTestQuestionStore(rawQuestions), [rawQuestions]);
  const questions = useMemo(
    () => getQuestionsForSuite(questionStore, suite.id),
    [questionStore, suite.id]
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

  const handleSave = async (): Promise<void> => {
    if (!editingQuestion || !formData || !activeDraftQuestionId) return;
    try {
      const saved = formDataToQuestion(
        formData,
        editingQuestion.id,
        suite.id,
        editingQuestion.sortOrder
      );
      const nextStore = upsertKangurTestQuestion(questionStore, saved);
      await updateSetting.mutateAsync({
        key: KANGUR_TEST_QUESTIONS_SETTING_KEY,
        value: serializeSetting(nextStore),
      });
      clearQuestionEditorDraft(suite.id, activeDraftQuestionId);
      toast(isNewQuestion ? 'Question created.' : 'Question updated.', { variant: 'success' });
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
      toast('Question deleted.', { variant: 'success' });
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
      };
      const nextStore = upsertKangurTestQuestion(questionStore, duped);
      await updateSetting.mutateAsync({
        key: KANGUR_TEST_QUESTIONS_SETTING_KEY,
        value: serializeSetting(nextStore),
      });
      toast('Question duplicated.', { variant: 'success' });
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
            <div className='text-sm font-semibold text-white'>{suite.title}</div>
            <div className='text-xs text-muted-foreground'>
              {questions.length} {questions.length === 1 ? 'question' : 'questions'}
              {suite.year ? ` · ${suite.year}` : ''}
              {suite.gradeLevel ? ` · ${suite.gradeLevel}` : ''}
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
            </div>
          </div>
          <div className='flex items-center gap-1'>
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
