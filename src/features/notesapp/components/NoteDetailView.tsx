'use client';

import React from 'react';

import {
  useNotesAppActions,
  useNotesAppState,
} from '@/features/notesapp/hooks/NotesAppContext';
import { NoteForm } from './NoteForm';
import { NoteDetailBreadcrumbs } from './detail/NoteDetailBreadcrumbs';
import { NoteDetailActions } from './detail/NoteDetailActions';
import { NoteDetailPreview } from './detail/NoteDetailPreview';

export function NoteDetailView(): React.JSX.Element | null {
  const { selectedNote, isEditing } = useNotesAppState();
  const { handleUpdateSuccess } = useNotesAppActions();

  if (!selectedNote) return null;

  return (
    <div className='flex h-full flex-col'>
      <NoteDetailBreadcrumbs />
      <NoteDetailActions />

      {isEditing ? (
        <div className='flex-1 overflow-y-auto'>
          <NoteForm note={selectedNote} onSuccess={handleUpdateSuccess} />
        </div>
      ) : (
        <NoteDetailPreview />
      )}
    </div>
  );
}
