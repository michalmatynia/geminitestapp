'use client';

import React, { createContext, useContext, useMemo } from 'react';

import { internalError } from '@/shared/errors/app-error';

type TreeSectionContextValue = {
  sectionId: string;
};

const TreeSectionContext = createContext<TreeSectionContextValue | null>(null);

type TreeSectionProviderProps = {
  sectionId: string;
  children: React.ReactNode;
};

export function TreeSectionProvider({
  sectionId,
  children,
}: TreeSectionProviderProps): React.JSX.Element {
  const value = useMemo<TreeSectionContextValue>(() => ({ sectionId }), [sectionId]);
  return <TreeSectionContext.Provider value={value}>{children}</TreeSectionContext.Provider>;
}

export function useTreeSectionId(explicitSectionId?: string): string {
  if (typeof explicitSectionId === 'string' && explicitSectionId.trim().length > 0) {
    return explicitSectionId;
  }
  const context = useContext(TreeSectionContext);
  if (!context?.sectionId) {
    throw internalError(
      'useTreeSectionId must be used within TreeSectionProvider or receive a sectionId prop'
    );
  }
  return context.sectionId;
}
