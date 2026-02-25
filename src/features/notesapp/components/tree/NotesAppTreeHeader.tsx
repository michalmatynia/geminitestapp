'use client';

import React from 'react';
import { FolderPlus, FilePlus, ChevronRight, Star, Folder } from 'lucide-react';

import { useNotesAppContext } from '@/features/notesapp/hooks/NotesAppContext';
import { Button, TreeHeader } from '@/shared/ui';
import type { MasterFolderTreeController } from '@/shared/contracts/master-folder-tree';

export type NotesAppTreeHeaderProps = {
  controller: MasterFolderTreeController;
  selectedFolderForCreate: string | null;
  setPanelCollapsed: (collapsed: boolean) => void;
};

export function NotesAppTreeHeader({
  controller,
  selectedFolderForCreate,
  setPanelCollapsed,
}: NotesAppTreeHeaderProps): React.JSX.Element {
  const {
    settings,
    filters,
    setSelectedNote,
    setIsEditing,
    setIsCreating,
    setIsFolderTreeCollapsed,
    operations,
    undoStack,
    undoHistory,
    handleUndoFolderTree,
    handleUndoAtIndex,
    setSelectedFolderId,
  } = useNotesAppContext();

  const isAllNotesActive = !settings.selectedFolderId && !settings.selectedNoteId;

  return (
    <TreeHeader
      title='Folders'
      actions={(
        <>
          <Button
            onClick={(): void => {
              void operations.handleCreateFolder(selectedFolderForCreate);
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
            disabled={undoStack.length === 0}
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
      )}
    >
      <Button
        onClick={(): void => {
          setSelectedFolderId(null);
          setSelectedNote(null);
          setIsEditing(false);
          controller.selectNode(null);
        }}
        className={`w-full justify-start gap-2 px-2 py-1.5 text-left text-sm ${
          isAllNotesActive
            ? 'bg-blue-600 text-white'
            : 'text-gray-300 hover:bg-muted/50'
        }`}
      >
        <Folder className='size-4' />
        <span>All Notes</span>
      </Button>
      <Button
        onClick={(): void => {
          filters.handleToggleFavoritesFilter(
            setSelectedFolderId,
            setSelectedNote,
            setIsEditing
          );
        }}
        className={`mt-1 w-full justify-start gap-2 px-2 py-1.5 text-left text-sm ${
          filters.filterFavorite === true
            ? 'bg-yellow-500/20 text-yellow-200'
            : 'text-gray-300 hover:bg-muted/50'
        }`}
      >
        <Star className='size-4' />
        <span>Favorites</span>
      </Button>
      {undoHistory.length > 0 && (
        <div className='mt-3 rounded border border-border bg-card/60 p-2 text-xs text-gray-300'>
          <div className='mb-2 text-[10px] uppercase tracking-wide text-gray-500'>
            History
          </div>
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
