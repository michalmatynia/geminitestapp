'use client';

import React from 'react';

import { useNotesAppContext } from '@/features/notesapp/hooks/NotesAppContext';
import type { ThemeRecord, NoteWithRelations } from '@/shared/contracts/notes';
import { cn, setNoteDragData } from '@/shared/utils';

import { NoteCardHeader } from './list/NoteCardHeader';
import { NoteCardContent } from './list/NoteCardContent';
import { NoteCardFooter } from './list/NoteCardFooter';

// Hardcoded dark mode fallback theme - consistent with page styling
const FALLBACK_THEME: Omit<ThemeRecord, 'id' | 'createdAt' | 'updatedAt' | 'name' | 'notebookId'> =
  {
    description: 'Default dark theme',
    isDefault: true,
    textColor: '#e5e7eb', // gray-200
    backgroundColor: '#111827', // gray-900
    markdownHeadingColor: '#ffffff', // white
    markdownLinkColor: '#60a5fa', // blue-400
    markdownCodeBackground: '#1f2937', // gray-800
    markdownCodeText: '#e5e7eb', // gray-200
    relatedNoteBorderWidth: 1,
    relatedNoteBorderColor: '#374151', // gray-700
    relatedNoteBackgroundColor: '#1f2937', // gray-800
    relatedNoteTextColor: '#e5e7eb', // gray-200
  };

type NoteCardProps = {
  note: NoteWithRelations;
};

function NoteCardBase({ note }: NoteCardProps): React.JSX.Element {
  const {
    isFolderTreeCollapsed,
    setSelectedNote,
    setIsEditing,
    setDraggedNoteId,
    getThemeForNote,
  } = useNotesAppContext();

  const enableDrag = !isFolderTreeCollapsed;
  const onSelectNote = (next: NoteWithRelations): void => {
    setSelectedNote(next);
    setIsEditing(false);
  };
  const onDragStart = (noteId: string): void => setDraggedNoteId(noteId);
  const onDragEnd = (): void => setDraggedNoteId(null);

  // Use provided theme or fall back to dark mode theme
  const effectiveTheme = getThemeForNote(note) ?? FALLBACK_THEME;

  const normalizedColor = note.color?.toLowerCase().trim();
  // Only use note's custom color if it's not white (default)
  const hasCustomColor = normalizedColor && normalizedColor !== '#ffffff';
  const backgroundColor = hasCustomColor ? normalizedColor : effectiveTheme.backgroundColor;

  const getReadableTextColor = (hexColor: string): string => {
    const normalized = hexColor.replace('#', '');
    if (!/^[0-9a-fA-F]{6}$/.test(normalized)) {
      return '#111827';
    }
    const r = parseInt(normalized.slice(0, 2), 16);
    const g = parseInt(normalized.slice(2, 4), 16);
    const b = parseInt(normalized.slice(4, 6), 16);
    const luminance = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
    return luminance > 0.7 ? '#111827' : '#f8fafc';
  };

  const textColor = hasCustomColor
    ? getReadableTextColor(backgroundColor)
    : effectiveTheme.textColor;

  const relatedNoteStyle = {
    borderWidth: `${effectiveTheme.relatedNoteBorderWidth ?? 1}px`,
    borderColor: effectiveTheme.relatedNoteBorderColor,
    backgroundColor: effectiveTheme.relatedNoteBackgroundColor,
    color: effectiveTheme.relatedNoteTextColor,
  } as const;

  return (
    <div
      key={note.id}
      draggable={enableDrag}
      onDragStart={
        enableDrag
          ? (e: React.DragEvent): void => {
              setNoteDragData(e.dataTransfer, note.id);
              const target = e.currentTarget as HTMLElement;
              target.style.opacity = '0.5';
              onDragStart(note.id);
            }
          : undefined
      }
      onDragEnd={
        enableDrag
          ? (e: React.DragEvent): void => {
              const target = e.currentTarget as HTMLElement;
              target.style.opacity = '1';
              onDragEnd();
            }
          : undefined
      }
      onClick={(): void => onSelectNote(note)}
      style={{
        backgroundColor,
        color: textColor,
        ['--tw-prose-body' as never]: textColor,
        ['--tw-prose-headings' as never]: effectiveTheme.markdownHeadingColor ?? textColor,
        ['--note-link-color' as never]: effectiveTheme.markdownLinkColor ?? '#38bdf8',
        ['--note-code-bg' as never]: effectiveTheme.markdownCodeBackground ?? '#0f172a',
        ['--note-code-text' as never]: effectiveTheme.markdownCodeText ?? '#e2e8f0',
        ['--note-inline-code-bg' as never]:
          effectiveTheme.markdownCodeBackground ?? 'rgba(15, 23, 42, 0.12)',
      }}
      className={cn(
        'rounded-lg border border-border/60 p-4 transition',
        enableDrag
          ? 'cursor-grab active:cursor-grabbing hover:shadow-md'
          : 'cursor-pointer hover:shadow-md hover:brightness-90'
      )}
    >
      <NoteCardHeader note={note} />
      <NoteCardContent note={note} />
      <NoteCardFooter
        note={note}
        backgroundColor={backgroundColor}
        relatedNoteStyle={relatedNoteStyle}
      />
    </div>
  );
}

export const NoteCard = React.memo(NoteCardBase);
NoteCard.displayName = 'NoteCard';
