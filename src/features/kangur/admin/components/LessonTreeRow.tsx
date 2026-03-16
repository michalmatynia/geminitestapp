import {
  ChevronDown,
  ChevronRight,
  FileText,
  Folder,
  FolderOpen,
  GripVertical,
  ImagePlus,
  Pencil,
  Trash2,
} from 'lucide-react';
import React from 'react';

import type { FolderTreeViewportRenderNodeInput } from '@/features/foldertree';
import type { KangurLesson } from '@/features/kangur/shared/contracts/kangur';
import { Badge, TreeRow } from '@/features/kangur/shared/ui';
import { cn } from '@/features/kangur/shared/utils';

import { fromKangurLessonNodeId } from '../kangur-lessons-master-tree';
import { readLessonGroupCount } from '../utils';

import type { KangurLessonAuthoringStatus } from '../content-creator-insights';

export function LessonTreeRow(props: {
  input: FolderTreeViewportRenderNodeInput;
  lessonById: Map<string, KangurLesson>;
  authoringStatus: (lesson: KangurLesson) => KangurLessonAuthoringStatus;
  onEdit: (lesson: KangurLesson) => void;
  onEditContent: (lesson: KangurLesson) => void;
  onQuickSvg: (lesson: KangurLesson) => void;
  onDelete: (lesson: KangurLesson) => void;
  isUpdating?: boolean;
}): React.JSX.Element {
  const {
    input,
    lessonById,
    authoringStatus,
    onEdit,
    onEditContent,
    onQuickSvg,
    onDelete,
    isUpdating,
  } = props;
  const lessonId = fromKangurLessonNodeId(input.node.id);
  const lesson = lessonId ? (lessonById.get(lessonId) ?? null) : null;
  const rowStatusBadgeClassName = 'h-5 rounded-full border px-2 text-[10px] uppercase tracking-wide';
  const actionButtonClassName =
    'inline-flex cursor-pointer items-center justify-center rounded-lg border border-transparent p-1.5 text-muted-foreground transition hover:border-border/60 hover:bg-background/70 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:ring-offset-2 ring-offset-background';

  if (!lesson) {
    const lessonCount = readLessonGroupCount(input.node.metadata);
    return (
      <TreeRow
        depth={input.depth}
        baseIndent={8}
        indent={12}
        tone='subtle'
        selected={input.isSelected}
        selectedClassName='bg-primary/12 text-foreground ring-1 ring-primary/15 hover:bg-primary/12'
        className={cn(
          'h-10 text-xs',
          input.isDragging && 'opacity-50',
          input.isSearchMatch && !input.isSelected && 'ring-1 ring-primary/20'
        )}
      >
        <div className='flex h-full w-full min-w-0 items-center gap-2 text-left'>
          {input.hasChildren ? (
            <button
              type='button'
              className='inline-flex size-5 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:bg-background/70 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:ring-offset-2 ring-offset-background'
              onClick={(event): void => {
                event.preventDefault();
                event.stopPropagation();
                input.toggleExpand();
              }}
              aria-label={
                input.isExpanded ? `Collapse ${input.node.name}` : `Expand ${input.node.name}`
              }
              aria-expanded={input.isExpanded}
              title={input.isExpanded ? `Collapse ${input.node.name}` : `Expand ${input.node.name}`}>
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
            aria-label={`Select lesson group ${input.node.name}`}
            className='flex min-w-0 flex-1 items-center gap-2 rounded-md text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:ring-offset-2 focus-visible:ring-offset-background'
          >
            {input.isExpanded ? (
              <FolderOpen className='size-4 shrink-0 text-primary/80' />
            ) : (
              <Folder className='size-4 shrink-0 text-primary/70' />
            )}
            <div className='min-w-0 flex-1 truncate text-[12px] font-medium text-foreground'>
              {input.node.name}
            </div>
            {lessonCount !== null ? (
              <Badge
                variant='outline'
                className='h-5 rounded-full border-border/60 bg-background/70 px-2 text-[10px] text-muted-foreground'
              >
                {lessonCount}
              </Badge>
            ) : null}
          </button>
        </div>
      </TreeRow>
    );
  }

  const status = authoringStatus(lesson);

  return (
    <TreeRow
      depth={input.depth}
      baseIndent={8}
      indent={12}
      tone='subtle'
      selected={input.isSelected}
      selectedClassName='bg-primary/12 text-foreground ring-1 ring-primary/15 hover:bg-primary/12'
      className={cn('h-11 text-xs', input.isDragging && 'opacity-50')}
    >
      <div className='flex h-full w-full min-w-0 items-center gap-2 text-left'>
        <span className='inline-flex h-4 w-4 shrink-0 items-center justify-center opacity-0 transition-opacity group-hover:opacity-100'>
          <GripVertical className='size-3.5 cursor-grab text-muted-foreground/80' />
        </span>

        <button
          type='button'
          onClick={input.select}
          aria-pressed={input.isSelected}
          aria-label={`Select lesson ${lesson.title}`}
          className='flex min-w-0 flex-1 items-center gap-2 rounded-md text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:ring-offset-2 focus-visible:ring-offset-background'
        >
          <span className='text-base leading-none'>{lesson.emoji}</span>

          <div className='min-w-0 flex-1'>
            <div className='truncate font-medium text-foreground'>{lesson.title}</div>
            <div className='truncate text-[11px] text-muted-foreground'>{lesson.description}</div>
          </div>

          <Badge variant='outline' className={cn(rowStatusBadgeClassName, 'border-border/60 bg-background/70 text-muted-foreground')}>
            {lesson.componentId}
          </Badge>
          <Badge
            variant='outline'
            className={cn(
              rowStatusBadgeClassName,
              lesson.contentMode === 'document'
                ? 'border-sky-400/30 bg-sky-500/10 text-sky-200'
                : 'border-border/60 bg-background/70 text-muted-foreground'
            )}
          >
            {lesson.contentMode}
          </Badge>
          {status.hasContent ? (
            <Badge
              variant='outline'
              className={cn(
                rowStatusBadgeClassName,
                'border-sky-400/30 bg-sky-500/10 text-sky-200'
              )}
            >
              Custom content
            </Badge>
          ) : null}
          {status.hasStructuralWarnings || status.hasBlockingIssues ? (
            <Badge
              variant='outline'
              className={cn(rowStatusBadgeClassName, 'border-amber-400/30 bg-amber-500/10 text-amber-200')}
            >
              Needs fixes
            </Badge>
          ) : null}
          {status.isMissingNarration ? (
            <Badge
              variant='outline'
              className={cn(rowStatusBadgeClassName, 'border-amber-300/25 bg-amber-500/5 text-amber-100')}
            >
              Missing narration
            </Badge>
          ) : null}
          {status.isHidden ? (
            <Badge
              variant='outline'
              className={cn(rowStatusBadgeClassName, 'border-border/60 bg-background/70 text-muted-foreground')}
            >
              Hidden
            </Badge>
          ) : null}
        </button>

        <div className='inline-flex items-center gap-1 opacity-100'>
          <button
            type='button'
            className={cn(actionButtonClassName, 'hover:text-violet-200')}
            onMouseDown={(event): void => event.stopPropagation()}
            onClick={(event): void => {
              event.stopPropagation();
              onQuickSvg(lesson);
            }}
            title='Quick add SVG image'
            aria-label='Quick add SVG image'
            disabled={isUpdating}
          >
            <ImagePlus className='size-3.5' />
          </button>
          <button
            type='button'
            className={cn(actionButtonClassName, 'hover:text-sky-200')}
            onMouseDown={(event): void => event.stopPropagation()}
            onClick={(event): void => {
              event.stopPropagation();
              onEditContent(lesson);
            }}
            title='Edit lesson content'
            aria-label='Edit lesson content'
            disabled={isUpdating}
          >
            <FileText className='size-3.5' />
          </button>
          <button
            type='button'
            className={actionButtonClassName}
            onMouseDown={(event): void => event.stopPropagation()}
            onClick={(event): void => {
              event.stopPropagation();
              onEdit(lesson);
            }}
            title='Edit lesson'
            aria-label='Edit lesson'
            disabled={isUpdating}
          >
            <Pencil className='size-3.5' />
          </button>
          <button
            type='button'
            className={cn(actionButtonClassName, 'hover:text-rose-300')}
            onMouseDown={(event): void => event.stopPropagation()}
            onClick={(event): void => {
              event.stopPropagation();
              onDelete(lesson);
            }}
            title='Delete lesson'
            aria-label='Delete lesson'
            disabled={isUpdating}
          >
            <Trash2 className='size-3.5' />
          </button>
        </div>
      </div>
    </TreeRow>
  );
}
