import React from 'react';
import {
  AlertTriangle,
  ChevronDown,
  ChevronRight,
  Folder,
  FolderOpen,
  GripVertical,
  ListChecks,
  EyeOff,
  Pencil,
  Sparkles,
  Trash2,
  WandSparkles,
} from 'lucide-react';

import type { FolderTreeViewportRenderNodeInput } from '@/features/foldertree';
import { Badge, TreeRow } from '@/shared/ui';
import { cn } from '@/shared/utils';
import type { KangurTestSuite } from '@/shared/contracts/kangur-tests';
import { fromKangurTestSuiteNodeId } from '../kangur-test-suites-master-tree';
import type { KangurTestSuiteHealth } from '../test-suite-health';

export function TestSuiteTreeRow(props: {
  input: FolderTreeViewportRenderNodeInput;
  suiteById: Map<string, KangurTestSuite>;
  questionCountBySuiteId: Map<string, number>;
  suiteHealthById?: Map<string, KangurTestSuiteHealth>;
  onEdit: (suite: KangurTestSuite) => void;
  onManageQuestions: (suite: KangurTestSuite) => void;
  onReviewQueue?: (suite: KangurTestSuite) => void;
  onPublishReady?: (suite: KangurTestSuite) => void;
  onGoLive?: (suite: KangurTestSuite) => void;
  onTakeOffline?: (suite: KangurTestSuite) => void;
  onDelete: (suite: KangurTestSuite) => void;
  isUpdating?: boolean;
}): React.JSX.Element {
  const {
    input,
    suiteById,
    questionCountBySuiteId,
    suiteHealthById,
    onEdit,
    onManageQuestions,
    onReviewQueue,
    onPublishReady,
    onGoLive,
    onTakeOffline,
    onDelete,
    isUpdating,
  } = props;
  const suiteId = fromKangurTestSuiteNodeId(input.node.id);
  const suite = suiteId ? (suiteById.get(suiteId) ?? null) : null;

  if (!suite) {
    // Folder / group node
    return (
      <TreeRow
        depth={input.depth}
        baseIndent={8}
        indent={12}
        tone='subtle'
        selected={input.isSelected}
        selectedClassName='bg-muted text-white hover:bg-muted'
        className={cn(
          'h-9 text-xs',
          input.isDragging && 'opacity-50',
          input.isSearchMatch && !input.isSelected && 'ring-1 ring-cyan-400/40'
        )}
      >
        <div
          className='flex h-full w-full min-w-0 items-center gap-2 text-left'
        >
          {input.hasChildren ? (
            <button
              type='button'
              className='inline-flex size-5 shrink-0 items-center justify-center rounded text-gray-400 hover:bg-muted/40'
              onClick={(e): void => {
                e.preventDefault();
                e.stopPropagation();
                input.toggleExpand();
              }}
              aria-label={
                input.isExpanded ? `Collapse ${input.node.name}` : `Expand ${input.node.name}`
              }
              aria-expanded={input.isExpanded}
            >
              {input.isExpanded ? (
                <ChevronDown className='size-3.5' />
              ) : (
                <ChevronRight className='size-3.5' />
              )}
            </button>
          ) : (
            <span className='inline-flex size-5 shrink-0 items-center justify-center text-[10px] opacity-60'>
              •
            </span>
          )}
          <button
            type='button'
            onClick={input.select}
            aria-pressed={input.isSelected}
            aria-label={`Select test suite group ${input.node.name}`}
            className='flex min-w-0 flex-1 items-center gap-2 rounded-sm text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400/70 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950'
          >
            {input.isExpanded ? (
              <FolderOpen className='size-4 shrink-0 text-sky-300/90' />
            ) : (
              <Folder className='size-4 shrink-0 text-sky-300/70' />
            )}
            <div className='min-w-0 flex-1 truncate text-[12px] font-medium text-gray-200'>
              {input.node.name}
            </div>
          </button>
        </div>
      </TreeRow>
    );
  }

  const questionCount = questionCountBySuiteId.get(suite.id) ?? 0;
  const suiteHealth = suiteHealthById?.get(suite.id);

  return (
    <TreeRow
      depth={input.depth}
      baseIndent={8}
      indent={12}
      tone='subtle'
      selected={input.isSelected}
      selectedClassName='bg-muted text-white hover:bg-muted'
      className={cn('h-12 text-xs', input.isDragging && 'opacity-50')}
    >
      <div
        className='flex h-full w-full min-w-0 items-center gap-2 text-left'
      >
        <span className='inline-flex h-4 w-4 shrink-0 items-center justify-center opacity-0 transition-opacity group-hover:opacity-100'>
          <GripVertical className='size-3.5 cursor-grab text-gray-500' />
        </span>

        <button
          type='button'
          onClick={input.select}
          aria-pressed={input.isSelected}
          aria-label={`Select test suite ${suite.title}`}
          className='flex min-w-0 flex-1 items-center gap-2 rounded-sm text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400/70 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950'
        >
          <div className='min-w-0 flex-1'>
            <div className='truncate font-medium text-gray-100'>{suite.title}</div>
            <div className='flex items-center gap-1.5 text-[11px] text-gray-400'>
              {suite.year ? <span>{suite.year}</span> : null}
              {suite.gradeLevel ? <span>· {suite.gradeLevel}</span> : null}
              {suite.category ? (
                <Badge variant='outline' className='h-4 px-1 text-[9px]'>
                  {suite.category}
                </Badge>
              ) : null}
            </div>
          </div>

          <Badge variant='outline' className='h-5 px-1.5 text-[10px]'>
            {questionCount}Q
          </Badge>
          {suiteHealth?.needsFixQuestionCount ? (
            <Badge
              variant='outline'
              className='h-5 px-1.5 text-[10px] border-rose-400/40 text-rose-300'
            >
              Fix {suiteHealth.needsFixQuestionCount}
            </Badge>
          ) : null}
          {!suiteHealth?.needsFixQuestionCount && suiteHealth?.needsReviewQuestionCount ? (
            <Badge
              variant='outline'
              className='h-5 px-1.5 text-[10px] border-amber-400/40 text-amber-300'
            >
              Review {suiteHealth.needsReviewQuestionCount}
            </Badge>
          ) : null}
          {suiteHealth?.status === 'ready' &&
          suiteHealth.questionCount > 0 &&
          !suiteHealth.draftQuestionCount &&
          !suiteHealth.readyToPublishQuestionCount &&
          suiteHealth.publishedQuestionCount !== suiteHealth.questionCount ? (
            <Badge
              variant='outline'
              className='h-5 px-1.5 text-[10px] border-emerald-400/40 text-emerald-300'
            >
              Clean
            </Badge>
          ) : null}
          {suiteHealth?.draftQuestionCount ? (
            <Badge
              variant='outline'
              className='h-5 px-1.5 text-[10px] border-slate-400/40 text-slate-300'
            >
              Draft {suiteHealth.draftQuestionCount}
            </Badge>
          ) : null}
          {!suiteHealth?.draftQuestionCount && suiteHealth?.readyToPublishQuestionCount ? (
            <Badge
              variant='outline'
              className='h-5 px-1.5 text-[10px] border-cyan-400/40 text-cyan-300'
            >
              Ready {suiteHealth.readyToPublishQuestionCount}
            </Badge>
          ) : null}
          {suiteHealth?.canGoLive ? (
            <Badge
              variant='outline'
              className='h-5 px-1.5 text-[10px] border-emerald-400/40 text-emerald-300'
            >
              Ready for live
            </Badge>
          ) : null}
          {suiteHealth?.publishStatus === 'partial' ? (
            <Badge
              variant='outline'
              className='h-5 px-1.5 text-[10px] border-cyan-400/40 text-cyan-300'
            >
              Published {suiteHealth.publishedQuestionCount}/{suiteHealth.questionCount}
            </Badge>
          ) : null}
          {suiteHealth?.publishStatus === 'published' && !suiteHealth.isLive && !suiteHealth.canGoLive ? (
            <Badge
              variant='outline'
              className='h-5 px-1.5 text-[10px] border-emerald-400/40 text-emerald-300'
            >
              Published
            </Badge>
          ) : null}
          {suiteHealth?.isLive ? (
            <Badge
              variant='outline'
              className='h-5 px-1.5 text-[10px] border-emerald-400/40 bg-emerald-500/10 text-emerald-200'
            >
              Live
            </Badge>
          ) : null}
          {suiteHealth?.liveNeedsAttention ? (
            <Badge
              variant='outline'
              className='h-5 px-1.5 text-[10px] border-rose-400/40 bg-rose-500/10 text-rose-200'
            >
              Live needs attention
            </Badge>
          ) : null}
          {suiteHealth?.publishStatus === 'unpublished' && suiteHealth.questionCount > 0 ? (
            <Badge
              variant='outline'
              className='h-5 px-1.5 text-[10px] border-slate-400/40 text-slate-300'
            >
              Not published
            </Badge>
          ) : null}

          {!suite.enabled ? (
            <Badge
              variant='outline'
              className='h-5 px-1.5 text-[10px] border-amber-400/40 text-amber-300'
            >
              Disabled
            </Badge>
          ) : null}
        </button>

        <div className='inline-flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100'>
          {suiteHealth?.isLive ? (
            <button
              type='button'
              className='inline-flex items-center justify-center rounded p-1 text-slate-300 hover:bg-slate-500/20 hover:text-slate-200'
              onMouseDown={(e): void => e.stopPropagation()}
              onClick={(e): void => {
                e.stopPropagation();
                onTakeOffline?.(suite);
              }}
              title='Take suite offline'
              aria-label='Take suite offline'
              disabled={isUpdating || !onTakeOffline}
            >
              <EyeOff className='size-3.5' />
            </button>
          ) : null}
          {suiteHealth?.canGoLive ? (
            <button
              type='button'
              className='inline-flex items-center justify-center rounded p-1 text-emerald-300 hover:bg-emerald-500/20 hover:text-emerald-200'
              onMouseDown={(e): void => e.stopPropagation()}
              onClick={(e): void => {
                e.stopPropagation();
                onGoLive?.(suite);
              }}
              title='Go live for learners'
              aria-label='Go live for learners'
              disabled={isUpdating || !onGoLive}
            >
              <WandSparkles className='size-3.5' />
            </button>
          ) : null}
          {suiteHealth?.publishableQuestionCount ? (
            <button
              type='button'
              className='inline-flex items-center justify-center rounded p-1 text-cyan-300 hover:bg-cyan-500/20 hover:text-cyan-200'
              onMouseDown={(e): void => e.stopPropagation()}
              onClick={(e): void => {
                e.stopPropagation();
                onPublishReady?.(suite);
              }}
              title='Publish ready questions'
              aria-label='Publish ready questions'
              disabled={isUpdating || !onPublishReady}
            >
              <Sparkles className='size-3.5' />
            </button>
          ) : null}
          {suiteHealth && suiteHealth.status !== 'ready' && suiteHealth.status !== 'empty' ? (
            <button
              type='button'
              className={cn(
                'inline-flex items-center justify-center rounded p-1 hover:bg-amber-500/20',
                suiteHealth.status === 'needs-fix' ? 'text-rose-300 hover:text-rose-200' : 'text-amber-300 hover:text-amber-200'
              )}
              onMouseDown={(e): void => e.stopPropagation()}
              onClick={(e): void => {
                e.stopPropagation();
                onReviewQueue?.(suite);
              }}
              title='Open review queue'
              aria-label='Open review queue'
              disabled={isUpdating || !onReviewQueue}
            >
              <AlertTriangle className='size-3.5' />
            </button>
          ) : null}
          <button
            type='button'
            className='inline-flex items-center justify-center rounded p-1 text-gray-400 hover:bg-sky-500/20 hover:text-sky-200'
            onMouseDown={(e): void => e.stopPropagation()}
            onClick={(e): void => {
              e.stopPropagation();
              onManageQuestions(suite);
            }}
            title='Manage questions'
            aria-label='Manage questions'
            disabled={isUpdating}
          >
            <ListChecks className='size-3.5' />
          </button>
          <button
            type='button'
            className='inline-flex items-center justify-center rounded p-1 text-gray-400 hover:bg-gray-700/60 hover:text-white'
            onMouseDown={(e): void => e.stopPropagation()}
            onClick={(e): void => {
              e.stopPropagation();
              onEdit(suite);
            }}
            title='Edit suite'
            aria-label='Edit suite'
            disabled={isUpdating}
          >
            <Pencil className='size-3.5' />
          </button>
          <button
            type='button'
            className='inline-flex items-center justify-center rounded p-1 text-gray-400 hover:bg-red-500/20 hover:text-red-300'
            onMouseDown={(e): void => e.stopPropagation()}
            onClick={(e): void => {
              e.stopPropagation();
              onDelete(suite);
            }}
            title='Delete suite'
            aria-label='Delete suite'
            disabled={isUpdating}
          >
            <Trash2 className='size-3.5' />
          </button>
        </div>
      </div>
    </TreeRow>
  );
}
