'use client';

import React from 'react';
import { GripVertical, Pencil, Trash2 } from 'lucide-react';

import { BRAIN_CATALOG_POOL_LABELS } from '@/shared/lib/ai-brain/catalog-entries';
import type { AiBrainCatalogEntry } from '@/shared/lib/ai-brain/settings';
import { Badge, TreeContextMenu, TreeRow } from '@/shared/ui';
import { cn, type MasterTreeNode } from '@/shared/utils';

export interface BrainCatalogNodeItemProps {
  node: MasterTreeNode;
  entry: AiBrainCatalogEntry;
  depth: number;
  isSelected: boolean;
  isDragging: boolean;
  select: () => void;
  onEdit: (entry: AiBrainCatalogEntry) => void;
  onRemove: (entry: AiBrainCatalogEntry) => void;
  isPending: boolean;
}

export function BrainCatalogNodeItem({
  node,
  entry,
  depth,
  isSelected,
  isDragging,
  select,
  onEdit,
  onRemove,
  isPending,
}: BrainCatalogNodeItemProps): React.JSX.Element {
  const poolLabel = BRAIN_CATALOG_POOL_LABELS[entry.pool] ?? entry.pool;

  return (
    <TreeContextMenu
      items={[
        {
          id: 'edit',
          label: 'Edit item',
          icon: <Pencil className='size-3.5' />,
          onSelect: (): void => onEdit(entry),
        },
        {
          id: 'remove',
          label: 'Remove item',
          icon: <Trash2 className='size-3.5' />,
          tone: 'danger',
          onSelect: (): void => onRemove(entry),
        },
      ]}
    >
      <TreeRow
        depth={depth}
        baseIndent={8}
        indent={12}
        tone='subtle'
        selected={isSelected}
        selectedClassName='bg-muted text-white hover:bg-muted'
        className={cn('relative h-8 text-xs', isDragging && 'opacity-50')}
        onClick={(event: React.MouseEvent<HTMLDivElement>): void => {
          event.stopPropagation();
          select();
        }}
      >
        <div className='flex h-full w-full min-w-0 items-center gap-1.5 text-left'>
          <span className='inline-flex h-3.5 w-3.5 shrink-0 items-center justify-center opacity-0 transition-opacity group-hover:opacity-100'>
            <GripVertical className='size-3.5 shrink-0 cursor-grab text-gray-500' />
          </span>

          <span className='min-w-0 flex-1 truncate font-medium text-gray-100' title={node.name}>
            {node.name}
          </span>

          <span className='ml-1 flex shrink-0 items-center gap-1'>
            <Badge
              variant='outline'
              className='h-4 px-1 text-[10px] text-gray-400 border-gray-600/50'
            >
              {poolLabel}
            </Badge>
            <span
              className={cn(
                'inline-flex items-center justify-center rounded p-0.5 transition',
                'opacity-0 group-hover:opacity-100 hover:bg-gray-700/60 text-gray-400',
                isPending && 'pointer-events-none opacity-40'
              )}
              onMouseDown={(event: React.MouseEvent<HTMLSpanElement>): void => {
                event.stopPropagation();
              }}
              onClick={(event: React.MouseEvent<HTMLSpanElement>): void => {
                event.stopPropagation();
                onEdit(entry);
              }}
              title='Edit item'
              aria-hidden='true'
            >
              <Pencil className='size-3' />
            </span>
            <span
              className={cn(
                'inline-flex items-center justify-center rounded p-0.5 transition',
                'opacity-0 group-hover:opacity-100',
                'text-gray-400 hover:bg-red-500/20 hover:text-red-300',
                isPending && 'pointer-events-none opacity-40'
              )}
              onMouseDown={(event: React.MouseEvent<HTMLSpanElement>): void => {
                event.stopPropagation();
              }}
              onClick={(event: React.MouseEvent<HTMLSpanElement>): void => {
                event.stopPropagation();
                onRemove(entry);
              }}
              title='Remove item'
              aria-hidden='true'
            >
              <Trash2 className='size-3' />
            </span>
          </span>
        </div>
      </TreeRow>
    </TreeContextMenu>
  );
}
