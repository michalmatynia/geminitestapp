import { describe, expect, it, vi } from 'vitest';

import { createMasterFolderTreeNodesAdapter } from '@/shared/lib/foldertree/v2/adapter/createMasterFolderTreeNodesAdapter';
import type { FolderTreeTransaction } from '@/shared/lib/foldertree/v2/types';
import type { MasterTreeNode } from '@/shared/utils/master-folder-tree-contract';

const nextNodes: MasterTreeNode[] = [
  {
    id: 'folder:root',
    type: 'folder',
    kind: 'folder',
    parentId: null,
    name: 'Root',
    path: 'Root',
    sortOrder: 0,
  },
];

const createTransaction = (): FolderTreeTransaction => ({
  id: 'tx-nodes',
  version: 1,
  createdAt: Date.now(),
  operation: {
    type: 'replace_nodes',
    nodes: nextNodes,
    reason: 'refresh',
  },
  previousNodes: [],
  nextNodes,
});

describe('createMasterFolderTreeNodesAdapter', () => {
  it('persists the transaction next nodes', async () => {
    const onPersistNodes = vi.fn(async () => undefined);
    const adapter = createMasterFolderTreeNodesAdapter({ onPersistNodes });
    const tx = createTransaction();
    const prepared = await adapter.prepare(tx);

    await adapter.apply(tx, prepared);

    expect(onPersistNodes).toHaveBeenCalledWith(nextNodes, tx);
  });

  it('can skip persistence with a caller guard', async () => {
    const onPersistNodes = vi.fn();
    const adapter = createMasterFolderTreeNodesAdapter({
      onPersistNodes,
      shouldPersist: () => false,
    });
    const tx = createTransaction();
    const prepared = await adapter.prepare(tx);

    await adapter.apply(tx, prepared);

    expect(onPersistNodes).not.toHaveBeenCalled();
  });
});
