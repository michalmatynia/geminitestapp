'use client';

import React, { useMemo } from 'react';
import { FolderPlus, FilePlus, ChevronRight, Star, Folder } from 'lucide-react';

import { useNotesAppContext } from '@/features/notesapp/hooks/NotesAppContext';
import { createStrictContext } from '@/shared/lib/react/createStrictContext';
import type { NoteWithRelations } from '@/shared/contracts/notes';
import { Button, TreeHeader } from '@/shared/ui';
import type { MasterFolderTreeController } from '@/shared/contracts/master-folder-tree';

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

const {
  Context: NotesAppTreeHeaderActionsRuntimeContext,
  useStrictContext: useNotesAppTreeHeaderActionsRuntime,
} = createStrictContext<NotesAppTreeHeaderActionsRuntimeValue>({
  hookName: 'useNotesAppTreeHeaderActionsRuntime',
  providerName: 'NotesAppTreeHeaderActionsRuntimeProvider',
  displayName: 'NotesAppTreeHeaderActionsRuntimeContext',
});

function NotesAppTreeHeaderActions(): React.JSX.Element {
  const {
    selectedFolderForCreate,
    undoStackLength,
    setSelectedNote,
    setIsCreating,
    setSelectedFolderId,
    setIsFolderTreeCollapsed,
    setPanelCollapsed,
    handleUndoFolderTree,
    handleCreateFolder,
  } = useNotesAppTreeHeaderActionsRuntime();

  return (
    <>
      <Button
        onClick={(): void => {
          void handleCreateFolder(selectedFolderForCreate);
        }}
        size='sm'
        variant='outline'
        className='h-7 w-7 p-0 border text-gray-300 hover:bg-muted/50'
        title='Add folder'
      >
        <FolderPlus className='size-4' />
      </Button>
      <Button
        onClick={(): void => {
          setSelectedFolderId(selectedFolderForCreate);
          setIsCreating(true);
          setSelectedNote(null);
        }}
        size='sm'
        variant='outline'
        className='h-7 w-7 p-0 border text-gray-300 hover:bg-muted/50'
        title='Add note'
      >
        <FilePlus className='size-4' />
      </Button>
      <Button
        onClick={(): void => {
          void handleUndoFolderTree(1);
        }}
        size='sm'
        variant='outline'
        className='h-7 px-2 border text-gray-300 hover:bg-muted/50'
        disabled={undoStackLength === 0}
      >
        Undo
      </Button>
      <Button
        onClick={(): void => {
          setIsFolderTreeCollapsed(true);
          setPanelCollapsed(true);
        }}
        size='sm'
        variant='outline'
        className='h-7 w-7 p-0 border text-gray-300 hover:bg-muted/50'
        title='Collapse folder tree'
      >
        <ChevronRight className='size-4' />
      </Button>
    </>
  );
}

function NotesAppTreeHeaderQuickFilters(): React.JSX.Element {
  const { isAllNotesActive, isFavoritesFilterActive, onSelectAllNotes, onToggleFavorites } =
    useNotesAppTreeHeaderActionsRuntime();
  return (
    <>
      <Button
        onClick={onSelectAllNotes}
        className={`w-full justify-start gap-2 px-2 py-1.5 text-left text-sm ${
          isAllNotesActive ? 'bg-blue-600 text-white' : 'text-gray-300 hover:bg-muted/50'
        }`}
      >
        <Folder className='size-4' />
        <span>All Notes</span>
      </Button>
      <Button
        onClick={onToggleFavorites}
        className={`mt-1 w-full justify-start gap-2 px-2 py-1.5 text-left text-sm ${
          isFavoritesFilterActive ? 'bg-yellow-500/20 text-yellow-200' : 'text-gray-300 hover:bg-muted/50'
        }`}
      >
        <Star className='size-4' />
        <span>Favorites</span>
      </Button>
    </>
  );
}

export function NotesAppTreeHeader({
  controller,
  selectedFolderForCreate,
  setPanelCollapsed,
}: NotesAppTreeHeaderProps): React.JSX.Element {
  const notesAppContext = useNotesAppContext();
  const {
    settings,
    filters,
    setSelectedNote,
    setIsEditing,
    setIsCreating,
    setIsFolderTreeCollapsed,
    undoStack,
    undoHistory,
    handleUndoFolderTree,
    handleUndoAtIndex,
    setSelectedFolderId,
  } = notesAppContext;
  const operations = notesAppContext.operations as NotesTreeHeaderOperations;

  const isAllNotesActive = !settings.selectedFolderId && !settings.selectedNoteId;
  const actionsRuntimeValue = useMemo(
    () => ({
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
      handleCreateFolder: operations.handleCreateFolder,
    }),
    [
      controller,
      filters,
      handleUndoFolderTree,
      isAllNotesActive,
      operations.handleCreateFolder,
      selectedFolderForCreate,
      setIsCreating,
      setIsEditing,
      setIsFolderTreeCollapsed,
      setPanelCollapsed,
      setSelectedFolderId,
      setSelectedNote,
      undoStack.length,
    ]
  );

  return (
    <NotesAppTreeHeaderActionsRuntimeContext.Provider value={actionsRuntimeValue}>
      <TreeHeader title='Folders' actions={<NotesAppTreeHeaderActions />}>
        <NotesAppTreeHeaderQuickFilters />
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
    </NotesAppTreeHeaderActionsRuntimeContext.Provider>
  );
}
