import { fireEvent, render, screen } from '@testing-library/react';
import React from 'react';
import { describe, expect, it, vi } from 'vitest';

import { FolderTreeViewportV2 } from '@/shared/lib/foldertree/v2/components/FolderTreeViewportV2';
import { createMasterFolderTreeRuntimeBus } from '@/shared/lib/foldertree/v2/runtime/createMasterFolderTreeRuntimeBus';
import type { MasterFolderTreeController } from '@/shared/contracts/master-folder-tree';
import type { MasterTreeNode } from '@/shared/utils/master-folder-tree-contract';

const nodes: MasterTreeNode[] = [
  {
    id: 'a',
    type: 'file',
    kind: 'file',
    parentId: null,
    name: 'Alpha',
    path: '/alpha',
    sortOrder: 0,
  },
  {
    id: 'b',
    type: 'file',
    kind: 'file',
    parentId: null,
    name: 'Beta',
    path: '/beta',
    sortOrder: 1,
  },
  {
    id: 'c',
    type: 'file',
    kind: 'file',
    parentId: null,
    name: 'Gamma',
    path: '/gamma',
    sortOrder: 2,
  },
];

const createController = ({
  selectedNodeId = null,
  selectedNodeIds = [],
}: {
  selectedNodeId?: string | null;
  selectedNodeIds?: string[];
} = {}): MasterFolderTreeController => {
  const controller = {
    nodes,
    roots: [],
    validationIssues: [],
    selectedNodeId,
    selectedNode: null,
    expandedNodeIds: new Set<string>(),
    renamingNodeId: null,
    renameDraft: '',
    dragState: null,
    canUndo: false,
    undoHistory: [],
    isApplying: false,
    lastError: null,
    canDropNode: vi.fn(() => ({ ok: true })),
    selectNode: vi.fn((nodeId: string | null) => {
      controller.selectedNodeId = nodeId;
    }),
    setExpandedNodeIds: vi.fn(),
    toggleNodeExpanded: vi.fn(),
    expandNode: vi.fn(),
    collapseNode: vi.fn(),
    expandAll: vi.fn(),
    collapseAll: vi.fn(),
    startRename: vi.fn(),
    updateRenameDraft: vi.fn(),
    cancelRename: vi.fn(),
    commitRename: vi.fn(async () => ({ ok: true })),
    startDrag: vi.fn(),
    updateDragTarget: vi.fn(),
    clearDrag: vi.fn(),
    dropDraggedNode: vi.fn(async () => ({ ok: true })),
    moveNode: vi.fn(async () => ({ ok: true })),
    reorderNode: vi.fn(async () => ({ ok: true })),
    dropNodeToRoot: vi.fn(async () => ({ ok: true })),
    replaceNodes: vi.fn(async () => ({ ok: true })),
    refreshFromAdapter: vi.fn(async () => ({ ok: true })),
    undo: vi.fn(async () => ({ ok: true })),
    clearError: vi.fn(),
    selectedNodeIds: new Set<string>(selectedNodeIds),
    setSelectedNodeIds: vi.fn((nodeIds: string[]) => {
      controller.selectedNodeIds = new Set(nodeIds);
    }),
    selectAllNodes: vi.fn(() => {
      controller.selectedNodeIds = new Set(nodes.map((node) => node.id));
    }),
  } as unknown as MasterFolderTreeController;

  return controller;
};

const renderViewport = (
  controller: MasterFolderTreeController,
  multiSelectConfig: {
    enabled: boolean;
    ctrlClick: boolean;
    shiftClick: boolean;
    selectAll: boolean;
  }
) => {
  const runtime = createMasterFolderTreeRuntimeBus({ bindWindowKeydown: false });
  const rendered = render(
    <FolderTreeViewportV2
      controller={controller}
      enableDnd={false}
      runtime={runtime}
      multiSelectConfig={multiSelectConfig}
    />
  );
  return {
    ...rendered,
    disposeRuntime: () => runtime.dispose(),
  };
};

describe('FolderTreeViewportV2 multi-select pointer behavior', () => {
  it('keeps single-select behavior when multi-select is disabled', () => {
    const controller = createController();
    const { disposeRuntime } = renderViewport(controller, {
      enabled: false,
      ctrlClick: true,
      shiftClick: true,
      selectAll: true,
    });

    fireEvent.click(screen.getByRole('button', { name: /Beta/i }));

    expect(controller.setSelectedNodeIds).toHaveBeenLastCalledWith(['b']);
    disposeRuntime();
  });

  it('supports ctrl/cmd toggle when enabled', () => {
    const controller = createController({ selectedNodeId: 'a', selectedNodeIds: ['a'] });
    const { disposeRuntime } = renderViewport(controller, {
      enabled: true,
      ctrlClick: true,
      shiftClick: true,
      selectAll: true,
    });

    fireEvent.click(screen.getByRole('button', { name: /Beta/i }), { ctrlKey: true });
    expect(controller.setSelectedNodeIds).toHaveBeenLastCalledWith(['a', 'b']);

    fireEvent.click(screen.getByRole('button', { name: /Alpha/i }), { metaKey: true });
    expect(controller.setSelectedNodeIds).toHaveBeenLastCalledWith(['b']);
    disposeRuntime();
  });

  it('supports shift range selection when enabled', () => {
    const controller = createController();
    const { disposeRuntime } = renderViewport(controller, {
      enabled: true,
      ctrlClick: true,
      shiftClick: true,
      selectAll: true,
    });

    fireEvent.click(screen.getByRole('button', { name: /Alpha/i }));
    fireEvent.click(screen.getByRole('button', { name: /Gamma/i }), { shiftKey: true });

    expect(controller.setSelectedNodeIds).toHaveBeenLastCalledWith(['a', 'b', 'c']);
    disposeRuntime();
  });

  it('blocks ctrl toggle when ctrlClick flag is disabled', () => {
    const controller = createController({ selectedNodeId: 'a', selectedNodeIds: ['a'] });
    const { disposeRuntime } = renderViewport(controller, {
      enabled: true,
      ctrlClick: false,
      shiftClick: true,
      selectAll: true,
    });

    fireEvent.click(screen.getByRole('button', { name: /Beta/i }), { ctrlKey: true });
    expect(controller.setSelectedNodeIds).toHaveBeenLastCalledWith(['b']);
    disposeRuntime();
  });

  it('blocks shift range when shiftClick flag is disabled', () => {
    const controller = createController();
    const { disposeRuntime } = renderViewport(controller, {
      enabled: true,
      ctrlClick: true,
      shiftClick: false,
      selectAll: true,
    });

    fireEvent.click(screen.getByRole('button', { name: /Alpha/i }));
    fireEvent.click(screen.getByRole('button', { name: /Gamma/i }), { shiftKey: true });

    expect(controller.setSelectedNodeIds).toHaveBeenLastCalledWith(['c']);
    disposeRuntime();
  });
});
