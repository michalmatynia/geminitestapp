'use client';

import React from 'react';
import { GripVertical, Pencil, Trash2 } from 'lucide-react';

import { BRAIN_CATALOG_POOL_LABELS } from '@/shared/lib/ai-brain/catalog-entries';
import { createStrictContext } from '@/shared/lib/react/createStrictContext';
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
}

export type BrainCatalogNodeItemRuntimeValue = {
  onEdit: (entry: AiBrainCatalogEntry) => void;
  onRemove: (entry: AiBrainCatalogEntry) => void;
  isPending: boolean;
};

const {
  Context: BrainCatalogNodeItemRuntimeContext,
  useStrictContext: useBrainCatalogNodeItemRuntime,
} = createStrictContext<BrainCatalogNodeItemRuntimeValue>({
  hookName: 'useBrainCatalogNodeItemRuntime',
  providerName: 'BrainCatalogNodeItemRuntimeProvider',
  displayName: 'BrainCatalogNodeItemRuntimeContext',
});

export { BrainCatalogNodeItemRuntimeContext };

export function BrainCatalogNodeItem(props: BrainCatalogNodeItemProps): React.JSX.Element {
  const { node, entry, depth, isSelected, isDragging, select } = props;

  const { onEdit, onRemove, isPending } = useBrainCatalogNodeItemRuntime();
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
      >
        <div className='flex h-full w-full min-w-0 items-center gap-1.5 text-left'>
          <button
            type='button'
            className='flex h-full min-w-0 flex-1 items-center gap-1.5 text-left'
            onClick={(event: React.MouseEvent<HTMLButtonElement>): void => {
              event.stopPropagation();
              select();
            }}
            title={node.name}
          >
            <span className='inline-flex h-3.5 w-3.5 shrink-0 items-center justify-center opacity-0 transition-opacity group-hover:opacity-100'>
              <GripVertical className='size-3.5 shrink-0 cursor-grab text-gray-500' aria-hidden='true' />
            </span>

            <span className='min-w-0 flex-1 truncate font-medium text-gray-100'>{node.name}</span>
          </button>

          <Badge
            variant='outline'
            className='h-4 shrink-0 px-1 text-[10px] text-gray-400 border-gray-600/50'
          >
            {poolLabel}
          </Badge>
          <button
            type='button'
            className={cn(
              'inline-flex shrink-0 items-center justify-center rounded p-0.5 text-gray-400 transition',
              'opacity-0 group-hover:opacity-100 hover:bg-gray-700/60',
              isPending ? 'cursor-not-allowed opacity-40' : undefined
            )}
            onClick={(event: React.MouseEvent<HTMLButtonElement>): void => {
              event.stopPropagation();
              onEdit(entry);
            }}
            onMouseDown={(event: React.MouseEvent<HTMLButtonElement>): void => {
              event.stopPropagation();
            }}
            title='Edit item'
            aria-label={`Edit ${node.name}`}
            disabled={isPending}
          >
            <Pencil className='size-3' aria-hidden='true' />
          </button>
          <button
            type='button'
            className={cn(
              'inline-flex shrink-0 items-center justify-center rounded p-0.5 text-gray-400 transition',
              'opacity-0 group-hover:opacity-100 hover:bg-red-500/20 hover:text-red-300',
              isPending ? 'cursor-not-allowed opacity-40' : undefined
            )}
            onClick={(event: React.MouseEvent<HTMLButtonElement>): void => {
              event.stopPropagation();
              onRemove(entry);
            }}
            onMouseDown={(event: React.MouseEvent<HTMLButtonElement>): void => {
              event.stopPropagation();
            }}
            title='Remove item'
            aria-label={`Remove ${node.name}`}
            disabled={isPending}
          >
            <Trash2 className='size-3' aria-hidden='true' />
          </button>
        </div>
      </TreeRow>
    </TreeContextMenu>
  );
}
