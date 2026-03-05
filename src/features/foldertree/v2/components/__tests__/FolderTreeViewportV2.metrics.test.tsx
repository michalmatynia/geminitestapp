import { render, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { FolderTreeViewportV2 } from '@/features/foldertree/v2/components/FolderTreeViewportV2';
import { createMasterFolderTreeRuntimeBus } from '@/features/foldertree/v2/runtime/createMasterFolderTreeRuntimeBus';
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

const createController = (
  overrides?: Partial<MasterFolderTreeController>
): MasterFolderTreeController =>
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
    ...overrides,
  }) as unknown as MasterFolderTreeController;

const runtimes: Array<ReturnType<typeof createMasterFolderTreeRuntimeBus>> = [];
const createTestRuntime = () => {
  const runtime = createMasterFolderTreeRuntimeBus({ bindWindowKeydown: false });
  runtimes.push(runtime);
  return runtime;
};

describe('FolderTreeViewportV2 runtime metrics', () => {
  afterEach(() => {
    while (runtimes.length > 0) {
      runtimes.pop()?.dispose();
    }
  });

  it('records row rerender metrics through the runtime bus', async () => {
    const runtime = createTestRuntime();
    const controller = createController();

    render(
      <FolderTreeViewportV2 controller={controller} enableDnd={false} runtime={runtime} />
    );

    await waitFor(() => {
      expect(runtime.getMetricsSnapshot()['row_rerender'] ?? 0).toBeGreaterThanOrEqual(1);
    });
  });

  it('records frame budget misses when drag frames exceed the budget threshold', async () => {
    const runtime = createTestRuntime();
    const rafQueue = new Map<number, FrameRequestCallback>();
    let rafCounter = 0;

    const nowSpy = vi.spyOn(performance, 'now').mockReturnValue(0);
    const rafSpy = vi.spyOn(window, 'requestAnimationFrame').mockImplementation((callback) => {
      const id = ++rafCounter;
      rafQueue.set(id, callback);
      return id;
    });
    const cancelSpy = vi.spyOn(window, 'cancelAnimationFrame').mockImplementation((id: number) => {
      rafQueue.delete(id);
    });

    try {
      const controller = createController({
        dragState: {
          draggedNodeId: 'root',
          targetId: null,
          position: 'inside',
        },
      });

      render(<FolderTreeViewportV2 controller={controller} enableDnd={false} runtime={runtime} />);

      await waitFor(() => {
        expect(rafQueue.size).toBeGreaterThanOrEqual(1);
      });

      const firstFrame = rafQueue.values().next().value as FrameRequestCallback;
      firstFrame(25);

      await waitFor(() => {
        expect(runtime.getMetricsSnapshot()['frame_budget_miss'] ?? 0).toBeGreaterThanOrEqual(1);
      });
    } finally {
      cancelSpy.mockRestore();
      rafSpy.mockRestore();
      nowSpy.mockRestore();
    }
  });
});
