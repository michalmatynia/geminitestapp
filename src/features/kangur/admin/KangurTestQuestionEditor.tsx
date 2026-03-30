'use client';

import { useLocale } from 'next-intl';
import React from 'react';

import type { KangurTestQuestion } from '@/features/kangur/shared/contracts/kangur-tests';
import { Badge, Button, SelectSimple, Textarea } from '@/features/kangur/shared/ui';
import {
  KANGUR_GRID_RELAXED_CLASSNAME,
  KANGUR_GRID_ROOMY_CLASSNAME,
} from '@/features/kangur/ui/design/tokens';


import { hasIllustration } from '../test-suites/questions';
import { QuestionChoicesEditor } from './components/QuestionChoicesEditor';
import { QuestionIllustrationEditor } from './components/QuestionIllustrationEditor';
import { useOptionalKangurQuestionsManagerRuntimeContext } from './context/KangurQuestionsManagerRuntimeContext';
import {
  KangurTestQuestionEditorActionsContext,
  KangurTestQuestionEditorStateContext,
  useKangurTestQuestionEditorContext,
  useCreateKangurTestQuestionEditorProviderValues,
} from './context/KangurTestQuestionEditorContext';
import { getQuestionAuthoringSummary } from './question-authoring-insights';
import { getQuestionWorkflowLabel } from './question-authoring-insights';
import {
  applyQuestionAuthoringRepair,
  getQuestionAuthoringRepairActions,
} from './question-authoring-repairs';
import {
  applyQuestionPresentationPreset,
  getQuestionPresentationPresets,
} from './question-presentation-presets';
import { KangurTestQuestionRenderer } from '../ui/components/KangurTestQuestionRenderer';
import {
  getQuestionEditorCopy,
  resolveQuestionEditorLocale,
} from './question-editor.copy';

