import { createMasterFolderTreeAdapterV3 } from '@/features/foldertree/public';
import type { MasterTreeNode } from '@/shared/utils/master-folder-tree-contract';
import { canMoveTreePath, normalizeTreePath } from '@/shared/utils/tree-operations';

import {
  decodeCaseResolverCaseMasterNodeId,
  decodeCaseResolverMasterNodeId,
  resolveCaseResolverFolderTargetForNode,
} from './master-tree';

export type CaseResolverMasterTreeAdapterOperations = {
  moveFile: (fileId: string, targetFolder: string) => Promise<void>;
  moveAsset: (assetId: string, targetFolder: string) => Promise<void>;
  moveFolder: (folderPath: string, targetFolder: string) => Promise<void>;
  renameFile: (fileId: string, nextName: string) => Promise<void>;
  renameAsset: (assetId: string, nextName: string) => Promise<void>;
  renameFolder: (folderPath: string, nextFolderPath: string) => Promise<void>;
};

export type CaseResolverCasesMasterTreeAdapterOperations = {
  moveCase: (
    caseId: string,
    targetParentCaseId: string | null,
    targetIndex?: number
  ) => Promise<void>;
  reorderCase: (
    caseId: string,
    targetCaseId: string,
    position: 'before' | 'after'
  ) => Promise<void>;
  renameCase: (caseId: string, nextName: string) => Promise<void>;
};

export const createCaseResolverMasterTreeAdapter = (
  operations: CaseResolverMasterTreeAdapterOperations
) =>
  createMasterFolderTreeAdapterV3({
    decodeNodeId: decodeCaseResolverMasterNodeId,
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
            : (resolveCaseResolverFolderTargetForNode(
              context.nextNodes,
              operation.targetParentId
            ) ?? '');

        if (node.entity === 'file') {
          await operations.moveFile(node.id, targetFolder);
          return context.nextNodes;
        }
        if (node.entity === 'asset') {
          await operations.moveAsset(node.id, targetFolder);
          return context.nextNodes;
        }

        if (!canMoveTreePath(node.id, targetFolder)) return;
        await operations.moveFolder(node.id, targetFolder);
        return context.nextNodes;
      },
      onReorder: async ({ operation, context, node }): Promise<MasterTreeNode[] | void> => {
        const targetNode = context.previousNodes.find(
          (candidate: MasterTreeNode): boolean => candidate.id === operation.targetId
        );
        const targetFolder =
          resolveCaseResolverFolderTargetForNode(
            context.previousNodes,
            targetNode?.parentId ?? null
          ) ?? '';

        if (node.entity === 'file') {
          await operations.moveFile(node.id, targetFolder);
          return context.nextNodes;
        }
        if (node.entity === 'asset') {
          await operations.moveAsset(node.id, targetFolder);
          return context.nextNodes;
        }

        if (!canMoveTreePath(node.id, targetFolder)) return;
        await operations.moveFolder(node.id, targetFolder);
        return context.nextNodes;
      },
      onRename: async ({ context, node, nextName }): Promise<MasterTreeNode[] | void> => {
        const normalizedName = nextName.replace(/[\\/]+/g, ' ').trim();
        if (!normalizedName) return;

        if (node.entity === 'file') {
          await operations.renameFile(node.id, normalizedName);
          return context.nextNodes;
        }
        if (node.entity === 'asset') {
          await operations.renameAsset(node.id, normalizedName);
          return context.nextNodes;
        }

        const parentPath = node.id.includes('/') ? node.id.slice(0, node.id.lastIndexOf('/')) : '';
        const nextPath = normalizeTreePath(
          parentPath ? `${parentPath}/${normalizedName}` : normalizedName
        );
        if (!canMoveTreePath(node.id, nextPath)) return;
        await operations.renameFolder(node.id, nextPath);
        return context.nextNodes;
      },
    },
  });

export const createCaseResolverCasesMasterTreeAdapter = (
  operations: CaseResolverCasesMasterTreeAdapterOperations
) =>
  createMasterFolderTreeAdapterV3({
    decodeNodeId: decodeCaseResolverCaseMasterNodeId,
    handlers: {
      onMove: async ({
        operation,
        context,
        node,
        targetParent,
      }): Promise<MasterTreeNode[] | void> => {
        const targetParentCaseId =
          targetParent?.entity === 'case'
            ? targetParent.id
            : operation.targetParentId
              ? (decodeCaseResolverCaseMasterNodeId(operation.targetParentId)?.id ?? null)
              : null;
        await operations.moveCase(node.id, targetParentCaseId, operation.targetIndex);
        return context.nextNodes;
      },
      onReorder: async ({ operation, context, node, target }): Promise<MasterTreeNode[] | void> => {
        await operations.reorderCase(node.id, target.id, operation.position);
        return context.nextNodes;
      },
      onRename: async ({ context, node, nextName }): Promise<MasterTreeNode[] | void> => {
        const normalizedName = nextName.replace(/[\\/]+/g, ' ').trim();
        if (!normalizedName) return;
        await operations.renameCase(node.id, normalizedName);
        return context.nextNodes;
      },
    },
  });
