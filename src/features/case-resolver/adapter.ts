import {
  createMasterFolderTreeAdapterV3,
  type DecodedMasterTreeNodeV3,
} from '@/shared/lib/foldertree/public';
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

type CaseResolverTreeAdapter = ReturnType<typeof createMasterFolderTreeAdapterV3>;
type CaseResolverDecodedNode = DecodedMasterTreeNodeV3<'file' | 'folder' | 'asset'>;

const buildMoveTargetFolder = (targetParent: CaseResolverDecodedNode | null | undefined, context: { nextNodes: MasterTreeNode[] }, operation: { targetParentId: string | null }): string => {
  if (targetParent?.entity === 'folder') {
    return targetParent.id;
  }
  return resolveCaseResolverFolderTargetForNode(context.nextNodes, operation.targetParentId) ?? '';
};

const handleMove = async (node: CaseResolverDecodedNode, targetFolder: string, operations: CaseResolverMasterTreeAdapterOperations, nextNodes: MasterTreeNode[]): Promise<MasterTreeNode[] | void> => {
  if (node.entity === 'file') {
    await operations.moveFile(node.id, targetFolder);
    return nextNodes;
  }
  if (node.entity === 'asset') {
    await operations.moveAsset(node.id, targetFolder);
    return nextNodes;
  }

  if (!canMoveTreePath(node.id, targetFolder)) return undefined;
  await operations.moveFolder(node.id, targetFolder);
  return nextNodes;
};

export const createCaseResolverMasterTreeAdapter = (
  operations: CaseResolverMasterTreeAdapterOperations
): CaseResolverTreeAdapter =>
  createMasterFolderTreeAdapterV3({
    decodeNodeId: decodeCaseResolverMasterNodeId,
    handlers: {
      onMove: async ({
        operation,
        context,
        node,
        targetParent,
      }): Promise<MasterTreeNode[] | void> => {
        const targetFolder = buildMoveTargetFolder(targetParent, context, operation);
        return handleMove(node, targetFolder, operations, context.nextNodes);
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

        return handleMove(node, targetFolder, operations, context.nextNodes);
      },
      onRename: async ({ context, node, nextName }): Promise<MasterTreeNode[] | void> => {
        const normalizedName = nextName.replace(/[\\/]+/g, ' ').trim();
        if (normalizedName.length === 0) return undefined;

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
          parentPath.length > 0 ? `${parentPath}/${normalizedName}` : normalizedName
        );
        if (!canMoveTreePath(node.id, nextPath)) return undefined;
        await operations.renameFolder(node.id, nextPath);
        return context.nextNodes;
      },
    },
  });

export const createCaseResolverCasesMasterTreeAdapter = (
  operations: CaseResolverCasesMasterTreeAdapterOperations
): CaseResolverTreeAdapter =>
  createMasterFolderTreeAdapterV3({
    decodeNodeId: decodeCaseResolverCaseMasterNodeId,
    handlers: {
      onMove: async ({
        operation,
        context,
        node,
        targetParent,
      }): Promise<MasterTreeNode[] | void> => {
        let targetParentCaseId: string | null = null;
        if (targetParent?.entity === 'case') {
          targetParentCaseId = targetParent.id;
        } else if (operation.targetParentId !== null) {
          targetParentCaseId = decodeCaseResolverCaseMasterNodeId(operation.targetParentId)?.id ?? null;
        }

        await operations.moveCase(node.id, targetParentCaseId, operation.targetIndex);
        return context.nextNodes;
      },
      onReorder: async ({ operation, context, node, target }): Promise<MasterTreeNode[] | void> => {
        await operations.reorderCase(node.id, target.id, operation.position);
        return context.nextNodes;
      },
      onRename: async ({ context, node, nextName }): Promise<MasterTreeNode[] | void> => {
        const normalizedName = nextName.replace(/[\\/]+/g, ' ').trim();
        if (normalizedName.length === 0) return undefined;
        await operations.renameCase(node.id, normalizedName);
        return context.nextNodes;
      },
    },
  });
