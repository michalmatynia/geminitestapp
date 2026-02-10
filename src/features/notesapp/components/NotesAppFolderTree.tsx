'use client';

import React from 'react';

import { FolderTree } from '@/features/foldertree/components/FolderTree';
import { useNotesAppContext } from '@/features/notesapp/hooks/NotesAppContext';

export function NotesAppFolderTree(): React.JSX.Element {
  const {
    settings,
    filters,
    folderTree,
    selectedNote,
    setSelectedNote,
    setIsEditing,
    setIsCreating,
    setIsFolderTreeCollapsed,
    draggedNoteId,
    setDraggedNoteId,
    operations,
    undoStack,
    undoHistory,
    handleUndoFolderTree,
    handleUndoAtIndex,
    fetchFolderTree,
    setSelectedFolderId,
    handleSelectNoteFromTree,
  } = useNotesAppContext();

  return (
    <FolderTree
      folders={folderTree}
      selectedFolderId={settings.selectedFolderId}
      selectedNotebookId={settings.selectedNotebookId}
      onSelectFolder={(id: string | null): void => {
        setSelectedFolderId(id);
        setSelectedNote(null);
        setIsEditing(false);
      }}
      onCreateFolder={(parentId?: string | null): void => { void operations.handleCreateFolder(parentId ?? null); }}
      onCreateNote={(folderId: string | null): void => {
        setSelectedFolderId(folderId);
        setIsCreating(true);
        setSelectedNote(null);
      }}
      onDeleteFolder={(id: string): void => { void operations.handleDeleteFolder(id); }}
      onRenameFolder={(id: string, name: string): void => { void operations.handleRenameFolder(id, name); }}
      onSelectNote={(id: string): void => { void handleSelectNoteFromTree(id); }}
      onDuplicateNote={(id: string): void => { void operations.handleDuplicateNote(id); }}
      onDeleteNote={(id: string): void => { void operations.handleDeleteNoteFromTree(id); }}
      onRenameNote={(id: string, title: string): void => { void operations.handleRenameNote(id, title); }}
      onRelateNotes={(id1: string, id2: string): void => { void operations.handleRelateNotes(id1, id2); }}
      selectedNoteId={selectedNote?.id}
      onDropNote={(id: string, folderId: string | null): void => { void operations.handleMoveNoteToFolder(id, folderId); }}
      onDropFolder={(id: string, parentId: string | null): void => { void operations.handleMoveFolderToFolder(id, parentId); }}
      onReorderFolder={(id: string, targetId: string, position: 'before' | 'after'): void => {
        void operations.handleReorderFolder(id, targetId, position);
      }}
      draggedNoteId={draggedNoteId}
      setDraggedNoteId={setDraggedNoteId}
      onToggleCollapse={(): void => setIsFolderTreeCollapsed(true)}
      isFavoritesActive={filters.filterFavorite === true}
      onToggleFavorites={(): void => filters.handleToggleFavoritesFilter(setSelectedFolderId, setSelectedNote, setIsEditing)}
      canUndo={undoStack.length > 0}
      onUndo={(): void => { void handleUndoFolderTree(1); }}
      undoHistory={undoHistory}
      onUndoAtIndex={handleUndoAtIndex}
      onRefreshFolders={async (): Promise<void> => { await fetchFolderTree(); }}
    />
  );
}
