import { describe, expect, it, vi } from 'vitest';

import type { ImageStudioSlotRecord } from '@/features/ai/image-studio/types';
import {
  toFolderMasterNodeId,
  toSlotMasterNodeId,
} from '@/features/ai/image-studio/utils/master-folder-tree';
import { createImageStudioMasterTreeAdapter } from '@/features/ai/image-studio/utils/studio-master-tree-adapter';
import type { MasterFolderTreePersistContext } from '@/shared/contracts/master-folder-tree';
import type { MasterTreeNode } from '@/shared/utils/master-folder-tree-contract';

const folderNode = (
  folderPath: string,
  parentId: string | null,
  sortOrder: number
): MasterTreeNode => ({
  id: toFolderMasterNodeId(folderPath),
  type: 'folder',
  kind: 'folder',
  parentId,
  name: folderPath,
  path: folderPath,
  sortOrder,
});

const createContext = (
  previousNodes: MasterTreeNode[],
  nextNodes: MasterTreeNode[]
): MasterFolderTreePersistContext => ({
  previousNodes,
  nextNodes,
});

const createSlot = (id: string, folderPath: string | null): ImageStudioSlotRecord => ({
  id,
  projectId: 'project-1',
  name: `slot-${id}`,
  folderPath,
});

describe('createImageStudioMasterTreeAdapter', () => {
  it('moves card nodes using resolved folder path', async () => {
    const slot = createSlot('slot-1', null);
    const moveSlot = vi.fn(async () => undefined);
    const moveFolder = vi.fn(async () => undefined);
    const renameFolder = vi.fn(async () => undefined);
    const renameSlot = vi.fn(async () => undefined);
    const adapter = createImageStudioMasterTreeAdapter({
      slotById: new Map([[slot.id, slot]]),
      moveSlot,
      moveFolder,
      renameFolder,
      renameSlot,
    });

    await adapter.applyOperation?.(
      {
        type: 'move',
        nodeId: toSlotMasterNodeId(slot.id),
        targetParentId: toFolderMasterNodeId('assets'),
        targetIndex: 0,
      },
      createContext([], [])
    );

    expect(moveSlot).toHaveBeenCalledTimes(1);
    expect(moveSlot).toHaveBeenCalledWith({
      slot,
      targetFolder: 'assets',
    });
    expect(moveFolder).not.toHaveBeenCalled();
  });

  it('reorders folder nodes using target parent from previous nodes', async () => {
    const moveSlot = vi.fn(async () => undefined);
    const moveFolder = vi.fn(async () => undefined);
    const renameFolder = vi.fn(async () => undefined);
    const renameSlot = vi.fn(async () => undefined);
    const adapter = createImageStudioMasterTreeAdapter({
      slotById: new Map(),
      moveSlot,
      moveFolder,
      renameFolder,
      renameSlot,
    });
    const parentNodeId = toFolderMasterNodeId('workspace');
    const previousNodes: MasterTreeNode[] = [
      folderNode('workspace', null, 0),
      folderNode('workspace/target', parentNodeId, 0),
      folderNode('assets', null, 1),
    ];

    await adapter.applyOperation?.(
      {
        type: 'reorder',
        nodeId: toFolderMasterNodeId('assets'),
        targetId: toFolderMasterNodeId('workspace/target'),
        position: 'after',
      },
      createContext(previousNodes, previousNodes)
    );

    expect(moveFolder).toHaveBeenCalledTimes(1);
    expect(moveFolder).toHaveBeenCalledWith('assets', 'workspace');
  });

  it('renames card nodes with normalized name values', async () => {
    const moveSlot = vi.fn(async () => undefined);
    const moveFolder = vi.fn(async () => undefined);
    const renameFolder = vi.fn(async () => undefined);
    const renameSlot = vi.fn(async () => undefined);
    const adapter = createImageStudioMasterTreeAdapter({
      slotById: new Map(),
      moveSlot,
      moveFolder,
      renameFolder,
      renameSlot,
    });

    await adapter.applyOperation?.(
      {
        type: 'rename',
        nodeId: toSlotMasterNodeId('slot-2'),
        name: '  Fresh/Name  ',
      },
      createContext([], [])
    );

    expect(renameSlot).toHaveBeenCalledTimes(1);
    expect(renameSlot).toHaveBeenCalledWith({
      id: 'slot-2',
      data: { name: 'Fresh Name' },
    });
    expect(renameFolder).not.toHaveBeenCalled();
  });
});
