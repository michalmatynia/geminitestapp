'use client';

import React, { createContext, useContext, useMemo } from 'react';

type TreeColumnContextValue = {
  columnId: string;
};

const TreeColumnContext = createContext<TreeColumnContextValue | null>(null);

type TreeColumnProviderProps = {
  columnId: string;
  children: React.ReactNode;
};

export function TreeColumnProvider({
  columnId,
  children,
}: TreeColumnProviderProps): React.JSX.Element {
  const value = useMemo<TreeColumnContextValue>(() => ({ columnId }), [columnId]);
  return <TreeColumnContext.Provider value={value}>{children}</TreeColumnContext.Provider>;
}

export function useOptionalTreeColumnId(explicitColumnId?: string): string | undefined {
  if (typeof explicitColumnId === 'string' && explicitColumnId.trim().length > 0) {
    return explicitColumnId;
  }
  const context = useContext(TreeColumnContext);
  return context?.columnId;
}

export function useTreeColumnId(explicitColumnId?: string): string {
  const columnId = useOptionalTreeColumnId(explicitColumnId);
  if (!columnId) {
    throw new Error(
      'useTreeColumnId must be used within TreeColumnProvider or receive a columnId prop'
    );
  }
  return columnId;
}
