
import { createContext } from 'react';

export interface NoteFoldersData {
  selectedFolderId: string;
  setSelectedFolderId: (id: string) => void;
  flatFolders: Array<{ id: string; name: string; level: number }>;
}

export const NoteFoldersContext = createContext<NoteFoldersData | null>(null);
