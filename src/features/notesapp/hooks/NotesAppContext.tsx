'use client';

import React, { createContext, useContext, useState, useCallback, useMemo } from 'react';

import { useNoteSettings } from '@/features/notesapp/hooks/NoteSettingsContext';
import { 
  useNoteData,
  useUpdateNoteMutation,
  useDeleteNoteMutation,
  useUpdateCategoryMutation
} from '@/features/notesapp/hooks/useNoteData';
import { useNoteFilters, type UseNoteFiltersResult } from '@/features/notesapp/hooks/useNoteFilters';
import { useNoteOperations } from '@/features/notesapp/hooks/useNoteOperations';
import { useNoteTheme } from '@/features/notesapp/hooks/useNoteTheme';
import type { UndoAction } from '@/features/notesapp/types/notes-hooks';
import type { NoteSettings } from '@/features/notesapp/types/notes-settings';
import { internalError } from '@/shared/errors/app-error';
import { api } from '@/shared/lib/api-client';
import type { NoteWithRelations, TagRecord, ThemeRecord, CategoryWithChildren, NoteTagRecord, NoteRelationWithSource, NoteRelationWithTarget } from '@/shared/types/domain/notes';
import { useToast } from '@/shared/ui';
import { ConfirmModal, PromptModal } from '@/shared/ui/templates/modals';
import { logClientError } from '@/shared/utils/observability/client-error-logger';

type NoteTagWithDetails = NoteTagRecord & { tag: TagRecord };

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
  
  // Confirmation Modal
  confirmation: {
    title: string;
    message: string;
    onConfirm: () => void | Promise<void>;
    confirmText?: string;
    isDangerous?: boolean;
  } | null;
  setConfirmation: (val: {
    title: string;
    message: string;
    onConfirm: () => void | Promise<void>;
    confirmText?: string;
    isDangerous?: boolean;
  } | null) => void;
  confirmAction: (config: {
    title: string;
    message: string;
    onConfirm: () => void | Promise<void>;
    confirmText?: string;
    isDangerous?: boolean;
  }) => void;

  // Prompt Modal
  prompt: {
    title: string;
    message?: string;
    label?: string;
    defaultValue?: string;
    placeholder?: string;
    onConfirm: (value: string) => void | Promise<void>;
    required?: boolean;
  } | null;
  setPrompt: (val: {
    title: string;
    message?: string;
    label?: string;
    defaultValue?: string;
    placeholder?: string;
    onConfirm: (value: string) => void | Promise<void>;
    required?: boolean;
  } | null) => void;
  promptAction: (config: {
    title: string;
    message?: string;
    label?: string;
    defaultValue?: string;
    placeholder?: string;
    onConfirm: (value: string) => void | Promise<void>;
    required?: boolean;
  }) => void;

  // Operations
  operations: ReturnType<typeof useNoteOperations>;
  undoStack: UndoAction[];
  undoHistory: { label: string }[];
  handleUndoFolderTree: (count?: number) => Promise<void>;
  handleUndoAtIndex: (index: number) => void;
  fetchFolderTree: () => Promise<void>;
}

const NotesAppContext = createContext<NotesAppContextValue | null>(null);

