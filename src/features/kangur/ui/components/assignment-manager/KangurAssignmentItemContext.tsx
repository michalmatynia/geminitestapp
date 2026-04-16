'use client';

import React, { createContext, useContext } from 'react';
import type { useKangurAssignmentManagerState } from './KangurAssignmentManager.hooks';

type AssignmentManagerState = ReturnType<typeof useKangurAssignmentManagerState>;
export type AssignmentManagerCatalogItem = AssignmentManagerState['filteredCatalog'][number];
export type AssignmentManagerSuggestedCatalogItem = AssignmentManagerState['recommendedCatalog'][number];
export type AssignmentManagerItem = AssignmentManagerCatalogItem | AssignmentManagerSuggestedCatalogItem;

const KangurAssignmentItemContext = createContext<AssignmentManagerItem | null>(null);

export function KangurAssignmentItemProvider({
  children,
  item,
}: {
  children: React.ReactNode;
  item: AssignmentManagerItem;
}): React.JSX.Element {
  return (
    <KangurAssignmentItemContext.Provider value={item}>
      {children}
    </KangurAssignmentItemContext.Provider>
  );
}

export function useKangurAssignmentItem(): AssignmentManagerItem {
  const context = useContext(KangurAssignmentItemContext);
  if (!context) {
    throw new Error('useKangurAssignmentItem must be used within a KangurAssignmentItemProvider');
  }
  return context;
}
