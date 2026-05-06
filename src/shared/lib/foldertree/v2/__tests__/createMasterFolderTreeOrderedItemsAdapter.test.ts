import { describe, expect, it, vi } from 'vitest';

import { createMasterFolderTreeOrderedItemsAdapter } from '@/shared/lib/foldertree/v2/adapter/createMasterFolderTreeOrderedItemsAdapter';
import type { FolderTreeTransaction } from '@/shared/lib/foldertree/v2/types';
import type { MasterTreeNode } from '@/shared/utils/master-folder-tree-contract';

type Item = {
  id: string;
  label: string;
  sortOrder: number;
};

const buildNode = (id: string, sortOrder: number): MasterTreeNode => ({
  id,
  type: 'file',
  kind: 'item',
  parentId: null,
  name: id,
  path: id,
  sortOrder,
});

const createTransaction = (nextNodes: MasterTreeNode[]): FolderTreeTransaction => ({
  id: 'tx-ordered-items',
  version: 1,
  createdAt: Date.now(),
  operation: {
    type: 'reorder',
    nodeId: 'item:b',
    targetId: 'item:a',
    position: 'before',
  },
  previousNodes: [],
  nextNodes,
});

describe('createMasterFolderTreeOrderedItemsAdapter', () => {
  it('persists normalized items resolved from transaction next nodes', async () => {
    const items: Item[] = [
      { id: 'a', label: 'Alpha', sortOrder: 1000 },
      { id: 'b', label: 'Beta', sortOrder: 2000 },
    ];
    const itemById = new Map(items.map((item): [string, Item] => [item.id, item]));
    const onPersistItems = vi.fn(async () => undefined);
    const adapter = createMasterFolderTreeOrderedItemsAdapter({
      items,
      itemById,
      getItemId: (item) => item.id,
      resolveOrderedItemsFromNodes: (nodes, lookup) =>
        nodes.flatMap((node, index) => {
          const itemId = node.id.replace('item:', '');
          const item = lookup.get(itemId);
          return item ? [{ ...item, sortOrder: (index + 1) * 1000 }] : [];
        }),
      normalizeItems: (nextItems) => [...nextItems].sort((left, right) => left.sortOrder - right.sortOrder),
      onPersistItems,
    });

    const tx = createTransaction([buildNode('item:b', 1000), buildNode('item:a', 2000)]);
    const prepared = await adapter.prepare(tx);
    await adapter.apply(tx, prepared);

    expect(onPersistItems).toHaveBeenCalledWith([
      { id: 'b', label: 'Beta', sortOrder: 1000 },
      { id: 'a', label: 'Alpha', sortOrder: 2000 },
    ]);
  });

  it('can skip persistence for caller-controlled guarded states', async () => {
    const items: Item[] = [{ id: 'a', label: 'Alpha', sortOrder: 1000 }];
    const onPersistItems = vi.fn();
    const adapter = createMasterFolderTreeOrderedItemsAdapter({
      items,
      itemById: new Map(items.map((item): [string, Item] => [item.id, item])),
      getItemId: (item) => item.id,
      resolveOrderedItemsFromNodes: () => items,
      shouldPersist: () => false,
      onPersistItems,
    });

    const tx = createTransaction([buildNode('item:a', 1000)]);
    const prepared = await adapter.prepare(tx);
    await adapter.apply(tx, prepared);

    expect(onPersistItems).not.toHaveBeenCalled();
  });

  it('uses resolver order when items do not carry explicit sort order updates', async () => {
    const items: Item[] = [
      { id: 'a', label: 'Alpha', sortOrder: 0 },
      { id: 'b', label: 'Beta', sortOrder: 0 },
    ];
    const itemById = new Map(items.map((item): [string, Item] => [item.id, item]));
    const onPersistItems = vi.fn();
    const adapter = createMasterFolderTreeOrderedItemsAdapter({
      items,
      itemById,
      getItemId: (item) => item.id,
      resolveOrderedItemsFromNodes: (nodes, lookup) =>
        nodes.flatMap((node) => {
          const itemId = node.id.replace('item:', '');
          const item = lookup.get(itemId);
          return item ? [item] : [];
        }),
      onPersistItems,
    });

    const tx = createTransaction([buildNode('item:b', 1000), buildNode('item:a', 2000)]);
    const prepared = await adapter.prepare(tx);
    await adapter.apply(tx, prepared);

    expect(onPersistItems).toHaveBeenCalledWith([
      { id: 'b', label: 'Beta', sortOrder: 0 },
      { id: 'a', label: 'Alpha', sortOrder: 0 },
    ]);
  });
});
