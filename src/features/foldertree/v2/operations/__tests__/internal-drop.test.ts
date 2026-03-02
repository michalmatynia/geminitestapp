import { describe, expect, it, vi } from 'vitest';

import {
  applyInternalMasterTreeDrop,
  isInternalMasterTreeNode,
} from '@/features/foldertree/v2/operations/internal-drop';
import type { MasterFolderTreeController } from '@/shared/contracts/master-folder-tree';
import type { MasterTreeNode } from '@/shared/utils/master-folder-tree-contract';

const createController = () =>
  ({
    dropNodeToRoot: vi.fn(async () => ({ ok: true })),
    reorderNode: vi.fn(async () => ({ ok: true })),
    moveNode: vi.fn(async () => ({ ok: true })),
  }) as unknown as MasterFolderTreeController;

const folderNode: MasterTreeNode = {
  id: 'folder:alpha',
  type: 'folder',
  kind: 'folder',
  parentId: null,
  name: 'Alpha',
  path: 'alpha',
  sortOrder: 0,
};

describe('internal-drop', () => {
  it('detects whether dragged node belongs to current master tree', () => {
    expect(isInternalMasterTreeNode([folderNode], 'folder:alpha')).toBe(true);
    expect(isInternalMasterTreeNode([folderNode], 'folder:missing')).toBe(false);
  });

  it('drops node to root top when root drop zone is top', async () => {
    const controller = createController();
    await applyInternalMasterTreeDrop({
      controller,
      draggedNodeId: 'folder:alpha',
      targetId: null,
      position: 'inside',
      rootDropZone: 'top',
    });

    expect(controller.dropNodeToRoot).toHaveBeenCalledWith('folder:alpha', 0);
    expect(controller.reorderNode).not.toHaveBeenCalled();
    expect(controller.moveNode).not.toHaveBeenCalled();
  });

  it('drops node to root end when root drop zone is bottom or omitted', async () => {
    const controller = createController();
    await applyInternalMasterTreeDrop({
      controller,
      draggedNodeId: 'folder:alpha',
      targetId: null,
      position: 'inside',
      rootDropZone: 'bottom',
    });

    expect(controller.dropNodeToRoot).toHaveBeenCalledWith('folder:alpha', undefined);
    expect(controller.reorderNode).not.toHaveBeenCalled();
    expect(controller.moveNode).not.toHaveBeenCalled();
  });

  it('routes before and after drops to reorder handler', async () => {
    const controller = createController();
    await applyInternalMasterTreeDrop({
      controller,
      draggedNodeId: 'folder:alpha',
      targetId: 'folder:beta',
      position: 'before',
    });

    expect(controller.reorderNode).toHaveBeenCalledWith('folder:alpha', 'folder:beta', 'before');
    expect(controller.dropNodeToRoot).not.toHaveBeenCalled();
    expect(controller.moveNode).not.toHaveBeenCalled();
  });

  it('routes inside drops to move handler', async () => {
    const controller = createController();
    await applyInternalMasterTreeDrop({
      controller,
      draggedNodeId: 'folder:alpha',
      targetId: 'folder:beta',
      position: 'inside',
    });

    expect(controller.moveNode).toHaveBeenCalledWith('folder:alpha', 'folder:beta');
    expect(controller.dropNodeToRoot).not.toHaveBeenCalled();
    expect(controller.reorderNode).not.toHaveBeenCalled();
  });
});
