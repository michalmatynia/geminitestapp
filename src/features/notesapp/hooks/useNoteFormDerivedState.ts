'use client';

import { type UseQueryResult } from '@tanstack/react-query';
import { useState, useMemo, useEffect, useCallback } from 'react';

import type {
  CategoryWithChildren,
  NoteRelationRecord,
  NoteWithRelations,
  RelatedNote,
  ThemeRecord,
} from '@/shared/contracts/notes';
import { api } from '@/shared/lib/api-client';
import { createListQueryV2, createMultiQueryV2 } from '@/shared/lib/query-factories-v2';
import { normalizeQueryKey } from '@/shared/lib/query-key-utils';
import { QUERY_KEYS } from '@/shared/lib/query-keys';

import type { RelatedNoteItem } from '../context/note-form/NoteRelationsContext';

const FALLBACK_THEME = {
  id: 'fallback',
  name: 'Fallback Dark',
  createdAt: new Date(),
  updatedAt: new Date(),
  textColor: '#e5e7eb',
  backgroundColor: '#111827',
  markdownHeadingColor: '#ffffff',
  markdownLinkColor: '#60a5fa',
  markdownCodeBackground: '#1f2937',
  markdownCodeText: '#e5e7eb',
  relatedNoteBorderWidth: 1,
  relatedNoteBorderColor: '#374151',
  relatedNoteBackgroundColor: '#1f2937',
  relatedNoteTextColor: '#e5e7eb',
};

const flattenFolderTree = (
  folders: CategoryWithChildren[],
  level: number = 0
): Array<{ id: string; name: string; level: number }> => {
  const result: Array<{ id: string; name: string; level: number }> = [];
  for (const folder of folders) {
    result.push({ id: folder.id, name: folder.name, level });
    if (folder.children.length > 0) {
      result.push(...flattenFolderTree(folder.children, level + 1));
    }
  }
  return result;
};

