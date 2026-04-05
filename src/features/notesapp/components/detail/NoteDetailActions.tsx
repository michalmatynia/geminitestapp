'use client';

import { Star } from 'lucide-react';
import React from 'react';

import { useNotesAppActions, useNotesAppState } from '@/features/notesapp/hooks/NotesAppContext';
import { TriggerButtonBar } from '@/shared/lib/ai-paths/components/trigger-buttons/TriggerButtonBar';
import { Button } from '@/shared/ui/primitives.public';
import { UI_CENTER_ROW_RELAXED_CLASSNAME } from '@/shared/ui/navigation-and-layout.public';

export function NoteDetailActions(): React.JSX.Element | null {
  const { selectedNote, isEditing } = useNotesAppState();
  const { setSelectedNote, setIsEditing, handleToggleFavorite, handleDeleteNote } =
    useNotesAppActions();

  if (!selectedNote) return null;

  return (
    <div className={`${UI_CENTER_ROW_RELAXED_CLASSNAME} mb-4`}>
      <Button
        onClick={(): void => {
          if (isEditing) {
            setIsEditing(false);
          } else {
            setSelectedNote(null);
          }
        }}
        className='min-w-[80px] border border-white/20 hover:border-white/40'
      >
        Back
      </Button>
      <Button
        type='button'
        onClick={(): void => {
          void handleToggleFavorite(selectedNote);
        }}
        className='flex items-center gap-2 border border-white/20 hover:border-white/40'
      >
        <Star
          size={16}
          className={selectedNote.isFavorite ? 'fill-yellow-400 text-yellow-500' : ''}
        />
        <span className='text-sm'>{selectedNote.isFavorite ? 'Favorited' : 'Favorite'}</span>
      </Button>
      {!isEditing ? (
        <Button
          onClick={(): void => setIsEditing(true)}
          className='min-w-[80px] border border-white/20 hover:border-white/40'
        >
          Edit
        </Button>
      ) : (
        <>
          <Button
            type='button'
            form='note-edit-form'
            onClick={(): void => {
              const form = document.getElementById('note-edit-form') as HTMLFormElement;
              form?.requestSubmit();
            }}
            className='min-w-[80px] border border-white/20 hover:border-white/40'
          >
            Update
          </Button>
          <Button
            type='button'
            onClick={(): void => setIsEditing(false)}
            className='min-w-[80px] border border-white/20 hover:border-white/40'
          >
            Cancel
          </Button>
          <Button
            type='button'
            onClick={(): void => {
              void handleDeleteNote();
            }}
            className='min-w-[80px] border border-red-500/20 hover:border-red-500/40 text-red-400'
          >
            Delete
          </Button>
        </>
      )}
      <div className='ml-auto'>
        <TriggerButtonBar
          location='note_modal'
          entityType='note'
          entityId={selectedNote.id}
          getEntityJson={() => selectedNote as Record<string, unknown>}
        />
      </div>
    </div>
  );
}
