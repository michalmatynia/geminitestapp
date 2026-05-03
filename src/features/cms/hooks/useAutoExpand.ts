'use client';

import { useCallback, type Dispatch, type SetStateAction } from 'react';

type AutoExpandResult = {
  autoExpand: (...nodeIds: (string | string[] | null | undefined)[]) => void;
  toggleExpand: (nodeId: string) => void;
  collapse: (...nodeIds: (string | string[] | null | undefined)[]) => void;
  setExpanded: (nodeIds: string[]) => void;
  collapseAll: () => void;
};

/**
 * A hook that provides utility functions for managing the expanded state
 * of tree nodes. Consolidates the repeated auto-expand patterns used
 * throughout ComponentTreePanel.tsx.
 *
 * @example
 * ```tsx
 * function ComponentTreePanel() {
 *   const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
 *   const { autoExpand, toggleExpand } = useAutoExpand(setExpandedIds);
 *
 *   // Auto-expand multiple nodes at once
 *   const handleAddBlock = (sectionId: string) => {
 *     dispatch({ type: "ADD_BLOCK", sectionId });
 *     autoExpand(sectionId); // or autoExpand([sectionId, columnId])
 *   };
 * }
 * ```
 */
export function useAutoExpand(
  setExpandedIds: Dispatch<SetStateAction<Set<string>>>
): AutoExpandResult {
  /**
   * Adds one or more node IDs to the expanded set.
   * Accepts a single ID, an array of IDs, or multiple IDs as rest parameters.
   * Filters out null/undefined values automatically.
   */
  const autoExpand = useCallback(
    (...nodeIds: (string | string[] | null | undefined)[]) => {
      // Flatten and filter the input
      const idsToAdd = nodeIds
        .flat()
        .filter((id): id is string => typeof id === 'string' && id.length > 0);

      if (idsToAdd.length === 0) return;

      setExpandedIds((prev) => {
        const next = new Set(prev);
        idsToAdd.forEach((id) => next.add(id));
        return next;
      });
    },
    [setExpandedIds]
  );

  /**
   * Toggles a node's expanded state.
   */
  const toggleExpand = useCallback(
    (nodeId: string) => {
      setExpandedIds((prev) => {
        const next = new Set(prev);
        if (next.has(nodeId)) {
          next.delete(nodeId);
        } else {
          next.add(nodeId);
        }
        return next;
      });
    },
    [setExpandedIds]
  );

  /**
   * Collapses one or more nodes by removing them from the expanded set.
   */
  const collapse = useCallback(
    (...nodeIds: (string | string[] | null | undefined)[]) => {
      const idsToRemove = nodeIds
        .flat()
        .filter((id): id is string => typeof id === 'string' && id.length > 0);

      if (idsToRemove.length === 0) return;

      setExpandedIds((prev) => {
        const next = new Set(prev);
        idsToRemove.forEach((id) => next.delete(id));
        return next;
      });
    },
    [setExpandedIds]
  );

  const setExpanded = useCallback((nodeIds: string[]) => {
    setExpandedIds(new Set(nodeIds));
  }, [setExpandedIds]);

  const collapseAll = useCallback(() => {
    setExpandedIds(new Set());
  }, [setExpandedIds]);

  return { autoExpand, toggleExpand, collapse, setExpanded, collapseAll };
}
