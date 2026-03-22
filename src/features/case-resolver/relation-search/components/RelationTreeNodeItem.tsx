'use client';

import {
  ChevronDown,
  ChevronRight,
  FileText,
  Folder,
  FolderOpen,
  GripVertical,
  Lock,
  Plus,
  ScanText,
} from 'lucide-react';
import React from 'react';

import type { FolderTreeViewportRenderNodeInput } from '@/features/foldertree/public';
import { Button, Checkbox, Tooltip } from '@/shared/ui';
import { cn } from '@/shared/utils';

import { useRelationTreeNodeRuntimeContext } from './RelationTreeNodeRuntimeContext';
import { getCaseResolverDocTooltipWithFallback } from '../utils/docs';

type RelationTreeNodeItemProps = FolderTreeViewportRenderNodeInput;

const resolveNodeTypeFromMetadata = (
  node: FolderTreeViewportRenderNodeInput['node']
): 'case' | 'folder' | 'file' => {
  const raw = String(node.metadata?.['relationNodeType'] ?? '');
  if (raw === 'file' || raw === 'case' || raw === 'folder') return raw;
  if (node.kind === 'relation_file') return 'file';
  if (node.kind === 'relation_case') return 'case';
  return 'folder';
};

const renderFileTypeIcon = (fileType: string): React.JSX.Element => {
  if (fileType === 'scanfile') {
    return <ScanText className='size-3.5 shrink-0 text-amber-400/80' />;
  }
  return <FileText className='size-3.5 shrink-0 text-sky-400/80' />;
};

export function RelationTreeNodeItem(props: RelationTreeNodeItemProps): React.JSX.Element {
  const {
    node,
    depth,
    hasChildren,
    isExpanded,
    isDragging,
    isDropTarget,
    dropPosition,
    toggleExpand,
    select,
  } = props;

  const {
    mode,
    lookup,
    isLocked,
    selectedFileIds,
    onToggleFileSelection,
    onLinkFile,
    onAddFile,
    onPreviewFile,
    onArmDragHandle,
  } = useRelationTreeNodeRuntimeContext();
  const nodeType = resolveNodeTypeFromMetadata(node);
  const row = nodeType === 'file' ? (lookup.fileRowByNodeId.get(node.id) ?? null) : null;
  const fileId = row?.file.id ?? '';
  const isFileSelected = fileId.length > 0 && (selectedFileIds?.has(fileId) ?? false);

  const stateClassName =
    dropPosition === 'before'
      ? 'bg-blue-500/10 text-gray-100 ring-1 ring-inset ring-blue-500/60'
      : dropPosition === 'after'
        ? 'bg-blue-500/10 text-gray-100 ring-1 ring-inset ring-cyan-400/60'
        : isDragging
          ? 'opacity-50 text-gray-200'
          : isDropTarget
            ? 'bg-cyan-500/10 text-cyan-100'
            : 'text-gray-300 hover:bg-muted/40';

  if (nodeType !== 'file' || !row) {
    return (
      <div
        className={cn(
          'group flex items-center gap-2 rounded px-2 py-1.5 text-sm transition',
          stateClassName
        )}
        style={{ paddingLeft: `${depth * 16 + 8}px` }}
      >
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
            title={isExpanded ? 'Collapse' : 'Expand'}>
            {isExpanded ? (
              <ChevronDown className='size-3.5' />
            ) : (
              <ChevronRight className='size-3.5' />
            )}
          </Button>
        ) : (
          <span className='inline-flex size-4 items-center justify-center text-xs opacity-40'>
            •
          </span>
        )}
        {isExpanded ? (
          <FolderOpen className='size-4 shrink-0 text-amber-300/70' />
        ) : (
          <Folder className='size-4 shrink-0 text-amber-300/70' />
        )}
        <Button
          variant='link'
          className='h-auto min-w-0 flex-1 justify-start p-0 truncate text-left text-gray-200 hover:text-white hover:no-underline'
          onClick={(event): void => {
            event.preventDefault();
            event.stopPropagation();
            if (hasChildren) {
              toggleExpand();
              return;
            }
            select(event);
          }}
          title={node.name}
        >
          <span className='truncate'>{node.name}</span>
        </Button>
      </div>
    );
  }

  return (
    <div
      className={cn(
        'group flex items-center gap-2 rounded px-2 py-1.5 text-sm transition',
        stateClassName
      )}
      style={{ paddingLeft: `${depth * 16 + 8}px` }}
    >
      <span className='inline-flex size-4 items-center justify-center text-xs opacity-40'>•</span>
      {mode === 'link_relations' ? (
        <Checkbox
          checked={isFileSelected}
          onCheckedChange={() => onToggleFileSelection?.(row.file.id)}
          className='h-3.5 w-3.5 shrink-0'
          aria-label={`Select ${row.file.name}`}
        />
      ) : (
        <Tooltip
          content={getCaseResolverDocTooltipWithFallback(
            'dragToCanvas',
            'Drag from handle to canvas'
          )}
          side='top'
        >
          <button
            type='button'
            data-relation-drag-handle='true'
            className='inline-flex size-5 shrink-0 items-center justify-center rounded border border-border/60 bg-card/40 text-gray-400 transition hover:bg-card/70 hover:text-gray-200'
            onPointerDown={(event): void => {
              event.stopPropagation();
              onArmDragHandle?.(row.file.id);
            }}
            aria-label='Drag handle'
            title={'Drag handle'}>
            <GripVertical className='size-3.5' />
          </button>
        </Tooltip>
      )}

      {renderFileTypeIcon(row.file.fileType)}
      <Button
        variant='link'
        className='h-auto min-w-0 flex-1 justify-start p-0 truncate text-left text-gray-200 hover:text-cyan-300 hover:no-underline'
        onClick={(event): void => {
          event.preventDefault();
          event.stopPropagation();
          onPreviewFile?.(row.file.id);
        }}
        title={row.file.name}
      >
        <span className='truncate'>{row.file.name}</span>
      </Button>
      {row.file.isLocked ? <Lock className='size-3.5 shrink-0 text-amber-400/80' /> : null}
      {mode === 'link_relations' ? (
        <Button
          variant='ghost'
          size='sm'
          disabled={isLocked}
          className='h-7 w-7 shrink-0 p-0 text-gray-400 hover:bg-cyan-500/15 hover:text-cyan-300'
          onClick={(event): void => {
            event.preventDefault();
            event.stopPropagation();
            onLinkFile?.(row.file.id);
          }}
          aria-label={`Link ${row.file.name}`}
          title={`Link ${row.file.name}`}>
          <Plus className='size-3.5' />
        </Button>
      ) : (
        <Button
          variant='ghost'
          size='sm'
          className='h-7 w-7 shrink-0 p-0 text-gray-400 hover:bg-cyan-500/15 hover:text-cyan-300'
          onClick={(event): void => {
            event.preventDefault();
            event.stopPropagation();
            onAddFile?.(row.file.id);
          }}
          aria-label={`Add ${row.file.name} to canvas`}
          title={`Add ${row.file.name} to canvas`}>
          <Plus className='size-3.5' />
        </Button>
      )}
    </div>
  );
}
