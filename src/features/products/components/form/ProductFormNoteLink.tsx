'use client';

import { Link2, Plus, X } from 'lucide-react';
import Link from 'next/link';
import { useMemo, useState } from 'react';

import { useProductFormCore } from '@/features/products/context/ProductFormCoreContext';
import type { NoteWithRelations, RelatedNote } from '@/shared/contracts/notes';
import { useConfirm } from '@/shared/hooks/ui/useConfirm';
import { api } from '@/shared/lib/api-client';
import { createListQueryV2 } from '@/shared/lib/query-factories-v2';
import { QUERY_KEYS } from '@/shared/lib/query-keys';
import { Button, Input, FormSection, EmptyState, LoadingState } from '@/features/products/ui';

type NotesLookupResult = RelatedNote[];

function useNotesSearch(query: string): { notes: NoteWithRelations[]; loading: boolean } {
  const q = query.trim();
  const res = createListQueryV2<NoteWithRelations[], NoteWithRelations[]>({
    queryKey: QUERY_KEYS.notes.search(q),
    queryFn: () =>
      api.get<NoteWithRelations[]>('/api/notes', {
        params: { truncateContent: 'true', searchScope: 'title', search: q },
      }),
    enabled: q.length >= 2,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    meta: {
      source: 'products.form.note-link.search',
      operation: 'list',
      resource: 'notes.search',
      domain: 'global',
      tags: ['products', 'notes', 'search'],
      description: 'Loads notes search.'},
  });

  return { notes: res.data ?? [], loading: res.isLoading };
}

function useNotesLookup(noteIds: string[]): { notes: NotesLookupResult; loading: boolean } {
  const ids = noteIds.filter(Boolean);
  const res = createListQueryV2<NotesLookupResult, NotesLookupResult>({
    queryKey: QUERY_KEYS.notes.lookup(ids),
    queryFn: () =>
      api.get<NotesLookupResult>('/api/notes/lookup', {
        params: { ids: ids.join(',') },
      }),
    enabled: ids.length > 0,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    meta: {
      source: 'products.form.note-link.lookup',
      operation: 'list',
      resource: 'notes.lookup',
      domain: 'global',
      tags: ['products', 'notes', 'lookup'],
      description: 'Loads notes lookup.'},
  });

  return { notes: res.data ?? [], loading: res.isLoading };
}

export default function ProductFormNoteLink(): React.JSX.Element {
  const { selectedNoteIds, toggleNote, removeNote } = useProductFormCore();
  const { confirm, ConfirmationModal } = useConfirm();
  const [query, setQuery] = useState('');

  const { notes: searchResults, loading: searching } = useNotesSearch(query);
  const { notes: linkedNotes, loading: loadingLinked } = useNotesLookup(selectedNoteIds);

  const linkedMap = useMemo(() => {
    const map = new Map<string, RelatedNote>();
    linkedNotes.forEach((n: RelatedNote) => map.set(n.id, n));
    return map;
  }, [linkedNotes]);

  const orderedLinked = useMemo(() => {
    return selectedNoteIds
      .map((id: string) => linkedMap.get(id) ?? null)
      .filter((n: RelatedNote | null): n is RelatedNote => n !== null);
  }, [linkedMap, selectedNoteIds]);

  return (
    <div className='space-y-6'>
      <FormSection
        title='Search & Attach'
        description='Find notes by title to link them with this product.'
      >
        <div className='flex gap-2'>
          <Input
            id='note-link-search'
            value={query}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setQuery(e.target.value)}
            aria-label='Search notes'
            placeholder='Type at least 2 characters...'
            className='max-w-md h-9'
           title='Type at least 2 characters...'/>
          {query.trim() && (
            <Button
              type='button'
              variant='outline'
              size='icon'
              onClick={() => setQuery('')}
              title='Clear search'
              aria-label='Clear search'
              className='h-9 w-9'
            >
              <X className='size-4' />
            </Button>
          )}
        </div>

        <div className='mt-2 space-y-2 max-h-[300px] overflow-y-auto pr-1'>
          {query.trim().length < 2 ? (
            <div className='text-xs text-muted-foreground italic py-4 text-center'>
              Start typing to search notes...
            </div>
          ) : searching ? (
            <LoadingState message='Searching...' className='py-4' size='sm' />
          ) : searchResults.length === 0 ? (
            <EmptyState
              title='No notes found'
              description='No notes match your search criteria.'
              variant='compact'
              className='py-6'
            />
          ) : (
            searchResults.slice(0, 10).map((note: NoteWithRelations) => {
              const isLinked = selectedNoteIds.includes(note.id);
              return (
                <div
                  key={note.id}
                  className='flex items-center justify-between gap-3 rounded-md border border-border bg-gray-900/50 px-3 py-2 transition-colors hover:border-border/80'
                >
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
                    {isLinked ? (
                      'Attached'
                    ) : (
                      <>
                        <Plus className='size-3' />
                        Attach
                      </>
                    )}
                  </Button>
                </div>
              );
            })
          )}
        </div>
      </FormSection>

      <FormSection
        title='Linked Notes'
        description={
          selectedNoteIds.length === 0
            ? 'No notes linked yet.'
            : `${selectedNoteIds.length} note(s) attached.`
        }
      >
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
                message:
                  'Are you sure you want to remove all linked notes from this product? The notes themselves will not be deleted.',
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
          {selectedNoteIds.length === 0 ? (
            <EmptyState
              title='No notes linked yet'
              description='Search and attach notes above to link them with this product.'
              variant='compact'
              className='py-8'
            />
          ) : loadingLinked ? (
            <LoadingState message='Loading linked notes...' size='sm' className='py-8' />
          ) : orderedLinked.length === 0 ? (
            <EmptyState
              title='Details unavailable'
              description='Linked note details could not be loaded.'
              variant='compact'
              className='py-8'
            />
          ) : (
            orderedLinked.map((note: RelatedNote) => (
              <div
                key={note.id}
                className='flex items-center justify-between gap-3 rounded-md border border-border bg-gray-900 px-3 py-2'
              >
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
            ))
          )}
          {selectedNoteIds.length > 0 && (
            <div className='pt-2 text-[10px] text-gray-500 text-center uppercase tracking-widest font-semibold'>
              Manage all content in{' '}
              <Link href='/admin/notes' className='text-blue-400 hover:underline'>
                Notes App
              </Link>
            </div>
          )}
        </div>
      </FormSection>

      <ConfirmationModal />
    </div>
  );
}
