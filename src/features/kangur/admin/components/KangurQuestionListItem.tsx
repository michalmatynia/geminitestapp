import { ArrowDown, ArrowUp, Copy, Trash2 } from 'lucide-react';
import React from 'react';

import type { KangurTestQuestion } from '@/shared/contracts/kangur-tests';
import { Badge, Button } from '@/shared/ui';

import {
  hasIllustration,
  hasRichChoiceContent,
  usesRichQuestionPresentation,
} from '../test-questions';
import { getQuestionWorkflowLabel } from '../question-authoring-insights';

interface KangurQuestionListItemProps {
  question: KangurTestQuestion;
  index: number;
  absoluteIndex: number;
  canReorder: boolean;
  isSaving: boolean;
  questionSummary: any;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onEdit: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
}

export function KangurQuestionListItem({
  question,
  index,
  absoluteIndex,
  canReorder,
  isSaving,
  questionSummary,
  onMoveUp,
  onMoveDown,
  onEdit,
  onDuplicate,
  onDelete,
}: KangurQuestionListItemProps): React.JSX.Element {
  const workflowLabel = getQuestionWorkflowLabel(question.editorial.workflowStatus);

  return (
    <div className='group flex flex-col gap-4 rounded-2xl border border-border/50 bg-card/35 p-4 transition hover:border-cyan-400/30 hover:bg-card/50 sm:flex-row sm:items-start sm:p-5'>
      <div className='flex shrink-0 flex-row gap-1.5 rounded-xl border border-border/50 bg-background/25 p-1 sm:flex-col'>
        <Button
          type='button'
          size='sm'
          variant='ghost'
          className='h-5 px-1'
          onClick={onMoveUp}
          disabled={!canReorder || absoluteIndex === 0 || isSaving}
          aria-label='Move up'
          title='Move up'
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
          aria-label='Move down'
          title='Move down'
        >
          <ArrowDown className='size-3' />
        </Button>
      </div>

      <div className='min-w-0 flex-1'>
        <div className='mb-2.5 flex flex-wrap items-center gap-1.5'>
          <span className='text-xs font-semibold text-gray-400'>#{index + 1}</span>
          {absoluteIndex >= 0 ? (
            <Badge variant='outline' className='h-4 px-1 text-[9px] text-slate-300'>
              Order {absoluteIndex + 1}
            </Badge>
          ) : null}
          <Badge variant='outline' className='h-4 px-1 text-[9px]'>
            {question.pointValue}pt
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
              SVG
            </Badge>
          ) : null}
          {hasRichChoiceContent(question) ? (
            <Badge
              variant='outline'
              className='h-4 px-1 text-[9px] text-sky-300 border-sky-400/40'
            >
              Choice UI
            </Badge>
          ) : null}
          {usesRichQuestionPresentation(question) ? (
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
          {question.prompt || '(empty prompt)'}
        </p>
      </div>

      <div className='flex shrink-0 items-center justify-end gap-1 rounded-xl border border-border/50 bg-background/25 p-1 sm:justify-start'>
        <button
          type='button'
          className='inline-flex items-center justify-center rounded-lg p-2.5 text-gray-400 hover:bg-sky-500/20 hover:text-sky-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:ring-offset-2 ring-offset-background'
          onClick={onEdit}
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
          className='inline-flex items-center justify-center rounded-lg p-2.5 text-gray-400 hover:bg-gray-700/60 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:ring-offset-2 ring-offset-background'
          onClick={onDuplicate}
          title='Duplicate question'
          disabled={isSaving}
          aria-label='Duplicate question'
        >
          <Copy className='size-3.5' />
        </button>
        <button
          type='button'
          className='inline-flex items-center justify-center rounded-lg p-2.5 text-gray-400 hover:bg-red-500/20 hover:text-red-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:ring-offset-2 ring-offset-background'
          onClick={onDelete}
          title='Delete question'
          disabled={isSaving}
          aria-label='Delete question'
        >
          <Trash2 className='size-3.5' />
        </button>
      </div>
    </div>
  );
}
