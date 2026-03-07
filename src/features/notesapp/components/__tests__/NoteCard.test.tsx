import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { NoteWithRelations } from '@/shared/contracts/notes';

const {
  nestedActionMock,
  setDraggedNoteIdMock,
  setIsEditingMock,
  setSelectedNoteMock,
} = vi.hoisted(() => ({
  nestedActionMock: vi.fn(),
  setDraggedNoteIdMock: vi.fn(),
  setIsEditingMock: vi.fn(),
  setSelectedNoteMock: vi.fn(),
}));

vi.mock('@/features/notesapp/hooks/NotesAppContext', () => ({
  useNotesAppState: () => ({
    isFolderTreeCollapsed: true,
    getThemeForNote: () => null,
  }),
  useNotesAppActions: () => ({
    setSelectedNote: setSelectedNoteMock,
    setIsEditing: setIsEditingMock,
    setDraggedNoteId: setDraggedNoteIdMock,
  }),
}));

vi.mock('@/features/notesapp/components/list/NoteCardHeader', async () => {
  const ReactModule = await import('react');

  const NoteCardHeaderRuntimeContext =
    ReactModule.createContext<{ note: NoteWithRelations } | null>(null);

  function NoteCardHeader(): React.JSX.Element | null {
    const value = ReactModule.useContext(NoteCardHeaderRuntimeContext);

    if (!value) {
      return null;
    }

    return (
      <div>
        <button type='button' onClick={nestedActionMock}>
          Nested action
        </button>
        <span>{value.note.title}</span>
      </div>
    );
  }

  return {
    NoteCardHeader,
    NoteCardHeaderRuntimeContext,
  };
});

vi.mock('@/features/notesapp/components/list/NoteCardContent', () => ({
  NoteCardContent: () => <div>content</div>,
}));

vi.mock('@/features/notesapp/components/list/NoteCardFooter', () => ({
  NoteCardFooter: () => <div>footer</div>,
}));

import { NoteCard } from '@/features/notesapp/components/NoteCard';

const note: NoteWithRelations = {
  id: 'note-1',
  createdAt: '2026-03-07T00:00:00.000Z',
  updatedAt: '2026-03-07T00:00:00.000Z',
  title: 'Test note',
  content: 'Body',
  editorType: 'markdown',
  notebookId: null,
  categoryId: null,
  color: null,
  isPinned: false,
  isFavorite: false,
  isArchived: false,
  tags: [],
  tagIds: [],
  categories: [],
  categoryIds: [],
  relatedNoteIds: [],
  relations: [],
};

describe('NoteCard', () => {
  beforeEach(() => {
    nestedActionMock.mockReset();
    setDraggedNoteIdMock.mockReset();
    setIsEditingMock.mockReset();
    setSelectedNoteMock.mockReset();
  });

  it('selects the note from the card wrapper via click and keyboard', () => {
    render(<NoteCard note={note} />);

    const card = screen.getByRole('button', { name: 'Open note Test note' });

    fireEvent.click(card);
    fireEvent.keyDown(card, { key: 'Enter' });
    fireEvent.keyDown(card, { key: ' ' });

    expect(setSelectedNoteMock).toHaveBeenCalledTimes(3);
    expect(setSelectedNoteMock).toHaveBeenNthCalledWith(1, note);
    expect(setSelectedNoteMock).toHaveBeenNthCalledWith(2, note);
    expect(setSelectedNoteMock).toHaveBeenNthCalledWith(3, note);
    expect(setIsEditingMock).toHaveBeenCalledTimes(3);
    expect(setIsEditingMock).toHaveBeenNthCalledWith(1, false);
    expect(setIsEditingMock).toHaveBeenNthCalledWith(2, false);
    expect(setIsEditingMock).toHaveBeenNthCalledWith(3, false);
  });

  it('ignores nested interactive controls when handling card selection', () => {
    render(<NoteCard note={note} />);

    fireEvent.click(screen.getByRole('button', { name: 'Nested action' }));

    expect(nestedActionMock).toHaveBeenCalledTimes(1);
    expect(setSelectedNoteMock).not.toHaveBeenCalled();
    expect(setIsEditingMock).not.toHaveBeenCalled();
  });
});
