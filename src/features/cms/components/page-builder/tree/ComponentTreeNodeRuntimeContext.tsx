'use client';

import React, { createContext, useContext } from 'react';

import type { PageZone, SectionInstance } from '@/shared/contracts/cms';

export type ComponentTreeNodeRuntimeContextValue = {
  rootSectionsByZone: Record<PageZone, SectionInstance[]>;
  sectionById: Map<string, SectionInstance>;
  sectionIndexById: Map<string, number>;
};

const ComponentTreeNodeRuntimeContext = createContext<ComponentTreeNodeRuntimeContextValue | null>(
  null
);

export function ComponentTreeNodeRuntimeProvider({
  value,
  children,
}: {
  value: ComponentTreeNodeRuntimeContextValue;
  children: React.ReactNode;
}): React.JSX.Element {
  return (
    <ComponentTreeNodeRuntimeContext.Provider value={value}>
      {children}
    </ComponentTreeNodeRuntimeContext.Provider>
  );
}

export function useComponentTreeNodeRuntimeContext(): ComponentTreeNodeRuntimeContextValue {
  const context = useContext(ComponentTreeNodeRuntimeContext);
  if (!context) {
    throw new Error(
      'useComponentTreeNodeRuntimeContext must be used within ComponentTreeNodeRuntimeProvider'
    );
  }
  return context;
}
