'use client';

import React from 'react';
import { Pin, Star } from 'lucide-react';

import { useNotesAppContext } from '@/features/notesapp/hooks/NotesAppContext';
import { createStrictContext } from '@/shared/lib/react/createStrictContext';
import type { NoteWithRelations } from '@/shared/contracts/notes';
import { Button, CopyButton, Badge } from '@/shared/ui';

export type NoteCardHeaderRuntimeValue = {
  note: NoteWithRelations;
};

const {
  Context: NoteCardHeaderRuntimeContext,
  useStrictContext: useNoteCardHeaderRuntime,
} = createStrictContext<NoteCardHeaderRuntimeValue>({
  hookName: 'useNoteCardHeaderRuntime',
  providerName: 'NoteCardHeaderRuntimeProvider',
  displayName: 'NoteCardHeaderRuntimeContext',
});

export { NoteCardHeaderRuntimeContext };

export function NoteCardHeader(): React.JSX.Element {
  const { note } = useNoteCardHeaderRuntime();
  const { handleToggleFavorite } = useNotesAppContext();

  const isCodeNote = (note.editorType as string) === 'code';
  const onToggleFavorite = (target: NoteWithRelations): void => {
    void handleToggleFavorite(target);
  };

  return (
    <div className='mb-2 flex items-start justify-between gap-2'>
      <div className='flex items-center gap-2'>
        <h3 className='font-semibold'>{note.title}</h3>
        {isCodeNote && (
          <Badge variant='success' className='text-[10px] h-4'>
            CODE
          </Badge>
        )}
      </div>
      <div className='flex items-center gap-2'>
        {isCodeNote && (
          <CopyButton value={note.content} className='text-gray-500 hover:text-blue-500' />
        )}
        <Button
          type='button'
          variant='ghost'
          size='icon'
          className='h-auto w-auto p-0 text-gray-500 hover:bg-transparent hover:text-yellow-500'
          onMouseDown={(event: React.MouseEvent): void => event.preventDefault()}
          onClick={(event: React.MouseEvent): void => {
            event.stopPropagation();
            onToggleFavorite(note);
          }}
          aria-label={note.isFavorite ? 'Unfavorite note' : 'Favorite note'}
          title={note.isFavorite ? 'Remove favorite' : 'Add favorite'}
        >
          <Star size={16} className={note.isFavorite ? 'fill-yellow-400 text-yellow-500' : ''} />
        </Button>
        {note.isPinned && <Pin size={16} className='text-blue-600' />}
      </div>
    </div>
  );
}