export function NotesAppProvider({
  children,
}: {
  children: React.ReactNode;
}): React.JSX.Element {
  const { settings, updateSettings } = useNoteSettings();
  const { toast } = useToast();
  
  // Mutations
  const updateNoteMutation = useUpdateNoteMutation();
  const deleteNoteMutation = useDeleteNoteMutation();
  const updateCategoryMutation = useUpdateCategoryMutation();

  // Local UI State
  const [selectedNote, setSelectedNote] = useState<NoteWithRelations | null>(null);
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [isCreating, setIsCreating] = useState<boolean>(false);
  const [draggedNoteId, setDraggedNoteId] = useState<string | null>(null);
  const [isFolderTreeCollapsed, setIsFolderTreeCollapsed] = useState<boolean>(false);
  const [undoStack, setUndoStack] = useState<UndoAction[]>([]);
    const [confirmation, setConfirmation] = useState<{
      title: string;
      message: string;
      onConfirm: () => void | Promise<void>;
      confirmText?: string;
      isDangerous?: boolean;
    } | null>(null);
    const [prompt, setPrompt] = useState<{
      title: string;
      message?: string;
      label?: string;
      defaultValue?: string;
      placeholder?: string;
      onConfirm: (value: string) => void | Promise<void>;
      required?: boolean;
    } | null>(null);
  
    const confirmAction = useCallback((config: {
      title: string;
      message: string;
      onConfirm: () => void | Promise<void>;
      confirmText?: string;
      isDangerous?: boolean;
    }): void => {
      setConfirmation(config);
    }, []);
  
    const promptAction = useCallback((config: {
      title: string;
      message?: string;
      label?: string;
      defaultValue?: string;
      placeholder?: string;
      onConfirm: (value: string) => void | Promise<void>;
      required?: boolean;
    }): void => {
      setPrompt(config);
    }, []);
  
    // Settings helpers
  
  const setSelectedFolderId = useCallback((id: string | null): void => {
    updateSettings({ selectedFolderId: id });
  }, [updateSettings]);

  const setSelectedNotebookId = useCallback((id: string | null): void => {
    updateSettings({ selectedNotebookId: id });
  }, [updateSettings]);

  // Hooks
  const filters = useNoteFilters({ settings, updateSettings });
  
  const {
    notes,
    setNotes,
    tags,
    themes,
    notebook,
    setNotebook,
    folderTree,
    loading,
    notesRef,
    folderTreeRef,
    fetchNotes,
    fetchFolderTree,
    fetchTags,
  } = useNoteData({
    selectedNotebookId: settings.selectedNotebookId,
    selectedFolderId: settings.selectedFolderId,
    searchQuery: filters.debouncedSearchQuery,
    searchScope: settings.searchScope,
    filterPinned: filters.filterPinned,
    filterArchived: filters.filterArchived,
    filterFavorite: filters.filterFavorite,
    filterTagIds: filters.filterTagIds,
    setSelectedNotebookId,
  });

  const operations = useNoteOperations({
    selectedNotebookId: settings.selectedNotebookId,
    notesRef,
    folderTreeRef,
    fetchNotes,
    fetchFolderTree,
    setUndoStack,
    toast,
    setSelectedFolderId,
    setSelectedNote,
    selectedNote,
    confirmAction,
    promptAction,
  });

  const themeLogic = useNoteTheme({
    themes,
    notebook,
    folderTree,
    selectedFolderId: settings.selectedFolderId,
    selectedNotebookId: settings.selectedNotebookId,
    selectedNote,
    fetchFolderTree,
    setNotebook,
  });

  // Derived Logic (Sorting & Pagination)
  const notesInScope: NoteWithRelations[] = useMemo((): NoteWithRelations[] => {
    return notes;
  }, [notes]);

  const sortedNotes: NoteWithRelations[] = useMemo((): NoteWithRelations[] => {
    const sorted: NoteWithRelations[] = [...notesInScope].sort((a: NoteWithRelations, b: NoteWithRelations): number => {
      if (settings.sortBy === 'name') {
        return a.title.localeCompare(b.title);
      }
      if (settings.sortBy === 'updated') {
        const aTime = a.updatedAt ? new Date(a.updatedAt).getTime() : 0;
        const bTime = b.updatedAt ? new Date(b.updatedAt).getTime() : 0;
        return aTime - bTime;
      }
      return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
    });
    return settings.sortOrder === 'desc' ? sorted.reverse() : sorted;
  }, [notesInScope, settings.sortBy, settings.sortOrder]);

  const totalPages: number = useMemo((): number => {
    return Math.max(1, Math.ceil(sortedNotes.length / (filters.pageSize || 1)));
  }, [sortedNotes.length, filters.pageSize]);

  const pagedNotes: NoteWithRelations[] = useMemo((): NoteWithRelations[] => {
    const clampedPage: number = Math.min(filters.page, totalPages);
    const start: number = (clampedPage - 1) * filters.pageSize;
    return sortedNotes.slice(start, start + filters.pageSize);
  }, [sortedNotes, filters.page, filters.pageSize, totalPages]);

  const noteLayoutClassName: string = useMemo((): string => {
    if (settings.viewMode === 'list') {
      return 'grid grid-cols-1 gap-3';
    }
    if (settings.gridDensity === 8) {
      return 'grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6 2xl:grid-cols-8';
    }
    return 'grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4';
  }, [settings.viewMode, settings.gridDensity]);

  const availableTagsInScope: TagRecord[] = useMemo((): TagRecord[] => {
    const tagMap: Map<string, TagRecord> = new Map<string, TagRecord>();
    notesInScope.forEach((note: NoteWithRelations): void => {
      (note.tags as NoteTagWithDetails[]).forEach((noteTag: NoteTagWithDetails): void => {
        tagMap.set(noteTag.tagId, noteTag.tag);
      });
    });
    return Array.from(tagMap.values()).sort((a: TagRecord, b: TagRecord): number => a.name.localeCompare(b.name));
  }, [notesInScope]);

  // Handlers
  const handleSelectNoteFromTree = useCallback(async (noteId: string): Promise<void> => {
    try {
      const note = await api.get<NoteWithRelations>(`/api/notes/${noteId}`);
      setSelectedNote(note);
      setIsEditing(false);
    } catch (error: unknown) {
      logClientError(error, { context: { source: 'NotesAppProvider', action: 'fetchNote', noteId } });
    }
  }, []);

  const handleCreateSuccess = useCallback((): void => {
    setIsCreating(false);
    void fetchNotes();
    void fetchFolderTree();
  }, [fetchNotes, fetchFolderTree]);

  const handleFilterByTag = useCallback((tagId: string): void => {
    filters.handleFilterByTag(tagId, setSelectedFolderId, setSelectedNote, setIsEditing);
  }, [filters, setSelectedFolderId]);

  const handleUpdateSuccess = useCallback((): void => {
    setIsEditing(false);
    void fetchNotes();
    void fetchFolderTree();
    if (selectedNote) {
      void handleSelectNoteFromTree(selectedNote.id);
    }
  }, [fetchNotes, fetchFolderTree, selectedNote, handleSelectNoteFromTree]);

  const handleToggleFavorite = useCallback(async (note: NoteWithRelations): Promise<void> => {
    const nextFavorite: boolean = !note.isFavorite;
    try {
      await updateNoteMutation.mutateAsync({ id: note.id, isFavorite: nextFavorite });
      
      setNotes((prev: NoteWithRelations[] | undefined): NoteWithRelations[] =>
        (prev || []).map((item: NoteWithRelations): NoteWithRelations =>
          item.id === note.id ? { ...item, isFavorite: nextFavorite } : item
        )
      );
      
      setSelectedNote((prev: NoteWithRelations | null): NoteWithRelations | null =>
        prev && prev.id === note.id ? { ...prev, isFavorite: nextFavorite } : prev
      );
    } catch (error: unknown) {
      logClientError(error, { context: { source: 'NotesAppProvider', action: 'toggleFavorite', noteId: note.id } });
      toast('Failed to update favorite', { variant: 'error' });
    }
  }, [toast, setNotes, updateNoteMutation]);

  const handleUnlinkRelatedNote = useCallback(async (relatedId: string): Promise<void> => {
    if (!selectedNote) return;
    try {
      const sourceRelations: string[] =
        selectedNote.relations?.map((rel: { id: string }): string => rel.id) ||
        [
          ...(selectedNote.relationsFrom ?? [])
            .map((rel: NoteRelationWithTarget) => rel.targetNote?.id)
            .filter((rid: string | undefined): rid is string => !!rid),
          ...(selectedNote.relationsTo ?? [])
            .map((rel: NoteRelationWithSource) => rel.sourceNote?.id)
            .filter((rid: string | undefined): rid is string => !!rid),
        ].filter(
          (id: string, index: number, array: string[]): boolean => array.indexOf(id) === index
        );

      const nextSourceIds: string[] = sourceRelations.filter((id: string): boolean => id !== relatedId);

      await updateNoteMutation.mutateAsync({ id: selectedNote.id, relatedNoteIds: nextSourceIds });

      toast('Note unlinked');
      await fetchNotes();
      void handleSelectNoteFromTree(selectedNote.id);
    } catch (error: unknown) {
      logClientError(error, { context: { source: 'NotesAppProvider', action: 'unlinkNote', noteId: selectedNote.id, relatedId } });
      toast('Failed to unlink note', { variant: 'error' });
    }
  }, [selectedNote, fetchNotes, handleSelectNoteFromTree, toast, updateNoteMutation]);

  const handleDeleteNote = useCallback(async (): Promise<void> => {
    if (!selectedNote) return;
    confirmAction({
      title: 'Delete Note?',
      message: 'Are you sure you want to delete this note?',
      confirmText: 'Delete',
      isDangerous: true,
      onConfirm: async () => {
        try {
          await deleteNoteMutation.mutateAsync(selectedNote.id);
          setSelectedNote(null);
          setIsEditing(false);
        } catch (error: unknown) {
          logClientError(error, { context: { source: 'NotesAppProvider', action: 'deleteNote', noteId: selectedNote.id } });
          toast('Failed to delete note', { variant: 'error' });
        }
      },
    });
  }, [selectedNote, deleteNoteMutation, toast, confirmAction]);

  // Undo Logic
  const formatUndoLabel = useCallback((action: UndoAction): string => {
    if (action.type === 'moveNote') return 'Moved note';
    if (action.type === 'moveFolder') return 'Moved folder';
    if (action.type === 'renameFolder') return `Renamed folder to "${action.toName}"`;
    return `Renamed note to "${action.toTitle}"`;
  }, []);

  const applyUndoAction = useCallback(async (action: UndoAction): Promise<void> => {
    if (action.type === 'moveNote') {
      await updateNoteMutation.mutateAsync({
        id: action.noteId,
        categoryIds: action.fromFolderId ? [action.fromFolderId] : [],
      });
      return;
    }
    if (action.type === 'moveFolder') {
      await updateCategoryMutation.mutateAsync({
        id: action.folderId,
        parentId: action.fromParentId ?? null,
      });
      return;
    }
    if (action.type === 'renameFolder') {
      await updateCategoryMutation.mutateAsync({
        id: action.folderId,
        name: action.fromName,
      });
      return;
    }
    if (action.type === 'renameNote') {
      await updateNoteMutation.mutateAsync({
        id: action.noteId,
        title: action.fromTitle,
      });
    }
  }, [updateNoteMutation, updateCategoryMutation]);

  const handleUndoFolderTree = useCallback(async (count: number = 1): Promise<void> => {
    const actionsToUndo: UndoAction[] = undoStack.slice(0, count);
    if (actionsToUndo.length === 0) return;
    setUndoStack((prev: UndoAction[]): UndoAction[] => prev.slice(count));
    try {
      for (const action of actionsToUndo) {
        await applyUndoAction(action);
      }
    } catch (error: unknown) {
      logClientError(error, { context: { source: 'NotesAppProvider', action: 'undoFolderTree', count } });
      toast('Failed to undo', { variant: 'error' });
    }
  }, [undoStack, applyUndoAction, toast]);

  const handleUndoAtIndex = useCallback((index: number): void => {
    const count: number = Math.max(1, index + 1);
    void handleUndoFolderTree(count);
  }, [handleUndoFolderTree]);

  const undoHistory: { label: string }[] = useMemo(
    (): { label: string }[] => undoStack.map((action: UndoAction): { label: string } => ({ label: formatUndoLabel(action) })),
    [undoStack, formatUndoLabel]
  );

  const contextValue: NotesAppContextValue = useMemo(
    () => ({
      settings,
      updateSettings,
      filters,
      folderTree,
      tags,
      themes,
      loading,
      selectedNote,
      setSelectedNote,
      selectedFolderId: settings.selectedFolderId,
      selectedNotebookId: settings.selectedNotebookId,
      isEditing,
      setIsEditing,
      isCreating,
      setIsCreating,
      isFolderTreeCollapsed,
      setIsFolderTreeCollapsed,
      draggedNoteId,
      setDraggedNoteId,
      sortedNotes,
      pagedNotes,
      totalPages,
      noteLayoutClassName,
      availableTagsInScope,
      selectedFolderThemeId: themeLogic.selectedFolderThemeId,
      selectedFolderTheme: themeLogic.selectedFolderTheme,
      selectedNoteTheme: themeLogic.selectedNoteTheme,
      getThemeForNote: themeLogic.getThemeForNote,
      handleThemeChange: themeLogic.handleThemeChange,
      fetchTags: () => {
        void fetchTags();
      },
      setSelectedFolderId,
      handleSelectNoteFromTree,
      handleToggleFavorite,
      handleDeleteNote,
      handleUpdateSuccess,
      handleCreateSuccess,
      handleUnlinkRelatedNote,
      handleFilterByTag,
      confirmation,
      setConfirmation,
      confirmAction,
      prompt,
      setPrompt,
      promptAction,
      
      operations,
      undoStack,
      undoHistory,
      handleUndoFolderTree,
      handleUndoAtIndex,
      fetchFolderTree,
    }),
    [
      settings,
      updateSettings,
      filters,
      folderTree,
      tags,
      themes,
      loading,
      selectedNote,
      isEditing,
      isCreating,
      isFolderTreeCollapsed,
      draggedNoteId,
      sortedNotes,
      pagedNotes,
      totalPages,
      noteLayoutClassName,
      availableTagsInScope,
      themeLogic,
      fetchTags,
      setSelectedFolderId,
      handleSelectNoteFromTree,
      handleToggleFavorite,
      handleDeleteNote,
      handleUpdateSuccess,
      handleCreateSuccess,
      handleUnlinkRelatedNote,
      handleFilterByTag,
      confirmation,
      confirmAction,
      prompt,
      promptAction,
      operations,
      undoStack,
      undoHistory,
      handleUndoFolderTree,
      handleUndoAtIndex,
      fetchFolderTree,
    ]
  );

  return (
    <NotesAppContext.Provider value={contextValue}>
      {children}
      <ConfirmModal
        isOpen={Boolean(confirmation)}
        onClose={() => setConfirmation(null)}
        title={confirmation?.title ?? ''}
        message={confirmation?.message ?? ''}
        confirmText={confirmation?.confirmText ?? 'Confirm'}
        isDangerous={confirmation?.isDangerous ?? false}
        onConfirm={async () => {
          if (confirmation?.onConfirm) {
            await confirmation.onConfirm();
          }
          setConfirmation(null);
        }}
      />
      <PromptModal
        open={Boolean(prompt)}
        onClose={() => setPrompt(null)}
        title={prompt?.title ?? ''}
        message={prompt?.message ?? ''}
        label={prompt?.label ?? ''}
        defaultValue={prompt?.defaultValue ?? ''}
        placeholder={prompt?.placeholder ?? ''}
        required={prompt?.required ?? false}
        onConfirm={async (value) => {
          if (prompt?.onConfirm) {
            await prompt.onConfirm(value);
          }
          setPrompt(null);
        }}
      />
    </NotesAppContext.Provider>
  );
}

export function useNotesAppContext(): NotesAppContextValue {
  const context = useContext(NotesAppContext);
  if (!context) {
    throw internalError('useNotesAppContext must be used within NotesAppProvider');
  }
  return context;
}
