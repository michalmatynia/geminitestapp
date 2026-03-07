import React from 'react';
import {
  ChevronDown,
  ChevronRight,
  Folder,
  FolderOpen,
  GripVertical,
  ListChecks,
  Pencil,
  Trash2,
} from 'lucide-react';

import type { FolderTreeViewportRenderNodeInput } from '@/features/foldertree/v2';
import { Badge, TreeRow } from '@/shared/ui';
import { cn } from '@/shared/utils';
import type { KangurTestSuite } from '@/shared/contracts/kangur-tests';
import { fromKangurTestSuiteNodeId } from '../kangur-test-suites-master-tree';

export function TestSuiteTreeRow(props: {
  input: FolderTreeViewportRenderNodeInput;
  suiteById: Map<string, KangurTestSuite>;
  questionCountBySuiteId: Map<string, number>;
  onEdit: (suite: KangurTestSuite) => void;
  onManageQuestions: (suite: KangurTestSuite) => void;
  onDelete: (suite: KangurTestSuite) => void;
  isUpdating?: boolean;
}): React.JSX.Element {
  const { input, suiteById, questionCountBySuiteId, onEdit, onManageQuestions, onDelete, isUpdating } = props;
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
          onClick={input.select}
          role='button'
          tabIndex={0}
          onKeyDown={(e: React.KeyboardEvent<HTMLDivElement>): void => {
            if (e.key !== 'Enter' && e.key !== ' ') return;
            e.preventDefault();
            input.select();
          }}
        >
          <button
            type='button'
            className='inline-flex size-5 shrink-0 items-center justify-center rounded text-gray-400 hover:bg-muted/40'
            onClick={(e): void => {
              e.preventDefault();
              e.stopPropagation();
              input.toggleExpand();
            }}
          >
            {input.hasChildren ? (
              input.isExpanded ? <ChevronDown className='size-3.5' /> : <ChevronRight className='size-3.5' />
            ) : (
              <span className='text-[10px] opacity-60'>•</span>
            )}
          </button>
          {input.isExpanded ? (
            <FolderOpen className='size-4 shrink-0 text-sky-300/90' />
          ) : (
            <Folder className='size-4 shrink-0 text-sky-300/70' />
          )}
          <div className='min-w-0 flex-1 truncate text-[12px] font-medium text-gray-200'>
            {input.node.name}
          </div>
        </div>
      </TreeRow>
    );
  }

  const questionCount = questionCountBySuiteId.get(suite.id) ?? 0;

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
        onClick={input.select}
        role='button'
        tabIndex={0}
        onKeyDown={(e: React.KeyboardEvent<HTMLDivElement>): void => {
          if (e.key !== 'Enter' && e.key !== ' ') return;
          e.preventDefault();
          input.select();
        }}
      >
        <span className='inline-flex h-4 w-4 shrink-0 items-center justify-center opacity-0 transition-opacity group-hover:opacity-100'>
          <GripVertical className='size-3.5 cursor-grab text-gray-500' />
        </span>

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

        {!suite.enabled ? (
          <Badge variant='outline' className='h-5 px-1.5 text-[10px] border-amber-400/40 text-amber-300'>
            Disabled
          </Badge>
        ) : null}

        <div className='inline-flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100'>
          <button
            type='button'
            className='inline-flex items-center justify-center rounded p-1 text-gray-400 hover:bg-sky-500/20 hover:text-sky-200'
            onMouseDown={(e): void => e.stopPropagation()}
            onClick={(e): void => { e.stopPropagation(); onManageQuestions(suite); }}
            title='Manage questions'
            disabled={isUpdating}
          >
            <ListChecks className='size-3.5' />
          </button>
          <button
            type='button'
            className='inline-flex items-center justify-center rounded p-1 text-gray-400 hover:bg-gray-700/60 hover:text-white'
            onMouseDown={(e): void => e.stopPropagation()}
            onClick={(e): void => { e.stopPropagation(); onEdit(suite); }}
            title='Edit suite'
            disabled={isUpdating}
          >
            <Pencil className='size-3.5' />
          </button>
          <button
            type='button'
            className='inline-flex items-center justify-center rounded p-1 text-gray-400 hover:bg-red-500/20 hover:text-red-300'
            onMouseDown={(e): void => e.stopPropagation()}
            onClick={(e): void => { e.stopPropagation(); onDelete(suite); }}
            title='Delete suite'
            disabled={isUpdating}
          >
            <Trash2 className='size-3.5' />
          </button>
        </div>
      </div>
    </TreeRow>
  );
}
