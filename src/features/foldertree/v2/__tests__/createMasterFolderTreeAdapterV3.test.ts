import { describe, expect, it, vi } from 'vitest';

import { createMasterFolderTreeAdapterV3 } from '@/features/foldertree/v2/adapter/createMasterFolderTreeAdapterV3';
import type {
  MasterFolderTreePersistContext,
  MasterFolderTreePersistOperation,
} from '@/shared/contracts/master-folder-tree';
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
  const context: MasterFolderTreePersistContext = {
    previousNodes: [],
    nextNodes: [],
  };

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

    const prepared = await adapter.prepare?.(tx);
    await adapter.apply(tx, prepared ?? { tx, preparedAt: Date.now() });

    expect(onMove).toHaveBeenCalledTimes(1);
    expect(onMove).toHaveBeenCalledWith(
      expect.objectContaining({
        node: { entity: 'file', id: 'a', nodeId: 'file:a' },
        targetParent: { entity: 'folder', id: 'inbox', nodeId: 'folder:inbox' },
      })
    );
  });

  it('supports legacy loadNodes alias from fetchState', async () => {
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

    const operation: Extract<MasterFolderTreePersistOperation, { type: 'rename' }> = {
      type: 'rename',
      nodeId: 'folder:root',
      name: '   ',
    };

    await adapter.applyOperation?.(operation, context);

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

    const validOperation: Extract<MasterFolderTreePersistOperation, { type: 'reorder' }> = {
      type: 'reorder',
      nodeId: 'folder:alpha',
      targetId: 'folder:beta',
      position: 'before',
    };

    await adapter.applyOperation?.(validOperation, context);
    expect(onReorder).toHaveBeenCalledTimes(1);

    const invalidOperation: Extract<MasterFolderTreePersistOperation, { type: 'reorder' }> = {
      type: 'reorder',
      nodeId: 'folder:alpha',
      targetId: 'unknown',
      position: 'after',
    };

    await adapter.applyOperation?.(invalidOperation, context);
    expect(onReorder).toHaveBeenCalledTimes(1);
  });
});
