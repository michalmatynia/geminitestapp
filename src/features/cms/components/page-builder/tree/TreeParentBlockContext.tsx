'use client';

import React, { createContext, useContext } from 'react';

type TreeParentBlockContextValue = {
  parentBlockId: string;
};

const TreeParentBlockContext = createContext<TreeParentBlockContextValue | null>(null);

type TreeParentBlockProviderProps = {
  parentBlockId: string;
  children: React.ReactNode;
};

export function TreeParentBlockProvider({
  parentBlockId,
  children,
}: TreeParentBlockProviderProps): React.JSX.Element {
  return (
    <TreeParentBlockContext.Provider value={{ parentBlockId }}>
      {children}
    </TreeParentBlockContext.Provider>
  );
}

export function useOptionalTreeParentBlockId(explicitParentBlockId?: string): string | undefined {
  if (typeof explicitParentBlockId === 'string' && explicitParentBlockId.trim().length > 0) {
    return explicitParentBlockId;
  }
  const context = useContext(TreeParentBlockContext);
  return context?.parentBlockId;
}
