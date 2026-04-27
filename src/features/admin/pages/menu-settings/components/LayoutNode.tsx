'use client';

import React from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { StatusBadge } from '@/shared/ui/data-display.public';
import { type FolderTreeViewportRenderNodeInput } from '@/shared/lib/foldertree/public';
import { cn } from '@/shared/utils/ui-utils';
import type { AdminMenuLayoutNodeEntry } from '../../admin-menu-layout-types';

interface LayoutNodeProps {
  input: FolderTreeViewportRenderNodeInput;
  layoutNodeStateById: Map<string, AdminMenuLayoutNodeEntry>;
}

export function LayoutNode({ input, layoutNodeStateById }: LayoutNodeProps): React.JSX.Element {
  const nodeState = layoutNodeStateById.get(input.node.id);
  
  return (
    <div className={cn('flex items-center gap-2', input.isDragging && 'opacity-50')}>
      <button
        type='button'
        className='flex size-6 items-center justify-center rounded hover:bg-white/10'
        onClick={() => input.toggleExpand()}
        aria-label={input.isExpanded ? 'Collapse node' : 'Expand node'}
      >
        {input.isExpanded ? (
          <ChevronDown className='size-3.5 text-gray-400' />
        ) : (
          <ChevronRight className='size-3.5 text-gray-400' />
        )}
      </button>
      <span className='flex-1 truncate text-sm text-gray-200'>{nodeState?.label ?? input.node.label}</span>
      {nodeState?.isBuiltIn === true && <StatusBadge status='Built-in' variant='warning' size='xs' />}
    </div>
  );
}
