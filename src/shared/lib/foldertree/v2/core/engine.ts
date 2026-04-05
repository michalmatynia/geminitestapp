import type {
  FolderTreeProfileV2,
  MasterTreeCanDropResultDto,
  MasterTreeMutationResultDto,
} from '@/shared/contracts/master-folder-tree';
import type {
  MasterTreeDropPosition,
  MasterTreeId,
  MasterTreeNode,
} from '@/shared/utils/master-folder-tree-contract';
import {
  buildMasterTree,
  canDropMasterTreeNode,
  dropMasterTreeNodeToRoot,
  moveMasterTreeNode,
  normalizeMasterTreeNodes,
  reorderMasterTreeNode,
  type MasterTreeViewNode,
} from '@/shared/utils/master-folder-tree-engine';

import type { FolderTreeNodeView } from '../types';

export type FolderTreeEngineInput = {
  nodes: MasterTreeNode[];
  profile?: FolderTreeProfileV2 | undefined;
};

export const normalizeNodesV2 = (nodes: MasterTreeNode[]): MasterTreeNode[] =>
  normalizeMasterTreeNodes(nodes);

export const canDropNodeV2 = ({
  nodes,
  nodeId,
  targetId,
  position = 'inside',
  profile,
}: {
  nodes: MasterTreeNode[];
  nodeId: MasterTreeId;
  targetId: MasterTreeId | null;
  position?: MasterTreeDropPosition | undefined;
  profile?: FolderTreeProfileV2 | undefined;
}): MasterTreeCanDropResultDto =>
  canDropMasterTreeNode({
    nodes,
    nodeId,
    targetId,
    position,
    profile,
  });

export const moveNodeV2 = ({
  nodes,
  nodeId,
  targetParentId,
  targetIndex,
  profile,
}: {
  nodes: MasterTreeNode[];
  nodeId: MasterTreeId;
  targetParentId: MasterTreeId | null;
  targetIndex?: number | undefined;
  profile?: FolderTreeProfileV2 | undefined;
}): MasterTreeMutationResultDto =>
  moveMasterTreeNode({
    nodes,
    nodeId,
    targetParentId,
    targetIndex,
    profile,
  });

export const reorderNodeV2 = ({
  nodes,
  nodeId,
  targetId,
  position,
  profile,
}: {
  nodes: MasterTreeNode[];
  nodeId: MasterTreeId;
  targetId: MasterTreeId;
  position: 'before' | 'after';
  profile?: FolderTreeProfileV2 | undefined;
}): MasterTreeMutationResultDto =>
  reorderMasterTreeNode({
    nodes,
    nodeId,
    targetId,
    position,
    profile,
  });

export const dropNodeToRootV2 = ({
  nodes,
  nodeId,
  targetIndex,
  profile,
}: {
  nodes: MasterTreeNode[];
  nodeId: MasterTreeId;
  targetIndex?: number | undefined;
  profile?: FolderTreeProfileV2 | undefined;
}): MasterTreeMutationResultDto =>
  dropMasterTreeNodeToRoot({
    nodes,
    nodeId,
    targetIndex,
    profile,
  });

export const buildRootsV2 = (nodes: MasterTreeNode[]): MasterTreeViewNode[] =>
  buildMasterTree(nodes).roots;

export const flattenVisibleNodesV2 = (
  roots: MasterTreeViewNode[],
  expandedNodeIds: ReadonlySet<MasterTreeId>
): FolderTreeNodeView[] => {
  const rows: FolderTreeNodeView[] = [];

  const walk = (
    children: MasterTreeViewNode[],
    depth: number,
    parentId: MasterTreeId | null
  ): void => {
    children.forEach((child: MasterTreeViewNode): void => {
      const hasChildren = child.children.length > 0;
      const isExpanded = expandedNodeIds.has(child.id);
      rows.push({
        nodeId: child.id,
        depth,
        parentId,
        hasChildren,
        isExpanded,
      });
      if (hasChildren && isExpanded) {
        walk(child.children, depth + 1, child.id);
      }
    });
  };

  walk(roots, 0, null);
  return rows;
};
