'use client';

import { Link2, Plus, X } from 'lucide-react';
import Link from 'next/link';
import React from 'react';

import type { NoteWithRelations, RelatedNote } from '@/shared/contracts/notes';
import type { useConfirm } from '@/shared/hooks/ui/useConfirm';
import { Button } from '@/shared/ui/button';
import { CompactEmptyState } from '@/shared/ui/empty-state';
import { FormSection } from '@/shared/ui/form-section';
import { Input } from '@/shared/ui/input';
import { LoadingState } from '@/shared/ui/LoadingState';

type ConfirmFn = ReturnType<typeof useConfirm>['confirm'];

function NoteSearchResultRow({
  note,
  selectedNoteIds,
  toggleNote,
}: {
  note: NoteWithRelations;
  selectedNoteIds: string[];
  toggleNote: (noteId: string) => void;
}): React.JSX.Element {
  const isLinked = selectedNoteIds.includes(note.id);

  return (
    <div className='flex items-center justify-between gap-3 rounded-md border border-border bg-gray-900/50 px-3 py-2 transition-colors hover:border-border/80'>
      <div className='min-w-0'>
        <div className='truncate text-sm font-medium text-gray-100'>{note.title}</div>
        <div className='truncate text-[10px] text-gray-500 font-mono'>{note.id}</div>
      </div>
      <Button
        type='button'
        onClick={() => toggleNote(note.id)}
        disabled={isLinked}
        variant={isLinked ? 'ghost' : 'secondary'}
        size='sm'
        className='h-7 px-2 text-[11px] gap-1'
      >
        {isLinked ? 'Attached' : <><Plus className='size-3' />Attach</>}
      </Button>
    </div>
  );
}

function NoteSearchResults({
  query,
  searching,
  searchResults,
  selectedNoteIds,
  toggleNote,
}: {
  query: string;
  searching: boolean;
  searchResults: NoteWithRelations[];
  selectedNoteIds: string[];
  toggleNote: (noteId: string) => void;
}): React.JSX.Element {
  const trimmedQuery = query.trim();

  if (trimmedQuery.length < 2) {
    return (
      <div className='text-xs text-muted-foreground italic py-4 text-center'>
        Start typing to search notes...
      </div>
    );
  }
  if (searching) return <LoadingState message='Searching...' className='py-4' size='sm' />;
  if (searchResults.length === 0) {
    return (
      <CompactEmptyState
        title='No notes found'
        description='No notes match your search criteria.'
        className='py-6'
      />
    );
  }

  return (
    <>
      {searchResults.slice(0, 10).map((note: NoteWithRelations) => (
        <NoteSearchResultRow
          key={note.id}
          note={note}
          selectedNoteIds={selectedNoteIds}
          toggleNote={toggleNote}
        />
      ))}
    </>
  );
}

export function SearchAttachSection({
  query,
  searching,
  searchResults,
  selectedNoteIds,
  setQuery,
  toggleNote,
}: {
  query: string;
  searching: boolean;
  searchResults: NoteWithRelations[];
  selectedNoteIds: string[];
  setQuery: React.Dispatch<React.SetStateAction<string>>;
  toggleNote: (noteId: string) => void;
}): React.JSX.Element {
  const showClearButton = query.trim().length > 0;

  return (
    <FormSection title='Search & Attach' description='Find notes by title to link them with this product.'>
      <div className='flex gap-2'>
        <Input
          id='note-link-search'
          value={query}
          onChange={(event: React.ChangeEvent<HTMLInputElement>) => setQuery(event.target.value)}
          aria-label='Search notes'
          placeholder='Type at least 2 characters...'
          className='max-w-md h-9'
          title='Type at least 2 characters...'
        />
        {showClearButton ? (
          <Button type='button' variant='outline' size='icon' onClick={() => setQuery('')} title='Clear search' aria-label='Clear search' className='h-9 w-9'>
            <X className='size-4' />
          </Button>
        ) : null}
      </div>
      <div className='mt-2 space-y-2 max-h-[300px] overflow-y-auto pr-1'>
        <NoteSearchResults
          query={query}
          searching={searching}
          searchResults={searchResults}
          selectedNoteIds={selectedNoteIds}
          toggleNote={toggleNote}
        />
      </div>
    </FormSection>
  );
}

