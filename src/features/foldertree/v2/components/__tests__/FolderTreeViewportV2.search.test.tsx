import { render, screen } from '@testing-library/react';
import React from 'react';
import { describe, expect, it, vi } from 'vitest';

import { FolderTreeViewportV2 } from '@/features/foldertree/v2/components/FolderTreeViewportV2';
import { createMasterFolderTreeRuntimeBus } from '@/features/foldertree/v2/runtime/createMasterFolderTreeRuntimeBus';
import type { MasterFolderTreeSearchState } from '@/features/foldertree/v2/search';
import type { MasterFolderTreeController } from '@/shared/contracts/master-folder-tree';
import type { MasterTreeNode } from '@/shared/utils/master-folder-tree-contract';

const createController = ({
  nodes,
  expandedNodeIds,
}: {
  nodes: MasterTreeNode[];
  expandedNodeIds: string[];
}): MasterFolderTreeController => {
  const controller = {
    nodes,
    roots: [],
    validationIssues: [],
    selectedNodeId: null,
    selectedNode: null,
    expandedNodeIds: new Set(expandedNodeIds),
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
  } as unknown as MasterFolderTreeController;

  return controller;
};

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
  {
    id: 'folder-a',
    type: 'folder',
    kind: 'folder',
    parentId: 'root',
    name: 'Alpha',
    path: '/root/alpha',
    sortOrder: 0,
  },
  {
    id: 'file-match',
    type: 'file',
    kind: 'file',
    parentId: 'folder-a',
    name: 'Document Match',
    path: '/root/alpha/document-match',
    sortOrder: 0,
  },
  {
    id: 'file-other',
    type: 'file',
    kind: 'file',
    parentId: 'root',
    name: 'Outside Node',
    path: '/root/outside-node',
    sortOrder: 1,
  },
];

const buildSearchState = (
  overrides: Partial<MasterFolderTreeSearchState>
): MasterFolderTreeSearchState => ({
  query: 'match',
  effectiveQuery: 'match',
  isActive: true,
  config: {
    enabled: true,
    debounceMs: 0,
    filterMode: 'highlight',
    matchFields: ['name'],
    minQueryLength: 1,
  },
  matchNodeIds: new Set<string>(['file-match']),
  results: [],
  filteredNodes: nodes,
  filteredExpandedNodeIds: ['root', 'folder-a'],
  ...overrides,
});

describe('FolderTreeViewportV2 search rendering', () => {
  it('keeps full tree visible in highlight mode and marks matching rows', () => {
    const runtime = createMasterFolderTreeRuntimeBus({ bindWindowKeydown: false });
    const controller = createController({
      nodes,
      expandedNodeIds: ['root', 'folder-a'],
    });

    render(
      <FolderTreeViewportV2
        controller={controller}
        enableDnd={false}
        runtime={runtime}
        searchState={buildSearchState({
          config: {
            enabled: true,
            debounceMs: 0,
            filterMode: 'highlight',
            matchFields: ['name'],
            minQueryLength: 1,
          },
        })}
      />
    );

    expect(screen.getByText('Root')).toBeInTheDocument();
    expect(screen.getByText('Alpha')).toBeInTheDocument();
    expect(screen.getByText('Document Match')).toBeInTheDocument();
    expect(screen.getByText('Outside Node')).toBeInTheDocument();

    const matchButton = screen.getByRole('button', { name: /Document Match/i });
    expect(matchButton.className).toContain('ring-blue-500/30');
    runtime.dispose();
  });

  it('shows only matched branches and ancestors in filter_tree mode', () => {
    const runtime = createMasterFolderTreeRuntimeBus({ bindWindowKeydown: false });
    const controller = createController({
      nodes,
      expandedNodeIds: ['root', 'folder-a'],
    });

    render(
      <FolderTreeViewportV2
        controller={controller}
        enableDnd={false}
        runtime={runtime}
        searchState={buildSearchState({
          config: {
            enabled: true,
            debounceMs: 0,
            filterMode: 'filter_tree',
            matchFields: ['name'],
            minQueryLength: 1,
          },
          filteredNodes: nodes.filter((node) => node.id !== 'file-other'),
          filteredExpandedNodeIds: ['root', 'folder-a'],
        })}
      />
    );

    expect(screen.getByText('Root')).toBeInTheDocument();
    expect(screen.getByText('Alpha')).toBeInTheDocument();
    expect(screen.getByText('Document Match')).toBeInTheDocument();
    expect(screen.queryByText('Outside Node')).not.toBeInTheDocument();
    runtime.dispose();
  });

  it('shows empty search state when filter_tree has no matches', () => {
    const runtime = createMasterFolderTreeRuntimeBus({ bindWindowKeydown: false });
    const controller = createController({
      nodes,
      expandedNodeIds: ['root', 'folder-a'],
    });

    render(
      <FolderTreeViewportV2
        controller={controller}
        enableDnd={false}
        runtime={runtime}
        searchState={buildSearchState({
          query: 'zzz',
          effectiveQuery: 'zzz',
          config: {
            enabled: true,
            debounceMs: 0,
            filterMode: 'filter_tree',
            matchFields: ['name'],
            minQueryLength: 1,
          },
          matchNodeIds: new Set<string>(),
          filteredNodes: [],
          filteredExpandedNodeIds: [],
        })}
      />
    );

    expect(screen.getByText('No results for "zzz"')).toBeInTheDocument();
    runtime.dispose();
  });
});
