'use client';

import { useCallback } from 'react';


import type {
  NoteRelationWithSource,
  NoteRelationWithTarget,
  NoteUpdateInput,
  NoteWithRelations,
} from '@/shared/contracts/notes';
import type { Toast } from '@/shared/contracts/ui/ui/base';
import { api } from '@/shared/lib/api-client';
import { fetchQueryV2 } from '@/shared/lib/query-factories-v2';
import { QUERY_KEYS } from '@/shared/lib/query-keys';
import { logClientCatch } from '@/shared/utils/observability/client-error-logger';

import type { NotesAppActionsValue, NotesAppStateValue } from './NotesAppContext.types';
import type { UseNoteDataResult } from './useNoteData';
import type { QueryClient } from '@tanstack/react-query';

type UpdateNoteInput = NoteUpdateInput & { id: string };

export function useNotesAppEntityHandlers({
  confirmAction,
  deleteNote,
  fetchFolderTree,
  fetchNotes,
  fetchTags,
  filters,
  queryClient,
  selectedNote,
  setNotes,
  setIsCreating,
  setIsEditing,
  setSelectedFolderId,
  setSelectedNote,
  toast,
  updateNote,
  updateSettings,
}: {
  confirmAction: NotesAppActionsValue['confirmAction'];
  deleteNote: (noteId: string) => Promise<unknown>;
  fetchFolderTree: UseNoteDataResult['fetchFolderTree'];
  fetchNotes: UseNoteDataResult['fetchNotes'];
  fetchTags: UseNoteDataResult['fetchTags'];
  filters: NotesAppStateValue['filters'];
  queryClient: QueryClient;
  selectedNote: NotesAppStateValue['selectedNote'];
  setNotes: UseNoteDataResult['setNotes'];
  setIsCreating: NotesAppActionsValue['setIsCreating'];
  setIsEditing: NotesAppActionsValue['setIsEditing'];
  setSelectedFolderId: NotesAppActionsValue['setSelectedFolderId'];
  setSelectedNote: NotesAppActionsValue['setSelectedNote'];
  toast: Toast;
  updateNote: (input: UpdateNoteInput) => Promise<unknown>;
  updateSettings: NotesAppActionsValue['updateSettings'];
}) {
  const handleSelectNoteFromTree = useCallback(
    async (noteId: string): Promise<void> => {
      try {
        const note = await fetchQueryV2<NoteWithRelations>(queryClient, {
          queryKey: QUERY_KEYS.notes.detail(noteId),
          queryFn: () => api.get<NoteWithRelations>(`/api/notes/${noteId}`),
          staleTime: 10_000,
          meta: {
            source: 'notes.context.handleSelectNoteFromTree',
            operation: 'detail',
            resource: 'notes.detail',
            domain: 'notes',
            queryKey: QUERY_KEYS.notes.detail(noteId),
            tags: ['notes', 'detail', 'fetch'],
            description: 'Loads notes detail.',
          },
        })();
        setSelectedNote(note);
        updateSettings({ selectedNoteId: noteId });
        setIsEditing(false);
      } catch (error: unknown) {
        logClientCatch(error, {
          source: 'NotesAppProvider',
          action: 'fetchNote',
          noteId,
        });
      }
    },
    [queryClient, setIsEditing, setSelectedNote, updateSettings]
  );

  const handleCreateSuccess = useCallback((): void => {
    setIsCreating(false);
    void fetchNotes();
    void fetchFolderTree();
  }, [fetchFolderTree, fetchNotes, setIsCreating]);

  const handleFilterByTag = useCallback(
    (tagId: string): void => {
      filters.handleFilterByTag(tagId, setSelectedFolderId, setSelectedNote, setIsEditing);
    },
    [filters, setIsEditing, setSelectedFolderId, setSelectedNote]
  );

  const handleUpdateSuccess = useCallback((): void => {
    setIsEditing(false);
    void fetchNotes();
    void fetchFolderTree();
    if (selectedNote) {
      void queryClient.invalidateQueries({ queryKey: QUERY_KEYS.notes.detail(selectedNote.id) });
      void handleSelectNoteFromTree(selectedNote.id);
    }
  }, [
    fetchFolderTree,
    fetchNotes,
    handleSelectNoteFromTree,
    queryClient,
    selectedNote,
    setIsEditing,
  ]);

  const handleToggleFavorite = useCallback(
    async (note: NoteWithRelations): Promise<void> => {
      const nextFavorite: boolean = !note.isFavorite;
      try {
        await updateNote({
          id: note.id,
          isFavorite: nextFavorite,
        });

        setNotes((prev): NoteWithRelations[] => {
          return (
            prev?.map((item: NoteWithRelations): NoteWithRelations =>
              item.id === note.id ? { ...item, isFavorite: nextFavorite } : item
            ) ?? []
          );
        });

        queryClient.setQueriesData<NoteWithRelations[]>(
          { queryKey: QUERY_KEYS.notes.lists() },
          (prev): NoteWithRelations[] | undefined =>
            prev?.map((item: NoteWithRelations): NoteWithRelations =>
              item.id === note.id ? { ...item, isFavorite: nextFavorite } : item
            )
        );

        queryClient.setQueryData<NoteWithRelations | null>(
          QUERY_KEYS.notes.detail(note.id),
          (prev): NoteWithRelations | null | undefined =>
            prev ? { ...prev, isFavorite: nextFavorite } : prev
        );

        if (selectedNote?.id === note.id) {
          setSelectedNote({ ...selectedNote, isFavorite: nextFavorite });
        }
      } catch (error: unknown) {
        logClientCatch(error, {
          source: 'NotesAppProvider',
          action: 'toggleFavorite',
          noteId: note.id,
        });
        toast('Failed to update favorite', { variant: 'error' });
      }
    },
    [queryClient, selectedNote, setNotes, setSelectedNote, toast, updateNote]
  );

  const handleUnlinkRelatedNote = useCallback(
    async (relatedId: string): Promise<void> => {
      if (!selectedNote) return;
      try {
        const sourceRelations: string[] =
          selectedNote.relations?.map((rel: { id: string }): string => rel.id) ||
          [
            ...(selectedNote.relationsFrom ?? [])
              .map((rel: NoteRelationWithTarget) => rel.targetNote?.id)
              .filter((rid: string | undefined): rid is string => !!rid),
            ...(selectedNote.relationsTo ?? [])
              .map((rel: NoteRelationWithSource) => rel.sourceNote?.id)
              .filter((rid: string | undefined): rid is string => !!rid),
          ].filter(
            (id: string, index: number, array: string[]): boolean => array.indexOf(id) === index
          );

        const nextSourceIds: string[] = sourceRelations.filter(
          (id: string): boolean => id !== relatedId
        );

        await updateNote({
          id: selectedNote.id,
          relatedNoteIds: nextSourceIds,
        });

        toast('Note unlinked');
        await fetchNotes();
        void handleSelectNoteFromTree(selectedNote.id);
      } catch (error: unknown) {
        logClientCatch(error, {
          source: 'NotesAppProvider',
          action: 'unlinkNote',
          noteId: selectedNote.id,
          relatedId,
        });
        toast('Failed to unlink note', { variant: 'error' });
      }
    },
    [fetchNotes, handleSelectNoteFromTree, selectedNote, toast, updateNote]
  );

  const handleDeleteNote = useCallback(async (): Promise<void> => {
    if (!selectedNote) return;
    confirmAction({
      title: 'Delete Note?',
      message: 'Are you sure you want to delete this note?',
      confirmText: 'Delete',
      isDangerous: true,
      onConfirm: async () => {
        try {
          await deleteNote(selectedNote.id);
          setSelectedNote(null);
          setIsEditing(false);
        } catch (error: unknown) {
          logClientCatch(error, {
            source: 'NotesAppProvider',
            action: 'deleteNote',
            noteId: selectedNote.id,
          });
          toast('Failed to delete note', { variant: 'error' });
        }
      },
    });
  }, [confirmAction, deleteNote, selectedNote, setIsEditing, setSelectedNote, toast]);

  const fetchTagsAction = useCallback((): void => {
    void fetchTags();
  }, [fetchTags]);

  return {
    handleSelectNoteFromTree,
    handleCreateSuccess,
    handleFilterByTag,
    handleUpdateSuccess,
    handleToggleFavorite,
    handleUnlinkRelatedNote,
    handleDeleteNote,
    fetchTagsAction,
  };
}
