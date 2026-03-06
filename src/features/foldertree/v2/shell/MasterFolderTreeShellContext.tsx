'use client';

import React, { createContext, useContext } from 'react';
import type { MasterFolderTreeShell } from './useMasterFolderTreeShell';

export type { MasterFolderTreeShell };

export const MasterFolderTreeShellContext = createContext<MasterFolderTreeShell | null>(null);

export function MasterFolderTreeShellProvider({
  children,
  value,
}: {
  children: React.ReactNode;
  value: MasterFolderTreeShell;
}) {
  return (
    <MasterFolderTreeShellContext.Provider value={value}>
      {children}
    </MasterFolderTreeShellContext.Provider>
  );
}

export function useMasterFolderTreeShellContext() {
  const context = useContext(MasterFolderTreeShellContext);
  if (!context) {
    throw new Error(
      'useMasterFolderTreeShellContext must be used within MasterFolderTreeShellProvider'
    );
  }
  return context;
}

export function useOptionalMasterFolderTreeShellContext() {
  return useContext(MasterFolderTreeShellContext);
}
