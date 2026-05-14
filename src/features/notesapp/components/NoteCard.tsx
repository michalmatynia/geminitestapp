'use client';

import React, { useRef } from 'react';
import { useNotesAppActions, useNotesAppState } from '@/features/notesapp/hooks/NotesAppContext';
import type { NoteWithRelations } from '@/shared/contracts/notes';
import { cn } from '@/shared/utils/ui-utils';
import { setNoteDragData } from '@/shared/utils/drag-drop';
import { renderNoteCardContent } from './list/NoteCardContent';
import { NoteCardFooter } from './list/NoteCardFooter';
import { NoteCardHeader } from './list/NoteCardHeader';
import { FALLBACK_THEME, getReadableTextColor } from './list/NoteCardTheme';

type NoteCardProps = { note: NoteWithRelations };

export function NoteCard({ note }: NoteCardProps): React.JSX.Element {
  const { isFolderTreeCollapsed, getThemeForNote } = useNotesAppState();
  const { setSelectedNote, setIsEditing, setDraggedNoteId } = useNotesAppActions();
  const cardRef = useRef<HTMLDivElement | null>(null);

  const theme = getThemeForNote(note) ?? FALLBACK_THEME;
  const color = note.color ?? '#ffffff';
  const hasCustom = color.toLowerCase().trim() !== '#ffffff';
  const bg = hasCustom ? color : theme.backgroundColor;
  const text = hasCustom ? getReadableTextColor(bg) : theme.textColor;

  const onDrag = (e: React.DragEvent<HTMLElement>, start: boolean): void => {
    if (start) {
      setNoteDragData(e.dataTransfer, note.id);
      if (cardRef.current) cardRef.current.style.opacity = '0.5';
      setDraggedNoteId(note.id);
    } else {
      if (cardRef.current) cardRef.current.style.opacity = '1';
      setDraggedNoteId(null);
    }
  };

  return (
    <div
      ref={cardRef}
      onClick={() => { setSelectedNote(note); setIsEditing(false); }}
      style={{ backgroundColor: bg, color: text }}
      className={cn('rounded-lg border border-border/60 p-4 transition cursor-pointer hover:shadow-md hover:brightness-90')}
    >
      <NoteCardHeader
        note={note}
        onSelectNote={(n) => { setSelectedNote(n); setIsEditing(false); }}
        enableDrag={!isFolderTreeCollapsed}
        onNoteDragStart={(e) => onDrag(e, true)}
        onNoteDragEnd={(e) => onDrag(e as React.DragEvent<HTMLElement>, false)}
      />
      {renderNoteCardContent({ note })}
      <NoteCardFooter
        note={note}
        backgroundColor={bg}
        relatedNoteStyle={{
          borderWidth: `${theme.relatedNoteBorderWidth ?? 1}px`,
          borderColor: theme.relatedNoteBorderColor ?? 'transparent',
          backgroundColor: theme.relatedNoteBackgroundColor ?? 'transparent',
          color: theme.relatedNoteTextColor ?? 'inherit',
        }}
      />
    </div>
  );
}
