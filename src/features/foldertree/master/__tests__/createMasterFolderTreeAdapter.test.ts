import { describe, expect, it, vi } from 'vitest';

import { createMasterFolderTreeAdapter } from '@/features/foldertree/master/createMasterFolderTreeAdapter';
import type {
  MasterFolderTreePersistContext,
  MasterFolderTreePersistOperation,
} from '@/shared/contracts/master-folder-tree';
import type { MasterTreeNode } from '@/shared/utils/master-folder-tree-contract';

type DecodedNode =
  | { entity: 'folder'; id: string; nodeId: string }
  | { entity: 'file'; id: string; nodeId: string };

const decodeNodeId = (nodeId: string): DecodedNode | null => {
  if (nodeId.startsWith('folder:')) {
    return { entity: 'folder', id: nodeId.slice('folder:'.length), nodeId };
  }
  if (nodeId.startsWith('file:')) {
    return { entity: 'file', id: nodeId.slice('file:'.length), nodeId };
  }
  return null;
};

const context: MasterFolderTreePersistContext = {
  previousNodes: [],
  nextNodes: [],
};

describe('createMasterFolderTreeAdapter', () => {
  it('delegates move operations with decoded source and target parent', async () => {
    const onMove = vi.fn();
    const adapter = createMasterFolderTreeAdapter({
      decodeNodeId,
      handlers: { onMove },
    });

    const operation: Extract<MasterFolderTreePersistOperation, { type: 'move' }> = {
      type: 'move',
      nodeId: 'file:note-1',
      targetParentId: 'folder:work',
      targetIndex: 2,
    };

    await adapter.applyOperation?.(operation, context);

    expect(onMove).toHaveBeenCalledTimes(1);
    expect(onMove).toHaveBeenCalledWith({
      operation,
      context,
      node: { entity: 'file', id: 'note-1', nodeId: 'file:note-1' },
      targetParent: { entity: 'folder', id: 'work', nodeId: 'folder:work' },
    });
  });

  it('skips rename handler when normalized name is empty', async () => {
    const onRename = vi.fn();
    const adapter = createMasterFolderTreeAdapter({
      decodeNodeId,
      handlers: { onRename },
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
    const adapter = createMasterFolderTreeAdapter({
      decodeNodeId,
      handlers: { onReorder },
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

  it('passes through loadNodes when provided', async () => {
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
    const loadNodes = vi.fn(async (): Promise<MasterTreeNode[]> => nodes);
    const adapter = createMasterFolderTreeAdapter({
      decodeNodeId,
      loadNodes,
    });

    const loaded = await adapter.loadNodes?.();

    expect(loadNodes).toHaveBeenCalledTimes(1);
    expect(loaded).toEqual(nodes);
  });
});
