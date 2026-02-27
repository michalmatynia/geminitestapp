/**
 * @vitest-environment jsdom
 */
import { act, renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { useMasterFolderTree } from '@/shared/lib/foldertree/master/useMasterFolderTree';
import type { MasterTreeNode } from '@/shared/utils/master-folder-tree-contract';

const createNodes = (): MasterTreeNode[] => [
  {
    id: 'folder-root',
    type: 'folder',
    kind: 'folder',
    parentId: null,
    name: 'Root',
    path: 'Root',
    sortOrder: 0,
  },
  {
    id: 'folder-a',
    type: 'folder',
    kind: 'folder',
    parentId: 'folder-root',
    name: 'Folder A',
    path: 'Folder A',
    sortOrder: 0,
  },
  {
    id: 'file-1',
    type: 'file',
    kind: 'note',
    parentId: 'folder-a',
    name: 'Note 1',
    path: 'Note 1',
    sortOrder: 0,
  },
];

const createRootDropNodes = (): MasterTreeNode[] => [
  {
    id: 'folder-a',
    type: 'folder',
    kind: 'folder',
    parentId: null,
    name: 'Folder A',
    path: 'Folder A',
    sortOrder: 0,
  },
  {
    id: 'folder-b',
    type: 'folder',
    kind: 'folder',
    parentId: null,
    name: 'Folder B',
    path: 'Folder B',
    sortOrder: 1,
  },
  {
    id: 'file-1',
    type: 'file',
    kind: 'note',
    parentId: 'folder-b',
    name: 'Note 1',
    path: 'Note 1',
    sortOrder: 0,
  },
];

describe('useMasterFolderTree', () => {
  it('initializes nodes and tree view state', () => {
    const { result } = renderHook(() =>
      useMasterFolderTree({
        initialNodes: createNodes(),
        initialSelectedNodeId: 'file-1',
        initiallyExpandedNodeIds: ['folder-root', 'folder-a'],
      })
    );

    expect(result.current.roots.map((node) => node.id)).toEqual(['folder-root']);
    expect(result.current.selectedNodeId).toBe('file-1');
    expect(result.current.expandedNodeIds.has('folder-a')).toBe(true);
    expect(result.current.validationIssues).toEqual([]);
  });

  it('moves and renames nodes optimistically', async () => {
    const { result } = renderHook(() =>
      useMasterFolderTree({
        initialNodes: createNodes(),
      })
    );

    await act(async () => {
      const moveResult = await result.current.moveNode('file-1', null);
      expect(moveResult.ok).toBe(true);
    });

    expect(result.current.nodes.find((node) => node.id === 'file-1')?.parentId).toBeNull();
    expect(result.current.canUndo).toBe(true);

    act(() => {
      result.current.startRename('file-1');
      result.current.updateRenameDraft('Renamed Note');
    });

    await act(async () => {
      const renameResult = await result.current.commitRename();
      expect(renameResult.ok).toBe(true);
    });

    expect(result.current.nodes.find((node) => node.id === 'file-1')?.name).toBe('Renamed Note');
  });

  it('rolls back optimistic update when adapter persistence fails', async () => {
    const adapter = {
      applyOperation: vi.fn(async (operation: { type: string }) => {
        if (operation.type === 'move') {
          throw new Error('Move failed');
        }
      }),
    };

    const { result } = renderHook(() =>
      useMasterFolderTree({
        initialNodes: createNodes(),
        adapter,
      })
    );

    await act(async () => {
      const moveResult = await result.current.moveNode('file-1', null);
      expect(moveResult.ok).toBe(false);
    });

    expect(result.current.nodes.find((node) => node.id === 'file-1')?.parentId).toBe('folder-a');
    expect(result.current.lastError?.code).toBe('PERSIST_FAILED');
  });

  it('supports undo after optimistic operations', async () => {
    const { result } = renderHook(() =>
      useMasterFolderTree({
        initialNodes: createNodes(),
      })
    );

    await act(async () => {
      await result.current.moveNode('file-1', null);
    });

    expect(result.current.nodes.find((node) => node.id === 'file-1')?.parentId).toBeNull();

    await act(async () => {
      const undoResult = await result.current.undo();
      expect(undoResult.ok).toBe(true);
    });

    expect(result.current.nodes.find((node) => node.id === 'file-1')?.parentId).toBe('folder-a');
  });

  it('allows external expanded node synchronization', () => {
    const { result } = renderHook(() =>
      useMasterFolderTree({
        initialNodes: createNodes(),
      })
    );

    act(() => {
      result.current.setExpandedNodeIds(['folder-root', 'folder-a']);
    });

    expect(result.current.expandedNodeIds.has('folder-root')).toBe(true);
    expect(result.current.expandedNodeIds.has('folder-a')).toBe(true);

    act(() => {
      result.current.setExpandedNodeIds(['folder-a']);
    });

    expect(result.current.expandedNodeIds.has('folder-root')).toBe(false);
    expect(result.current.expandedNodeIds.has('folder-a')).toBe(true);
  });

  it('drops nested nodes to root at a specific index', async () => {
    const { result } = renderHook(() =>
      useMasterFolderTree({
        initialNodes: createRootDropNodes(),
      })
    );

    await act(async () => {
      const dropResult = await result.current.dropNodeToRoot('file-1', 0);
      expect(dropResult.ok).toBe(true);
    });

    expect(result.current.nodes.find((node) => node.id === 'file-1')?.parentId).toBeNull();
    expect(result.current.roots.map((node) => node.id)[0]).toBe('file-1');
  });

  it('exposes drag state transitions and drop action', async () => {
    const { result } = renderHook(() =>
      useMasterFolderTree({
        initialNodes: createNodes(),
      })
    );

    act(() => {
      result.current.startDrag('file-1');
      result.current.updateDragTarget(null, 'inside');
    });

    expect(result.current.dragState?.draggedNodeId).toBe('file-1');
    expect(result.current.dragState?.targetId).toBeNull();

    await act(async () => {
      const dropResult = await result.current.dropDraggedNode(null, 'inside');
      expect(dropResult.ok).toBe(true);
    });

    expect(result.current.dragState).toBeNull();
    expect(result.current.nodes.find((node) => node.id === 'file-1')?.parentId).toBeNull();
  });
});
