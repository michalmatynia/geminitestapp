'use client';

import { useLocale } from 'next-intl';
import React, { useMemo, useState } from 'react';

import type { KangurTestQuestion } from '@/features/kangur/shared/contracts/kangur-tests';
import { useSettingsStore } from '@/features/kangur/shared/providers/SettingsStoreProvider';
import { Button, FormModal } from '@/features/kangur/shared/ui';
import { ConfirmModal } from '@/features/kangur/shared/ui/templates/modals';
import { withKangurClientErrorSync } from '@/features/kangur/observability/client';

import {
  KANGUR_TEST_QUESTIONS_SETTING_KEY,
  getQuestionsForSuite,
  hasIllustration,
  hasRichChoiceContent,
  parseKangurTestQuestionStore,
  usesRichQuestionPresentation,
  type QuestionFormData,
} from '../test-suites/questions';
import {
  KANGUR_TEST_SUITES_SETTING_KEY,
  parseKangurTestSuites,
} from '../test-suites';
import { KangurQuestionListItem } from './components/KangurQuestionListItem';
import { KangurQuestionsFilterTriage } from './components/KangurQuestionsFilterTriage';
import { KangurQuestionsHeader } from './components/KangurQuestionsHeader';
import { useKangurQuestionsManagerRuntimeContext } from './context/KangurQuestionsManagerRuntimeContext';
import { KangurTestQuestionEditor } from './KangurTestQuestionEditor';
import { useKangurQuestionsMutations } from './hooks/useKangurQuestionsMutations';
import { getQuestionAuthoringSummary } from './question-authoring-insights';
import {
  clearQuestionEditorDraft,
  QUESTION_EDITOR_NEW_DRAFT_SLOT,
  readQuestionEditorDraft,
  writeQuestionEditorDraft,
} from './question-editor-drafts';
import {
  getQuestionManagerCopy,
  resolveQuestionManagerLocale,
} from './question-manager.copy';
import { getKangurTestSuiteHealth } from './test-suite-health';

import type { QuestionListFilter, QuestionListSort } from './question-manager-view';


const QUESTION_STATUS_PRIORITY: Record<'ready' | 'needs-review' | 'needs-fix', number> = {
  'needs-fix': 0,
  'needs-review': 1,
  ready: 2,
};