import type { QuestionFormData } from '../test-suites/questions';

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
  const editorDirtyState = props.isDirty;
  const editorLocalDraftSavedAtLabel = props.localDraftSavedAtLabel;
  const { stateValue, actionsValue } = useCreateKangurTestQuestionEditorProviderValues({
    formData: props.formData,
    onChange: props.onChange,
    suiteTitle: resolvedSuiteTitle,
  });

  return (
    <KangurTestQuestionEditorActionsContext.Provider value={actionsValue}>
      <KangurTestQuestionEditorStateContext.Provider value={stateValue}>
        <KangurTestQuestionEditorContent
          isDirty={editorDirtyState}
          localDraftSavedAtLabel={editorLocalDraftSavedAtLabel}
        />
      </KangurTestQuestionEditorStateContext.Provider>
    </KangurTestQuestionEditorActionsContext.Provider>
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
  const locale = resolveQuestionEditorLocale(useLocale());
  const copy = React.useMemo(() => getQuestionEditorCopy(locale), [locale]);
  const presentationPresets = React.useMemo(
    () => getQuestionPresentationPresets(locale),
    [locale]
  );
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
  const authoringSummary = getQuestionAuthoringSummary(previewQuestion, locale);
  const statusBadgeClassName =
    authoringSummary.status === 'needs-fix'
      ? 'border-rose-400/40 text-[10px] text-rose-300'
      : authoringSummary.status === 'needs-review'
        ? 'border-amber-400/40 text-[10px] text-amber-300'
        : 'border-emerald-400/40 text-[10px] text-emerald-300';
  const statusLabel =
    authoringSummary.status === 'needs-fix'
      ? copy.statusLabels['needs-fix']
      : authoringSummary.status === 'needs-review'
        ? copy.statusLabels['needs-review']
        : copy.statusLabels.ready;
  const workflowLabel = getQuestionWorkflowLabel(formData.editorial.workflowStatus, locale);
  const workflowBadgeClassName =
    formData.editorial.workflowStatus === 'published'
      ? 'border-emerald-400/40 text-[10px] text-emerald-300'
      : formData.editorial.workflowStatus === 'ready'
        ? 'border-cyan-400/40 text-[10px] text-cyan-300'
        : 'border-slate-400/40 text-[10px] text-slate-300';
  const dirtyStateLabel = isDirty ? copy.dirtyStateLabels.unsaved : copy.dirtyStateLabels.saved;
  const draftStateLabel = localDraftSavedAtLabel
    ? locale === 'uk'
      ? `Автозбережено ${localDraftSavedAtLabel}`
      : locale === 'pl'
        ? `Autozapis ${localDraftSavedAtLabel}`
        : `Autosaved ${localDraftSavedAtLabel}`
    : locale === 'uk'
      ? 'Ще немає локального автозбереження'
      : locale === 'pl'
        ? 'Brak lokalnego autosave'
        : 'No local autosave yet';
  const repairActions = React.useMemo(
    () =>
      getQuestionAuthoringRepairActions([
        ...authoringSummary.blockers,
        ...authoringSummary.warnings,
      ], locale),
    [authoringSummary.blockers, authoringSummary.warnings, locale]
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
      ? copy.shell.previewModes.learner
      : previewMode === 'correct'
        ? copy.shell.previewModes.correctReview
        : copy.shell.previewModes.incorrectReview;

  return (
    <div
      className={`${KANGUR_GRID_ROOMY_CLASSNAME} items-start 2xl:grid-cols-[minmax(0,1.14fr)_minmax(340px,0.86fr)]`}
    >
      {/* ── Editor column ───────────────────────────────────────────────── */}
      <div className='space-y-5'>
        <div className='overflow-hidden rounded-3xl border border-border/60 bg-[linear-gradient(135deg,rgba(9,16,32,0.97),rgba(12,34,59,0.86))] p-5 shadow-[0_24px_70px_-36px_rgba(8,145,178,0.55)]'>
          <div className='flex flex-wrap items-start justify-between gap-4'>
            <div className='max-w-2xl space-y-2'>
              <div className='text-[11px] font-semibold uppercase tracking-[0.24em] text-cyan-200/80'>
                {copy.shell.eyebrow}
              </div>
              <div className='text-lg font-semibold text-white'>{copy.shell.title}</div>
              <div className='text-sm leading-6 text-slate-300'>{copy.shell.description}</div>
            </div>
            <div className='min-w-[148px] rounded-2xl border border-cyan-400/25 bg-cyan-500/10 p-3'>
              <div className='text-[11px] font-semibold uppercase tracking-wide text-cyan-100/80'>
                {copy.shell.pointValue}
              </div>
              <div className='mt-2'>
                <SelectSimple
                  size='sm'
                  value={String(formData.pointValue)}
                  onValueChange={(v): void => {
                    const n = parseInt(v, 10);
                    if (Number.isFinite(n)) updateFormData({ pointValue: n });
                  }}
                  options={copy.pointValueOptions}
                  triggerClassName='h-9'
                  ariaLabel={copy.selectOptionLabel}
                  title={copy.selectOptionLabel}
                />
              </div>
            </div>
          </div>

          <div className='mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4'>
            <div className='rounded-2xl border border-white/10 bg-white/5 p-3'>
              <div className='text-[11px] font-semibold uppercase tracking-wide text-slate-400'>
                {copy.shell.suiteTarget}
              </div>
              <div className='mt-1 text-sm font-medium text-white'>
                {suiteTitle ?? copy.shell.adHocDraft}
              </div>
            </div>
            <div className='rounded-2xl border border-white/10 bg-white/5 p-3'>
              <div className='text-[11px] font-semibold uppercase tracking-wide text-slate-400'>
                {copy.shell.workflow}
              </div>
              <div className='mt-1 text-sm font-medium text-white'>{workflowLabel}</div>
            </div>
            <div className='rounded-2xl border border-white/10 bg-white/5 p-3'>
              <div className='text-[11px] font-semibold uppercase tracking-wide text-slate-400'>
                {copy.shell.authoringStatus}
              </div>
              <div className='mt-1 text-sm font-medium text-white'>{statusLabel}</div>
            </div>
            <div className='rounded-2xl border border-white/10 bg-white/5 p-3'>
              <div className='text-[11px] font-semibold uppercase tracking-wide text-slate-400'>
                {copy.shell.localDraft}
              </div>
              <div className='mt-1 text-sm font-medium text-white'>{draftStateLabel}</div>
            </div>
          </div>

          <div className='mt-4 flex flex-wrap gap-2'>
            <Badge variant='outline' className='text-[10px]'>
              {dirtyStateLabel}
            </Badge>
            <Badge variant='outline' className={workflowBadgeClassName}>
              {workflowLabel}
            </Badge>
            <Badge variant='outline' className={statusBadgeClassName}>
              {statusLabel}
            </Badge>
            {hasIllustration(previewQuestion) ? (
              <Badge
                variant='outline'
                className='border-violet-400/40 text-[10px] text-violet-300'
              >
                {copy.shell.hasIllustration}
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
                {formData.editorial.reviewStatus === 'needs-fix'
                  ? copy.reviewStatusBadges['needs-fix']
                  : copy.reviewStatusBadges['needs-review']}
              </Badge>
            ) : null}
            {formData.presentation.choiceStyle === 'grid' ? (
              <Badge variant='outline' className='border-sky-400/40 text-[10px] text-sky-300'>
                {copy.choiceStyleOptions[1]?.label}
              </Badge>
            ) : null}
          </div>
        </div>

        <div
          className={`${KANGUR_GRID_RELAXED_CLASSNAME} rounded-3xl border border-border/50 bg-card/25 p-5`}
        >
          <div className='flex flex-wrap items-start justify-between gap-3'>
            <div className='space-y-1'>
              <div className='text-xs font-semibold uppercase tracking-wide text-muted-foreground'>
                {copy.shell.questionReview}
              </div>
              <div className='text-sm font-semibold text-white'>{copy.shell.nextAction}</div>
              <div className='text-sm text-muted-foreground'>{authoringSummary.nextAction}</div>
            </div>
            <Badge variant='outline' className={statusBadgeClassName}>
              {statusLabel}
            </Badge>
          </div>
          <div className='grid gap-3 md:grid-cols-2'>
            <div className='rounded-2xl border border-border/40 bg-background/30 p-4'>
              <div className='mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground'>
                {copy.shell.requiredBeforeSave}
              </div>
              {authoringSummary.blockers.length > 0 ? (
                <ul className='space-y-1 text-sm text-rose-200'>
                  {authoringSummary.blockers.map((issue) => (
                    <li key={issue.code}>• {issue.message}</li>
                  ))}
                </ul>
              ) : (
                <div className='text-sm text-emerald-200'>
                  {copy.shell.noStructuralBlockers}
                </div>
              )}
            </div>
            <div className='rounded-2xl border border-border/40 bg-background/30 p-4'>
              <div className='mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground'>
                {copy.shell.reviewBeforePublish}
              </div>
              {authoringSummary.warnings.length > 0 ? (
                <ul className='space-y-1 text-sm text-amber-100'>
                  {authoringSummary.warnings.map((issue) => (
                    <li key={issue.code}>• {issue.message}</li>
                  ))}
                </ul>
              ) : (
                <div className='text-sm text-emerald-200'>
                  {copy.shell.noReviewWarnings}
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
            <div className='rounded-2xl border border-border/40 bg-background/30 p-4'>
              <div className='mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground'>
                {copy.shell.quickRepairs}
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
                      updateFormData(applyQuestionAuthoringRepair(formData, repair.id, locale))
                    }
                  >
                    {repair.label}
                  </Button>
                ))}
              </div>
            </div>
          ) : null}
        </div>

        <div className='grid gap-3 rounded-3xl border border-border/50 bg-card/25 p-5'>
          <div className='space-y-1'>
            <div className='text-xs font-semibold uppercase tracking-wide text-muted-foreground'>
              {copy.shell.presentationPresets}
            </div>
            <div className='text-sm text-muted-foreground'>
              {copy.shell.presentationPresetsHint}
            </div>
          </div>
          <div className='grid gap-2 md:grid-cols-2'>
            {presentationPresets.map((preset) => (
              <button
                key={preset.id}
                type='button'
                aria-label={preset.label}
                className='rounded-2xl border border-border/50 bg-background/30 px-4 py-3 text-left transition hover:border-cyan-400/40 hover:bg-cyan-500/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:ring-offset-2 ring-offset-background'
                onClick={(): void =>
                  updateFormData(applyQuestionPresentationPreset(formData, preset.id))
                }
              >
                <div className='text-sm font-semibold text-white'>{preset.label}</div>
                <div className='mt-1 text-xs leading-relaxed text-muted-foreground'>
                  {preset.description}
                </div>
              </button>
            ))}
          </div>
        </div>

        <div className='grid gap-3 rounded-3xl border border-border/50 bg-card/25 p-5'>
          <div className='space-y-1'>
            <div className='text-xs font-semibold uppercase tracking-wide text-muted-foreground'>
              {copy.shell.publishingState}
            </div>
            <div className='text-sm text-muted-foreground'>{copy.shell.publishingStateHint}</div>
          </div>
          <div className='flex flex-wrap gap-2'>
            {copy.workflowOptions.map((option) => {
              const isActive = formData.editorial.workflowStatus === option.value;
              return (
                <button
                  key={option.value}
                  type='button'
                  className={
                    isActive
                      ? 'inline-flex items-center rounded-full border border-cyan-400/50 bg-cyan-500/15 px-3 py-1.5 text-xs font-semibold text-cyan-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:ring-offset-2 ring-offset-background'
                      : 'inline-flex items-center rounded-full border border-border/60 bg-background/40 px-3 py-1.5 text-xs font-semibold text-muted-foreground hover:border-primary/40 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:ring-offset-2 ring-offset-background'
                  }
                  aria-pressed={isActive}
                  aria-label={option.label}
                  onClick={(): void =>
                    updateFormData({
                      editorial: {
                        ...formData.editorial,
                        workflowStatus: option.value as 'published' | 'ready' | 'draft',
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
              {copy.shell.lastPublished(
                new Date(formData.editorial.publishedAt).toLocaleString(copy.intlLocale)
              )}
            </div>
          ) : (
            <div className='text-xs text-muted-foreground'>
              {copy.shell.notPublishedYet}
            </div>
          )}
        </div>

        <div className='grid gap-3 rounded-2xl border border-border/50 bg-card/20 p-4 md:grid-cols-2'>
          <div className='space-y-1'>
            <div className='text-xs font-semibold uppercase tracking-wide text-muted-foreground'>
              {copy.shell.questionLayout}
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
              options={copy.presentationLayoutOptions}
              triggerClassName='h-9'
              ariaLabel={copy.selectOptionLabel}
              title={copy.selectOptionLabel}
            />
          </div>
          <div className='space-y-1'>
            <div className='text-xs font-semibold uppercase tracking-wide text-muted-foreground'>
              {copy.shell.choiceStyle}
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
              options={copy.choiceStyleOptions}
              triggerClassName='h-9'
              ariaLabel={copy.selectOptionLabel}
              title={copy.selectOptionLabel}
            />
          </div>
          {formData.editorial.auditFlags.length > 0 ? (
            <div className='space-y-2 md:col-span-2'>
              <div className='text-xs font-semibold uppercase tracking-wide text-muted-foreground'>
                {copy.shell.legacyReviewNotes}
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
            {copy.shell.questionPrompt}
          </div>
          <Textarea
            value={formData.prompt}
            onChange={(e): void => updateFormData({ prompt: e.target.value })}
            placeholder={copy.shell.questionPromptPlaceholder}
            className='min-h-[100px]'
            aria-label={copy.shell.questionPromptPlaceholder}
            title={copy.shell.questionPromptPlaceholder}
          />
          <div className='text-xs text-muted-foreground'>{copy.shell.questionPromptHelper}</div>
        </div>

        {/* Choices */}
        <QuestionChoicesEditor />

        {/* Illustration */}
        <div className='space-y-2'>
          <div className='text-xs font-semibold uppercase tracking-wide text-muted-foreground'>
            {copy.shell.illustration}
          </div>
          <QuestionIllustrationEditor />
        </div>

        {/* Explanation */}
        <div className='space-y-1'>
          <div className='text-xs font-semibold uppercase tracking-wide text-muted-foreground'>
            {copy.shell.explanation}
          </div>
          <Textarea
            value={formData.explanation}
            onChange={(e): void => updateFormData({ explanation: e.target.value })}
            placeholder={copy.shell.explanationPlaceholder}
            className='min-h-[80px]'
            aria-label={copy.shell.explanationPlaceholder}
            title={copy.shell.explanationPlaceholder}
          />
          <div className='text-xs text-muted-foreground'>{copy.shell.explanationHelper}</div>
        </div>
      </div>

      {/* ── Preview column ──────────────────────────────────────────────── */}
      <div className='sticky top-4 hidden h-[calc(100vh-2rem)] flex-col overflow-hidden rounded-2xl border border-border/60 bg-card/20 xl:flex'>
        <div className='flex items-center justify-between border-b border-border/60 bg-card/40 px-4 py-3 backdrop-blur-md'>
          <div>
            <div className='text-sm font-semibold text-white'>{copy.shell.preview}</div>
            <div className='text-xs text-muted-foreground'>{previewModeLabel}</div>
          </div>
          <div className='flex flex-wrap items-center justify-end gap-2'>
            <div className='flex items-center gap-1 rounded-full border border-border/50 bg-background/30 p-1'>
              {(['learner', 'correct', 'incorrect'] as const).map((mode) => {
                const label =
                  mode === 'learner'
                    ? copy.shell.previewModes.learner
                    : mode === 'correct'
                      ? copy.shell.previewModes.correct
                      : copy.shell.previewModes.incorrect;
                return (
                  <button
                    key={mode}
                    type='button'
                    className={
                      previewMode === mode
                        ? 'rounded-full bg-cyan-500/15 px-2.5 py-1 text-[11px] font-semibold text-cyan-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:ring-offset-2 ring-offset-background'
                        : 'rounded-full px-2.5 py-1 text-[11px] font-semibold text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:ring-offset-2 ring-offset-background'
                    }
                    onClick={(): void => setPreviewMode(mode)}
                    aria-pressed={previewMode === mode}
                    aria-label={label}
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
                      ? 'rounded-full bg-cyan-500/15 px-2.5 py-1 text-[11px] font-semibold text-cyan-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:ring-offset-2 ring-offset-background'
                      : 'rounded-full px-2.5 py-1 text-[11px] font-semibold text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:ring-offset-2 ring-offset-background'
                  }
                  onClick={(): void => setPreviewFrame(frame)}
                  aria-pressed={previewFrame === frame}
                  aria-label={
                    frame === 'desktop'
                      ? copy.shell.previewFrames.desktop
                      : copy.shell.previewFrames.compact
                  }
                >
                  {frame === 'desktop'
                    ? copy.shell.previewFrames.desktop
                    : copy.shell.previewFrames.compact}
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
              showSectionIntro={false}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
