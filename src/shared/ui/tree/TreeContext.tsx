'use client';

import React, { createContext, useContext, useMemo } from 'react';

import type { TreeContextValue } from '@/shared/contracts/ui/ui/menus';

export type { TreeContextValue };

const TreeContext = createContext<TreeContextValue | null>(null);

export function TreeProvider({
  value,
  children,
}: {
  value: TreeContextValue;
  children: React.ReactNode;
}) {
  return <TreeContext.Provider value={value}>{children}</TreeContext.Provider>;
}

function useTreeContext() {
  return useContext(TreeContext);
}

/**
 * Helper to check if a node is selected/expanded from context
 */
export function useTreeNodeState(id: string | undefined) {
  const context = useTreeContext();

  return useMemo(() => {
    if (!context || !id) return { isSelected: false, isExpanded: false };

    const isSelected = Array.isArray(context.selectedIds)
      ? context.selectedIds.includes(id)
      : (context.selectedIds?.has(id) ?? false);

    const isExpanded = Array.isArray(context.expandedIds)
      ? context.expandedIds.includes(id)
      : (context.expandedIds?.has(id) ?? false);

    return {
      isSelected,
      isExpanded,
      onToggleExpand: () => context.onToggleExpand?.(id),
      onSelect: (options?: { multi?: boolean; toggle?: boolean }) =>
        context.onSelect?.(id, options),
      isProcessing: context.isProcessing,
    };
  }, [context, id]);
}
