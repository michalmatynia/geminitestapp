'use client';

import { createContext, useContext } from 'react';

export interface NoteFoldersData {
  selectedFolderId: string;
  setSelectedFolderId: (id: string) => void;
  flatFolders: Array<{ id: string; name: string; level: number }>;
}

export const NoteFoldersContext = createContext<NoteFoldersData | null>(null);

export function useNoteFolders(): NoteFoldersData {
  const context = useContext(NoteFoldersContext);
  if (!context) throw new Error('useNoteFolders must be used within NoteFormProvider');
  return context;
}
