'use client';

import React, { useMemo } from 'react';
import { X } from 'lucide-react';

import { useNotesLookup } from '@/features/notesapp/api/useNoteQueries';
import {
  useNotesAppActions,
  useNotesAppState,
} from '@/features/notesapp/hooks/NotesAppContext';
import { Button } from '@/shared/ui';
import type { RelatedNote, NoteRelationRecord } from '@/shared/contracts/notes';

type NoteRelationWithTarget = NoteRelationRecord & {
  targetNote?: RelatedNote | undefined;
};

type NoteRelationWithSource = NoteRelationRecord & {
  sourceNote?: RelatedNote | undefined;
};

export function NoteDetailRelatedNotes(): React.JSX.Element | null {
  const { selectedNote, selectedNoteTheme } = useNotesAppState();
  const { handleSelectNoteFromTree, handleUnlinkRelatedNote } = useNotesAppActions();

  const onSelectRelatedNote = (id: string): void => {
    void handleSelectNoteFromTree(id);
  };

  const onUnlinkRelatedNote = (id: string): Promise<void> => handleUnlinkRelatedNote(id);

  const relatedNotes = useMemo((): RelatedNote[] => {
    if (!selectedNote) return [];
    if (selectedNote.relations && selectedNote.relations.length > 0) {
      return selectedNote.relations;
    }

    const build = (
      id: string | undefined,
      title: string | undefined,
      color: string | null | undefined
    ): RelatedNote | null =>
      id ? { id, title: title ?? 'Untitled note', color: color ?? null } : null;

    const fromRelations = (selectedNote.relationsFrom ?? [])
      .map((relation: NoteRelationWithTarget) =>
        build(
          relation.targetNote?.id ?? relation.targetNoteId,
          relation.targetNote?.title,
          relation.targetNote?.color
        )
      )
      .filter((item: RelatedNote | null): item is RelatedNote => Boolean(item));

    const toRelations = (selectedNote.relationsTo ?? [])
      .map((relation: NoteRelationWithSource) =>
        build(
          relation.sourceNote?.id ?? relation.sourceNoteId,
          relation.sourceNote?.title,
          relation.sourceNote?.color
        )
      )
      .filter((item: RelatedNote | null): item is RelatedNote => Boolean(item));

    return [...fromRelations, ...toRelations];
  }, [selectedNote]);

  const relationIds = useMemo(
    (): string[] =>
      relatedNotes
        .map((rel: RelatedNote) => rel.id)
        .filter(
          (id: string, index: number, array: string[]): boolean =>
            array.findIndex((entry: string): boolean => entry === id) === index
        ),
    [relatedNotes]
  );

  const { data: linkedDetails } = useNotesLookup(relationIds);

  const relatedPreviewNotes = useMemo(() => {
    const map: Record<string, RelatedNote> = {};
    (linkedDetails ?? []).forEach((n) => {
      map[n.id] = {
        id: n.id,
        title: n.title,
        color: n.color,
        content: n.content ?? undefined,
      };
    });
    return map;
  }, [linkedDetails]);

  const fallbackTheme = useMemo(
    () => ({
      relatedNoteBorderWidth: 1,
      relatedNoteBorderColor: '#374151',
      relatedNoteBackgroundColor: '#1f2937',
      relatedNoteTextColor: '#e5e7eb',
    }),
    []
  );

  const effectivePreviewTheme = selectedNoteTheme ?? fallbackTheme;

  const relatedPreviewStyle = useMemo(
    () => ({
      borderWidth: `${effectivePreviewTheme.relatedNoteBorderWidth ?? 1}px`,
      borderColor: effectivePreviewTheme.relatedNoteBorderColor ?? 'rgba(15, 23, 42, 0.2)',
      backgroundColor: effectivePreviewTheme.relatedNoteBackgroundColor ?? 'rgba(15, 23, 42, 0.05)',
      color: effectivePreviewTheme.relatedNoteTextColor ?? '#f8fafc',
    }),
    [effectivePreviewTheme]
  );

  if (!selectedNote || relatedNotes.length === 0) return null;

  return (
    <div className='mt-6 space-y-4'>
      <div className='space-y-2'>
        <div className='text-xs uppercase tracking-wide text-gray-400'>Related Notes</div>
        <div className='flex flex-wrap gap-2'>
          {relatedNotes
            .filter(
              (noteItem: RelatedNote, index: number, array: RelatedNote[]) =>
                array.findIndex((item: RelatedNote) => item.id === noteItem.id) === index
            )
            .map((related: RelatedNote) => {
              const relatedNote = relatedPreviewNotes[related.id];
              return (
                <div
                  key={related.id}
                  className='relative w-40 cursor-pointer rounded-md border border-border/60 bg-card/30 p-2 text-left text-xs transition hover:bg-muted/40'
                  style={relatedPreviewStyle}
                  role='button'
                  tabIndex={0}
                  onClick={(): void => onSelectRelatedNote(related.id)}
                  onKeyDown={(event: React.KeyboardEvent<HTMLDivElement>): void => {
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault();
                      onSelectRelatedNote(related.id);
                    }
                  }}
                >
                  <div className='truncate font-semibold'>
                    {relatedNote?.title ?? related.title}
                  </div>
                  <div className='line-clamp-2 text-[11px] opacity-80'>
                    {relatedNote?.content ?? 'No content'}
                  </div>
                  <Button
                    type='button'
                    onClick={(event: React.MouseEvent<HTMLButtonElement>): void => {
                      event.stopPropagation();
                      void onUnlinkRelatedNote(related.id);
                    }}
                    className='absolute right-2 top-2 opacity-70 hover:opacity-100'
                    aria-label='Unlink related note'
                  >
                    <X size={12} />
                  </Button>
                </div>
              );
            })}
        </div>
      </div>
    </div>
  );
}
