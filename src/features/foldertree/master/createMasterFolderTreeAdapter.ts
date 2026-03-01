import type {
  MasterFolderTreeAdapterV3,
  MasterFolderTreePersistContext as _MasterFolderTreePersistContext,
  MasterFolderTreePersistOperation as _MasterFolderTreePersistOperation,
  DecodedMasterTreeNode,
  CreateMasterFolderTreeAdapterOptions,
  MoveOperation as _MoveOperation,
  ReorderOperation as _ReorderOperation,
  RenameOperation as _RenameOperation,
  ReplaceNodesOperation as _ReplaceNodesOperation,
} from '@/shared/contracts/master-folder-tree';
import type { MasterTreeId as _MasterTreeId, MasterTreeNode } from '@/shared/utils/master-folder-tree-contract';

import { createMasterFolderTreeAdapterV3 } from '../v2/adapter/createMasterFolderTreeAdapterV3';

export type { DecodedMasterTreeNode, CreateMasterFolderTreeAdapterOptions };

export function createMasterFolderTreeAdapter<TEntity extends string>({
  decodeNodeId,
  fetchState,
  loadNodes,
  handlers,
}: CreateMasterFolderTreeAdapterOptions<TEntity>): MasterFolderTreeAdapterV3 {
  const resolvedFetchState =
    fetchState ??
    (loadNodes
      ? async (): Promise<{ nodes: MasterTreeNode[] }> => ({
        nodes: await loadNodes(),
      })
      : undefined);

  return createMasterFolderTreeAdapterV3({
    decodeNodeId,
    ...(resolvedFetchState ? { fetchState: resolvedFetchState } : {}),
    handlers: handlers
      ? {
        onMove: async ({
          operation,
          context,
          node,
          targetParent,
        }): Promise<MasterTreeNode[] | void> =>
          await handlers.onMove?.({
            operation,
            context: context,
            node,
            targetParent,
          }),
        onReorder: async ({
          operation,
          context,
          node,
          target,
        }): Promise<MasterTreeNode[] | void> =>
          await handlers.onReorder?.({
            operation,
            context: context,
            node,
            target,
          }),
        onRename: async ({
          operation,
          context,
          node,
          nextName,
        }): Promise<MasterTreeNode[] | void> =>
          await handlers.onRename?.({
            operation,
            context: context,
            node,
            nextName,
          }),
        onReplaceNodes: async ({ operation, context }): Promise<MasterTreeNode[] | void> =>
          await handlers.onReplaceNodes?.({
            operation,
            context: context,
          }),
      }
      : undefined,
  });
}
