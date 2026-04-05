'use client';

import { useQueryClient } from '@tanstack/react-query';
import React, { createContext, useState, useCallback, useMemo, useEffect } from 'react';

import {
  useNoteSettingsActions,
  useNoteSettingsState,
} from '@/features/notesapp/hooks/NoteSettingsContext';
import {
  useNoteData,
  useUpdateNoteMutation,
  useDeleteNoteMutation,
  useUpdateCategoryMutation,
} from '@/features/notesapp/hooks/useNoteData';
import { useNoteFilters } from '@/features/notesapp/hooks/useNoteFilters';
import { useNoteOperations } from '@/features/notesapp/hooks/useNoteOperations';
import { useNoteTheme } from '@/features/notesapp/hooks/useNoteTheme';
import type { UndoAction } from '@/shared/contracts/notes';
import type {
  NoteWithRelations,
} from '@/shared/contracts/notes';
import { useToast } from '@/shared/ui/primitives.public';
import { ConfirmModal, PromptModal } from '@/shared/ui/templates/modals';
import { logClientCatch } from '@/shared/utils/observability/client-error-logger';

import { useNotesAppDerivedState } from './useNotesAppDerivedState';
import { useNotesAppDialogs } from './useNotesAppDialogs';
import { useNotesAppEntityHandlers } from './useNotesAppEntityHandlers';

import type { NotesAppActionsValue, NotesAppStateValue } from './NotesAppContext.types';

export const NotesAppStateContext = createContext<NotesAppStateValue | null>(null);
export const NotesAppActionsContext = createContext<NotesAppActionsValue | null>(null);

