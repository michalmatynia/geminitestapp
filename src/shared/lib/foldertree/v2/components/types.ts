import React from 'react';

import { MasterTreeNodeStatus } from '@/shared/contracts/master-folder-tree';
import { MasterTreeDropPosition } from '@/shared/utils/master-folder-tree-contract';
import { MasterTreeViewNode } from '@/shared/utils/master-folder-tree-engine';

export type FolderTreeViewportRenderNodeInput = {
  node: MasterTreeViewNode;
  depth: number;
  hasChildren: boolean;
  isExpanded: boolean;
  isSelected: boolean;
  /** True when this node is part of a multi-selection. */
  isMultiSelected: boolean;
  isRenaming: boolean;
  isDragging: boolean;
  isDropTarget: boolean;
  dropPosition: MasterTreeDropPosition | null;
  /** Semantic status from node.metadata['_status']. Null when not set. */
  nodeStatus: MasterTreeNodeStatus | null;
  isSearchMatch: boolean;
  select: (event?: React.MouseEvent<HTMLElement>) => void;
  toggleExpand: () => void;
  startRename: () => void;
};