const formatDraftTimestamp = (
  value: string | null,
  locale: string
): string | null => {
  if (!value) return null;

  return withKangurClientErrorSync(
    {
      source: 'kangur.admin.questions',
      action: 'format-draft-timestamp',
      description: 'Formats question draft timestamps for the questions manager.',
      context: { value },
    },
    () =>
      new Intl.DateTimeFormat(locale, {
        dateStyle: 'medium',
        timeStyle: 'short',
      }).format(new Date(value)),
    { fallback: value }
  );
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
  const locale = resolveQuestionManagerLocale(useLocale());
  const copy = useMemo(() => getQuestionManagerCopy(locale), [locale]);

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

  const {
    editingQuestion,
    formData,
    setFormData,
    showEditor,
    questionToDelete,
    setQuestionToDelete,
    discardConfirmOpen,
    setDiscardConfirmOpen,
    initialEditorSnapshot,
    localDraftSavedAt,
    restorableDraftSavedAt,
    setRestorableDraftSavedAt,
    setLocalDraftSavedAt,
    openCreate,
    openEditor,
    openEdit,
    handlePublishReadyForCurrentSuite,
    handlePublishAndGoLiveCurrentSuite,
    handleGoLiveCurrentSuite,
    handleTakeCurrentSuiteOffline,
    handleSave,
    handleDelete,
    handleDuplicate,
    handleMove,
    isSaving,
    closeEditor,
    setEditingQuestion,
    setIsNewQuestion,
    isNewQuestion,
  } = useKangurQuestionsMutations(
    currentSuite,
    suites,
    questionStore,
    questions,
    currentPublishableQuestionIds
  );

  const [listFilter, setListFilter] = useState<QuestionListFilter>(
    initialView?.listFilter ?? 'all'
  );
  const [sortMode, setSortMode] = useState<QuestionListSort>(
    initialView?.sortMode ?? 'manual'
  );
  const [searchQuery, setSearchQuery] = useState(initialView?.searchQuery ?? '');
  const [didAutoOpenQuestion, setDidAutoOpenQuestion] = useState(false);

  const activeDraftQuestionId =
    editingQuestion ? (isNewQuestion ? QUESTION_EDITOR_NEW_DRAFT_SLOT : editingQuestion.id) : null;
  const currentEditorSnapshot =
    editingQuestion && formData ? buildQuestionEditorSnapshot(editingQuestion, formData) : null;
  const isEditorDirty =
    showEditor &&
    Boolean(initialEditorSnapshot) &&
    Boolean(currentEditorSnapshot) &&
    currentEditorSnapshot !== initialEditorSnapshot;

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
      ? copy.emptyStates.noMatches(searchQuery.trim())
      : listFilter === 'all'
        ? copy.emptyStates.noQuestionsYet
        : copy.emptyStates.noFilterMatches(
            copy.filterOptions.find((option) => option.value === listFilter)?.label ?? listFilter
          );

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
        <KangurQuestionsHeader
          copy={copy.header}
          currentSuite={currentSuite}
          questionCount={questions.length}
          formatQuestionCount={copy.formatQuestionCount}
          readyCount={readyCount}
          richQuestionCount={richQuestionCount}
          needsReviewCount={needsReviewCount}
          needsFixCount={needsFixCount}
          illustratedCount={illustratedCount}
          reviewQueueCount={reviewQueueCount}
          draftCount={draftCount}
          readyToPublishCount={readyToPublishCount}
          publishedCount={publishedCount}
          currentSuiteHealth={currentSuiteHealth}
          canPublishAndGoLive={canPublishAndGoLiveCurrentSuite}
          canPublishReady={canPublishReadyForCurrentSuite}
          isSaving={isSaving}
          onPublishAndGoLive={(): void => {
            void handlePublishAndGoLiveCurrentSuite();
          }}
          onPublishReady={(): void => {
            void handlePublishReadyForCurrentSuite();
          }}
          onGoLive={(): void => {
            void handleGoLiveCurrentSuite();
          }}
          onTakeOffline={(): void => {
            void handleTakeCurrentSuiteOffline();
          }}
          onAddQuestion={openCreate}
          onBack={onClose}
        />

        {currentSuiteHealth.liveNeedsAttention ? (
          <div className='rounded-2xl border border-rose-400/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-100'>
            {copy.alerts.liveNeedsAttention}
          </div>
        ) : currentSuiteHealth.isLive ? (
          <div className='rounded-2xl border border-emerald-400/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-100'>
            {copy.alerts.live}
          </div>
        ) : currentSuiteHealth.canGoLive ? (
          <div className='rounded-2xl border border-cyan-400/30 bg-cyan-500/10 px-4 py-3 text-sm text-cyan-100'>
            {copy.alerts.readyForLive}
          </div>
        ) : canPublishAndGoLiveCurrentSuite ? (
          <div className='rounded-2xl border border-cyan-400/30 bg-cyan-500/10 px-4 py-3 text-sm text-cyan-100'>
            {copy.alerts.publishAndGoLive}
          </div>
        ) : null}

        <KangurQuestionsFilterTriage
          copy={copy.filters}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          sortMode={sortMode}
          onSortChange={setSortMode}
          listFilter={listFilter}
          onFilterChange={setListFilter}
          filterOptions={copy.filterOptions}
          sortOptions={copy.sortOptions}
        />

        {/* Question list */}
        <div className='flex-1 overflow-auto rounded-[28px] border border-border/60 bg-card/20 p-3 sm:p-4'>
          <div className='space-y-3 pr-1'>
            {visibleQuestions.length === 0 ? (
              <div className='rounded-2xl border border-dashed border-border/60 p-8 text-center text-sm text-muted-foreground'>
                {emptyFilterLabel}
              </div>
            ) : (
              visibleQuestions.map((q, index) => {
                const absoluteIndex = questions.findIndex((question) => question.id === q.id);
                const canReorder = listFilter === 'all' && sortMode === 'manual';
                const questionSummary = questionSummaries.get(q.id);
                const queuePosition = sortMode === 'review-queue' ? index + 1 : null;

                return (
                  <KangurQuestionListItem
                    copy={copy.listItem}
                    key={q.id}
                    question={q}
                    index={index}
                    absoluteIndex={absoluteIndex}
                    canReorder={canReorder}
                    isSaving={isSaving}
                    questionSummary={questionSummary ?? null}
                    queuePosition={queuePosition}
                    onMoveUp={(): void => {
                      if (canReorder) {
                        void handleMove(absoluteIndex, absoluteIndex - 1);
                      }
                    }}
                    onMoveDown={(): void => {
                      if (canReorder) {
                        void handleMove(absoluteIndex, absoluteIndex + 1);
                      }
                    }}
                    onEdit={(): void => openEdit(q)}
                    onDuplicate={(): void => {
                      void handleDuplicate(q);
                    }}
                    onDelete={(): void => setQuestionToDelete(q)}
                  />
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* Question editor modal */}
      <FormModal
        isOpen={showEditor}
        onClose={handleRequestClose}
        title={isNewQuestion ? copy.modal.addQuestionTitle : copy.modal.editQuestionTitle}
        subtitle={`${suite.title}`}
        onSave={(): void => {
          void handleSave();
        }}
        isSaving={isSaving}
        isSaveDisabled={isSaveDisabled}
        hasUnsavedChanges={isEditorDirty}
        saveText={isNewQuestion ? copy.modal.addQuestionSave : copy.modal.saveQuestion}
        size='xl'
      >
        {formData ? (
          <div className='space-y-4'>
            {restorableDraftSavedAt ? (
              <div className='rounded-xl border border-cyan-400/20 bg-cyan-500/10 px-4 py-3'>
                <div className='flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between'>
                  <div>
                    <div className='text-sm font-semibold text-cyan-100'>
                      {copy.modal.recoveredDraftTitle}
                    </div>
                    <div className='mt-1 text-xs text-cyan-50/80'>
                      {copy.modal.recoveredDraftFrom(
                        formatDraftTimestamp(restorableDraftSavedAt, copy.intlLocale) ??
                          restorableDraftSavedAt
                      )}
                    </div>
                  </div>
                  <div className='flex items-center gap-2'>
                    <Button type='button' size='sm' variant='outline' onClick={handleDismissDraft}>
                      {copy.modal.dismissDraft}
                    </Button>
                    <Button type='button' size='sm' onClick={handleRestoreDraft}>
                      {copy.modal.restoreDraft}
                    </Button>
                  </div>
                </div>
              </div>
            ) : null}
            <KangurTestQuestionEditor
              formData={formData}
              onChange={setFormData}
              isDirty={isEditorDirty}
              localDraftSavedAtLabel={formatDraftTimestamp(localDraftSavedAt, copy.intlLocale)}
            />
          </div>
        ) : null}
      </FormModal>

      {/* Delete confirm */}
      <ConfirmModal
        isOpen={Boolean(questionToDelete)}
        onClose={(): void => setQuestionToDelete(null)}
        onConfirm={(): void => {
          void handleDelete();
        }}
        title={copy.modal.deleteQuestionTitle}
        message={copy.modal.deleteQuestionMessage(
          questionToDelete?.prompt.slice(0, 60) ?? ''
        )}
        confirmText={copy.modal.deleteQuestionConfirm}
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
        title={copy.modal.discardChangesTitle}
        subtitle={copy.modal.discardChangesSubtitle}
        message={copy.modal.discardChangesMessage}
        confirmText={copy.modal.discardChangesConfirm}
        cancelText={copy.modal.discardChangesCancel}
        isDangerous={true}
      />
    </>
  );
}
