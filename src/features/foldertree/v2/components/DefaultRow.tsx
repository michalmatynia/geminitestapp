'use client';

import React from 'react';
import { Button } from '@/shared/ui';
import { cn } from '@/shared/utils';
import { MasterTreeNodeStatus } from '@/shared/contracts/master-folder-tree';
import { FolderTreeViewportRenderNodeInput } from './types';

const STATUS_ICON_CHARS: Record<MasterTreeNodeStatus, string> = {
  loading: '⏳',
  error: '✕',
  locked: '🔒',
  warning: '⚠',
  success: '✓',
};

const STATUS_COLOR_CLASSES: Record<MasterTreeNodeStatus, string> = {
  loading: 'text-blue-400',
  error: 'text-red-400',
  locked: 'text-amber-400',
  warning: 'text-yellow-400',
  success: 'text-green-400',
};

export const DefaultRow = ({
  node,
  depth,
  hasChildren,
  isExpanded,
  isSelected,
  isMultiSelected,
  isDragging,
  dropPosition,
  nodeStatus,
  isSearchMatch,
  select,
  toggleExpand,
}: FolderTreeViewportRenderNodeInput): React.JSX.Element => {
  const stateClassName = isSelected
    ? 'bg-blue-600 text-white shadow-sm'
    : isMultiSelected
      ? 'bg-blue-500/20 text-blue-100 ring-1 ring-inset ring-blue-400/40'
      : dropPosition === 'before'
        ? 'bg-blue-500/10 text-gray-100 ring-1 ring-inset ring-blue-500/60'
        : dropPosition === 'after'
          ? 'bg-blue-500/10 text-gray-100 ring-1 ring-inset ring-cyan-400/60'
          : isDragging
            ? 'opacity-50'
            : isSearchMatch
              ? 'bg-blue-500/8 text-blue-100 ring-1 ring-inset ring-blue-500/30'
              : 'text-gray-300 hover:bg-muted/40';

  return (
    <Button
      variant='ghost'
      onClick={(event): void => select(event)}
      className={cn(
        'flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-sm transition-all h-auto font-normal justify-start',
        stateClassName
      )}
      style={{ paddingLeft: `${depth * 16 + 8}px` }}
    >
      {hasChildren ? (
        <span
          aria-hidden='true'
          onClick={(event: React.MouseEvent) => {
            event.preventDefault();
            event.stopPropagation();
            toggleExpand();
          }}
          className='inline-flex size-4 items-center justify-center rounded hover:bg-muted/40'
        >
          {isExpanded ? '▾' : '▸'}
        </span>
      ) : (
        <span className='inline-flex size-4 items-center justify-center text-xs opacity-40'>•</span>
      )}
      <span className='truncate'>{node.name}</span>
      {nodeStatus ? (
        <span
          aria-label={nodeStatus}
          className={cn(
            'ml-auto shrink-0 text-xs',
            isSelected ? 'text-white/80' : STATUS_COLOR_CLASSES[nodeStatus]
          )}
        >
          {STATUS_ICON_CHARS[nodeStatus]}
        </span>
      ) : null}
    </Button>
  );
};
