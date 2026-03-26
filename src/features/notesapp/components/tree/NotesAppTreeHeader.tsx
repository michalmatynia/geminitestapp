'use client';

import { FolderPlus, FilePlus, ChevronRight, Star, Folder } from 'lucide-react';
import React from 'react';

import { useNotesAppActions, useNotesAppState } from '@/features/notesapp/hooks/NotesAppContext';
import type { MasterFolderTreeController } from '@/shared/contracts/master-folder-tree';
import type { NoteWithRelations } from '@/shared/contracts/notes';
import { Button, TreeHeader } from '@/shared/ui';

type NotesTreeHeaderOperations = {
  handleCreateFolder: (parentId?: string | null) => Promise<void>;
};

export type NotesAppTreeHeaderProps = {
  controller: MasterFolderTreeController;
  selectedFolderForCreate: string | null;
  setPanelCollapsed: (collapsed: boolean) => void;
};

type NotesAppTreeHeaderActionsRuntimeValue = {
  selectedFolderForCreate: string | null;
  undoStackLength: number;
  isAllNotesActive: boolean;
  isFavoritesFilterActive: boolean;
  setSelectedNote: (note: NoteWithRelations | null) => void;
  setIsCreating: (isCreating: boolean) => void;
  setSelectedFolderId: (folderId: string | null) => void;
  setIsFolderTreeCollapsed: (isCollapsed: boolean) => void;
  setPanelCollapsed: (collapsed: boolean) => void;
  onSelectAllNotes: () => void;
  onToggleFavorites: () => void;
  handleUndoFolderTree: (steps: number) => Promise<void>;
  handleCreateFolder: (parentId?: string | null) => Promise<void>;
};

export function NotesAppTreeHeader({
  controller,
  selectedFolderForCreate,
  setPanelCollapsed,
}: NotesAppTreeHeaderProps): React.JSX.Element {
  const { settings, filters, undoStack, undoHistory } = useNotesAppState();
  const {
    setSelectedNote,
    setIsEditing,
    setIsCreating,
    setIsFolderTreeCollapsed,
    handleUndoFolderTree,
    handleUndoAtIndex,
    setSelectedFolderId,
    operations,
  } = useNotesAppActions();

  const isAllNotesActive = !settings.selectedFolderId && !settings.selectedNoteId;
  const actionsRuntimeValue: NotesAppTreeHeaderActionsRuntimeValue = {
    selectedFolderForCreate,
    undoStackLength: undoStack.length,
    isAllNotesActive,
    isFavoritesFilterActive: filters.filterFavorite === true,
    setSelectedNote,
    setIsCreating,
    setSelectedFolderId,
    setIsFolderTreeCollapsed,
    setPanelCollapsed,
    onSelectAllNotes: () => {
      setSelectedFolderId(null);
      setSelectedNote(null);
      setIsEditing(false);
      controller.selectNode(null);
    },
    onToggleFavorites: () => {
      filters.handleToggleFavoritesFilter(setSelectedFolderId, setSelectedNote, setIsEditing);
    },
    handleUndoFolderTree,
    handleCreateFolder: (operations as NotesTreeHeaderOperations).handleCreateFolder,
  };

  return (
    <TreeHeader
      title='Folders'
      actions={
        <>
          <Button
            onClick={(): void => {
              void actionsRuntimeValue.handleCreateFolder(actionsRuntimeValue.selectedFolderForCreate);
            }}
            size='sm'
            variant='outline'
            className='h-7 w-7 p-0 border text-gray-300 hover:bg-muted/50'
            title='Add folder'
            aria-label='Add folder'
          >
            <FolderPlus className='size-4' />
          </Button>
          <Button
            onClick={(): void => {
              actionsRuntimeValue.setSelectedFolderId(actionsRuntimeValue.selectedFolderForCreate);
              actionsRuntimeValue.setIsCreating(true);
              actionsRuntimeValue.setSelectedNote(null);
            }}
            size='sm'
            variant='outline'
            className='h-7 w-7 p-0 border text-gray-300 hover:bg-muted/50'
            title='Add note'
            aria-label='Add note'
          >
            <FilePlus className='size-4' />
          </Button>
          <Button
            onClick={(): void => {
              void actionsRuntimeValue.handleUndoFolderTree(1);
            }}
            size='sm'
            variant='outline'
            className='h-7 px-2 border text-gray-300 hover:bg-muted/50'
            disabled={actionsRuntimeValue.undoStackLength === 0}
          >
            Undo
          </Button>
          <Button
            onClick={(): void => {
              actionsRuntimeValue.setIsFolderTreeCollapsed(true);
              actionsRuntimeValue.setPanelCollapsed(true);
            }}
            size='sm'
            variant='outline'
            className='h-7 w-7 p-0 border text-gray-300 hover:bg-muted/50'
            title='Collapse folder tree'
            aria-label='Collapse folder tree'
          >
            <ChevronRight className='size-4' />
          </Button>
        </>
      }
    >
      <Button
        onClick={actionsRuntimeValue.onSelectAllNotes}
        className={`w-full justify-start gap-2 px-2 py-1.5 text-left text-sm ${
          actionsRuntimeValue.isAllNotesActive
            ? 'bg-blue-600 text-white'
            : 'text-gray-300 hover:bg-muted/50'
        }`}
      >
        <Folder className='size-4' />
        <span>All Notes</span>
      </Button>
      <Button
        onClick={actionsRuntimeValue.onToggleFavorites}
        className={`mt-1 w-full justify-start gap-2 px-2 py-1.5 text-left text-sm ${
          actionsRuntimeValue.isFavoritesFilterActive
            ? 'bg-yellow-500/20 text-yellow-200'
            : 'text-gray-300 hover:bg-muted/50'
        }`}
      >
        <Star className='size-4' />
        <span>Favorites</span>
      </Button>
        {undoHistory.length > 0 && (
          <div className='mt-3 rounded border border-border bg-card/60 p-2 text-xs text-gray-300'>
            <div className='mb-2 text-[10px] uppercase tracking-wide text-gray-500'>History</div>
            <div className='space-y-1'>
              {undoHistory.slice(0, 10).map((entry: { label: string }, index: number) => (
                <Button
                  key={`${entry.label}-${index}`}
                  type='button'
                  onClick={(): void => handleUndoAtIndex(index)}
                  className='flex w-full items-center justify-between rounded px-1.5 py-1 text-left text-gray-300 hover:bg-muted/50'
                >
                  <span className='truncate'>{entry.label}</span>
                </Button>
              ))}
            </div>
          </div>
        )}
    </TreeHeader>
  );
}
