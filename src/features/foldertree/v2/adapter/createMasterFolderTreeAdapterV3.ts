import type {
  CreateMasterFolderTreeAdapterOptions as SharedCreateMasterFolderTreeAdapterOptions,
  DecodedMasterTreeNode as SharedDecodedMasterTreeNode,
  MasterFolderTreePersistContext,
} from '@/shared/contracts/master-folder-tree';
import type { MasterTreeId } from '@/shared/utils/master-folder-tree-contract';

import type {
  FolderTreeAppliedTransaction,
  FolderTreePreparedTransaction,
  FolderTreeTransaction,
  MasterFolderTreeAdapterV3,
} from '../types/index';

type DecodedMasterTreeNodeV3<TEntity extends string = string> = SharedDecodedMasterTreeNode<TEntity>;

export type { DecodedMasterTreeNodeV3 };

type CreateMasterFolderTreeAdapterV3Options<TEntity extends string> =
  SharedCreateMasterFolderTreeAdapterOptions<TEntity>;

export type { CreateMasterFolderTreeAdapterV3Options };

const toPersistContext = (tx: FolderTreeTransaction): MasterFolderTreePersistContext => ({
  previousNodes: tx.previousNodes,
  nextNodes: tx.nextNodes,
});

const defaultPrepare = async (
  tx: FolderTreeTransaction
): Promise<FolderTreePreparedTransaction> => ({
  tx,
  preparedAt: Date.now(),
});

const applyDecodedOperation = async <TEntity extends string>({
  tx,
  decodeNodeId,
  handlers,
}: {
  tx: FolderTreeTransaction;
  decodeNodeId: (nodeId: MasterTreeId) => DecodedMasterTreeNodeV3<TEntity> | null;
  handlers: CreateMasterFolderTreeAdapterV3Options<TEntity>['handlers'];
}): Promise<FolderTreeAppliedTransaction | void> => {
  const operation = tx.operation;
  const context = toPersistContext(tx);

  if (operation.type === 'move') {
    const node = decodeNodeId(operation.nodeId);
    if (!node || !handlers?.onMove) return;
    const targetParent = operation.targetParentId ? decodeNodeId(operation.targetParentId) : null;
    const nodes = await handlers.onMove({ operation, context, node, targetParent });
    return {
      tx,
      appliedAt: Date.now(),
      ...(Array.isArray(nodes) ? { nodes } : {}),
    };
  }

  if (operation.type === 'reorder') {
    const node = decodeNodeId(operation.nodeId);
    const target = decodeNodeId(operation.targetId);
    if (!node || !target || !handlers?.onReorder) return;
    const nodes = await handlers.onReorder({ operation, context, node, target });
    return {
      tx,
      appliedAt: Date.now(),
      ...(Array.isArray(nodes) ? { nodes } : {}),
    };
  }

  if (operation.type === 'rename') {
    const node = decodeNodeId(operation.nodeId);
    if (!node || !handlers?.onRename) return;
    const nextName = operation.name.trim();
    if (!nextName) return;
    const nodes = await handlers.onRename({ operation, context, node, nextName });
    return {
      tx,
      appliedAt: Date.now(),
      ...(Array.isArray(nodes) ? { nodes } : {}),
    };
  }

  if (operation.type === 'replace_nodes') {
    if (!handlers?.onReplaceNodes) return;
    const nodes = await handlers.onReplaceNodes({ operation, context });
    return {
      tx,
      appliedAt: Date.now(),
      ...(Array.isArray(nodes) ? { nodes } : {}),
    };
  }

  return;
};

export function createMasterFolderTreeAdapterV3<TEntity extends string>({
  decodeNodeId,
  fetchState,
  handlers,
}: CreateMasterFolderTreeAdapterV3Options<TEntity>): MasterFolderTreeAdapterV3 {
  return {
    ...(fetchState ? { fetchState } : {}),
    prepare: defaultPrepare,
    apply: async (
      tx: FolderTreeTransaction,
      _prepared: FolderTreePreparedTransaction
    ): Promise<FolderTreeAppliedTransaction | void> => {
      return await applyDecodedOperation({ tx, decodeNodeId, handlers });
    },
    commit: async (): Promise<void> => {
      // No-op by default, but this explicit phase keeps the v3 transaction contract stable.
    },
    rollback: async (): Promise<void> => {
      // No-op by default; caller owns state rollback.
    },
  };
}
