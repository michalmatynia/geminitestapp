'use client';

import React from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { StatusBadge } from '@/shared/ui/data-display.public';
import { type FolderTreeViewportRenderNodeInput } from '@/shared/lib/foldertree/public';
import { cn } from '@/shared/utils/ui-utils';
import type { 
  AdminMenuLayoutNodeEntry, 
  AdminMenuLayoutNodeSemantic 
} from '../admin-menu-layout-types';

interface LayoutNodeProps {
  input: FolderTreeViewportRenderNodeInput;
  layoutNodeStateById: Map<string, AdminMenuLayoutNodeEntry>;
}

export function LayoutNode({
  input,
  layoutNodeStateById,
}: LayoutNodeProps): React.JSX.Element {
  const nodeState = layoutNodeStateById.get(input.node.id);
  const semantic: AdminMenuLayoutNodeSemantic = nodeState?.semantic ?? 'group';
  const isBuiltIn = nodeState?.isBuiltIn ?? false;
  
  const stateClassName = input.isSelected
    ? 'bg-blue-600/30 text-white ring-1 ring-blue-400/40'
    : input.dropPosition === 'before'
      ? 'bg-blue-500/10 text-gray-100 ring-1 ring-blue-500/40'
      : input.dropPosition === 'after'
        ? 'bg-cyan-500/10 text-gray-100 ring-1 ring-cyan-500/40'
        : 'text-gray-300 hover:bg-muted/40';

  return (
    <div
      className={cn(
        'group flex w-full items-center gap-2 rounded px-2 py-1.5 text-xs transition',
        stateClassName,
        input.isDragging && 'opacity-50'
      )}
      style={{ paddingLeft: `${input.depth * 16 + 8}px` }}
    >
      {input.hasChildren ? (
        <button
          type='button'
          className='inline-flex size-4 items-center justify-center rounded hover:bg-muted/50'
          onClick={(event: React.MouseEvent<HTMLButtonElement>): void => {
            event.preventDefault();
            event.stopPropagation();
            input.toggleExpand();
          }}
          aria-label={input.isExpanded ? 'Collapse node' : 'Expand node'}
          aria-expanded={input.isExpanded}
          title={input.isExpanded ? 'Collapse node' : 'Expand node'}
        >
          {input.isExpanded ? (
            <ChevronDown className='size-3.5 text-gray-400' />
          ) : (
            <ChevronRight className='size-3.5 text-gray-400' />
          )}
        </button>
      ) : (
        <span className='inline-flex size-4 items-center justify-center text-gray-500'>•</span>
      )}

      <button
        type='button'
        onClick={input.select}
        aria-pressed={input.isSelected}
        aria-label={input.node.name}
        className='flex min-w-0 flex-1 items-center gap-2 rounded-sm text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400/70 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950'
      >
        <span className='min-w-0 flex-1 truncate'>{input.node.name}</span>

        <StatusBadge
          status={semantic === 'link' ? 'Link' : 'Group'}
          variant='info'
          size='sm'
          className='font-bold'
        />
        <StatusBadge
          status={isBuiltIn === true ? 'Built-in' : 'Custom'}
          variant={isBuiltIn === true ? 'warning' : 'success'}
          size='sm'
          className='font-bold'
        />
      </button>
    </div>
  );
}
