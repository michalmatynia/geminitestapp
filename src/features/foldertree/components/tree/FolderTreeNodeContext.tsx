'use client';

import React, { createContext, useContext } from 'react';

const FolderTreeNodeLevelContext = createContext<number>(0);
const FolderTreeFolderIdContext = createContext<string | null>(null);

type FolderTreeNodeLevelProviderProps = {
  level: number;
  children: React.ReactNode;
};

type FolderTreeFolderProviderProps = {
  folderId: string;
  children: React.ReactNode;
};

export function FolderTreeNodeLevelProvider({
  level,
  children,
}: FolderTreeNodeLevelProviderProps): React.JSX.Element {
  return (
    <FolderTreeNodeLevelContext.Provider value={level}>
      {children}
    </FolderTreeNodeLevelContext.Provider>
  );
}

export function FolderTreeFolderProvider({
  folderId,
  children,
}: FolderTreeFolderProviderProps): React.JSX.Element {
  return (
    <FolderTreeFolderIdContext.Provider value={folderId}>
      {children}
    </FolderTreeFolderIdContext.Provider>
  );
}

export function useFolderTreeNodeLevel(): number {
  return useContext(FolderTreeNodeLevelContext);
}

export function useFolderTreeFolderId(): string {
  const folderId = useContext(FolderTreeFolderIdContext);
  if (!folderId) {
    throw new Error('useFolderTreeFolderId must be used within FolderTreeFolderProvider');
  }
  return folderId;
}
