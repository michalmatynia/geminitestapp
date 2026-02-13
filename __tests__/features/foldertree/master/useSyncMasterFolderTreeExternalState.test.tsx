import { renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { useSyncMasterFolderTreeExternalState } from '@/features/foldertree/master/useSyncMasterFolderTreeExternalState';
import type { MasterTreeNode } from '@/shared/utils';

const createNodes = (suffix: string): MasterTreeNode[] => [
  {
    id: `folder-${suffix}`,
    type: 'folder',
    kind: 'folder',
    parentId: null,
    name: `Folder ${suffix}`,
    path: `folder-${suffix}`,
    sortOrder: 0,
  },
];

describe('useSyncMasterFolderTreeExternalState', () => {
  it('syncs external nodes on mount and when nodes change', () => {
    const replaceNodes = vi.fn().mockResolvedValue(undefined);
    const selectNode = vi.fn();
    const setExpandedNodeIds = vi.fn();
    const initialNodes = createNodes('a');

    const { rerender } = renderHook(
      ({ nodes }) =>
        useSyncMasterFolderTreeExternalState({
          controller: { replaceNodes, selectNode, setExpandedNodeIds },
          nodes,
        }),
      {
        initialProps: { nodes: initialNodes },
      }
    );

    expect(replaceNodes).toHaveBeenCalledTimes(1);
    expect(replaceNodes).toHaveBeenLastCalledWith(initialNodes, 'external_sync');
    expect(selectNode).not.toHaveBeenCalled();

    const nextNodes = createNodes('b');
    rerender({ nodes: nextNodes });

    expect(replaceNodes).toHaveBeenCalledTimes(2);
    expect(replaceNodes).toHaveBeenLastCalledWith(nextNodes, 'external_sync');
  });

  it('syncs selected node only when selected id is provided', () => {
    const replaceNodes = vi.fn().mockResolvedValue(undefined);
    const selectNode = vi.fn();
    const setExpandedNodeIds = vi.fn();
    const nodes = createNodes('selected');

    const { rerender } = renderHook(
      ({ selectedNodeId }) =>
        useSyncMasterFolderTreeExternalState({
          controller: { replaceNodes, selectNode, setExpandedNodeIds },
          nodes,
          selectedNodeId,
        }),
      {
        initialProps: { selectedNodeId: undefined as string | null | undefined },
      }
    );

    expect(selectNode).not.toHaveBeenCalled();

    rerender({ selectedNodeId: 'folder-selected' });
    expect(selectNode).toHaveBeenCalledTimes(1);
    expect(selectNode).toHaveBeenLastCalledWith('folder-selected');

    rerender({ selectedNodeId: null });
    expect(selectNode).toHaveBeenCalledTimes(2);
    expect(selectNode).toHaveBeenLastCalledWith(null);
  });

  it('syncs expanded node ids only when provided', () => {
    const replaceNodes = vi.fn().mockResolvedValue(undefined);
    const selectNode = vi.fn();
    const setExpandedNodeIds = vi.fn();
    const nodes = createNodes('expanded');

    const { rerender } = renderHook(
      ({ expandedNodeIds }) =>
        useSyncMasterFolderTreeExternalState({
          controller: { replaceNodes, selectNode, setExpandedNodeIds },
          nodes,
          expandedNodeIds,
        }),
      {
        initialProps: { expandedNodeIds: undefined as string[] | undefined },
      }
    );

    expect(setExpandedNodeIds).not.toHaveBeenCalled();

    rerender({ expandedNodeIds: ['folder-expanded'] });
    expect(setExpandedNodeIds).toHaveBeenCalledTimes(1);
    expect(setExpandedNodeIds).toHaveBeenLastCalledWith(['folder-expanded']);
  });
});