export function useNoteFormDerivedState({
  color,
  folderTree,
  getReadableTextColor,
  handleSelectNoteFromTree,
  note,
  selectedFolderTheme,
  selectedNoteTheme,
  selectedNotebookId,
  setIsCreating,
}: {
  color: string;
  folderTree: CategoryWithChildren[];
  getReadableTextColor: (bgColor: string) => string;
  handleSelectNoteFromTree: (noteId: string) => Promise<void>;
  note: NoteWithRelations | null;
  selectedFolderTheme: ThemeRecord | null;
  selectedNoteTheme: ThemeRecord | null;
  selectedNotebookId: string | null;
  setIsCreating: (val: boolean) => void;
}) {
  const flatFolders = useMemo(
    () => flattenFolderTree(folderTree),
    [folderTree]
  );

  const initialCombinedRelations = useMemo((): RelatedNoteItem[] => {
    if (!note) return [];
    return [
      ...(note.relations ?? []).map((rel: RelatedNote) => ({
        id: rel.id,
        title: rel.title,
        color: rel.color ?? null,
        content: '',
      })),
      ...(note.relationsFrom ?? [])
        .map((rel: NoteRelationRecord & { targetNote?: RelatedNote }) =>
          rel.targetNote
            ? {
              id: rel.targetNote.id,
              title: rel.targetNote.title,
              color: rel.targetNote.color ?? null,
              content: '',
            }
            : null
        )
        .filter((item: RelatedNoteItem | null): item is RelatedNoteItem => Boolean(item)),
      ...(note.relationsTo ?? [])
        .map((rel: NoteRelationRecord & { sourceNote?: RelatedNote }) =>
          rel.sourceNote
            ? {
              id: rel.sourceNote.id,
              title: rel.sourceNote.title,
              color: rel.sourceNote.color ?? null,
              content: '',
            }
            : null
        )
        .filter((item: RelatedNoteItem | null): item is RelatedNoteItem => Boolean(item)),
    ].filter(
      (item: RelatedNoteItem, index: number, array: RelatedNoteItem[]) =>
        array.findIndex((entry: RelatedNoteItem) => entry.id === item.id) === index
    );
  }, [note]);

  const [selectedRelatedNotes, setSelectedRelatedNotes] =
    useState<RelatedNoteItem[]>(initialCombinedRelations);

  const relatedNotesQueries = createMultiQueryV2({
    queries: selectedRelatedNotes.map((rel: RelatedNoteItem) => {
      const queryKey = normalizeQueryKey(QUERY_KEYS.notes.detail(rel.id));
      return {
        queryKey,
        queryFn: () => api.get<NoteWithRelations>(`/api/notes/${rel.id}`),
        staleTime: 1000 * 60 * 5,
        meta: {
          source: 'notes.context.NoteFormContext.relatedNotes',
          operation: 'detail',
          resource: 'notes',
          description: 'Loads notes.',
          domain: 'global',
          queryKey,
          tags: ['notes', 'detail', 'related'],
        },
      };
    }),
  });

  useEffect(() => {
    const updated = selectedRelatedNotes.map((item: RelatedNoteItem, index: number) => {
      const query = relatedNotesQueries[index] as UseQueryResult<NoteWithRelations, Error>;
      if (query?.data) {
        return {
          ...item,
          content: query.data.content ?? '',
          title: query.data.title ?? item.title,
          color: query.data.color ?? item.color ?? null,
        };
      }
      return item;
    });
    if (JSON.stringify(updated) !== JSON.stringify(selectedRelatedNotes)) {
      setSelectedRelatedNotes(updated);
    }
  }, [relatedNotesQueries, selectedRelatedNotes]);

  const [relatedNoteQuery, setRelatedNoteQuery] = useState('');
  const [isRelatedDropdownOpen, setIsRelatedDropdownOpen] = useState(false);

  const relatedNoteSearchQuery = createListQueryV2<NoteWithRelations>({
    queryKey: QUERY_KEYS.notes.search(relatedNoteQuery),
    queryFn: async (): Promise<NoteWithRelations[]> => {
      if (!relatedNoteQuery) return [];
      const resolvedNotebookId = selectedNotebookId ?? note?.notebookId ?? null;
      return api.get<NoteWithRelations[]>('/api/notes', {
        params: {
          search: relatedNoteQuery,
          searchScope: 'title',
          ...(resolvedNotebookId ? { notebookId: resolvedNotebookId } : {}),
        },
      });
    },
    enabled: Boolean(relatedNoteQuery),
    meta: {
      source: 'notes.context.NoteFormContext.relatedNoteSearch',
      operation: 'list',
      resource: 'notes.search',
      domain: 'global',
      tags: ['notes', 'search', 'related'],
      description: 'Loads notes search.',
    },
  });

  const { data: relatedNoteResults = [], isFetching: isRelatedLoading } = relatedNoteSearchQuery;

  const handleSelectRelatedNote = useCallback(
    (noteId: string): void => {
      if (!note) {
        setIsCreating(false);
      }
      void handleSelectNoteFromTree(noteId);
    },
    [handleSelectNoteFromTree, note, setIsCreating]
  );

  const resolvedFolderTheme = note ? selectedNoteTheme : selectedFolderTheme;
  const effectiveTheme = (resolvedFolderTheme ?? FALLBACK_THEME) as ThemeRecord;
  const hasCustomColor: boolean = color !== '#ffffff';
  const contentBackground: string = hasCustomColor ? color : effectiveTheme.backgroundColor;
  const contentTextColor: string = hasCustomColor
    ? getReadableTextColor(contentBackground)
    : effectiveTheme.textColor;

  const previewTypographyStyle: React.CSSProperties = useMemo(
    (): React.CSSProperties => ({
      color: contentTextColor,
      ['--tw-prose-body' as never]: contentTextColor,
      ['--tw-prose-headings' as never]: effectiveTheme.markdownHeadingColor ?? contentTextColor,
      ['--tw-prose-lead' as never]: contentTextColor,
      ['--tw-prose-bold' as never]: contentTextColor,
      ['--tw-prose-counters' as never]: contentTextColor,
      ['--tw-prose-bullets' as never]: contentTextColor,
      ['--tw-prose-quotes' as never]: contentTextColor,
      ['--tw-prose-quote-borders' as never]: 'rgba(148, 163, 184, 0.35)',
      ['--tw-prose-hr' as never]: 'rgba(148, 163, 184, 0.35)',
      ['--note-link-color' as never]: effectiveTheme.markdownLinkColor,
      ['--note-code-bg' as never]: effectiveTheme.markdownCodeBackground,
      ['--note-code-text' as never]: effectiveTheme.markdownCodeText,
      ['--note-inline-code-bg' as never]: effectiveTheme.markdownCodeBackground,
    }),
    [contentTextColor, effectiveTheme]
  );

  return {
    flatFolders,
    selectedRelatedNotes,
    setSelectedRelatedNotes,
    relatedNoteQuery,
    setRelatedNoteQuery,
    isRelatedDropdownOpen,
    setIsRelatedDropdownOpen,
    relatedNoteResults,
    isRelatedLoading,
    handleSelectRelatedNote,
    effectiveTheme,
    contentBackground,
    contentTextColor,
    previewTypographyStyle,
  };
}
