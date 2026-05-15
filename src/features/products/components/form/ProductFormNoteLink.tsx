'use client';

import { useMemo, useState } from 'react';

import { useProductFormCore } from '@/features/products/context/ProductFormCoreContext';
import type { NoteWithRelations, RelatedNote } from '@/shared/contracts/notes';
import { useConfirm } from '@/shared/hooks/ui/useConfirm';
import { api } from '@/shared/lib/api-client';
import { useListQueryV2 } from '@/shared/lib/query-factories-v2';
import { QUERY_KEYS } from '@/shared/lib/query-keys';

import {
  LinkedNotesSection,
  SearchAttachSection,
} from './ProductFormNoteLink.sections';

type NotesLookupResult = RelatedNote[];

function useNotesSearch(query: string): { notes: NoteWithRelations[]; loading: boolean } {
  const q = query.trim();
  const res = useListQueryV2<NoteWithRelations[], NoteWithRelations[]>({
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
  const res = useListQueryV2<NotesLookupResult, NotesLookupResult>({
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
      <SearchAttachSection
        query={query}
        searching={searching}
        searchResults={searchResults}
        selectedNoteIds={selectedNoteIds}
        setQuery={setQuery}
        toggleNote={toggleNote}
      />
      <LinkedNotesSection
        confirm={confirm}
        loadingLinked={loadingLinked}
        orderedLinked={orderedLinked}
        removeNote={removeNote}
        selectedNoteIds={selectedNoteIds}
      />
      <ConfirmationModal />
    </div>
  );
}
