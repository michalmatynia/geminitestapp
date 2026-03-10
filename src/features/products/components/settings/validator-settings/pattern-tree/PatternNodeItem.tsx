'use client';

import { Copy, GripVertical, Pencil, Trash2 } from 'lucide-react';
import React from 'react';

import type { FolderTreeViewportRenderNodeInput as PatternNodeItemProps } from '@/features/foldertree';
import { StatusBadge, StatusToggle, TreeCaret, TreeContextMenu, TreeRow } from '@/shared/ui';
import { cn } from '@/shared/utils';

import { fromPatternMasterNodeId } from '../validator-pattern-master-tree';
import { useValidatorPatternTreeContext } from '../ValidatorPatternTreeContext';

export type { PatternNodeItemProps };

export function PatternNodeItem(props: PatternNodeItemProps): React.JSX.Element | null {
  const { node, depth, hasChildren, isExpanded, isSelected, isDragging, select, toggleExpand } =
    props;

  const {
    patternById,
    isPending,
    onEditPattern,
    onDuplicatePattern,
    onDeletePattern,
    onTogglePattern,
  } = useValidatorPatternTreeContext();

  const patternId = fromPatternMasterNodeId(node.id);
  const pattern = patternId ? (patternById.get(patternId) ?? null) : null;
  if (!pattern) return null;

  const showLocale = pattern.target === 'name' || pattern.target === 'description';
  const localeLabel = pattern.locale ?? 'any';

  return (
    <TreeContextMenu
      items={[
        {
          id: 'edit-pattern',
          label: 'Edit pattern',
          onSelect: (): void => onEditPattern(pattern),
        },
        {
          id: 'duplicate-pattern',
          label: 'Duplicate pattern',
          onSelect: (): void => onDuplicatePattern(pattern),
        },
        {
          id: 'delete-pattern',
          label: 'Delete pattern',
          icon: <Trash2 className='size-3.5' />,
          tone: 'danger',
          onSelect: (): void => onDeletePattern(pattern),
        },
      ]}
    >
      <TreeRow
        asChild
        depth={depth}
        baseIndent={8}
        indent={12}
        tone='subtle'
        selected={isSelected}
        selectedClassName='bg-muted text-white hover:bg-muted'
        className={cn('relative h-8 text-xs', isDragging && 'opacity-50')}
      >
        <div
          className='flex h-full w-full min-w-0 items-center gap-1 text-left'
        >
          <span className='inline-flex h-3.5 w-3.5 shrink-0 items-center justify-center opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100'>
            <GripVertical className='size-3.5 shrink-0 cursor-grab text-gray-500' />
          </span>
          <TreeCaret
            isOpen={isExpanded}
            hasChildren={hasChildren}
            ariaLabel={isExpanded ? `Collapse ${node.name}` : `Expand ${node.name}`}
            onToggle={hasChildren ? toggleExpand : undefined}
            className='w-3 text-gray-400'
            buttonClassName='hover:bg-gray-700'
            placeholderClassName='w-3'
          />
          <button
            type='button'
            onClick={(event: React.MouseEvent<HTMLButtonElement>): void => {
              event.stopPropagation();
              select(event);
            }}
            aria-label={pattern.label || pattern.id}
            aria-pressed={isSelected}
            title={pattern.label || pattern.id}
            className='flex min-w-0 flex-1 items-center gap-1 rounded-sm text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400/70 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950'
          >
            <span className='min-w-0 flex-1 truncate font-medium text-white'>{pattern.label}</span>
            <StatusBadge status={pattern.target} variant='info' size='sm' />
            {showLocale && <StatusBadge status={localeLabel} variant='processing' size='sm' />}
            <StatusBadge
              status={pattern.severity}
              variant={pattern.severity === 'warning' ? 'warning' : 'error'}
              size='sm'
            />
          </button>
          <span className='ml-1 flex shrink-0 items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100'>
            <span
              onMouseDownCapture={(event: React.MouseEvent<HTMLSpanElement>): void => {
                event.stopPropagation();
              }}
              onClickCapture={(event: React.MouseEvent<HTMLSpanElement>): void => {
                event.stopPropagation();
              }}
            >
              <StatusToggle
                enabled={pattern.enabled}
                disabled={isPending}
                onToggle={(): void => {
                  void onTogglePattern(pattern);
                }}
              />
            </span>
            <button
              type='button'
              className={cn(
                'inline-flex items-center justify-center rounded p-0.5 text-gray-400 transition',
                'hover:bg-gray-700/60',
                isPending && 'pointer-events-none opacity-40'
              )}
              onMouseDown={(event: React.MouseEvent<HTMLButtonElement>): void => {
                event.stopPropagation();
              }}
              onClick={(event: React.MouseEvent<HTMLButtonElement>): void => {
                event.stopPropagation();
                onDuplicatePattern(pattern);
              }}
              title='Duplicate pattern'
              aria-label='Duplicate pattern'
              disabled={isPending}
            >
              <Copy className='size-3' />
            </button>
            <button
              type='button'
              className={cn(
                'inline-flex items-center justify-center rounded p-0.5 text-gray-400 transition',
                'hover:bg-gray-700/60',
                isPending && 'pointer-events-none opacity-40'
              )}
              onMouseDown={(event: React.MouseEvent<HTMLButtonElement>): void => {
                event.stopPropagation();
              }}
              onClick={(event: React.MouseEvent<HTMLButtonElement>): void => {
                event.stopPropagation();
                onEditPattern(pattern);
              }}
              title='Edit pattern'
              aria-label='Edit pattern'
              disabled={isPending}
            >
              <Pencil className='size-3' />
            </button>
            <button
              type='button'
              className={cn(
                'inline-flex items-center justify-center rounded p-0.5 text-gray-400 transition',
                'hover:bg-red-500/20 hover:text-red-300',
                isPending && 'pointer-events-none opacity-40'
              )}
              onMouseDown={(event: React.MouseEvent<HTMLButtonElement>): void => {
                event.stopPropagation();
              }}
              onClick={(event: React.MouseEvent<HTMLButtonElement>): void => {
                event.stopPropagation();
                onDeletePattern(pattern);
              }}
              title='Delete pattern'
              aria-label='Delete pattern'
              disabled={isPending}
            >
              <Trash2 className='size-3' />
            </button>
          </span>
        </div>
      </TreeRow>
    </TreeContextMenu>
  );
}
