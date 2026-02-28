import type { MasterFolderTreeController } from '@/shared/contracts/master-folder-tree';
import type {
  MasterTreeDropPosition,
  MasterTreeId,
} from '@/shared/utils/master-folder-tree-contract';

import {
  applyInternalMasterTreeDrop,
  isInternalMasterTreeNode,
  type MasterTreeRootDropZone,
} from './internal-drop';

export type MasterTreeDropInput = {
  draggedNodeId: MasterTreeId;
  targetId: MasterTreeId | null;
  position: MasterTreeDropPosition;
  rootDropZone?: MasterTreeRootDropZone | undefined;
};

export type MasterTreeDropHandlerContext = {
  input: MasterTreeDropInput;
  controller: MasterFolderTreeController;
};

export type MasterTreeInternalDropHandler = (
  context: MasterTreeDropHandlerContext
) => Promise<boolean | void> | boolean | void;

export type MasterTreeExternalDropHandler = (
  context: MasterTreeDropHandlerContext
) => Promise<void> | void;

export const handleMasterTreeDrop = async ({
  input,
  controller,
  onInternalDrop,
  onExternalDrop,
}: {
  input: MasterTreeDropInput;
  controller: MasterFolderTreeController;
  onInternalDrop?: MasterTreeInternalDropHandler | undefined;
  onExternalDrop?: MasterTreeExternalDropHandler | undefined;
}): Promise<void> => {
  const isInternal = isInternalMasterTreeNode(controller.nodes, input.draggedNodeId);

  if (isInternal) {
    const handled = await onInternalDrop?.({
      input,
      controller,
    });
    if (handled === true) return;

    await applyInternalMasterTreeDrop({
      controller,
      draggedNodeId: input.draggedNodeId,
      targetId: input.targetId,
      position: input.position,
      rootDropZone: input.rootDropZone,
    });
    return;
  }

  await onExternalDrop?.({
    input,
    controller,
  });
};
