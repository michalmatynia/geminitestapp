import { render, waitFor } from '@testing-library/react';
import React, { useEffect } from 'react';
import { describe, expect, it, vi } from 'vitest';

import { FolderTreeViewportV2 } from '@/features/foldertree/v2/components/FolderTreeViewportV2';
import {
  MasterFolderTreeRuntimeProvider,
  useMasterFolderTreeRuntime,
} from '@/features/foldertree/v2/runtime/MasterFolderTreeRuntimeProvider';
import type { MasterFolderTreeController } from '@/shared/contracts/master-folder-tree';
import type { MasterTreeNode } from '@/shared/utils/master-folder-tree-contract';

const nodes: MasterTreeNode[] = [
  {
    id: 'root',
    type: 'folder',
    kind: 'folder',
    parentId: null,
    name: 'Root',
    path: '/root',
    sortOrder: 0,
  },
];

const createController = (): MasterFolderTreeController =>
  ({
    nodes,
    roots: [],
    validationIssues: [],
    selectedNodeId: null,
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
    selectNode: vi.fn(),
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
    setSelectedNodeIds: vi.fn(),
  }) as unknown as MasterFolderTreeController;

describe('FolderTreeViewportV2 runtime metrics', () => {
  it('records row rerender metrics through the runtime bus', async () => {
    let runtimeRef: ReturnType<typeof useMasterFolderTreeRuntime> | null = null;

    const RuntimeProbe = () => {
      const runtime = useMasterFolderTreeRuntime();
      useEffect(() => {
        runtimeRef = runtime;
      }, [runtime]);
      return null;
    };

    const controller = createController();

    render(
      <MasterFolderTreeRuntimeProvider>
        <RuntimeProbe />
        <FolderTreeViewportV2 controller={controller} enableDnd={false} />
      </MasterFolderTreeRuntimeProvider>
    );

    await waitFor(() => {
      expect(runtimeRef?.getMetricsSnapshot()['row_rerender'] ?? 0).toBeGreaterThanOrEqual(1);
    });
  });
});
