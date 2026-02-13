import type { MasterTreeId, MasterTreeNode } from '@/shared/utils/master-folder-tree-contract';

import type {
  MasterFolderTreeAdapter,
  MasterFolderTreePersistContext,
  MasterFolderTreePersistOperation,
} from './types';

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
  loadNodes,
  handlers,
}: CreateMasterFolderTreeAdapterOptions<TEntity>): MasterFolderTreeAdapter {
  return {
    ...(loadNodes ? { loadNodes } : {}),
    applyOperation: async (
      operation: MasterFolderTreePersistOperation,
      context: MasterFolderTreePersistContext
    ): Promise<MasterTreeNode[] | void> => {
      if (operation.type === 'move') {
        const node = decodeNodeId(operation.nodeId);
        if (!node || !handlers?.onMove) return;
        const targetParent = operation.targetParentId
          ? decodeNodeId(operation.targetParentId)
          : null;
        return await handlers.onMove({
          operation,
          context,
          node,
          targetParent,
        });
      }

      if (operation.type === 'reorder') {
        const node = decodeNodeId(operation.nodeId);
        const target = decodeNodeId(operation.targetId);
        if (!node || !target || !handlers?.onReorder) return;
        return await handlers.onReorder({
          operation,
          context,
          node,
          target,
        });
      }

      if (operation.type === 'rename') {
        const node = decodeNodeId(operation.nodeId);
        if (!node || !handlers?.onRename) return;
        const nextName = operation.name.trim();
        if (!nextName) return;
        return await handlers.onRename({
          operation,
          context,
          node,
          nextName,
        });
      }

      if (operation.type === 'replace_nodes') {
        if (!handlers?.onReplaceNodes) return;
        return await handlers.onReplaceNodes({
          operation,
          context,
        });
      }
    },
  };
}
