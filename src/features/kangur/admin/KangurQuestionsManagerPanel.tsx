'use client';

import React, { useMemo, useState } from 'react';
import { ArrowDown, ArrowUp, Copy, Plus, Trash2 } from 'lucide-react';

import { Badge, Button, FormModal, useToast } from '@/shared/ui';
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
  parseKangurTestQuestionStore,
  reorderQuestions,
  toQuestionFormData,
  upsertKangurTestQuestion,
  type QuestionFormData,
} from '../test-questions';

import { moveItem } from './utils';
import { KangurTestQuestionEditor } from './KangurTestQuestionEditor';

export function KangurQuestionsManagerPanel(): React.JSX.Element {
  const { suite, onClose } = useKangurQuestionsManagerRuntimeContext();
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

  const openCreate = (): void => {
    const q = createKangurTestQuestion(suite.id, (questions.length + 1) * 1000);
    setEditingQuestion(q);
    setFormData(toQuestionFormData(q));
    setIsNewQuestion(true);
    setShowEditor(true);
  };

  const openEdit = (q: KangurTestQuestion): void => {
    setEditingQuestion(q);
    setFormData(toQuestionFormData(q));
    setIsNewQuestion(false);
    setShowEditor(true);
  };

  const handleSave = async (): Promise<void> => {
    if (!editingQuestion || !formData) return;
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
      toast(isNewQuestion ? 'Question created.' : 'Question updated.', { variant: 'success' });
      setShowEditor(false);
      setEditingQuestion(null);
      setFormData(null);
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
  const isSaveDisabled = !formData?.prompt.trim() || isSaving;

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

        {/* Question list */}
        <div className='flex-1 overflow-auto space-y-2 pr-1'>
          {questions.length === 0 ? (
            <div className='rounded-xl border border-dashed border-border/60 p-6 text-center text-sm text-muted-foreground'>
              No questions yet. Add the first question to start.
            </div>
          ) : (
            questions.map((q, index) => (
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
                      void handleMove(index, index - 1);
                    }}
                    disabled={index === 0 || isSaving}
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
                      void handleMove(index, index + 1);
                    }}
                    disabled={index === questions.length - 1 || isSaving}
                    aria-label='Move down'
                  >
                    <ArrowDown className='size-3' />
                  </Button>
                </div>

                <div className='min-w-0 flex-1'>
                  <div className='flex flex-wrap items-center gap-1.5 mb-1'>
                    <span className='text-xs font-semibold text-gray-400'>#{index + 1}</span>
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
            ))
          )}
        </div>
      </div>

      {/* Question editor modal */}
      <FormModal
        isOpen={showEditor}
        onClose={(): void => {
          setShowEditor(false);
          setEditingQuestion(null);
          setFormData(null);
        }}
        title={isNewQuestion ? 'Add Question' : 'Edit Question'}
        subtitle={`${suite.title}`}
        onSave={(): void => {
          void handleSave();
        }}
        isSaving={isSaving}
        isSaveDisabled={isSaveDisabled}
        saveText={isNewQuestion ? 'Add Question' : 'Save Question'}
        size='xl'
      >
        {formData ? (
          <KangurTestQuestionEditor formData={formData} onChange={setFormData} />
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
    </>
  );
}
