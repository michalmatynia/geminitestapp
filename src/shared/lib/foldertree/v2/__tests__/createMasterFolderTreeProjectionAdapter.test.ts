import { describe, expect, it, vi } from 'vitest';

import { createMasterFolderTreeProjectionAdapter } from '@/shared/lib/foldertree/v2/adapter/createMasterFolderTreeProjectionAdapter';
import type { FolderTreeTransaction } from '@/shared/lib/foldertree/v2/types';
import type { MasterTreeNode } from '@/shared/utils/master-folder-tree-contract';

const nextNodes: MasterTreeNode[] = [
  {
    id: 'item:a',
    type: 'file',
    kind: 'item',
    parentId: null,
    name: 'A',
    path: 'A',
    sortOrder: 0,
  },
];

const createTransaction = (): FolderTreeTransaction => ({
  id: 'tx-projection',
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

describe('createMasterFolderTreeProjectionAdapter', () => {
  it('projects a transaction before persisting domain state', async () => {
    const onPersistProjection = vi.fn();
    const adapter = createMasterFolderTreeProjectionAdapter({
      project: (tx) => tx.nextNodes.map((node) => node.id),
      onPersistProjection,
    });
    const tx = createTransaction();
    const prepared = await adapter.prepare(tx);

    await adapter.apply(tx, prepared);

    expect(onPersistProjection).toHaveBeenCalledWith(['item:a'], tx);
  });

  it('can skip projection with a caller guard', async () => {
    const project = vi.fn();
    const onPersistProjection = vi.fn();
    const adapter = createMasterFolderTreeProjectionAdapter({
      project,
      onPersistProjection,
      shouldPersist: () => false,
    });
    const tx = createTransaction();
    const prepared = await adapter.prepare(tx);

    await adapter.apply(tx, prepared);

    expect(project).not.toHaveBeenCalled();
    expect(onPersistProjection).not.toHaveBeenCalled();
  });
});
