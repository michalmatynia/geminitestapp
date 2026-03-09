'use client';

import React from 'react';

import { Badge, Button, SelectSimple, Textarea } from '@/shared/ui';
import type { KangurTestQuestion } from '@/shared/contracts/kangur-tests';
import type { QuestionFormData } from '../test-questions';
import { hasIllustration } from '../test-questions';
import { QuestionChoicesEditor } from './components/QuestionChoicesEditor';
import { QuestionIllustrationEditor } from './components/QuestionIllustrationEditor';
import { KangurTestQuestionRenderer } from '../ui/components/KangurTestQuestionRenderer';
import {
  KangurTestQuestionEditorProvider,
  useKangurTestQuestionEditorContext,
} from './context/KangurTestQuestionEditorContext';
import { useOptionalKangurQuestionsManagerRuntimeContext } from './context/KangurQuestionsManagerRuntimeContext';
import { getQuestionAuthoringSummary } from './question-authoring-insights';
import { getQuestionWorkflowLabel } from './question-authoring-insights';
import {
  applyQuestionAuthoringRepair,
  getQuestionAuthoringRepairActions,
} from './question-authoring-repairs';

const POINT_VALUE_OPTIONS = [
  { value: '1', label: '1 pt' },
  { value: '2', label: '2 pts' },
  { value: '3', label: '3 pts' },
  { value: '4', label: '4 pts' },
  { value: '5', label: '5 pts' },
];

const PRESENTATION_LAYOUT_OPTIONS = [
  { value: 'classic', label: 'Classic stack' },
  { value: 'split-illustration-left', label: 'Illustration left' },
  { value: 'split-illustration-right', label: 'Illustration right' },
];

const CHOICE_STYLE_OPTIONS = [
  { value: 'list', label: 'Choice list' },
  { value: 'grid', label: 'Choice grid' },
];

const QUESTION_WORKFLOW_OPTIONS = [
  { value: 'draft', label: 'Draft' },
  { value: 'ready', label: 'Ready to publish' },
  { value: 'published', label: 'Published' },
] as const;

type Props = {
  formData: QuestionFormData;
  onChange: (next: QuestionFormData) => void;
  suiteTitle?: string;
  isDirty?: boolean;
  localDraftSavedAtLabel?: string | null;
};

export function KangurTestQuestionEditor(props: Props): React.JSX.Element {
  const runtime = useOptionalKangurQuestionsManagerRuntimeContext();
  const resolvedSuiteTitle = props.suiteTitle ?? runtime?.suite.title;

  return (
    <KangurTestQuestionEditorProvider {...props} suiteTitle={resolvedSuiteTitle}>
      <KangurTestQuestionEditorContent
        isDirty={props.isDirty}
        localDraftSavedAtLabel={props.localDraftSavedAtLabel}
      />
    </KangurTestQuestionEditorProvider>
  );
}

