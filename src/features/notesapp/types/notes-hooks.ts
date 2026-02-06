import type { NoteSettings } from '@/features/notesapp/types/notes-settings';
import type {
  NoteWithRelations,
  CategoryWithChildren,
  ThemeRecord,
  NotebookRecord,
} from '@/shared/types/notes';

import type React from 'react';
import type { RefObject } from 'react';

export type UndoAction =
  | {
      type: 'moveNote';
      noteId: string;
      fromFolderId: string | null;
      toFolderId: string | null;
    }
  | {
      type: 'moveFolder';
      folderId: string;
      fromParentId: string | null;
      toParentId: string | null;
    }
  | { type: 'renameFolder'; folderId: string; fromName: string; toName: string }
  | { type: 'renameNote'; noteId: string; fromTitle: string; toTitle: string };

export interface UseNoteOperationsProps {
  selectedNotebookId: string | null;
  notesRef: RefObject<NoteWithRelations[]>;
  folderTreeRef: RefObject<CategoryWithChildren[]>;
  fetchNotes: () => Promise<void>;
  fetchFolderTree: () => Promise<void>;
  setUndoStack: React.Dispatch<React.SetStateAction<UndoAction[]>>;
  toast: (
    message: string,
    options?: { variant?: 'success' | 'error' | 'info'; duration?: number },
  ) => void;
  setSelectedFolderId: (id: string | null) => void;
  setSelectedNote: (note: NoteWithRelations | null) => void;
  selectedNote: NoteWithRelations | null;
}

export interface UseNoteFiltersProps {
  settings: NoteSettings;
  updateSettings: (settings: Partial<NoteSettings>) => void;
}

export interface UseNoteThemeProps {
  themes: ThemeRecord[];
  notebook: NotebookRecord | null;
  folderTree: CategoryWithChildren[];
  selectedFolderId: string | null;
  selectedNotebookId: string | null;
  selectedNote: NoteWithRelations | null;
  fetchFolderTree: () => Promise<void>;
  setNotebook: (notebook: NotebookRecord) => void;
}

export interface UseNoteDataProps {
  selectedNotebookId: string | null;
  selectedFolderId: string | null;
  searchQuery: string;
  searchScope: 'both' | 'title' | 'content';
  filterPinned?: boolean | undefined;
  filterArchived?: boolean | undefined;
  filterFavorite?: boolean | undefined;
  filterTagIds: string[];
  setSelectedNotebookId: (id: string | null) => void;
}
