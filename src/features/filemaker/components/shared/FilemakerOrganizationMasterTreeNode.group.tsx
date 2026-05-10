'use client';

import { Folder, FolderOpen } from 'lucide-react';
import React from 'react';

import { Badge } from '@/shared/ui/primitives.public';
import { cn } from '@/shared/utils/ui-utils';

import {
  createTreeIndentStyle,
  isTreeActivationKey,
  metadataNumber,
  OrganizationGroupToggleButton,
  type OrganizationGroupNodeProps,
  TreeNodeSpacer,
} from './FilemakerOrganizationMasterTreeNode.shared';

export function FilemakerOrganizationGroupNode(
  props: OrganizationGroupNodeProps
): React.JSX.Element {
  const { node, depth, hasChildren, isExpanded, toggleExpand, select, stateClassName } = props;
  const FolderIcon = isExpanded ? FolderOpen : Folder;

  return (
    <div
      className={cn(
        'flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 text-sm transition',
        stateClassName
      )}
      style={createTreeIndentStyle(depth)}
      role='button'
      tabIndex={0}
      onClick={(event: React.MouseEvent<HTMLDivElement>): void => {
        select(event);
        if (hasChildren) toggleExpand();
      }}
      onKeyDown={(event: React.KeyboardEvent<HTMLDivElement>): void => {
        if (!isTreeActivationKey(event)) return;
        event.preventDefault();
        if (hasChildren) toggleExpand();
      }}
    >
      {hasChildren ? (
        <OrganizationGroupToggleButton
          isExpanded={isExpanded}
          label={isExpanded ? `Collapse ${node.name}` : `Expand ${node.name}`}
          toggleExpand={toggleExpand}
        />
      ) : (
        <TreeNodeSpacer />
      )}
      <FolderIcon className='size-4 shrink-0 text-sky-300/80' />
      <div className='min-w-0 flex-1 truncate font-medium text-gray-100'>{node.name}</div>
      <Badge variant='outline' className='h-5 shrink-0 text-[10px]'>
        {metadataNumber(node.metadata?.['count'])}
      </Badge>
    </div>
  );
}
