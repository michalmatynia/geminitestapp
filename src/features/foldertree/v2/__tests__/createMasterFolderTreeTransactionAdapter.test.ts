import { describe, expect, it, vi } from 'vitest';

import { createMasterFolderTreeTransactionAdapter } from '@/features/foldertree/v2/adapter/createMasterFolderTreeTransactionAdapter';
import type { MasterTreeNode } from '@/shared/utils/master-folder-tree-contract';

const createTransaction = () => ({
  id: 'tx-1',
  version: 1,
  createdAt: Date.now(),
  operation: {
    type: 'replace_nodes' as const,
  },
  previousNodes: [],
  nextNodes: [],
});

describe('createMasterFolderTreeTransactionAdapter', () => {
  it('delegates apply callback and returns applied transaction envelope', async () => {
    const onApply = vi.fn();
    const adapter = createMasterFolderTreeTransactionAdapter({ onApply });
    const tx = createTransaction();

    const prepared = await adapter.prepare(tx);
    const applied = await adapter.apply(tx, prepared);

    expect(onApply).toHaveBeenCalledTimes(1);
    expect(onApply).toHaveBeenCalledWith(tx);
    expect(applied).toEqual(
      expect.objectContaining({
        tx,
      })
    );
    expect(typeof applied.appliedAt).toBe('number');
  });

  it('passes returned nodes through applied transaction payload', async () => {
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

    const adapter = createMasterFolderTreeTransactionAdapter({
      onApply: () => nextNodes,
    });
    const tx = createTransaction();
    const prepared = await adapter.prepare(tx);
    const applied = await adapter.apply(tx, prepared);

    expect(applied.nodes).toEqual(nextNodes);
  });
});
