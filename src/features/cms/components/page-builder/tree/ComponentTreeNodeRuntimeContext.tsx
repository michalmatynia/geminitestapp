'use client';

import React from 'react';

import type { PageZone, SectionInstance } from '@/shared/contracts/cms';
import { internalError } from '@/shared/errors/app-error';
import { createStrictContext } from '@/shared/lib/react/createStrictContext';

export type ComponentTreeNodeRuntimeContextValue = {
  rootSectionsByZone: Record<PageZone, SectionInstance[]>;
  sectionById: Map<string, SectionInstance>;
  sectionIndexById: Map<string, number>;
};

const {
  Context: ComponentTreeNodeRuntimeContext,
  useStrictContext: useComponentTreeNodeRuntimeContext,
} = createStrictContext<ComponentTreeNodeRuntimeContextValue>({
  hookName: 'useComponentTreeNodeRuntimeContext',
  providerName: 'ComponentTreeNodeRuntimeProvider',
  displayName: 'ComponentTreeNodeRuntimeContext',
  errorFactory: internalError,
});

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

export { useComponentTreeNodeRuntimeContext };
