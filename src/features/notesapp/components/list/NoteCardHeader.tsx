'use client';

import { GripVertical, Pin, Star } from 'lucide-react';
import React from 'react';

import { useNotesAppActions } from '@/features/notesapp/hooks/NotesAppContext';
import type { NoteWithRelations } from '@/shared/contracts/notes';
import { Button, Badge } from '@/shared/ui/primitives.public';
import { CopyButton } from '@/shared/ui/forms-and-actions.public';

export type NoteCardHeaderProps = {
  note: NoteWithRelations;
  onSelectNote: (note: NoteWithRelations) => void;
  enableDrag: boolean;
  onNoteDragStart: (event: React.DragEvent<HTMLElement>) => void;
  onNoteDragEnd: () => void;
};

export function NoteCardHeader(props: NoteCardHeaderProps): React.JSX.Element {
  const { note, onSelectNote, enableDrag, onNoteDragStart, onNoteDragEnd } = props;
  const { handleToggleFavorite } = useNotesAppActions();

  const isCodeNote = (note.editorType as string) === 'code';
  const onToggleFavorite = (target: NoteWithRelations): void => {
    void handleToggleFavorite(target);
  };

  return (
    <div className='mb-2 flex items-start justify-between gap-2'>
      <div className='flex min-w-0 flex-1 items-start gap-2'>
        {enableDrag ? (
          <button
            type='button'
            draggable
            className='mt-0.5 inline-flex size-6 shrink-0 cursor-grab items-center justify-center rounded text-gray-500 transition hover:bg-black/10 hover:text-gray-200 active:cursor-grabbing'
            onDragStart={(event: React.DragEvent<HTMLButtonElement>): void => {
              event.stopPropagation();
              onNoteDragStart(event);
            }}
            onDragEnd={(): void => onNoteDragEnd()}
            onClick={(event: React.MouseEvent<HTMLButtonElement>): void => {
              event.preventDefault();
              event.stopPropagation();
            }}
            aria-label='Drag note'
            title='Drag note'
          >
            <GripVertical size={16} aria-hidden='true' />
          </button>
        ) : null}
        <button
          type='button'
          className='min-w-0 flex flex-1 items-center gap-2 rounded-sm text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 focus-visible:ring-offset-2 focus-visible:ring-offset-black/20'
          onClick={(): void => onSelectNote(note)}
          aria-label={`Open note ${note.title}`}
        >
          <h3 className='font-semibold'>{note.title}</h3>
          {isCodeNote && (
            <Badge variant='success' className='text-[10px] h-4'>
              CODE
            </Badge>
          )}
        </button>
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
