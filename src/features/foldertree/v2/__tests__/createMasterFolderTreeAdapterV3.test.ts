import { describe, expect, it, vi } from 'vitest';

import { createMasterFolderTreeAdapterV3 } from '@/features/foldertree/v2/adapter/createMasterFolderTreeAdapterV3';
import type { MasterTreeNode } from '@/shared/utils/master-folder-tree-contract';

const decodeNodeId = (nodeId: string) => {
  if (nodeId.startsWith('file:')) {
    return { entity: 'file' as const, id: nodeId.slice('file:'.length), nodeId };
  }
  if (nodeId.startsWith('folder:')) {
    return { entity: 'folder' as const, id: nodeId.slice('folder:'.length), nodeId };
  }
  return null;
};

describe('createMasterFolderTreeAdapterV3', () => {
  it('delegates move operations through apply', async () => {
    const onMove = vi.fn();
    const adapter = createMasterFolderTreeAdapterV3({
      decodeNodeId,
      handlers: {
        onMove,
      },
    });

    const tx = {
      id: 'tx-1',
      version: 1,
      createdAt: Date.now(),
      operation: {
        type: 'move' as const,
        nodeId: 'file:a',
        targetParentId: 'folder:inbox',
      },
      previousNodes: [],
      nextNodes: [],
    };

    const prepared = await adapter.prepare(tx);
    await adapter.apply(tx, prepared);

    expect(onMove).toHaveBeenCalledTimes(1);
    expect(onMove).toHaveBeenCalledWith(
      expect.objectContaining({
        node: { entity: 'file', id: 'a', nodeId: 'file:a' },
        targetParent: { entity: 'folder', id: 'inbox', nodeId: 'folder:inbox' },
      })
    );
  });

  it('loads nodes from fetchState', async () => {
    const nodes: MasterTreeNode[] = [
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

    const adapter = createMasterFolderTreeAdapterV3({
      decodeNodeId,
      fetchState: async () => ({
        nodes,
        version: 2,
      }),
    });

    await expect(adapter.fetchState?.('')).resolves.toEqual({
      nodes,
      version: 2,
    });
  });

  it('skips rename handler when normalized name is empty', async () => {
    const onRename = vi.fn();
    const adapter = createMasterFolderTreeAdapterV3({
      decodeNodeId,
      handlers: {
        onRename,
      },
    });

    const tx = {
      id: 'tx-rename',
      version: 1,
      createdAt: Date.now(),
      operation: {
        type: 'rename' as const,
        nodeId: 'folder:root',
        name: '   ',
      },
      previousNodes: [],
      nextNodes: [],
    };

    const prepared = await adapter.prepare(tx);
    await adapter.apply(tx, prepared);

    expect(onRename).not.toHaveBeenCalled();
  });

  it('delegates reorder operations only when both nodes decode', async () => {
    const onReorder = vi.fn();
    const adapter = createMasterFolderTreeAdapterV3({
      decodeNodeId,
      handlers: {
        onReorder,
      },
    });

    const validTx = {
      id: 'tx-reorder-valid',
      version: 1,
      createdAt: Date.now(),
      operation: {
        type: 'reorder' as const,
        nodeId: 'folder:alpha',
        targetId: 'folder:beta',
        position: 'before',
      },
      previousNodes: [],
      nextNodes: [],
    };

    await adapter.apply(validTx, await adapter.prepare(validTx));
    expect(onReorder).toHaveBeenCalledTimes(1);

    const invalidTx = {
      id: 'tx-reorder-invalid',
      version: 1,
      createdAt: Date.now(),
      operation: {
        type: 'reorder' as const,
        nodeId: 'folder:alpha',
        targetId: 'unknown',
        position: 'after',
      },
      previousNodes: [],
      nextNodes: [],
    };

    await adapter.apply(invalidTx, await adapter.prepare(invalidTx));
    expect(onReorder).toHaveBeenCalledTimes(1);
  });
});
