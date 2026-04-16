import { createMasterFolderTreeAdapterV3 } from '@/shared/lib/foldertree/public';
import type { MasterTreeNode } from '@/shared/utils/master-folder-tree-contract';
import { normalizeTreePath } from '@/shared/utils/tree-operations';
import { canMoveAiPathFolder } from '@/shared/lib/ai-paths/core/utils/path-folders';

import {
  decodeAiPathMasterNodeId,
  resolveAiPathFolderTargetPathForNode,
} from './master-folder-tree';

export type AiPathsMasterTreeAdapterOptions = {
  movePath: (pathId: string, targetFolder?: string | null) => Promise<void>;
  moveFolder: (folderPath: string, targetFolder?: string | null) => Promise<void>;
  renameFolder: (folderPath: string, nextFolderPath: string) => Promise<void>;
};

export const createAiPathsMasterTreeAdapter = ({
  movePath,
  moveFolder,
  renameFolder,
}: AiPathsMasterTreeAdapterOptions) =>
  createMasterFolderTreeAdapterV3({
    decodeNodeId: decodeAiPathMasterNodeId,
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
            : (resolveAiPathFolderTargetPathForNode(context.nextNodes, operation.targetParentId) ??
              '');

        if (node.entity === 'path') {
          await movePath(node.id, targetFolder);
          return context.nextNodes;
        }

        if (!canMoveAiPathFolder(node.id, targetFolder)) return;
        await moveFolder(node.id, targetFolder);
        return context.nextNodes;
      },
      onReorder: async ({ operation, context, node }): Promise<MasterTreeNode[] | void> => {
        const targetNode = context.previousNodes.find(
          (candidate: MasterTreeNode): boolean => candidate.id === operation.targetId
        );
        const targetFolder =
          resolveAiPathFolderTargetPathForNode(context.previousNodes, targetNode?.parentId ?? null) ??
          '';

        if (node.entity === 'path') {
          await movePath(node.id, targetFolder);
          return context.nextNodes;
        }

        if (!canMoveAiPathFolder(node.id, targetFolder)) return;
        await moveFolder(node.id, targetFolder);
        return context.nextNodes;
      },
      onRename: async ({ context, node, nextName }): Promise<MasterTreeNode[] | void> => {
        if (node.entity !== 'folder') return context.nextNodes;
        const normalizedName = nextName.replace(/[\\/]+/g, ' ').trim();
        if (!normalizedName) return;

        const parentPath = node.id.includes('/') ? node.id.slice(0, node.id.lastIndexOf('/')) : '';
        const nextPath = normalizeTreePath(
          parentPath ? `${parentPath}/${normalizedName}` : normalizedName
        );
        if (!canMoveAiPathFolder(node.id, nextPath)) return;
        await renameFolder(node.id, nextPath);
        return context.nextNodes;
      },
    },
  });
