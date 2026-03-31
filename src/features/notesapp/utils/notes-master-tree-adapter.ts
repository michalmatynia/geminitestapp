import { createMasterFolderTreeAdapterV3 } from '@/shared/lib/foldertree/public';
import type { NotesMasterTreeOperations } from '@/shared/contracts/notes';
import type { MasterTreeId, MasterTreeNode } from '@/shared/utils';

import { decodeNotesMasterNodeId, fromFolderMasterNodeId } from './master-folder-tree';

export const resolveNotesFolderTargetForNode = (
  nodes: MasterTreeNode[],
  nodeId: MasterTreeId | null
): string | null => {
  if (!nodeId) return null;
  const folderId = fromFolderMasterNodeId(nodeId);
  if (folderId) return folderId;
  const node = nodes.find((item: MasterTreeNode) => item.id === nodeId);
  if (!node?.parentId) return null;
  return resolveNotesFolderTargetForNode(nodes, node.parentId);
};

export const createNotesMasterTreeAdapter = (operations: NotesMasterTreeOperations) =>
  createMasterFolderTreeAdapterV3({
    decodeNodeId: decodeNotesMasterNodeId,
    handlers: {
      onMove: async ({ operation, context, node, targetParent }): Promise<void> => {
        const targetFolderId =
          targetParent?.entity === 'folder'
            ? targetParent.id
            : resolveNotesFolderTargetForNode(context.nextNodes, operation.targetParentId);

        if (node.entity === 'note') {
          await operations.handleMoveNoteToFolder(node.id, targetFolderId);
          return;
        }

        if (operation.targetParentId === null && operation.targetIndex === 0) {
          const firstRootFolderId =
            context.nextNodes
              .filter((entry: MasterTreeNode) => entry.type === 'folder' && entry.parentId === null)
              .sort(
                (left: MasterTreeNode, right: MasterTreeNode) => left.sortOrder - right.sortOrder
              )
              .map((entry: MasterTreeNode): string | null => fromFolderMasterNodeId(entry.id))
              .find(
                (folderId: string | null): boolean => Boolean(folderId) && folderId !== node.id
              ) ?? null;
          if (firstRootFolderId) {
            await operations.handleReorderFolder(node.id, firstRootFolderId, 'before');
            return;
          }
        }

        await operations.handleMoveFolderToFolder(node.id, targetFolderId);
      },
      onReorder: async ({ operation, context, node, target }): Promise<void> => {
        if (node.entity === 'folder' && target.entity === 'folder') {
          await operations.handleReorderFolder(node.id, target.id, operation.position);
          return;
        }

        if (node.entity === 'note') {
          const targetFolderId =
            target.entity === 'folder'
              ? target.id
              : resolveNotesFolderTargetForNode(context.nextNodes, operation.targetId);
          await operations.handleMoveNoteToFolder(node.id, targetFolderId);
        }
      },
      onRename: async ({ node, nextName }): Promise<void> => {
        if (node.entity === 'note') {
          await operations.handleRenameNote(node.id, nextName);
          return;
        }
        await operations.handleRenameFolder(node.id, nextName);
      },
    },
  });
