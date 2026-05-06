import type { MasterTreeNode } from '@/shared/utils/master-folder-tree-contract';

import type { FolderTreeTransaction, MasterFolderTreeAdapterV3 } from '../types';
import { createMasterFolderTreeTransactionAdapter } from './createMasterFolderTreeTransactionAdapter';

export type CreateMasterFolderTreeNodesAdapterOptions = {
  onPersistNodes: (
    nodes: MasterTreeNode[],
    tx: FolderTreeTransaction
  ) => Promise<unknown> | void;
  shouldPersist?: (tx: FolderTreeTransaction) => boolean;
};

export const createMasterFolderTreeNodesAdapter = ({
  onPersistNodes,
  shouldPersist,
}: CreateMasterFolderTreeNodesAdapterOptions): MasterFolderTreeAdapterV3 =>
  createMasterFolderTreeTransactionAdapter({
    onApply: async (tx): Promise<void> => {
      if (shouldPersist?.(tx) === false) return;
      await onPersistNodes([...tx.nextNodes], tx);
    },
  });
