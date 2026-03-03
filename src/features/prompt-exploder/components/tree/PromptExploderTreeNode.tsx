'use client';

import {
  ChevronDown,
  ChevronRight,
  FileText,
  Folder,
  GripVertical,
  ListTree,
  Waypoints,
} from 'lucide-react';
import React from 'react';

import type { FolderTreeViewportRenderNodeInput } from '@/features/foldertree/v2';
import { Button, Badge } from '@/shared/ui';
import { cn } from '@/shared/utils';

import {
  readPromptExploderTreeMetadata,
  type PromptExploderTreeNodeKind,
} from '../../tree/types';

type PromptExploderTreeNodeProps = FolderTreeViewportRenderNodeInput & {
  armDragHandle: (nodeId: string) => void;
  releaseDragHandle: () => void;
};

const resolveNodeIcon = (kind: PromptExploderTreeNodeKind | null) => {
  switch (kind) {
    case 'segment':
      return FileText;
    case 'subsection':
      return Folder;
    case 'subsection_item':
      return ListTree;
    case 'list_item':
    case 'hierarchy_item':
      return Waypoints;
    default:
      return Folder;
  }
};

export function PromptExploderTreeNode({
  node,
  depth,
  hasChildren,
  isExpanded,
  isSelected,
  isMultiSelected,
  isDragging,
  dropPosition,
  select,
  toggleExpand,
  armDragHandle,
  releaseDragHandle,
}: PromptExploderTreeNodeProps): React.JSX.Element {
  const metadata = readPromptExploderTreeMetadata(node);
  const Icon = resolveNodeIcon(metadata?.kind ?? null);
  const stateClassName = isSelected
    ? 'bg-blue-600/20 text-white ring-1 ring-inset ring-blue-400/40 shadow-sm'
    : isMultiSelected
      ? 'bg-blue-500/15 text-blue-100 ring-1 ring-inset ring-blue-400/25'
      : dropPosition === 'before'
        ? 'bg-blue-500/10 text-gray-100 ring-1 ring-inset ring-blue-500/60'
        : dropPosition === 'after'
          ? 'bg-blue-500/10 text-gray-100 ring-1 ring-inset ring-cyan-400/60'
          : isDragging
            ? 'opacity-50'
            : 'text-gray-300 hover:bg-muted/40';

  const badgeLabel =
    metadata?.kind === 'segment'
      ? metadata.segmentType?.replaceAll('_', ' ') ?? 'segment'
      : metadata?.kind === 'subsection'
        ? metadata.code?.trim() || 'subsection'
        : metadata?.kind === 'subsection_item'
          ? metadata.logicalOperator?.replaceAll('_', ' ') || 'item'
          : metadata?.kind === 'list_item' || metadata?.kind === 'hierarchy_item'
            ? metadata.logicalOperator?.replaceAll('_', ' ') || 'item'
            : null;

  return (
    <div
      className={cn(
        'group flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-sm transition-all',
        stateClassName
      )}
      style={{ paddingLeft: `${depth * 16 + 8}px` }}
      role='button'
      tabIndex={0}
      onClick={select}
      onKeyDown={(event): void => {
        if (event.key !== 'Enter' && event.key !== ' ') return;
        event.preventDefault();
        select();
      }}
    >
      <span
        data-master-tree-drag-handle='true'
        onPointerDown={(): void => {
          armDragHandle(node.id);
        }}
        onPointerUp={releaseDragHandle}
        onPointerCancel={releaseDragHandle}
        onMouseDown={(): void => {
          armDragHandle(node.id);
        }}
        onMouseUp={releaseDragHandle}
        className='inline-flex size-5 shrink-0 items-center justify-center rounded cursor-grab text-gray-400 transition hover:bg-white/10 hover:text-gray-100 active:cursor-grabbing'
      >
        <GripVertical className='size-3.5' />
      </span>
      {hasChildren ? (
        <Button
          variant='ghost'
          size='sm'
          className='size-4 p-0 text-gray-500 hover:bg-white/10 hover:text-gray-300'
          onClick={(event): void => {
            event.preventDefault();
            event.stopPropagation();
            toggleExpand();
          }}
          aria-label={isExpanded ? 'Collapse' : 'Expand'}
        >
          {isExpanded ? <ChevronDown className='size-3' /> : <ChevronRight className='size-3' />}
        </Button>
      ) : (
        <span className='inline-flex size-4 items-center justify-center text-xs opacity-40'>•</span>
      )}
      <Icon className='size-4 shrink-0 text-sky-200/80' />
      <span className='min-w-0 flex-1 truncate'>{node.name}</span>
      {badgeLabel ? (
        <Badge
          variant='neutral'
          className='shrink-0 border-border/60 bg-card/40 text-[10px] h-4 px-1 uppercase tracking-wider'
        >
          {badgeLabel}
        </Badge>
      ) : null}
    </div>
  );
}
