'use client';

import { GripVertical, Pencil } from 'lucide-react';
import React from 'react';

import { createStrictContext } from '@/shared/lib/react/createStrictContext';
import { Badge } from '@/shared/ui/primitives.public';
import { StatusToggle } from '@/shared/ui/forms-and-actions.public';
import { TreeContextMenu, TreeRow } from '@/shared/ui/data-display.public';
import { cn } from '@/shared/utils/ui-utils';
import { type MasterTreeNode } from '@/shared/utils';

import type { AiBrainCapabilityKey } from '../settings';

export interface BrainRoutingCapabilityNodeItemProps {
  node: MasterTreeNode;
  capability: AiBrainCapabilityKey;
  depth: number;
  isSelected: boolean;
  isDragging: boolean;
  select: () => void;
  enabled: boolean;
  sourceLabel: 'Capability override' | 'Feature fallback' | 'Global defaults' | 'Feature disabled';
  toggleDisabled?: boolean;
}

export type BrainRoutingCapabilityNodeItemRuntimeValue = {
  onToggleEnabled: (capability: AiBrainCapabilityKey, enabled: boolean) => void;
  onEdit: (capability: AiBrainCapabilityKey) => void;
  isPending: boolean;
};

const {
  Context: BrainRoutingCapabilityNodeItemRuntimeContext,
  useStrictContext: useBrainRoutingCapabilityNodeItemRuntime,
} = createStrictContext<BrainRoutingCapabilityNodeItemRuntimeValue>({
  hookName: 'useBrainRoutingCapabilityNodeItemRuntime',
  providerName: 'BrainRoutingCapabilityNodeItemRuntimeProvider',
  displayName: 'BrainRoutingCapabilityNodeItemRuntimeContext',
});

export { BrainRoutingCapabilityNodeItemRuntimeContext };

const sourceBadgeClassName: Record<BrainRoutingCapabilityNodeItemProps['sourceLabel'], string> = {
  'Capability override': 'border-emerald-400/40 text-emerald-300',
  'Feature fallback': 'border-sky-400/40 text-sky-300',
  'Global defaults': 'border-gray-500/40 text-gray-400',
  'Feature disabled': 'border-amber-400/40 text-amber-300',
};

export function BrainRoutingCapabilityNodeItem(
  props: BrainRoutingCapabilityNodeItemProps
): React.JSX.Element {
  const {
    node,
    capability,
    depth,
    isSelected,
    isDragging,
    select,
    enabled,
    sourceLabel,
    toggleDisabled = false,
  } = props;

  const { onToggleEnabled, onEdit, isPending } = useBrainRoutingCapabilityNodeItemRuntime();

  return (
    <TreeContextMenu
      items={[
        {
          id: 'edit-route',
          label: 'Edit route',
          icon: <Pencil className='size-3.5' />,
          onSelect: (): void => onEdit(capability),
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
              <GripVertical className='size-3.5 shrink-0 cursor-default text-gray-600' aria-hidden='true' />
            </span>

            <span className='min-w-0 flex-1 truncate font-medium text-gray-100'>{node.name}</span>
          </button>

          <Badge
            variant='outline'
            className={cn('h-4 shrink-0 px-1 text-[10px] border-gray-600/50', sourceBadgeClassName[sourceLabel])}
          >
            {sourceLabel}
          </Badge>

          <StatusToggle
            enabled={enabled}
            disabled={isPending || toggleDisabled}
            size='sm'
            enabledLabel='ENABLED'
            disabledLabel='DISABLED'
            onToggle={(nextEnabled: boolean): void => onToggleEnabled(capability, nextEnabled)}
            className='shrink-0'
          />

          <button
            type='button'
            className={cn(
              'inline-flex shrink-0 items-center justify-center rounded p-0.5 text-gray-400 transition',
              'opacity-0 group-hover:opacity-100 hover:bg-gray-700/60',
              isPending ? 'cursor-not-allowed opacity-40' : undefined
            )}
            onClick={(event: React.MouseEvent<HTMLButtonElement>): void => {
              event.stopPropagation();
              onEdit(capability);
            }}
            onMouseDown={(event: React.MouseEvent<HTMLButtonElement>): void => {
              event.stopPropagation();
            }}
            title={`Edit ${capability}`}
            aria-label={`Edit ${node.name}`}
            disabled={isPending}
          >
            <Pencil className='size-3' aria-hidden='true' />
          </button>
        </div>
      </TreeRow>
    </TreeContextMenu>
  );
}
