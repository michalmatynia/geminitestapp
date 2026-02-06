'use client';

import React, { createContext, useContext } from 'react';

import type { UseNoteFiltersResult } from '@/features/notesapp/hooks/useNoteFilters';
import type { NoteSettings } from '@/features/notesapp/types/notes-settings';
import type { NoteWithRelations, TagRecord, ThemeRecord, CategoryWithChildren } from '@/shared/types/notes';

export interface NotesAppContextValue {
  settings: NoteSettings;
  updateSettings: (updates: Partial<NoteSettings>) => void;
  filters: UseNoteFiltersResult;
  folderTree: CategoryWithChildren[];
  tags: TagRecord[];
  themes: ThemeRecord[];
  loading: boolean;
  selectedNote: NoteWithRelations | null;
  setSelectedNote: (note: NoteWithRelations | null) => void;
  selectedFolderId: string | null;
  selectedNotebookId: string | null;
  isEditing: boolean;
  setIsEditing: (val: boolean) => void;
  isCreating: boolean;
  setIsCreating: (val: boolean) => void;
  isFolderTreeCollapsed: boolean;
  setIsFolderTreeCollapsed: (val: boolean) => void;
  draggedNoteId: string | null;
  setDraggedNoteId: (id: string | null) => void;
  sortedNotes: NoteWithRelations[];
  pagedNotes: NoteWithRelations[];
  totalPages: number;
  noteLayoutClassName: string;
  availableTagsInScope: TagRecord[];
  selectedFolderThemeId: string;
  selectedFolderTheme: ThemeRecord | null;
  selectedNoteTheme: ThemeRecord | null;
  getThemeForNote: (note: NoteWithRelations) => ThemeRecord | null;
  handleThemeChange: (themeId: string | null) => void | Promise<void>;
  fetchTags: () => void;
  setSelectedFolderId: (id: string | null) => void;
  handleSelectNoteFromTree: (id: string) => Promise<void>;
  handleToggleFavorite: (note: NoteWithRelations) => Promise<void>;
  handleDeleteNote: () => Promise<void>;
  handleUpdateSuccess: () => void;
  handleCreateSuccess: () => void;
  handleUnlinkRelatedNote: (id: string) => Promise<void>;
  handleFilterByTag: (tagId: string) => void;
}

const NotesAppContext = createContext<NotesAppContextValue | null>(null);

export function NotesAppProvider({
  value,
  children,
}: {
  value: NotesAppContextValue;
  children: React.ReactNode;
}): React.JSX.Element {
  return <NotesAppContext.Provider value={value}>{children}</NotesAppContext.Provider>;
}

export function useNotesAppContext(): NotesAppContextValue {
  const context = useContext(NotesAppContext);
  if (!context) {
    throw new Error('useNotesAppContext must be used within NotesAppProvider');
  }
  return context;
}
