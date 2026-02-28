'use client';

import React, { createContext, useContext } from 'react';
import { useAdmin3DAssetsState } from '../hooks/useAdmin3DAssetsState';

type Admin3DAssetsContextValue = ReturnType<typeof useAdmin3DAssetsState>;

const Admin3DAssetsContext = createContext<Admin3DAssetsContextValue | null>(null);

export function Admin3DAssetsProvider({ children }: { children: React.ReactNode }) {
  const value = useAdmin3DAssetsState();
  return <Admin3DAssetsContext.Provider value={value}>{children}</Admin3DAssetsContext.Provider>;
}

export function useAdmin3DAssetsContext() {
  const context = useContext(Admin3DAssetsContext);
  if (!context) {
    throw new Error('useAdmin3DAssetsContext must be used within Admin3DAssetsProvider');
  }
  return context;
}
