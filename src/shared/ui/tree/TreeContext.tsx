'use client';

import React, { createContext, useContext, useMemo } from 'react';

import type { TreeContextValue } from '@/shared/contracts/ui/menus';

export type { TreeContextValue };

const TreeContext = createContext<TreeContextValue | null>(null);

type TreeNodeSelectionOptions = {
  multi?: boolean;
  toggle?: boolean;
};

type TreeNodeState = {
  isSelected: boolean;
  isExpanded: boolean;
  onToggleExpand?: () => void;
  onSelect?: (options?: TreeNodeSelectionOptions) => void;
  isProcessing?: boolean;
};

const EMPTY_TREE_NODE_STATE: TreeNodeState = {
  isSelected: false,
  isExpanded: false,
};

const hasTrackedTreeNodeId = (id: string | undefined): id is string =>
  typeof id === 'string' && id.length > 0;

const hasTreeNodeId = (
  ids: TreeContextValue['selectedIds'] | TreeContextValue['expandedIds'],
  id: string
): boolean => {
  if (!ids) {
    return false;
  }

  return Array.isArray(ids) ? ids.includes(id) : ids.has(id);
};

const buildTreeNodeState = (
  context: TreeContextValue | null,
  id: string | undefined
): TreeNodeState => {
  if (!context || !hasTrackedTreeNodeId(id)) {
    return EMPTY_TREE_NODE_STATE;
  }

  return {
    isSelected: hasTreeNodeId(context.selectedIds, id),
    isExpanded: hasTreeNodeId(context.expandedIds, id),
    onToggleExpand: (): void => {
      context.onToggleExpand?.(id);
    },
    onSelect: (options?: TreeNodeSelectionOptions): void => {
      context.onSelect?.(id, options);
    },
    isProcessing: context.isProcessing,
  };
};

export function TreeProvider({
  value,
  children,
}: {
  value: TreeContextValue;
  children: React.ReactNode;
}): React.JSX.Element {
  return <TreeContext.Provider value={value}>{children}</TreeContext.Provider>;
}

function useTreeContext(): TreeContextValue | null {
  return useContext(TreeContext);
}

/**
 * Helper to check if a node is selected/expanded from context
 */
export function useTreeNodeState(id: string | undefined): TreeNodeState {
  const context = useTreeContext();

  return useMemo((): TreeNodeState => buildTreeNodeState(context, id), [context, id]);
}
