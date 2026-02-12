/**
 * @vitest-environment jsdom
 */
import { fireEvent, render, screen } from '@testing-library/react';
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

const dataTransferStub = () =>
  ({
    effectAllowed: 'move',
    dropEffect: 'move',
    setData: vi.fn(),
    getData: vi.fn(),
    types: [],
  }) as unknown as DataTransfer;

function MasterTreeHarness({
  initialNodes = createNodes(),
  onNodeDrop,
  canDrop,
  resolveDropPosition,
}: {
  initialNodes?: MasterTreeNode[];
  onNodeDrop?: ((payload: { draggedNodeId: string; targetId: string | null; position: 'inside' | 'before' | 'after' }) => Promise<void> | void) | undefined;
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
        resolveDropPosition
          ? (): 'inside' | 'before' | 'after' => resolveDropPosition()
          : undefined
      }
      renderNode={({ node, isSelected, select, depth }): React.JSX.Element => (
        <button
          type='button'
          onClick={select}
          data-testid={`row-${node.id}`}
          data-depth={depth}
        >
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
    fireEvent.dragStart(dragged, { dataTransfer });
    fireEvent.dragOver(target, { dataTransfer, clientY: 40 });
    fireEvent.drop(target, { dataTransfer, clientY: 40 });

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
    fireEvent.dragStart(dragged, { dataTransfer });
    fireEvent.dragOver(target, { dataTransfer });
    fireEvent.drop(target, { dataTransfer });

    expect(onNodeDrop).toHaveBeenCalledWith({
      draggedNodeId: 'folder-b',
      targetId: 'folder-a',
      position: 'before',
    });
  });
});
