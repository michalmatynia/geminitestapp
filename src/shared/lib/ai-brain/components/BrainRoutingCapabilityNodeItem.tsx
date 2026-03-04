'use client';

import React from 'react';
import { GripVertical, Pencil } from 'lucide-react';

import { Badge, StatusToggle, TreeContextMenu, TreeRow } from '@/shared/ui';
import { cn, type MasterTreeNode } from '@/shared/utils';

import type { AiBrainCapabilityKey } from '../settings';

export interface BrainRoutingCapabilityNodeItemProps {
  node: MasterTreeNode;
  capability: AiBrainCapabilityKey;
  depth: number;
  isSelected: boolean;
  isDragging: boolean;
  select: () => void;
  enabled: boolean;
  sourceLabel: 'Capability override' | 'Feature fallback' | 'Global defaults';
  onToggleEnabled: (next: boolean) => void;
  onEdit: () => void;
  isPending: boolean;
}

const sourceBadgeClassName: Record<BrainRoutingCapabilityNodeItemProps['sourceLabel'], string> = {
  'Capability override': 'border-emerald-400/40 text-emerald-300',
  'Feature fallback': 'border-sky-400/40 text-sky-300',
  'Global defaults': 'border-gray-500/40 text-gray-400',
};

export function BrainRoutingCapabilityNodeItem({
  node,
  capability,
  depth,
  isSelected,
  isDragging,
  select,
  enabled,
  sourceLabel,
  onToggleEnabled,
  onEdit,
  isPending,
}: BrainRoutingCapabilityNodeItemProps): React.JSX.Element {
  return (
    <TreeContextMenu
      items={[
        {
          id: 'edit-route',
          label: 'Edit route',
          icon: <Pencil className='size-3.5' />,
          onSelect: onEdit,
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
          className='flex h-full w-full min-w-0 items-center gap-1.5 text-left'
          onClick={(event: React.MouseEvent<HTMLDivElement>): void => {
            event.stopPropagation();
            select();
          }}
        >
          <span className='inline-flex h-3.5 w-3.5 shrink-0 items-center justify-center opacity-0 transition-opacity group-hover:opacity-100'>
            <GripVertical className='size-3.5 shrink-0 cursor-default text-gray-600' />
          </span>

          <span className='min-w-0 flex-1 truncate font-medium text-gray-100' title={node.name}>
            {node.name}
          </span>

          <span className='ml-1 flex shrink-0 items-center gap-1'>
            <Badge
              variant='outline'
              className={cn(
                'h-4 px-1 text-[10px] border-gray-600/50',
                sourceBadgeClassName[sourceLabel]
              )}
            >
              {sourceLabel}
            </Badge>

            <span
              onMouseDown={(event: React.MouseEvent<HTMLSpanElement>): void => {
                event.stopPropagation();
              }}
              onClick={(event: React.MouseEvent<HTMLSpanElement>): void => {
                event.stopPropagation();
              }}
            >
              <StatusToggle
                enabled={enabled}
                disabled={isPending}
                size='sm'
                enabledLabel='ENABLED'
                disabledLabel='DISABLED'
                onToggle={onToggleEnabled}
              />
            </span>

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
                onEdit();
              }}
              title={`Edit ${capability}`}
              aria-hidden='true'
            >
              <Pencil className='size-3' />
            </span>
          </span>
        </div>
      </TreeRow>
    </TreeContextMenu>
  );
}
