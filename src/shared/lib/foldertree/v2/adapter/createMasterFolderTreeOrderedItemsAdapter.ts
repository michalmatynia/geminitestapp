import type { MasterTreeNode } from '@/shared/utils/master-folder-tree-contract';

import type { FolderTreeTransaction, MasterFolderTreeAdapterV3 } from '../types';
import { createMasterFolderTreeTransactionAdapter } from './createMasterFolderTreeTransactionAdapter';

export type CreateMasterFolderTreeOrderedItemsAdapterOptions<TItem> = {
  items: readonly TItem[];
  itemById: Map<string, TItem>;
  getItemId: (item: TItem) => string;
  resolveOrderedItemsFromNodes: (
    nodes: MasterTreeNode[],
    itemById: Map<string, TItem>
  ) => readonly TItem[];
  onPersistItems: (items: TItem[]) => Promise<unknown> | void;
  normalizeItems?: (items: TItem[]) => TItem[];
  shouldPersist?: (tx: FolderTreeTransaction) => boolean;
};

export const createMasterFolderTreeOrderedItemsAdapter = <TItem>({
  items,
  itemById,
  getItemId,
  resolveOrderedItemsFromNodes,
  onPersistItems,
  normalizeItems,
  shouldPersist,
}: CreateMasterFolderTreeOrderedItemsAdapterOptions<TItem>): MasterFolderTreeAdapterV3 =>
  createMasterFolderTreeTransactionAdapter({
    onApply: async (tx): Promise<void> => {
      if (shouldPersist?.(tx) === false) return;

      const orderedItems = resolveOrderedItemsFromNodes(tx.nextNodes, itemById);
      const orderedItemIds = new Set(orderedItems.map((item) => getItemId(item)));
      const nextItems = [
        ...orderedItems,
        ...items.filter((item) => !orderedItemIds.has(getItemId(item))),
      ];
      const nextItemsSnapshot = [...nextItems];

      await onPersistItems(normalizeItems?.(nextItemsSnapshot) ?? nextItemsSnapshot);
    },
  });
