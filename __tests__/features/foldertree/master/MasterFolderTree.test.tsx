/**
 * @vitest-environment jsdom
 */
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import React from 'react';
import { describe, expect, it, vi } from 'vitest';

import { MasterFolderTree } from '@/features/foldertree/master/MasterFolderTree';
import { useMasterFolderTree } from '@/features/foldertree/master/useMasterFolderTree';
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
    id: 'file-1',
    type: 'file',
    kind: 'note',
    parentId: 'folder-root',
    name: 'Note 1',
    path: 'Note 1',
    sortOrder: 0,
  },
];

const createReorderNodes = (): MasterTreeNode[] => [
  {
    id: 'folder-a',
    type: 'folder',
    kind: 'folder',
    parentId: null,
    name: 'A',
    path: 'A',
    sortOrder: 0,
  },
  {
    id: 'folder-b',
    type: 'folder',
    kind: 'folder',
    parentId: null,
    name: 'B',
    path: 'B',
    sortOrder: 1,
  },
];

const dataTransferStub = () => {
  const store: Record<string, string> = {};
  return {
    effectAllowed: 'move',
    dropEffect: 'move',
    setData: vi.fn((key, val) => {
      store[key] = val;
    }),
    getData: vi.fn((key) => store[key] || ''),
    types: [],
  } as unknown as DataTransfer;
};

const flushDragLifecycle = async (): Promise<void> => {
  await Promise.resolve();
  await new Promise<void>((resolve) => {
    window.setTimeout(() => resolve(), 0);
  });
  await Promise.resolve();
};

function MasterTreeHarness({
  initialNodes = createNodes(),
  onNodeDrop,
  canDrop,
  resolveDropPosition,
}: {
  initialNodes?: MasterTreeNode[];
  onNodeDrop?:
    | ((payload: {
        draggedNodeId: string;
        targetId: string | null;
        position: 'inside' | 'before' | 'after';
        rootDropZone?: 'top' | 'bottom' | undefined;
      }) => Promise<void> | void)
    | undefined;
  canDrop?: (() => boolean) | undefined;
  resolveDropPosition?: (() => 'inside' | 'before' | 'after') | undefined;
}): React.JSX.Element {
  const controller = useMasterFolderTree({
    initialNodes,
    initiallyExpandedNodeIds: ['folder-root'],
  });

  return (
    <MasterFolderTree
      controller={controller}
      onNodeDrop={
        onNodeDrop
          ? async (payload): Promise<void> => {
            await onNodeDrop(payload);
          }
          : undefined
      }
      canDrop={canDrop ? (): boolean => canDrop() : undefined}
      resolveDropPosition={
        resolveDropPosition ? (): 'inside' | 'before' | 'after' => resolveDropPosition() : undefined
      }
      renderNode={({ node, isSelected, select, depth }): React.JSX.Element => (
        <button type='button' onClick={select} data-testid={`row-${node.id}`} data-depth={depth}>
          {isSelected ? '*' : ''}
          {node.name}
        </button>
      )}
    />
  );
}

describe('MasterFolderTree', () => {
  it('renders empty state when no roots exist', () => {
    render(<MasterTreeHarness initialNodes={[]} />);
    expect(screen.getByText('No items')).toBeInTheDocument();
  });

  it('renders nodes and updates selection using custom node renderer', () => {
    render(<MasterTreeHarness />);

    const noteRow = screen.getByTestId('row-file-1');
    expect(noteRow).toHaveTextContent('Note 1');
    expect(noteRow).not.toHaveTextContent('*Note 1');

    fireEvent.click(noteRow);
    expect(screen.getByTestId('row-file-1')).toHaveTextContent('*Note 1');
  });

  it('emits onNodeDrop callback with dragged and target identifiers', async () => {
    const onNodeDrop = vi.fn();
    render(<MasterTreeHarness onNodeDrop={onNodeDrop} />);

    const dragged = document.querySelector('[data-master-tree-node-id="file-1"]');
    const target = document.querySelector('[data-master-tree-node-id="folder-root"]');
    expect(dragged).toBeTruthy();
    expect(target).toBeTruthy();
    if (!dragged || !target) return;

    const dataTransfer = dataTransferStub();
    await act(async () => {
      fireEvent.dragStart(dragged, { dataTransfer });
      fireEvent.dragOver(target, { dataTransfer, clientY: 40 });
      fireEvent.drop(target, { dataTransfer, clientY: 40 });
      await flushDragLifecycle();
    });

    expect(onNodeDrop).toHaveBeenCalledWith({
      draggedNodeId: 'file-1',
      targetId: 'folder-root',
      position: 'inside',
    });
  });

  it('emits before position when dropping near the top edge of a row', async () => {
    const onNodeDrop = vi.fn();
    render(
      <MasterTreeHarness
        initialNodes={createReorderNodes()}
        onNodeDrop={onNodeDrop}
        canDrop={() => true}
        resolveDropPosition={() => 'before'}
      />
    );

    const dragged = document.querySelector('[data-master-tree-node-id="folder-b"]');
    const target = document.querySelector('[data-master-tree-node-id="folder-a"]');
    expect(dragged).toBeTruthy();
    expect(target).toBeTruthy();
    if (!dragged || !target) return;

    const dataTransfer = dataTransferStub();
    await act(async () => {
      fireEvent.dragStart(dragged, { dataTransfer });
      fireEvent.dragOver(target, { dataTransfer });
      fireEvent.drop(target, { dataTransfer });
      await flushDragLifecycle();
    });

    expect(onNodeDrop).toHaveBeenCalledWith({
      draggedNodeId: 'folder-b',
      targetId: 'folder-a',
      position: 'before',
    });
  });

  it('emits root drop payload when dropping on the top root zone', async () => {
    const onNodeDrop = vi.fn();
    render(<MasterTreeHarness onNodeDrop={onNodeDrop} />);

    const dragged = document.querySelector('[data-master-tree-node-id="file-1"]');
    expect(dragged).toBeTruthy();
    if (!dragged) return;

    const dataTransfer = dataTransferStub();
    await act(async () => {
      fireEvent.dragStart(dragged, { dataTransfer });
      await flushDragLifecycle();
    });

    await waitFor(() => {
      const topRootDropZone = document.querySelector('[data-master-tree-root-drop="top"]');
      expect(topRootDropZone).toBeTruthy();
    });

    const topRootDropZone = document.querySelector('[data-master-tree-root-drop="top"]');
    if (!topRootDropZone) return;

    await act(async () => {
      fireEvent.dragOver(topRootDropZone, { dataTransfer });
      fireEvent.drop(topRootDropZone, { dataTransfer });
      await flushDragLifecycle();
    });

    expect(onNodeDrop).toHaveBeenCalledWith({
      draggedNodeId: 'file-1',
      targetId: null,
      position: 'inside',
      rootDropZone: 'top',
    });
  });
});
