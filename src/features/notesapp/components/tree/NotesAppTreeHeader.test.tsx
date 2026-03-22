// @vitest-environment jsdom

import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

const selectNode = vi.fn();
const setSelectedNote = vi.fn();
const setIsEditing = vi.fn();
const setIsCreating = vi.fn();
const setIsFolderTreeCollapsed = vi.fn();
const handleUndoFolderTree = vi.fn();
const handleUndoAtIndex = vi.fn();
const setSelectedFolderId = vi.fn();
const handleToggleFavoritesFilter = vi.fn();
const handleCreateFolder = vi.fn();
const setPanelCollapsed = vi.fn();

vi.mock('@/features/notesapp/hooks/NotesAppContext', () => ({
  useNotesAppState: () => ({
    settings: {
      selectedFolderId: null,
      selectedNoteId: null,
    },
    filters: {
      filterFavorite: false,
      handleToggleFavoritesFilter,
    },
    undoStack: [{ label: 'Move folder' }],
    undoHistory: [{ label: 'Move folder' }],
  }),
  useNotesAppActions: () => ({
    setSelectedNote,
    setIsEditing,
    setIsCreating,
    setIsFolderTreeCollapsed,
    handleUndoFolderTree,
    handleUndoAtIndex,
    setSelectedFolderId,
    operations: { handleCreateFolder },
  }),
}));

import { NotesAppTreeHeader } from './NotesAppTreeHeader';

describe('NotesAppTreeHeader', () => {
  it('renders actions and quick filters directly and wires their handlers', () => {
    render(
      <NotesAppTreeHeader
        controller={{ selectNode } as never}
        selectedFolderForCreate='folder-1'
        setPanelCollapsed={setPanelCollapsed}
      />
    );

    expect(screen.getByText('Folders')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Add folder' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Add note' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Collapse folder tree' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'All Notes' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Favorites' })).toBeInTheDocument();
    expect(screen.getByText('History')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Add folder' }));
    fireEvent.click(screen.getByRole('button', { name: 'Add note' }));
    fireEvent.click(screen.getByRole('button', { name: 'Undo' }));
    fireEvent.click(screen.getByRole('button', { name: 'Collapse folder tree' }));
    fireEvent.click(screen.getByRole('button', { name: 'All Notes' }));
    fireEvent.click(screen.getByRole('button', { name: 'Favorites' }));
    fireEvent.click(screen.getByRole('button', { name: 'Move folder' }));

    expect(handleCreateFolder).toHaveBeenCalledWith('folder-1');
    expect(setSelectedFolderId).toHaveBeenCalledWith('folder-1');
    expect(setIsCreating).toHaveBeenCalledWith(true);
    expect(setSelectedNote).toHaveBeenCalledWith(null);
    expect(handleUndoFolderTree).toHaveBeenCalledWith(1);
    expect(setIsFolderTreeCollapsed).toHaveBeenCalledWith(true);
    expect(setPanelCollapsed).toHaveBeenCalledWith(true);
    expect(setSelectedFolderId).toHaveBeenCalledWith(null);
    expect(setIsEditing).toHaveBeenCalledWith(false);
    expect(selectNode).toHaveBeenCalledWith(null);
    expect(handleToggleFavoritesFilter).toHaveBeenCalledWith(
      setSelectedFolderId,
      setSelectedNote,
      setIsEditing
    );
    expect(handleUndoAtIndex).toHaveBeenCalledWith(0);
  });
});
