import { ArrowDown, ArrowUp, Copy, Trash2 } from 'lucide-react';
import React from 'react';

import type { KangurTestQuestion } from '@/features/kangur/shared/contracts/kangur-tests';
import { Badge, Button } from '@/features/kangur/shared/ui';
import { KANGUR_STACK_RELAXED_CLASSNAME } from '@/features/kangur/ui/design/tokens';

import {
  hasIllustration,
  hasRichChoiceContent,
  usesRichQuestionPresentation,
} from '../../test-suites/questions';
import type { QuestionAuthoringSummary } from '../question-authoring-insights';
import type { QuestionManagerCopy } from '../question-manager.copy';

interface KangurQuestionListItemProps {
  copy: QuestionManagerCopy['listItem'];
  question: KangurTestQuestion;
  index: number;
  absoluteIndex: number;
  canReorder: boolean;
  isSaving: boolean;
  questionSummary: QuestionAuthoringSummary | null;
  queuePosition?: number | null;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onEdit: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
}

export function KangurQuestionListItem(
  props: KangurQuestionListItemProps
): React.JSX.Element {
  const {
    copy,
    question,
    index,
    absoluteIndex,
    canReorder,
    isSaving,
    questionSummary,
    queuePosition,
    onMoveUp,
    onMoveDown,
    onEdit,
    onDuplicate,
    onDelete,
  } = props;
  const workflowLabel = copy.workflowLabels[question.editorial.workflowStatus];

  return (
    <div className={`${KANGUR_STACK_RELAXED_CLASSNAME} group rounded-2xl border border-border/50 bg-card/35 p-4 transition hover:border-cyan-400/30 hover:bg-card/50 sm:flex-row sm:items-start sm:p-5`}>
      <div className='flex shrink-0 flex-row gap-1.5 rounded-xl border border-border/50 bg-background/25 p-1 sm:flex-col'>
        <Button
          type='button'
          size='sm'
          variant='ghost'
          className='h-5 px-1'
          onClick={onMoveUp}
          disabled={!canReorder || absoluteIndex === 0 || isSaving}
          aria-label={copy.moveUp}
          title={copy.moveUp}
        >
          <ArrowUp className='size-3' />
        </Button>
        <Button
          type='button'
          size='sm'
          variant='ghost'
          className='h-5 px-1'
          onClick={onMoveDown}
          disabled={!canReorder || absoluteIndex < 0 || isSaving}
          aria-label={copy.moveDown}
          title={copy.moveDown}
        >
          <ArrowDown className='size-3' />
        </Button>
      </div>

      <div className='min-w-0 flex-1'>
        <div className='mb-2.5 flex flex-wrap items-center gap-1.5'>
          <span className='text-xs font-semibold text-gray-400'>#{index + 1}</span>
          {absoluteIndex >= 0 ? (
            <Badge variant='outline' className='h-4 px-1 text-[9px] text-slate-300'>
              {copy.order(absoluteIndex + 1)}
            </Badge>
          ) : null}
          {queuePosition ? (
            <Badge variant='outline' className='h-4 px-1 text-[9px] text-cyan-300 border-cyan-400/40'>
              {copy.queue(queuePosition)}
            </Badge>
          ) : null}
          <Badge variant='outline' className='h-4 px-1 text-[9px]'>
            {copy.points(question.pointValue)}
          </Badge>
          <Badge
            variant='outline'
            className='h-4 px-1 text-[9px] text-emerald-300 border-emerald-400/40'
          >
            ✓ {question.correctChoiceLabel}
          </Badge>
          {hasIllustration(question) ? (
            <Badge
              variant='outline'
              className='h-4 px-1 text-[9px] text-violet-300 border-violet-400/40'
            >
              {copy.svg}
            </Badge>
          ) : null}
          {hasRichChoiceContent(question) ? (
            <Badge
              variant='outline'
              className='h-4 px-1 text-[9px] text-sky-300 border-sky-400/40'
            >
              {copy.choiceUi}
            </Badge>
          ) : null}
          {usesRichQuestionPresentation(question) ? (
            <Badge
              variant='outline'
              className='h-4 px-1 text-[9px] text-cyan-300 border-cyan-400/40'
            >
              {copy.layout}
            </Badge>
          ) : null}
          {questionSummary?.status === 'needs-review' ? (
            <Badge
              variant='outline'
              className='h-4 px-1 text-[9px] text-amber-300 border-amber-400/40'
            >
              {copy.review}
            </Badge>
          ) : null}
          {questionSummary?.status === 'needs-fix' ? (
            <Badge
              variant='outline'
              className='h-4 px-1 text-[9px] text-rose-300 border-rose-400/40'
            >
              {copy.fix}
            </Badge>
          ) : null}
          <Badge
            variant='outline'
            className={
              question.editorial.workflowStatus === 'published'
                ? 'h-4 px-1 text-[9px] text-emerald-300 border-emerald-400/40'
                : question.editorial.workflowStatus === 'ready'
                  ? 'h-4 px-1 text-[9px] text-cyan-300 border-cyan-400/40'
                  : 'h-4 px-1 text-[9px] text-slate-300 border-slate-400/40'
            }
          >
            {workflowLabel}
          </Badge>
        </div>
        <p className='line-clamp-2 text-sm leading-6 text-gray-200 sm:text-[15px]'>
          {question.prompt || copy.emptyPrompt}
        </p>
      </div>

      <div className='flex shrink-0 items-center justify-end gap-1 rounded-xl border border-border/50 bg-background/25 p-1 sm:justify-start'>
        <button
          type='button'
          className='inline-flex items-center justify-center rounded-lg p-2.5 text-gray-400 hover:bg-sky-500/20 hover:text-sky-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:ring-offset-2 ring-offset-background'
          onClick={onEdit}
          title={copy.editQuestion}
          disabled={isSaving}
        >
          <span className='sr-only'>{copy.edit}</span>
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
          className='inline-flex items-center justify-center rounded-lg p-2.5 text-gray-400 hover:bg-gray-700/60 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:ring-offset-2 ring-offset-background'
          onClick={onDuplicate}
          title={copy.duplicateQuestion}
          disabled={isSaving}
          aria-label={copy.duplicateQuestion}
        >
          <Copy className='size-3.5' />
        </button>
        <button
          type='button'
          className='inline-flex items-center justify-center rounded-lg p-2.5 text-gray-400 hover:bg-red-500/20 hover:text-red-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:ring-offset-2 ring-offset-background'
          onClick={onDelete}
          title={copy.deleteQuestion}
          disabled={isSaving}
          aria-label={copy.deleteQuestion}
        >
          <Trash2 className='size-3.5' />
        </button>
      </div>
    </div>
  );
}
