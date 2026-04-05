'use client';

import { Brain, GripVertical } from 'lucide-react';
import React from 'react';

import { StatusToggle } from '@/shared/ui/forms-and-actions.public';
import { TreeCaret, TreeRow } from '@/shared/ui/data-display.public';
import { cn } from '@/shared/utils/ui-utils';
import { type MasterTreeNode } from '@/shared/utils/master-folder-tree-contract';

import type { BrainRoutingCapabilityGroup } from './brain-routing-master-tree';
import type { AiBrainFeature } from '../settings';

export interface BrainRoutingFeatureNodeItemProps {
  node: MasterTreeNode;
  group: BrainRoutingCapabilityGroup;
  depth: number;
  hasChildren: boolean;
  isExpanded: boolean;
  isSelected: boolean;
  isDragging: boolean;
  select: () => void;
  toggleExpand: () => void;
  enabled: boolean;
  isPending: boolean;
  onToggleEnabled: (feature: AiBrainFeature, enabled: boolean) => void;
}

export function BrainRoutingFeatureNodeItem(
  props: BrainRoutingFeatureNodeItemProps
): React.JSX.Element {
  const {
    node,
    group,
    depth,
    hasChildren,
    isExpanded,
    isSelected,
    isDragging,
    select,
    toggleExpand,
    enabled,
    isPending,
    onToggleEnabled,
  } = props;

  return (
    <TreeRow
      depth={depth}
      baseIndent={8}
      indent={12}
      tone='subtle'
      selected={isSelected}
      selectedClassName='bg-muted text-white hover:bg-muted'
      className={cn('relative h-9 text-xs', isDragging && 'opacity-50')}
    >
      <div className='flex h-full w-full min-w-0 items-center gap-1.5 text-left'>
        <span className='inline-flex h-3.5 w-3.5 shrink-0 items-center justify-center opacity-0 transition-opacity group-hover:opacity-100'>
          <GripVertical className='size-3.5 shrink-0 cursor-default text-gray-600' aria-hidden='true' />
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
          className='flex h-full min-w-0 flex-1 items-center gap-1.5 text-left'
          onClick={(event: React.MouseEvent<HTMLButtonElement>): void => {
            event.stopPropagation();
            select();
          }}
          title={group.description}
        >
          <span className='inline-flex h-3.5 w-3.5 shrink-0 items-center justify-center'>
            <Brain className='size-3.5 text-cyan-300' aria-hidden='true' />
          </span>
          <span className='min-w-0 flex-1 truncate font-semibold text-cyan-100'>{node.name}</span>
          <span className='ml-1 shrink-0 text-[10px] text-gray-500'>
            {group.capabilities.length} route{group.capabilities.length === 1 ? '' : 's'}
          </span>
        </button>
        <StatusToggle
          enabled={enabled}
          disabled={isPending}
          size='sm'
          enabledLabel='ON'
          disabledLabel='OFF'
          onToggle={(nextEnabled: boolean): void => onToggleEnabled(group.key, nextEnabled)}
          className='shrink-0'
        />
      </div>
    </TreeRow>
  );
}
