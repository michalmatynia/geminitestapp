import type {
  MasterTreeDropPosition,
  MasterTreeId,
  MasterTreeNode,
} from '@/shared/utils/master-folder-tree-contract';

import type { MasterFolderTreeController } from './types';

export type MasterTreeRootDropZone = 'top' | 'bottom';

export const isInternalMasterTreeNode = (
  nodes: MasterTreeNode[],
  nodeId: MasterTreeId
): boolean => nodes.some((node: MasterTreeNode): boolean => node.id === nodeId);

export const applyInternalMasterTreeDrop = async ({
  controller,
  draggedNodeId,
  targetId,
  position,
  rootDropZone,
}: {
  controller: MasterFolderTreeController;
  draggedNodeId: MasterTreeId;
  targetId: MasterTreeId | null;
  position: MasterTreeDropPosition;
  rootDropZone?: MasterTreeRootDropZone | undefined;
}): Promise<void> => {
  if (targetId === null) {
    await controller.dropNodeToRoot(
      draggedNodeId,
      rootDropZone === 'top' ? 0 : undefined
    );
    return;
  }

  if (position === 'before' || position === 'after') {
    await controller.reorderNode(draggedNodeId, targetId, position);
    return;
  }

  await controller.moveNode(draggedNodeId, targetId);
};
