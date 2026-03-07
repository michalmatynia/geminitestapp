'use client';

import React from 'react';

import { useNotesAppActions, useNotesAppState } from '@/features/notesapp/hooks/NotesAppContext';
import type { ThemeRecord, NoteWithRelations } from '@/shared/contracts/notes';
import { cn, setNoteDragData } from '@/shared/utils';

import {
  NoteCardHeader,
  NoteCardHeaderRuntimeContext,
  type NoteCardHeaderRuntimeValue,
} from './list/NoteCardHeader';
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

const shouldIgnoreSelectionTarget = (
  target: EventTarget | null,
  currentTarget: HTMLElement
): boolean => {
  if (!(target instanceof HTMLElement)) return false;

  let current: HTMLElement | null = target;
  while (current && current !== currentTarget) {
    const tagName = current.tagName;
    if (
      tagName === 'BUTTON' ||
      tagName === 'A' ||
      tagName === 'INPUT' ||
      tagName === 'TEXTAREA' ||
      tagName === 'SELECT' ||
      tagName === 'SUMMARY'
    ) {
      return true;
    }

    const role = current.getAttribute('role');
    if (
      role === 'button' ||
      role === 'link' ||
      role === 'menuitem' ||
      role === 'option' ||
      current.isContentEditable
    ) {
      return true;
    }

    current = current.parentElement;
  }

  return false;
};

function NoteCardBase({ note }: NoteCardProps): React.JSX.Element {
  const { isFolderTreeCollapsed, getThemeForNote } = useNotesAppState();
  const { setSelectedNote, setIsEditing, setDraggedNoteId } = useNotesAppActions();
  const cardRef = React.useRef<HTMLDivElement | null>(null);

  const enableDrag = !isFolderTreeCollapsed;
  const onSelectNote = (next: NoteWithRelations): void => {
    setSelectedNote(next);
    setIsEditing(false);
  };
  const onDragStart = (noteId: string): void => setDraggedNoteId(noteId);
  const onDragEnd = (): void => setDraggedNoteId(null);
  const onNoteDragStart = (event: React.DragEvent<HTMLElement>): void => {
    setNoteDragData(event.dataTransfer, note.id);
    if (cardRef.current) {
      cardRef.current.style.opacity = '0.5';
    }
    onDragStart(note.id);
  };
  const onNoteDragEnd = (): void => {
    if (cardRef.current) {
      cardRef.current.style.opacity = '1';
    }
    onDragEnd();
  };

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
  const noteCardHeaderRuntimeValue = React.useMemo<NoteCardHeaderRuntimeValue>(
    () => ({
      note,
      backgroundColor,
      relatedNoteStyle,
      onSelectNote,
      enableDrag,
      onNoteDragStart,
      onNoteDragEnd,
    }),
    [
      note,
      backgroundColor,
      relatedNoteStyle,
      onSelectNote,
      enableDrag,
      onNoteDragStart,
      onNoteDragEnd,
    ]
  );

  return (
    <div
      ref={cardRef}
      key={note.id}
      role='button'
      tabIndex={0}
      aria-label={`Open note ${note.title}`}
      onClick={(event: React.MouseEvent<HTMLElement>): void => {
        if (shouldIgnoreSelectionTarget(event.target, event.currentTarget)) {
          return;
        }
        if (event.defaultPrevented) return;
        onSelectNote(note);
      }}
      onKeyDown={(event: React.KeyboardEvent<HTMLElement>): void => {
        if (
          event.target !== event.currentTarget ||
          shouldIgnoreSelectionTarget(event.target, event.currentTarget)
        ) {
          return;
        }
        if (event.defaultPrevented) return;
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          onSelectNote(note);
        }
      }}
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
        'cursor-pointer hover:shadow-md hover:brightness-90'
      )}
    >
      <NoteCardHeaderRuntimeContext.Provider value={noteCardHeaderRuntimeValue}>
        <div>
          <NoteCardHeader />
          <NoteCardContent />
          <NoteCardFooter />
        </div>
      </NoteCardHeaderRuntimeContext.Provider>
    </div>
  );
}

export const NoteCard = React.memo(NoteCardBase);
NoteCard.displayName = 'NoteCard';