export function NotesAppProvider({ children }: { children: React.ReactNode }): React.JSX.Element {
  const { settings } = useNoteSettingsState();
  const { updateSettings } = useNoteSettingsActions();
  const { toast } = useToast();
  const queryClient = useQueryClient();

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

  useEffect(() => {
    updateSettings({ selectedNoteId: selectedNote?.id ?? null });
  }, [selectedNote?.id, updateSettings]);
  const { confirmation, setConfirmation, confirmAction, prompt, setPrompt, promptAction } =
    useNotesAppDialogs();

  // Settings helpers

  const setSelectedFolderId = useCallback(
    (id: string | null): void => {
      updateSettings({ selectedFolderId: id });
    },
    [updateSettings]
  );

  const setSelectedNotebookId = useCallback(
    (id: string | null): void => {
      updateSettings({ selectedNotebookId: id });
    },
    [updateSettings]
  );

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
    selectedNotebookId: settings.selectedNotebookId ?? null,
    selectedFolderId: settings.selectedFolderId ?? null,
    searchQuery: filters.debouncedSearchQuery,
    searchScope: settings.searchScope,
    filterPinned: filters.filterPinned,
    filterArchived: filters.filterArchived,
    filterFavorite: filters.filterFavorite,
    filterTagIds: filters.filterTagIds,
    setSelectedNotebookId,
  });

  const operations = useNoteOperations({
    selectedNotebookId: settings.selectedNotebookId ?? null,
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
    selectedFolderId: settings.selectedFolderId ?? null,
    selectedNotebookId: settings.selectedNotebookId ?? null,
    selectedNote,
    fetchFolderTree,
    setNotebook,
  });

  const {
    sortedNotes,
    pagedNotes,
    totalPages,
    noteLayoutClassName,
    availableTagsInScope,
    undoHistory,
  } = useNotesAppDerivedState({
    filters,
    notes,
    settings,
    undoStack,
  });

  const {
    handleSelectNoteFromTree,
    handleCreateSuccess,
    handleFilterByTag,
    handleUpdateSuccess,
    handleToggleFavorite,
    handleUnlinkRelatedNote,
    handleDeleteNote,
    fetchTagsAction,
  } = useNotesAppEntityHandlers({
    confirmAction,
    deleteNote: deleteNoteMutation.mutateAsync,
    fetchFolderTree,
    fetchNotes,
    fetchTags,
    filters,
    queryClient,
    selectedNote,
    setNotes,
    setIsCreating,
    setIsEditing,
    setSelectedFolderId,
    setSelectedNote,
    toast,
    updateNote: updateNoteMutation.mutateAsync,
    updateSettings,
  });

  // Undo Logic
  const applyUndoAction = useCallback(
    async (action: UndoAction): Promise<void> => {
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
    },
    [updateNoteMutation, updateCategoryMutation]
  );

  const handleUndoFolderTree = useCallback(
    async (count: number = 1): Promise<void> => {
      const actionsToUndo: UndoAction[] = undoStack.slice(0, count);
      if (actionsToUndo.length === 0) return;
      setUndoStack((prev: UndoAction[]): UndoAction[] => prev.slice(count));
      try {
        for (const action of actionsToUndo) {
          await applyUndoAction(action);
        }
      } catch (error: unknown) {
        logClientCatch(error, {
          source: 'NotesAppProvider',
          action: 'undoFolderTree',
          count,
        });
        toast('Failed to undo', { variant: 'error' });
      }
    },
    [undoStack, applyUndoAction, toast]
  );

  const handleUndoAtIndex = useCallback(
    (index: number): void => {
      const count: number = Math.max(1, index + 1);
      void handleUndoFolderTree(count);
    },
    [handleUndoFolderTree]
  );

  const stateValue: NotesAppStateValue = useMemo(
    () => ({
      settings,
      filters,
      folderTree,
      tags,
      themes,
      loading,
      selectedNote,
      selectedFolderId: settings.selectedFolderId ?? null,
      selectedNotebookId: settings.selectedNotebookId ?? null,
      isEditing,
      isCreating,
      isFolderTreeCollapsed,
      draggedNoteId,
      sortedNotes,
      pagedNotes,
      totalPages,
      noteLayoutClassName,
      availableTagsInScope,
      selectedFolderThemeId: themeLogic.selectedFolderThemeId,
      selectedFolderTheme: themeLogic.selectedFolderTheme,
      selectedNoteTheme: themeLogic.selectedNoteTheme,
      getThemeForNote: themeLogic.getThemeForNote,
      confirmation,
      prompt,
      undoStack,
      undoHistory,
    }),
    [
      settings,
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
      themeLogic.selectedFolderThemeId,
      themeLogic.selectedFolderTheme,
      themeLogic.selectedNoteTheme,
      themeLogic.getThemeForNote,
      confirmation,
      prompt,
      undoStack,
      undoHistory,
    ]
  );

  const actionsValue: NotesAppActionsValue = useMemo(
    () => ({
      updateSettings,
      setSelectedNote,
      setIsEditing,
      setIsCreating,
      setIsFolderTreeCollapsed,
      setDraggedNoteId,
      handleThemeChange: themeLogic.handleThemeChange,
      fetchTags: fetchTagsAction,
      setSelectedFolderId,
      handleSelectNoteFromTree,
      handleToggleFavorite,
      handleDeleteNote,
      handleUpdateSuccess,
      handleCreateSuccess,
      handleUnlinkRelatedNote,
      handleFilterByTag,
      setConfirmation,
      confirmAction,
      setPrompt,
      promptAction,

      operations,
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
      themeLogic.handleThemeChange,
      fetchTagsAction,
      setSelectedFolderId,
      handleSelectNoteFromTree,
      handleToggleFavorite,
      handleDeleteNote,
      handleUpdateSuccess,
      handleCreateSuccess,
      handleUnlinkRelatedNote,
      handleFilterByTag,
      setConfirmation,
      confirmAction,
      setPrompt,
      promptAction,
      operations,
      handleUndoFolderTree,
      handleUndoAtIndex,
      fetchFolderTree,
    ]
  );

  return (
    <NotesAppStateContext.Provider value={stateValue}>
      <NotesAppActionsContext.Provider value={actionsValue}>
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
      </NotesAppActionsContext.Provider>
    </NotesAppStateContext.Provider>
  );
}
export { useNotesAppState, useNotesAppActions } from './useNotesAppContextHooks';
