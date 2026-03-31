'use client';

import { useCallback } from 'react';

import { MasterTreeId } from '@/shared/contracts/master-folder-tree';

import { getAncestorIds } from '../../operations/expansion';
import { FolderTreeStore } from '../../store/createFolderTreeStore';
import { FolderTreeState } from '../../types';

export function useFolderTreeNavigationActions(store: FolderTreeStore) {
  const selectNode = useCallback(
    (nodeId: string | null): void => {
      store.patchState((prev: FolderTreeState) => {
        if (prev.selectedNodeId === nodeId) return prev;
        return {
          ...prev,
          selectedNodeId: nodeId,
        };
      });
    },
    [store]
  );

  const setExpandedNodeIds = useCallback(
    (nodeIds: string[]): void => {
      const ids = Array.from(new Set(nodeIds.map((id) => id.trim()).filter(Boolean)));
      store.patchState((prev: FolderTreeState) => {
        if (
          prev.expandedNodeIds.length === ids.length &&
          prev.expandedNodeIds.every((id, index) => id === ids[index])
        ) {
          return prev;
        }
        return {
          ...prev,
          expandedNodeIds: ids,
        };
      });
    },
    [store]
  );

  const toggleNodeExpanded = useCallback(
    (nodeId: string): void => {
      store.patchState((prev: FolderTreeState) => {
        const expanded = new Set(prev.expandedNodeIds);
        if (expanded.has(nodeId)) {
          expanded.delete(nodeId);
        } else {
          expanded.add(nodeId);
        }
        return {
          ...prev,
          expandedNodeIds: Array.from(expanded),
        };
      });
    },
    [store]
  );

  const expandNode = useCallback(
    (nodeId: string): void => {
      store.patchState((prev: FolderTreeState) => {
        if (prev.expandedNodeIds.includes(nodeId)) return prev;
        return {
          ...prev,
          expandedNodeIds: [...prev.expandedNodeIds, nodeId],
        };
      });
    },
    [store]
  );

  const collapseNode = useCallback(
    (nodeId: string): void => {
      store.patchState((prev: FolderTreeState) => {
        if (!prev.expandedNodeIds.includes(nodeId)) return prev;
        return {
          ...prev,
          expandedNodeIds: prev.expandedNodeIds.filter((id) => id !== nodeId),
        };
      });
    },
    [store]
  );

  const expandAll = useCallback((): void => {
    const nodes = store.getState().nodes;
    setExpandedNodeIds(nodes.filter((node) => node.type === 'folder').map((node) => node.id));
  }, [setExpandedNodeIds, store]);

  const collapseAll = useCallback((): void => {
    setExpandedNodeIds([]);
  }, [setExpandedNodeIds]);

  const expandToNode = useCallback(
    (nodeId: MasterTreeId): void => {
      const ancestors = getAncestorIds(store.getState().nodes, nodeId);
      if (ancestors.length === 0) return;
      store.patchState((prev: FolderTreeState) => {
        const expanded = new Set(prev.expandedNodeIds);
        let changed = false;
        ancestors.forEach((id) => {
          if (!expanded.has(id)) {
            expanded.add(id);
            changed = true;
          }
        });
        if (!changed) return prev;
        return {
          ...prev,
          expandedNodeIds: Array.from(expanded),
        };
      });
    },
    [store]
  );

  const toggleSelectNode = useCallback(
    (nodeId: MasterTreeId): void => {
      store.patchState((prev: FolderTreeState) => {
        const next = new Set(prev.selectedNodeIds);
        if (next.has(nodeId)) {
          next.delete(nodeId);
        } else {
          next.add(nodeId);
        }
        return {
          ...prev,
          selectedNodeIds: Array.from(next),
        };
      });
    },
    [store]
  );

  const selectNodeRange = useCallback(
    (anchorId: MasterTreeId, nodeId: MasterTreeId, visibleNodeIds: MasterTreeId[]): void => {
      const fromIdx = visibleNodeIds.indexOf(anchorId);
      const toIdx = visibleNodeIds.indexOf(nodeId);
      if (fromIdx === -1 || toIdx === -1) return;
      const lo = Math.min(fromIdx, toIdx);
      const hi = Math.max(fromIdx, toIdx);
      const rangeIds = visibleNodeIds.slice(lo, hi + 1);
      store.patchState((prev: FolderTreeState) => ({
        ...prev,
        selectedNodeIds: rangeIds,
        selectedNodeId: nodeId,
      }));
    },
    [store]
  );

  const selectAllNodes = useCallback((): void => {
    store.patchState((prev: FolderTreeState) => ({
      ...prev,
      selectedNodeIds: prev.nodes.map((n) => n.id),
    }));
  }, [store]);

  const clearMultiSelection = useCallback((): void => {
    store.patchState((prev: FolderTreeState) => {
      if (prev.selectedNodeIds.length === 0) return prev;
      return {
        ...prev,
        selectedNodeIds: [],
      };
    });
  }, [store]);

  const setSelectedNodeIds = useCallback(
    (nodeIds: MasterTreeId[]): void => {
      const ids = Array.from(new Set(nodeIds));
      store.patchState((prev: FolderTreeState) => ({
        ...prev,
        selectedNodeIds: ids,
      }));
    },
    [store]
  );

  return {
    selectNode,
    setExpandedNodeIds,
    toggleNodeExpanded,
    expandNode,
    collapseNode,
    expandAll,
    collapseAll,
    expandToNode,
    toggleSelectNode,
    selectNodeRange,
    selectAllNodes,
    clearMultiSelection,
    setSelectedNodeIds,
  };
}
