import React from 'react';
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
import type { FolderTreeViewportRenderNodeInput } from '@/features/foldertree';
import { Badge, TreeRow } from '@/shared/ui';
import { cn } from '@/shared/utils';
import type { KangurLesson } from '@/shared/contracts/kangur';
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

  if (!lesson) {
    const lessonCount = readLessonGroupCount(input.node.metadata);
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
              className='inline-flex size-5 shrink-0 items-center justify-center rounded text-gray-400 hover:bg-muted/40 hover:text-gray-200'
              onClick={(event): void => {
                event.preventDefault();
                event.stopPropagation();
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
            aria-label={`Select lesson group ${input.node.name}`}
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
            {lessonCount !== null ? (
              <Badge variant='outline' className='h-5 px-1.5 text-[10px]'>
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
      selectedClassName='bg-muted text-white hover:bg-muted'
      className={cn('h-11 text-xs', input.isDragging && 'opacity-50')}
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
          aria-label={`Select lesson ${lesson.title}`}
          className='flex min-w-0 flex-1 items-center gap-2 rounded-sm text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400/70 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950'
        >
          <span className='text-base leading-none'>{lesson.emoji}</span>

          <div className='min-w-0 flex-1'>
            <div className='truncate font-medium text-gray-100'>{lesson.title}</div>
            <div className='truncate text-[11px] text-gray-400'>{lesson.description}</div>
          </div>

          <Badge
            variant='outline'
            className='h-5 px-1.5 text-[10px] uppercase tracking-wide'
          >
            {lesson.componentId}
          </Badge>
          <Badge
            variant='outline'
            className={cn(
              'h-5 px-1.5 text-[10px] uppercase tracking-wide',
              lesson.contentMode === 'document'
                ? 'border-sky-400/40 text-sky-300'
                : 'border-gray-500/40 text-gray-300'
            )}
          >
            {lesson.contentMode}
          </Badge>
          {status.hasContent ? (
            <Badge
              variant='outline'
              className='h-5 px-1.5 text-[10px] border-sky-400/40 text-sky-300'
            >
              Custom content
            </Badge>
          ) : null}
          {status.hasStructuralWarnings || status.hasBlockingIssues ? (
            <Badge
              variant='outline'
              className='h-5 px-1.5 text-[10px] border-rose-400/40 text-rose-300'
            >
              Needs fixes
            </Badge>
          ) : null}
          {status.isMissingNarration ? (
            <Badge
              variant='outline'
              className='h-5 px-1.5 text-[10px] border-violet-400/40 text-violet-300'
            >
              Missing narration
            </Badge>
          ) : null}
          {status.isHidden ? (
            <Badge
              variant='outline'
              className='h-5 px-1.5 text-[10px] border-amber-400/40 text-amber-300'
            >
              Hidden
            </Badge>
          ) : null}
        </button>

        <div className='inline-flex items-center gap-1 opacity-100'>
          <button
            type='button'
            className='inline-flex cursor-pointer items-center justify-center rounded p-1 text-gray-400 hover:bg-violet-500/20 hover:text-violet-300'
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
            className='inline-flex cursor-pointer items-center justify-center rounded p-1 text-gray-400 hover:bg-sky-500/20 hover:text-sky-200'
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
            className='inline-flex cursor-pointer items-center justify-center rounded p-1 text-gray-400 hover:bg-gray-700/60 hover:text-white'
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
            className='inline-flex cursor-pointer items-center justify-center rounded p-1 text-gray-400 hover:bg-red-500/20 hover:text-red-300'
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