function KangurTestQuestionEditorContent({
  isDirty = false,
  localDraftSavedAtLabel = null,
}: {
  isDirty?: boolean;
  localDraftSavedAtLabel?: string | null;
}): React.JSX.Element {
  const { formData, suiteTitle, updateFormData } = useKangurTestQuestionEditorContext();
  const [previewMode, setPreviewMode] = React.useState<'learner' | 'correct' | 'incorrect'>(
    'learner'
  );
  const [previewFrame, setPreviewFrame] = React.useState<'desktop' | 'compact'>('desktop');

  const previewQuestion: KangurTestQuestion = {
    id: 'preview',
    suiteId: '',
    sortOrder: 0,
    prompt: formData.prompt,
    choices: formData.choices,
    correctChoiceLabel: formData.correctChoiceLabel,
    pointValue: formData.pointValue,
    explanation: formData.explanation || undefined,
    illustration: formData.illustration,
    stemDocument: formData.stemDocument ?? undefined,
    explanationDocument: formData.explanationDocument ?? undefined,
    hintDocument: formData.hintDocument ?? undefined,
    presentation: formData.presentation,
    editorial: formData.editorial,
  };
  const authoringSummary = getQuestionAuthoringSummary(previewQuestion);
  const statusBadgeClassName =
    authoringSummary.status === 'needs-fix'
      ? 'border-rose-400/40 text-[10px] text-rose-300'
      : authoringSummary.status === 'needs-review'
        ? 'border-amber-400/40 text-[10px] text-amber-300'
        : 'border-emerald-400/40 text-[10px] text-emerald-300';
  const statusLabel =
    authoringSummary.status === 'needs-fix'
      ? 'Needs fixes'
      : authoringSummary.status === 'needs-review'
        ? 'Needs review'
        : 'Ready';
  const workflowLabel = getQuestionWorkflowLabel(formData.editorial.workflowStatus);
  const repairActions = React.useMemo(
    () =>
      getQuestionAuthoringRepairActions([
        ...authoringSummary.blockers,
        ...authoringSummary.warnings,
      ]),
    [authoringSummary.blockers, authoringSummary.warnings]
  );
  const previewSelectedLabel =
    previewMode === 'learner'
      ? null
      : previewMode === 'correct'
        ? formData.correctChoiceLabel
        : formData.choices.find((choice) => choice.label !== formData.correctChoiceLabel)?.label ??
          formData.correctChoiceLabel;
  const previewShowAnswer = previewMode !== 'learner';
  const previewModeLabel =
    previewMode === 'learner'
      ? 'Learner view'
      : previewMode === 'correct'
        ? 'Correct answer review'
        : 'Wrong answer review';

  return (
    <div className='grid gap-6 xl:grid-cols-[minmax(0,1.1fr)_minmax(300px,0.9fr)]'>
      {/* ── Editor column ───────────────────────────────────────────────── */}
      <div className='space-y-5'>
        {/* Metadata strip */}
        <div className='flex flex-wrap items-center gap-3 rounded-xl border border-border/50 bg-card/30 px-4 py-2'>
          <div className='flex items-center gap-2'>
            <span className='text-xs text-muted-foreground'>Points:</span>
            <div className='w-24'>
              <SelectSimple
                size='sm'
                value={String(formData.pointValue)}
                onValueChange={(v): void => {
                  const n = parseInt(v, 10);
                  if (Number.isFinite(n)) updateFormData({ pointValue: n });
                }}
                options={POINT_VALUE_OPTIONS}
                triggerClassName='h-7'
              />
            </div>
          </div>
          {suiteTitle ? (
            <Badge variant='outline' className='text-[10px]'>
              {suiteTitle}
            </Badge>
          ) : null}
          {hasIllustration(previewQuestion) ? (
            <Badge variant='outline' className='border-violet-400/40 text-[10px] text-violet-300'>
              Has illustration
            </Badge>
          ) : null}
          {formData.editorial.reviewStatus !== 'ready' ? (
            <Badge
              variant='outline'
              className={
                formData.editorial.reviewStatus === 'needs-fix'
                  ? 'border-rose-400/40 text-[10px] text-rose-300'
                  : 'border-amber-400/40 text-[10px] text-amber-300'
              }
            >
              {formData.editorial.reviewStatus === 'needs-fix' ? 'Needs fix' : 'Needs review'}
            </Badge>
          ) : null}
          {formData.presentation.choiceStyle === 'grid' ? (
            <Badge variant='outline' className='border-sky-400/40 text-[10px] text-sky-300'>
              Choice grid
            </Badge>
          ) : null}
          <Badge variant='outline' className='text-[10px]'>
            {isDirty ? 'Unsaved changes' : 'Saved'}
          </Badge>
          <Badge
            variant='outline'
            className={
              formData.editorial.workflowStatus === 'published'
                ? 'border-emerald-400/40 text-[10px] text-emerald-300'
                : formData.editorial.workflowStatus === 'ready'
                  ? 'border-cyan-400/40 text-[10px] text-cyan-300'
                  : 'border-slate-400/40 text-[10px] text-slate-300'
            }
          >
            {workflowLabel}
          </Badge>
          <Badge variant='outline' className={statusBadgeClassName}>
            {statusLabel}
          </Badge>
          {localDraftSavedAtLabel ? (
            <span className='text-[10px] text-muted-foreground'>
              Local draft autosaved: {localDraftSavedAtLabel}
            </span>
          ) : null}
        </div>

        <div className='grid gap-4 rounded-2xl border border-border/50 bg-card/20 p-4'>
          <div className='flex flex-wrap items-start justify-between gap-3'>
            <div className='space-y-1'>
              <div className='text-xs font-semibold uppercase tracking-wide text-muted-foreground'>
                Question review
              </div>
              <div className='text-sm font-semibold text-white'>Next action</div>
              <div className='text-sm text-muted-foreground'>{authoringSummary.nextAction}</div>
            </div>
            <Badge variant='outline' className={statusBadgeClassName}>
              {statusLabel}
            </Badge>
          </div>
          <div className='grid gap-3 md:grid-cols-2'>
            <div className='rounded-xl border border-border/40 bg-background/30 p-3'>
              <div className='mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground'>
                Required before save
              </div>
              {authoringSummary.blockers.length > 0 ? (
                <ul className='space-y-1 text-sm text-rose-200'>
                  {authoringSummary.blockers.map((issue) => (
                    <li key={issue.code}>• {issue.message}</li>
                  ))}
                </ul>
              ) : (
                <div className='text-sm text-emerald-200'>
                  No structural blockers. This draft can be saved.
                </div>
              )}
            </div>
            <div className='rounded-xl border border-border/40 bg-background/30 p-3'>
              <div className='mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground'>
                Review before publish
              </div>
              {authoringSummary.warnings.length > 0 ? (
                <ul className='space-y-1 text-sm text-amber-100'>
                  {authoringSummary.warnings.map((issue) => (
                    <li key={issue.code}>• {issue.message}</li>
                  ))}
                </ul>
              ) : (
                <div className='text-sm text-emerald-200'>
                  No review warnings. The question is editorially clean.
                </div>
              )}
            </div>
          </div>
          {formData.editorial.note?.trim() ? (
            <div className='rounded-xl border border-amber-400/30 bg-amber-500/10 px-3 py-2 text-sm text-amber-100'>
              {formData.editorial.note.trim()}
            </div>
          ) : null}
          {repairActions.length > 0 ? (
            <div className='rounded-xl border border-border/40 bg-background/30 p-3'>
              <div className='mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground'>
                Quick repairs
              </div>
              <div className='flex flex-wrap gap-2'>
                {repairActions.map((repair) => (
                  <Button
                    key={repair.id}
                    type='button'
                    size='sm'
                    variant='outline'
                    className='h-8 px-3 text-[11px]'
                    onClick={(): void =>
                      updateFormData(applyQuestionAuthoringRepair(formData, repair.id))
                    }
                  >
                    {repair.label}
                  </Button>
                ))}
              </div>
            </div>
          ) : null}
        </div>

        <div className='grid gap-3 rounded-2xl border border-border/50 bg-card/20 p-4'>
          <div className='space-y-1'>
            <div className='text-xs font-semibold uppercase tracking-wide text-muted-foreground'>
              Publishing state
            </div>
            <div className='text-sm text-muted-foreground'>
              Draft questions stay in authoring. Ready questions are cleared for publish. Published
              marks the question as live-approved in the bank.
            </div>
          </div>
          <div className='flex flex-wrap gap-2'>
            {QUESTION_WORKFLOW_OPTIONS.map((option) => {
              const isActive = formData.editorial.workflowStatus === option.value;
              return (
                <button
                  key={option.value}
                  type='button'
                  className={
                    isActive
                      ? 'inline-flex items-center rounded-full border border-cyan-400/50 bg-cyan-500/15 px-3 py-1.5 text-xs font-semibold text-cyan-100'
                      : 'inline-flex items-center rounded-full border border-border/60 bg-background/40 px-3 py-1.5 text-xs font-semibold text-muted-foreground hover:border-primary/40 hover:text-foreground'
                  }
                  onClick={(): void =>
                    updateFormData({
                      editorial: {
                        ...formData.editorial,
                        workflowStatus: option.value,
                      },
                    })
                  }
                >
                  {option.label}
                </button>
              );
            })}
          </div>
          {formData.editorial.publishedAt ? (
            <div className='text-xs text-muted-foreground'>
              Last published: {new Date(formData.editorial.publishedAt).toLocaleString('pl-PL')}
            </div>
          ) : (
            <div className='text-xs text-muted-foreground'>
              This question has not been published yet.
            </div>
          )}
        </div>

        <div className='grid gap-3 rounded-2xl border border-border/50 bg-card/20 p-4 md:grid-cols-2'>
          <div className='space-y-1'>
            <div className='text-xs font-semibold uppercase tracking-wide text-muted-foreground'>
              Question layout
            </div>
            <SelectSimple
              size='sm'
              value={formData.presentation.layout}
              onValueChange={(value): void => {
                if (
                  value !== 'classic' &&
                  value !== 'split-illustration-left' &&
                  value !== 'split-illustration-right'
                ) {
                  return;
                }
                updateFormData({
                  presentation: {
                    ...formData.presentation,
                    layout: value,
                  },
                });
              }}
              options={PRESENTATION_LAYOUT_OPTIONS}
              triggerClassName='h-9'
            />
          </div>
          <div className='space-y-1'>
            <div className='text-xs font-semibold uppercase tracking-wide text-muted-foreground'>
              Choice style
            </div>
            <SelectSimple
              size='sm'
              value={formData.presentation.choiceStyle}
              onValueChange={(value): void => {
                if (value !== 'list' && value !== 'grid') {
                  return;
                }
                updateFormData({
                  presentation: {
                    ...formData.presentation,
                    choiceStyle: value,
                  },
                });
              }}
              options={CHOICE_STYLE_OPTIONS}
              triggerClassName='h-9'
            />
          </div>
          {formData.editorial.auditFlags.length > 0 ? (
            <div className='space-y-2 md:col-span-2'>
              <div className='text-xs font-semibold uppercase tracking-wide text-muted-foreground'>
                Legacy review notes
              </div>
              <div className='flex flex-wrap gap-1.5'>
                {formData.editorial.auditFlags.map((flag) => (
                  <Badge
                    key={flag}
                    variant='outline'
                    className='border-amber-400/40 text-[10px] text-amber-300'
                  >
                    {flag.replaceAll('_', ' ')}
                  </Badge>
                ))}
              </div>
            </div>
          ) : null}
        </div>

        {/* Prompt */}
        <div className='space-y-1'>
          <div className='text-xs font-semibold uppercase tracking-wide text-muted-foreground'>
            Question prompt
          </div>
          <Textarea
            value={formData.prompt}
            onChange={(e): void => updateFormData({ prompt: e.target.value })}
            placeholder='Enter the question text. You can use $$formula$$ markers for math expressions.'
            className='min-h-[100px]'
          />
          <div className='text-xs text-muted-foreground'>
            This prompt is also mirrored into the structured question-content engine so richer
            layouts can evolve without migrating the data again.
          </div>
        </div>

        {/* Choices */}
        <QuestionChoicesEditor />

        {/* Illustration */}
        <div className='space-y-2'>
          <div className='text-xs font-semibold uppercase tracking-wide text-muted-foreground'>
            Illustration
          </div>
          <QuestionIllustrationEditor />
        </div>

        {/* Explanation */}
        <div className='space-y-1'>
          <div className='text-xs font-semibold uppercase tracking-wide text-muted-foreground'>
            Explanation (shown after answer)
          </div>
          <Textarea
            value={formData.explanation}
            onChange={(e): void => updateFormData({ explanation: e.target.value })}
            placeholder='Step-by-step explanation of why the correct answer is correct.'
            className='min-h-[80px]'
          />
          <div className='text-xs text-muted-foreground'>
            Add the learner-facing explanation here. Imported legacy questions keep any review
            flags above until they are repaired.
          </div>
        </div>
      </div>

      {/* ── Preview column ──────────────────────────────────────────────── */}
      <div className='sticky top-4 hidden h-[calc(100vh-2rem)] flex-col overflow-hidden rounded-2xl border border-border/60 bg-card/20 xl:flex'>
        <div className='flex items-center justify-between border-b border-border/60 bg-card/40 px-4 py-3 backdrop-blur-md'>
          <div>
            <div className='text-sm font-semibold text-white'>Preview</div>
            <div className='text-xs text-muted-foreground'>{previewModeLabel}</div>
          </div>
          <div className='flex flex-wrap items-center justify-end gap-2'>
            <div className='flex items-center gap-1 rounded-full border border-border/50 bg-background/30 p-1'>
              {(['learner', 'correct', 'incorrect'] as const).map((mode) => {
                const label =
                  mode === 'learner'
                    ? 'Learner view'
                    : mode === 'correct'
                      ? 'Correct answer'
                      : 'Wrong answer';
                return (
                  <button
                    key={mode}
                    type='button'
                    className={
                      previewMode === mode
                        ? 'rounded-full bg-cyan-500/15 px-2.5 py-1 text-[11px] font-semibold text-cyan-100'
                        : 'rounded-full px-2.5 py-1 text-[11px] font-semibold text-muted-foreground hover:text-foreground'
                    }
                    onClick={(): void => setPreviewMode(mode)}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
            <div className='flex items-center gap-1 rounded-full border border-border/50 bg-background/30 p-1'>
              {(['desktop', 'compact'] as const).map((frame) => (
                <button
                  key={frame}
                  type='button'
                  className={
                    previewFrame === frame
                      ? 'rounded-full bg-cyan-500/15 px-2.5 py-1 text-[11px] font-semibold text-cyan-100'
                      : 'rounded-full px-2.5 py-1 text-[11px] font-semibold text-muted-foreground hover:text-foreground'
                  }
                  onClick={(): void => setPreviewFrame(frame)}
                >
                  {frame === 'desktop' ? 'Desktop' : 'Compact'}
                </button>
              ))}
            </div>
          </div>
        </div>
        <div className='flex-1 overflow-y-auto p-4 scrollbar-thin'>
          <div
            data-testid='question-preview-frame'
            className={
              previewFrame === 'compact'
                ? 'mx-auto max-w-[360px] rounded-xl border border-border/40 bg-white p-4 shadow-sm'
                : 'mx-auto max-w-xl rounded-xl border border-border/40 bg-white p-4 shadow-sm'
            }
          >
            <KangurTestQuestionRenderer
              question={previewQuestion}
              selectedLabel={previewSelectedLabel}
              onSelect={(): void => {}}
              showAnswer={previewShowAnswer}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