function LinkedNoteRow({
  note,
  removeNote,
}: {
  note: RelatedNote;
  removeNote: (noteId: string) => void;
}): React.JSX.Element {
  return (
    <div className='flex items-center justify-between gap-3 rounded-md border border-border bg-gray-900 px-3 py-2'>
      <div className='flex min-w-0 items-center gap-3'>
        <span className='inline-flex size-8 items-center justify-center rounded-md bg-gray-800 text-blue-400'>
          <Link2 className='size-4' />
        </span>
        <div className='min-w-0'>
          <div className='truncate text-sm font-medium text-gray-100'>{note.title}</div>
          <div className='truncate text-[10px] text-gray-500 font-mono'>{note.id}</div>
        </div>
      </div>
      <Button
        type='button'
        variant='ghost'
        size='sm'
        onClick={() => removeNote(note.id)}
        className='h-7 px-2 text-[11px] text-gray-400 hover:text-red-400 hover:bg-red-950/20'
      >
        Remove
      </Button>
    </div>
  );
}

function LinkedNotesList({
  loadingLinked,
  orderedLinked,
  removeNote,
  selectedNoteIds,
}: {
  loadingLinked: boolean;
  orderedLinked: RelatedNote[];
  removeNote: (noteId: string) => void;
  selectedNoteIds: string[];
}): React.JSX.Element {
  if (selectedNoteIds.length === 0) {
    return (
      <CompactEmptyState
        title='No notes linked yet'
        description='Search and attach notes above to link them with this product.'
        className='py-8'
      />
    );
  }
  if (loadingLinked) return <LoadingState message='Loading linked notes...' size='sm' className='py-8' />;
  if (orderedLinked.length === 0) {
    return (
      <CompactEmptyState
        title='Details unavailable'
        description='Linked note details could not be loaded.'
        className='py-8'
      />
    );
  }

  return (
    <>
      {orderedLinked.map((note: RelatedNote) => (
        <LinkedNoteRow key={note.id} note={note} removeNote={removeNote} />
      ))}
    </>
  );
}

export function LinkedNotesSection({
  confirm,
  loadingLinked,
  orderedLinked,
  removeNote,
  selectedNoteIds,
}: {
  confirm: ConfirmFn;
  loadingLinked: boolean;
  orderedLinked: RelatedNote[];
  removeNote: (noteId: string) => void;
  selectedNoteIds: string[];
}): React.JSX.Element {
  const description =
    selectedNoteIds.length === 0 ? 'No notes linked yet.' : `${selectedNoteIds.length} note(s) attached.`;

  return (
    <FormSection title='Linked Notes' description={description}>
      <div className='flex justify-end'>
        <Button
          type='button'
          variant='outline'
          size='sm'
          className='text-[11px] h-7 text-red-400 border-red-900/30 hover:bg-red-950/30'
          onClick={(): void => {
            if (selectedNoteIds.length === 0) return;
            confirm({
              title: 'Unlink All Notes?',
              message: 'Are you sure you want to remove all linked notes from this product? The notes themselves will not be deleted.',
              confirmText: 'Unlink All',
              isDangerous: true,
              onConfirm: () => {
                selectedNoteIds.forEach((id: string) => removeNote(id));
              },
            });
          }}
          disabled={selectedNoteIds.length === 0}
        >
          Clear All
        </Button>
      </div>
      <div className='mt-2 space-y-2'>
        <LinkedNotesList
          loadingLinked={loadingLinked}
          orderedLinked={orderedLinked}
          removeNote={removeNote}
          selectedNoteIds={selectedNoteIds}
        />
        {selectedNoteIds.length > 0 ? (
          <div className='pt-2 text-[10px] text-gray-500 text-center uppercase tracking-widest font-semibold'>
            Manage all content in{' '}
            <Link href='/admin/notes' className='text-blue-400 hover:underline'>
              Notes App
            </Link>
          </div>
        ) : null}
      </div>
    </FormSection>
  );
}
