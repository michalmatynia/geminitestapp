import type {
  MasterFolderTreeAdapterV3,
  MasterFolderTreePersistContext,
  MasterFolderTreePersistOperation,
} from '@/shared/contracts/master-folder-tree';
import type { MasterTreeId, MasterTreeNode } from '@/shared/utils/master-folder-tree-contract';

import { createMasterFolderTreeAdapterV3 } from '../v2/adapter/createMasterFolderTreeAdapterV3';


type MoveOperation = Extract<MasterFolderTreePersistOperation, { type: 'move' }>;
type ReorderOperation = Extract<MasterFolderTreePersistOperation, { type: 'reorder' }>;
type RenameOperation = Extract<MasterFolderTreePersistOperation, { type: 'rename' }>;
type ReplaceNodesOperation = Extract<MasterFolderTreePersistOperation, { type: 'replace_nodes' }>;

export type DecodedMasterTreeNode<TEntity extends string = string> = {
  entity: TEntity;
  id: string;
  nodeId: MasterTreeId;
};

export type CreateMasterFolderTreeAdapterOptions<TEntity extends string> = {
  decodeNodeId: (nodeId: MasterTreeId) => DecodedMasterTreeNode<TEntity> | null;
  fetchState?:
    | ((instanceId?: string) => Promise<{ nodes: MasterTreeNode[]; version?: number | undefined }>)
    | undefined;
  loadNodes?: (() => Promise<MasterTreeNode[]>) | undefined;
  handlers?: {
    onMove?:
      | ((
          input: {
            operation: MoveOperation;
            context: MasterFolderTreePersistContext;
            node: DecodedMasterTreeNode<TEntity>;
            targetParent: DecodedMasterTreeNode<TEntity> | null;
          }
        ) => Promise<MasterTreeNode[] | void> | MasterTreeNode[] | void)
      | undefined;
    onReorder?:
      | ((
          input: {
            operation: ReorderOperation;
            context: MasterFolderTreePersistContext;
            node: DecodedMasterTreeNode<TEntity>;
            target: DecodedMasterTreeNode<TEntity>;
          }
        ) => Promise<MasterTreeNode[] | void> | MasterTreeNode[] | void)
      | undefined;
    onRename?:
      | ((
          input: {
            operation: RenameOperation;
            context: MasterFolderTreePersistContext;
            node: DecodedMasterTreeNode<TEntity>;
            nextName: string;
          }
        ) => Promise<MasterTreeNode[] | void> | MasterTreeNode[] | void)
      | undefined;
    onReplaceNodes?:
      | ((
          input: {
            operation: ReplaceNodesOperation;
            context: MasterFolderTreePersistContext;
          }
        ) => Promise<MasterTreeNode[] | void> | MasterTreeNode[] | void)
      | undefined;
  };
};

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
        onReplaceNodes: async ({
          operation,
          context,
        }): Promise<MasterTreeNode[] | void> =>
          await handlers.onReplaceNodes?.({
            operation,
            context: context,
          }),
      }
      : undefined,
  });
}
