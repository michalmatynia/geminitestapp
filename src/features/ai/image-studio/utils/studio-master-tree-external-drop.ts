import { type FolderTreeProfileV2 } from '@/shared/contracts/master-folder-tree';
import {
  canNestTreeNodeV2,
  type MasterTreeId,
  type MasterTreeNode,
} from '@/shared/utils';
import { canMoveTreePath } from '@/shared/utils/tree-operations';

import {
  fromFolderMasterNodeId,
  fromSlotMasterNodeId,
  resolveFolderTargetPathForMasterNode,
} from './master-folder-tree';

export type ImageStudioExternalDropAction =
  | {
      type: 'move_slot';
      slotId: string;
      targetFolder: string;
    }
  | {
      type: 'move_folder';
      folderPath: string;
      targetFolder: string;
    };

export const canDropImageStudioExternalNode = ({
  draggedNodeId,
  targetId,
  nodes,
  profile,
}: {
  draggedNodeId: MasterTreeId;
  targetId: MasterTreeId | null;
  nodes: MasterTreeNode[];
  profile: FolderTreeProfileV2;
}): boolean => {
  if (targetId) {
    const targetNode = nodes.find((node: MasterTreeNode): boolean => node.id === targetId);
    if (targetNode?.type !== 'folder') return false;
  }

  const targetFolder = resolveFolderTargetPathForMasterNode(nodes, targetId);
  if (targetFolder === null) return false;
  const targetIsRoot = targetFolder.length === 0;

  const slotId = fromSlotMasterNodeId(draggedNodeId);
  if (slotId) {
    return canNestTreeNodeV2({
      profile,
      nodeType: 'file',
      nodeKind: 'card',
      targetType: targetIsRoot ? 'root' : 'folder',
      ...(targetIsRoot ? {} : { targetFolderKind: 'folder' }),
    });
  }

  const folderPath = fromFolderMasterNodeId(draggedNodeId);
  if (folderPath !== null) {
    return (
      canMoveTreePath(folderPath, targetFolder) &&
      canNestTreeNodeV2({
        profile,
        nodeType: 'folder',
        nodeKind: 'folder',
        targetType: targetIsRoot ? 'root' : 'folder',
        ...(targetIsRoot ? {} : { targetFolderKind: 'folder' }),
      })
    );
  }

  return false;
};

export const resolveImageStudioExternalDropAction = ({
  draggedNodeId,
  targetId,
  nodes,
}: {
  draggedNodeId: MasterTreeId;
  targetId: MasterTreeId | null;
  nodes: MasterTreeNode[];
}): ImageStudioExternalDropAction | null => {
  const targetFolder = resolveFolderTargetPathForMasterNode(nodes, targetId);
  if (targetFolder === null) return null;

  const slotId = fromSlotMasterNodeId(draggedNodeId);
  if (slotId) {
    return {
      type: 'move_slot',
      slotId,
      targetFolder,
    };
  }

  const folderPath = fromFolderMasterNodeId(draggedNodeId);
  if (folderPath !== null && canMoveTreePath(folderPath, targetFolder)) {
    return {
      type: 'move_folder',
      folderPath,
      targetFolder,
    };
  }

  return null;
};
