import { createMasterFolderTreeAdapter } from '@/features/foldertree';
import type { ImageStudioSlotRecord } from '@/shared/contracts/image-studio';
import type { MasterTreeNode } from '@/shared/utils/master-folder-tree-contract';
import { canMoveTreePath, normalizeTreePath } from '@/shared/utils/tree-operations';

import {
  decodeImageStudioMasterNodeId,
  resolveFolderTargetPathForMasterNode,
} from './master-folder-tree';

export type ImageStudioMasterTreeAdapterOptions = {
  slotById: Map<string, ImageStudioSlotRecord>;
  moveSlot: (input: { slot: ImageStudioSlotRecord; targetFolder: string }) => Promise<void>;
  moveFolder: (folderPath: string, targetFolderPath: string) => Promise<void>;
  renameFolder: (folderPath: string, nextPath: string) => Promise<void>;
  renameSlot: (input: { id: string; data: { name: string } }) => Promise<void>;
};

export const createImageStudioMasterTreeAdapter = ({
  slotById,
  moveSlot,
  moveFolder,
  renameFolder,
  renameSlot,
}: ImageStudioMasterTreeAdapterOptions) =>
  createMasterFolderTreeAdapter({
    decodeNodeId: decodeImageStudioMasterNodeId,
    handlers: {
      onMove: async ({
        operation,
        context,
        node,
        targetParent,
      }): Promise<MasterTreeNode[] | void> => {
        const targetFolder =
          targetParent?.entity === 'folder'
            ? targetParent.id
            : resolveFolderTargetPathForMasterNode(context.nextNodes, operation.targetParentId);
        if (targetFolder === null) return;

        if (node.entity === 'card') {
          const slot = slotById.get(node.id);
          if (!slot) return;
          await moveSlot({ slot, targetFolder });
          // Return the optimistic nodes so the tree controller uses them directly
          // instead of waiting for external sync (which can race with refetch).
          return context.nextNodes;
        }

        if (canMoveTreePath(node.id, targetFolder)) {
          await moveFolder(node.id, targetFolder);
          return context.nextNodes;
        }
      },
      onReorder: async ({ operation, context, node }): Promise<MasterTreeNode[] | void> => {
        const targetNode = context.previousNodes.find(
          (candidate: MasterTreeNode): boolean => candidate.id === operation.targetId
        );
        const targetFolder = resolveFolderTargetPathForMasterNode(
          context.previousNodes,
          targetNode?.parentId ?? null
        );
        if (targetFolder === null) return;

        if (node.entity === 'card') {
          const slot = slotById.get(node.id);
          if (!slot) return;
          await moveSlot({ slot, targetFolder });
          return context.nextNodes;
        }

        if (canMoveTreePath(node.id, targetFolder)) {
          await moveFolder(node.id, targetFolder);
          return context.nextNodes;
        }
      },
      onRename: async ({ node, nextName }): Promise<void> => {
        const normalizedName = nextName.replace(/[\\/]+/g, ' ').trim();
        if (!normalizedName) return;

        if (node.entity === 'card') {
          await renameSlot({
            id: node.id,
            data: { name: normalizedName },
          });
          return;
        }

        const parentPath = node.id.includes('/') ? node.id.slice(0, node.id.lastIndexOf('/')) : '';
        const nextPath = normalizeTreePath(
          parentPath ? `${parentPath}/${normalizedName}` : normalizedName
        );
        if (!canMoveTreePath(node.id, nextPath)) return;
        await renameFolder(node.id, nextPath);
      },
    },
  });
