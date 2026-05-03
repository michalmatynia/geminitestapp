import type { MasterTreeNode } from '@/shared/utils/master-folder-tree-contract';

import type {
  FolderTreeAppliedTransaction,
  FolderTreePreparedTransaction,
  FolderTreeTransaction,
  MasterFolderTreeAdapterV3,
} from '../types';

export type CreateMasterFolderTreeTransactionAdapterOptions = {
  onApply:
    | ((tx: FolderTreeTransaction) => Promise<void | MasterTreeNode[]> | void | MasterTreeNode[])
    | undefined;
};

const toPreparedTransaction = (
  tx: FolderTreeTransaction
): Promise<FolderTreePreparedTransaction> =>
  Promise.resolve({
    tx,
    preparedAt: Date.now(),
  });

const toAppliedTransaction = (
  tx: FolderTreeTransaction,
  nextNodes?: MasterTreeNode[] | void
): FolderTreeAppliedTransaction => ({
  tx,
  appliedAt: Date.now(),
  ...(Array.isArray(nextNodes) ? { nodes: nextNodes } : {}),
});

export const createMasterFolderTreeTransactionAdapter = ({
  onApply,
}: CreateMasterFolderTreeTransactionAdapterOptions): MasterFolderTreeAdapterV3 => ({
  prepare: toPreparedTransaction,
  apply: async (tx: FolderTreeTransaction): Promise<FolderTreeAppliedTransaction> => {
    const maybeNodes = await onApply?.(tx);
    return toAppliedTransaction(tx, maybeNodes);
  },
  commit: async (): Promise<void> => {},
  rollback: async (): Promise<void> => {},
});
