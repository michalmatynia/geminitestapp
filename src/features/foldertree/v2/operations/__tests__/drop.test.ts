import { describe, expect, it, vi } from 'vitest';

import { handleMasterTreeDrop } from '@/features/foldertree/v2/operations/drop';
import type { MasterFolderTreeController } from '@/shared/contracts/master-folder-tree';
import type { MasterTreeNode } from '@/shared/utils/master-folder-tree-contract';

const createNode = (id: string, type: 'folder' | 'file' = 'folder'): MasterTreeNode => ({
  id,
  type,
  kind: type === 'folder' ? 'folder' : 'file',
  parentId: null,
  name: id,
  path: id,
  sortOrder: 0,
});

const createController = (nodes: MasterTreeNode[]) =>
  ({
    nodes,
    dropNodeToRoot: vi.fn(async () => ({ ok: true })),
    reorderNode: vi.fn(async () => ({ ok: true })),
    moveNode: vi.fn(async () => ({ ok: true })),
  }) as unknown as MasterFolderTreeController;

describe('handleMasterTreeDrop', () => {
  it('applies default internal drop when dragged node belongs to current tree', async () => {
    const controller = createController([createNode('folder:a'), createNode('folder:b')]);

    await handleMasterTreeDrop({
      input: {
        draggedNodeId: 'folder:a',
        targetId: 'folder:b',
        position: 'inside',
      },
      controller,
    });

    expect(controller.moveNode).toHaveBeenCalledTimes(1);
    expect(controller.moveNode).toHaveBeenCalledWith('folder:a', 'folder:b');
    expect(controller.reorderNode).not.toHaveBeenCalled();
  });

  it('respects custom internal handler interception', async () => {
    const controller = createController([createNode('folder:a'), createNode('folder:b')]);
    const onInternalDrop = vi.fn(() => true);

    await handleMasterTreeDrop({
      input: {
        draggedNodeId: 'folder:a',
        targetId: 'folder:b',
        position: 'inside',
      },
      controller,
      onInternalDrop,
    });

    expect(onInternalDrop).toHaveBeenCalledTimes(1);
    expect(controller.moveNode).not.toHaveBeenCalled();
    expect(controller.reorderNode).not.toHaveBeenCalled();
    expect(controller.dropNodeToRoot).not.toHaveBeenCalled();
  });

  it('routes external drags to external handler only', async () => {
    const controller = createController([createNode('folder:a'), createNode('folder:b')]);
    const onExternalDrop = vi.fn();

    await handleMasterTreeDrop({
      input: {
        draggedNodeId: 'external:card-1',
        targetId: 'folder:b',
        position: 'inside',
      },
      controller,
      onExternalDrop,
    });

    expect(onExternalDrop).toHaveBeenCalledTimes(1);
    expect(controller.moveNode).not.toHaveBeenCalled();
    expect(controller.reorderNode).not.toHaveBeenCalled();
    expect(controller.dropNodeToRoot).not.toHaveBeenCalled();
  });
});
