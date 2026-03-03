import { describe, expect, it, vi } from 'vitest';

import {
  toFolderMasterNodeId,
  toNoteMasterNodeId,
} from '@/features/notesapp/utils/master-folder-tree';
import {
  createNotesMasterTreeAdapter,
  resolveNotesFolderTargetForNode,
} from '@/features/notesapp/utils/notes-master-tree-adapter';
import type { MasterFolderTreePersistContext } from '@/shared/contracts/master-folder-tree';
import type { MasterTreeNode } from '@/shared/utils/master-folder-tree-contract';

const folderNode = (id: string, parentId: string | null, sortOrder: number): MasterTreeNode => ({
  id: toFolderMasterNodeId(id),
  type: 'folder',
  kind: 'folder',
  parentId,
  name: id,
  path: id,
  sortOrder,
});

const noteNode = (id: string, parentId: string, sortOrder: number): MasterTreeNode => ({
  id: toNoteMasterNodeId(id),
  type: 'file',
  kind: 'note',
  parentId,
  name: id,
  path: id,
  sortOrder,
});

const createContext = (
  previousNodes: MasterTreeNode[],
  nextNodes: MasterTreeNode[]
): MasterFolderTreePersistContext => ({
  previousNodes,
  nextNodes,
});

const applyOperation = async (
  adapter: ReturnType<typeof createNotesMasterTreeAdapter>,
  operation: Parameters<typeof createContext>[0] extends never
    ? never
    : {
        type: 'move' | 'reorder' | 'rename';
        [key: string]: unknown;
      },
  context: MasterFolderTreePersistContext
): Promise<void> => {
  const tx = {
    id: `tx_${Date.now()}`,
    version: 1,
    createdAt: Date.now(),
    operation,
    previousNodes: context.previousNodes,
    nextNodes: context.nextNodes,
  };
  await adapter.apply(tx, await adapter.prepare(tx));
};

describe('resolveNotesFolderTargetForNode', () => {
  it('resolves folder ancestors for note nodes', () => {
    const workFolderNodeId = toFolderMasterNodeId('work');
    const nodes: MasterTreeNode[] = [
      folderNode('work', null, 0),
      noteNode('todo', workFolderNodeId, 0),
    ];

    expect(resolveNotesFolderTargetForNode(nodes, toNoteMasterNodeId('todo'))).toBe('work');
    expect(resolveNotesFolderTargetForNode(nodes, workFolderNodeId)).toBe('work');
    expect(resolveNotesFolderTargetForNode(nodes, null)).toBeNull();
  });
});

describe('createNotesMasterTreeAdapter', () => {
  it('moves notes to target folder on move operations', async () => {
    const operations = {
      handleMoveNoteToFolder: vi.fn(async () => undefined),
      handleMoveFolderToFolder: vi.fn(async () => undefined),
      handleReorderFolder: vi.fn(async () => undefined),
      handleRenameNote: vi.fn(async () => undefined),
      handleRenameFolder: vi.fn(async () => undefined),
    };
    const adapter = createNotesMasterTreeAdapter(operations);

    await applyOperation(
      adapter,
      {
        type: 'move',
        nodeId: toNoteMasterNodeId('note-1'),
        targetParentId: toFolderMasterNodeId('work'),
        targetIndex: 0,
      },
      createContext([], [])
    );

    expect(operations.handleMoveNoteToFolder).toHaveBeenCalledTimes(1);
    expect(operations.handleMoveNoteToFolder).toHaveBeenCalledWith('note-1', 'work');
  });

  it('converts root-top folder moves into reorder-before operations', async () => {
    const operations = {
      handleMoveNoteToFolder: vi.fn(async () => undefined),
      handleMoveFolderToFolder: vi.fn(async () => undefined),
      handleReorderFolder: vi.fn(async () => undefined),
      handleRenameNote: vi.fn(async () => undefined),
      handleRenameFolder: vi.fn(async () => undefined),
    };
    const adapter = createNotesMasterTreeAdapter(operations);
    const nextNodes: MasterTreeNode[] = [folderNode('alpha', null, 0), folderNode('beta', null, 1)];

    await applyOperation(
      adapter,
      {
        type: 'move',
        nodeId: toFolderMasterNodeId('beta'),
        targetParentId: null,
        targetIndex: 0,
      },
      createContext(nextNodes, nextNodes)
    );

    expect(operations.handleReorderFolder).toHaveBeenCalledTimes(1);
    expect(operations.handleReorderFolder).toHaveBeenCalledWith('beta', 'alpha', 'before');
    expect(operations.handleMoveFolderToFolder).not.toHaveBeenCalled();
  });

  it('reorders folders and routes note reorder via target folder', async () => {
    const operations = {
      handleMoveNoteToFolder: vi.fn(async () => undefined),
      handleMoveFolderToFolder: vi.fn(async () => undefined),
      handleReorderFolder: vi.fn(async () => undefined),
      handleRenameNote: vi.fn(async () => undefined),
      handleRenameFolder: vi.fn(async () => undefined),
    };
    const adapter = createNotesMasterTreeAdapter(operations);
    const workFolderNodeId = toFolderMasterNodeId('work');
    const nextNodes: MasterTreeNode[] = [
      folderNode('work', null, 0),
      folderNode('archive', null, 1),
      noteNode('target-note', workFolderNodeId, 0),
    ];

    await applyOperation(
      adapter,
      {
        type: 'reorder',
        nodeId: toFolderMasterNodeId('archive'),
        targetId: toFolderMasterNodeId('work'),
        position: 'before',
      },
      createContext(nextNodes, nextNodes)
    );

    await applyOperation(
      adapter,
      {
        type: 'reorder',
        nodeId: toNoteMasterNodeId('moving-note'),
        targetId: toNoteMasterNodeId('target-note'),
        position: 'after',
      },
      createContext(nextNodes, nextNodes)
    );

    expect(operations.handleReorderFolder).toHaveBeenCalledTimes(1);
    expect(operations.handleReorderFolder).toHaveBeenCalledWith('archive', 'work', 'before');
    expect(operations.handleMoveNoteToFolder).toHaveBeenCalledWith('moving-note', 'work');
  });

  it('dispatches rename operations by entity type', async () => {
    const operations = {
      handleMoveNoteToFolder: vi.fn(async () => undefined),
      handleMoveFolderToFolder: vi.fn(async () => undefined),
      handleReorderFolder: vi.fn(async () => undefined),
      handleRenameNote: vi.fn(async () => undefined),
      handleRenameFolder: vi.fn(async () => undefined),
    };
    const adapter = createNotesMasterTreeAdapter(operations);

    await applyOperation(
      adapter,
      {
        type: 'rename',
        nodeId: toNoteMasterNodeId('note-1'),
        name: 'Renamed note',
      },
      createContext([], [])
    );

    await applyOperation(
      adapter,
      {
        type: 'rename',
        nodeId: toFolderMasterNodeId('work'),
        name: 'Renamed folder',
      },
      createContext([], [])
    );

    expect(operations.handleRenameNote).toHaveBeenCalledWith('note-1', 'Renamed note');
    expect(operations.handleRenameFolder).toHaveBeenCalledWith('work', 'Renamed folder');
  });
});
