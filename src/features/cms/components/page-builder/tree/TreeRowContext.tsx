'use client';

import React, { createContext, useContext, useMemo } from 'react';

type TreeRowContextValue = {
  rowId: string;
};

const TreeRowContext = createContext<TreeRowContextValue | null>(null);

type TreeRowProviderProps = {
  rowId: string;
  children: React.ReactNode;
};

export function TreeRowProvider({ rowId, children }: TreeRowProviderProps): React.JSX.Element {
  const value = useMemo<TreeRowContextValue>(() => ({ rowId }), [rowId]);
  return <TreeRowContext.Provider value={value}>{children}</TreeRowContext.Provider>;
}

export function useOptionalTreeRowId(explicitRowId?: string): string | undefined {
  if (typeof explicitRowId === 'string' && explicitRowId.trim().length > 0) {
    return explicitRowId;
  }
  const context = useContext(TreeRowContext);
  return context?.rowId;
}
