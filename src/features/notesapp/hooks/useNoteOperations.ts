import { useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';

import { findFolderParentId, findFolderById } from '@/features/foldertree';
import type { UseNoteOperationsProps } from '@/features/notesapp/types/notes-hooks';
import type { UndoAction } from '@/features/notesapp/types/notes-hooks';
import { ApiError } from '@/shared/lib/api-client';
import { QUERY_KEYS } from '@/shared/lib/query-keys';
import type { NoteWithRelations, CategoryWithChildren } from '@/shared/types/domain/notes';
import { logClientError } from '@/shared/utils/observability/client-error-logger';

import {
  useCreateCategoryMutation,
  useDeleteCategoryMutation,
  useUpdateCategoryMutation,
  useCreateNoteMutation,
  useDeleteNoteMutation,
  useUpdateNoteMutation,
} from './useNoteData';

const NOTES_STALE_MS = 10_000;

export function useNoteOperations({
  selectedNotebookId,
  notesRef,
  folderTreeRef,
  setUndoStack,
  toast,
  setSelectedFolderId,
  setSelectedNote,
  selectedNote,
}: UseNoteOperationsProps): {
  handleCreateFolder: (parentId?: string | null) => Promise<void>;
  handleDeleteFolder: (folderId: string) => Promise<void>;
  handleRenameFolder: (folderId: string, newName: string) => Promise<void>;
  handleDuplicateNote: (noteId: string) => Promise<void>;
  handleDeleteNoteFromTree: (noteId: string) => Promise<void>;
  handleRenameNote: (noteId: string, newTitle: string) => Promise<void>;
  handleMoveNoteToFolder: (noteId: string, folderId: string | null) => Promise<void>;
  handleMoveFolderToFolder: (folderId: string, targetParentId: string | null) => Promise<void>;
  handleReorderFolder: (folderId: string, targetId: string, position: 'before' | 'after') => Promise<void>;
  handleRelateNotes: (sourceNoteId: string, targetNoteId: string) => Promise<void>;
} {
  const queryClient = useQueryClient();
  const createCategoryMutation = useCreateCategoryMutation();
  const deleteCategoryMutation = useDeleteCategoryMutation();
  const updateCategoryMutation = useUpdateCategoryMutation();
  const createNoteMutation = useCreateNoteMutation();
  const deleteNoteMutation = useDeleteNoteMutation();
  const updateNoteMutation = useUpdateNoteMutation();

  const handleCreateFolder = useCallback(async (parentId?: string | null): Promise<void> => {
    const folderName = prompt('Enter folder name:');
    if (!folderName) return;

    try {
      if (!selectedNotebookId) return;
      const created = await createCategoryMutation.mutateAsync({
        name: folderName,
        parentId: parentId ?? null,
        notebookId: selectedNotebookId,
      });

      if (created?.id) {
        setSelectedFolderId(created.id);
      }
      toast('Folder created successfully');
    } catch (error: unknown) {
      logClientError(error, { context: { source: 'useNoteOperations.handleCreateFolder' } });
      toast('An unexpected error occurred while creating the folder', { variant: 'error' });
    }
  }, [selectedNotebookId, createCategoryMutation, setSelectedFolderId, toast]);

  const handleDeleteFolder = useCallback(async (folderId: string): Promise<void> => {
    if (!confirm('Delete this folder and all its contents (subfolders, notes, and attachments)? This action cannot be undone.')) return;

    try {
      await deleteCategoryMutation.mutateAsync(folderId);
      toast('Folder deleted successfully');
    } catch (error: unknown) {
      logClientError(error, { context: { source: 'useNoteOperations.handleDeleteFolder', folderId } });
      toast('An unexpected error occurred while deleting the folder', { variant: 'error' });
    }
  }, [deleteCategoryMutation, toast]);

  const handleRenameFolder = useCallback(async (folderId: string, newName: string): Promise<void> => {
    const currentFolder = findFolderById(folderTreeRef.current, folderId);
    const previousName = currentFolder?.name ?? '';
    try {
      await updateCategoryMutation.mutateAsync({ id: folderId, name: newName });

      if (previousName && previousName !== newName) {
        setUndoStack((prev: UndoAction[]) => [
          { type: 'renameFolder', folderId, fromName: previousName, toName: newName },
          ...prev,
        ]);
      }
      toast('Folder renamed successfully');
    } catch (error: unknown) {
      logClientError(error, { context: { source: 'useNoteOperations.handleRenameFolder', folderId, newName } });
      toast('An unexpected error occurred while renaming the folder', { variant: 'error' });
    }
  }, [folderTreeRef, updateCategoryMutation, setUndoStack, toast]);

  const handleDuplicateNote = useCallback(async (noteId: string): Promise<void> => {
    try {
      const note = await queryClient.fetchQuery<NoteWithRelations>({
        queryKey: QUERY_KEYS.notes.detail(noteId),
        queryFn: async (): Promise<NoteWithRelations> => {
          const response = await fetch(`/api/notes/${noteId}`);
          if (!response.ok) throw new ApiError('Failed to fetch note', response.status);
          return response.json() as Promise<NoteWithRelations>;
        },
        staleTime: NOTES_STALE_MS,
      });

      const baseTitle = note.title.replace(/\s*\(\d+\)$/, '');
      let newTitle = `${baseTitle} (1)`;

      const existingNotes = notesRef.current.filter((n: NoteWithRelations) =>
        n.title.startsWith(baseTitle) && n.title !== note.title
      );
      if (existingNotes.length > 0) {
        const numbers = existingNotes
          .map((n: NoteWithRelations) => {
            const match = n.title.match(/\((\d+)\)$/);
            return match ? parseInt(match[1]!, 10) : 0;
          })
          .filter((n: number) => n > 0);
        const maxNumber = Math.max(0, ...numbers);
        newTitle = `${baseTitle} (${maxNumber + 1})`;
      }

      await createNoteMutation.mutateAsync({
        title: newTitle,
        content: note.content,
        color: note.color,
        isPinned: note.isPinned,
        isArchived: note.isArchived,
        isFavorite: note.isFavorite,
        tagIds: note.tags.map((t: { tagId: string }) => t.tagId),
        categoryIds: note.categories.map((c: { categoryId: string }) => c.categoryId),
        notebookId: note.notebookId ?? selectedNotebookId ?? null,
      });

      toast('Note duplicated successfully');
    } catch (error: unknown) {
      logClientError(error, { context: { source: 'useNoteOperations.handleDuplicateNote', noteId } });
      toast('An unexpected error occurred while duplicating the note', { variant: 'error' });
    }
  }, [selectedNotebookId, notesRef, createNoteMutation, toast, queryClient]);

  const handleDeleteNoteFromTree = useCallback(async (noteId: string): Promise<void> => {
    if (!confirm('Are you sure you want to delete this note?')) return;

    try {
      await deleteNoteMutation.mutateAsync(noteId);
      if (selectedNote?.id === noteId) {
        setSelectedNote(null);
      }
      toast('Note deleted successfully');
    } catch (error: unknown) {
      logClientError(error, { context: { source: 'useNoteOperations.handleDeleteNoteFromTree', noteId } });
      toast('An unexpected error occurred while deleting the note', { variant: 'error' });
    }
  }, [deleteNoteMutation, selectedNote, setSelectedNote, toast]);

  const handleRenameNote = useCallback(async (noteId: string, newTitle: string): Promise<void> => {
    const currentNote = notesRef.current.find((note: NoteWithRelations) => note.id === noteId);
    const previousTitle = currentNote?.title ?? '';
    try {
      const updatedNote = await updateNoteMutation.mutateAsync({ id: noteId, title: newTitle });

      if (previousTitle && previousTitle !== newTitle) {
        setUndoStack((prev: UndoAction[]) => [
          { type: 'renameNote', noteId, fromTitle: previousTitle, toTitle: newTitle },
          ...prev,
        ]);
      }
      
      if (selectedNote?.id === noteId) {
        setSelectedNote(updatedNote);
      }
      toast('Note renamed successfully');
    } catch (error: unknown) {
      logClientError(error, { context: { source: 'useNoteOperations.handleRenameNote', noteId, newTitle } });
      toast('An unexpected error occurred while renaming the note', { variant: 'error' });
    }
  }, [notesRef, updateNoteMutation, setUndoStack, selectedNote, setSelectedNote, toast]);

  const handleMoveNoteToFolder = useCallback(async (noteId: string, folderId: string | null): Promise<void> => {
    const currentNote = notesRef.current.find((note: NoteWithRelations) => note.id === noteId);
    const previousFolderId = currentNote?.categories?.[0]?.categoryId ?? null;
    try {
      await updateNoteMutation.mutateAsync({
        id: noteId,
        categoryIds: folderId ? [folderId] : [],
      });

      if (previousFolderId !== folderId) {
        setUndoStack((prev: UndoAction[]) => [
          { type: 'moveNote', noteId, fromFolderId: previousFolderId, toFolderId: folderId },
          ...prev,
        ]);
      }
      toast('Note moved successfully');
    } catch (error: unknown) {
      logClientError(error, { context: { source: 'useNoteOperations.handleMoveNoteToFolder', noteId, folderId } });
      toast('An unexpected error occurred while moving the note', { variant: 'error' });
    }
  }, [notesRef, updateNoteMutation, setUndoStack, toast]);

  const handleMoveFolderToFolder = useCallback(async (folderId: string, targetParentId: string | null): Promise<void> => {
    const previousParentId = findFolderParentId(folderTreeRef.current, folderId);
    try {
      await updateCategoryMutation.mutateAsync({
        id: folderId,
        parentId: targetParentId,
      });

      if (previousParentId !== targetParentId) {
        setUndoStack((prev: UndoAction[]) => [
          { type: 'moveFolder', folderId, fromParentId: previousParentId, toParentId: targetParentId },
          ...prev,
        ]);
      }
      toast('Folder moved successfully');
    } catch (error: unknown) {
      logClientError(error, { context: { source: 'useNoteOperations.handleMoveFolderToFolder', folderId, targetParentId } });
      toast('An unexpected error occurred while moving the folder', { variant: 'error' });
    }
  }, [folderTreeRef, updateCategoryMutation, setUndoStack, toast]);

  const handleReorderFolder = useCallback(async (folderId: string, targetId: string, position: 'before' | 'after'): Promise<void> => {
    const tree = folderTreeRef.current;
    const draggedFolder = findFolderById(tree, folderId);
    if (!draggedFolder) return;

    const targetParentId = findFolderParentId(tree, targetId);
    const draggedParentId = findFolderParentId(tree, folderId);

    const getSiblings = (parentId: string | null): CategoryWithChildren[] => {
      if (!parentId) return tree;
      const parent = findFolderById(tree, parentId);
      return parent?.children ?? [];
    };

    const siblings = getSiblings(targetParentId);
    const filtered = siblings.filter((sibling: CategoryWithChildren) => sibling.id !== folderId);
    const targetIndex = filtered.findIndex((sibling: CategoryWithChildren) => sibling.id === targetId);
    if (targetIndex === -1) return;

    const insertIndex = position === 'before' ? targetIndex : targetIndex + 1;
    filtered.splice(insertIndex, 0, draggedFolder);

    try {
      await Promise.all(
        filtered.map((sibling: CategoryWithChildren, index: number) => {
          const update: Record<string, unknown> = { sortIndex: index };
          if (sibling.id === folderId && draggedParentId !== targetParentId) {
            update['parentId'] = targetParentId;
          }
          // Using mutation for each update
          return updateCategoryMutation.mutateAsync({
            id: sibling.id,
            sortIndex: index,
            ...(sibling.id === folderId && draggedParentId !== targetParentId ? { parentId: targetParentId } : {})
          });
        })
      );
      toast('Folder reordered successfully');
    } catch (error: unknown) {
      logClientError(error, { context: { source: 'useNoteOperations.handleReorderFolder', folderId, targetId, position } });
      toast('Failed to reorder folder', { variant: 'error' });
    }
  }, [folderTreeRef, updateCategoryMutation, toast]);

  const handleRelateNotes = useCallback(async (sourceNoteId: string, targetNoteId: string): Promise<void> => {
    if (!sourceNoteId || !targetNoteId) return;
    if (sourceNoteId === targetNoteId) return;
    try {
      const [sourceNote, targetNote] = await Promise.all([
        queryClient.fetchQuery<NoteWithRelations>({
          queryKey: QUERY_KEYS.notes.detail(sourceNoteId),
          queryFn: async (): Promise<NoteWithRelations> => {
            const res = await fetch(`/api/notes/${sourceNoteId}`);
            if (!res.ok) throw new ApiError('Failed to fetch source note', 400);
            return res.json() as Promise<NoteWithRelations>;
          },
          staleTime: NOTES_STALE_MS,
        }),
        queryClient.fetchQuery<NoteWithRelations>({
          queryKey: QUERY_KEYS.notes.detail(targetNoteId),
          queryFn: async (): Promise<NoteWithRelations> => {
            const res = await fetch(`/api/notes/${targetNoteId}`);
            if (!res.ok) throw new ApiError('Failed to fetch target note', 400);
            return res.json() as Promise<NoteWithRelations>;
          },
          staleTime: NOTES_STALE_MS,
        }),
      ]);

      const sourceRelatedIds =
        sourceNote.relationsFrom?.map((rel: { targetNote: { id: string } }) => rel.targetNote.id) || [];
      const alreadyLinked = sourceRelatedIds.includes(targetNoteId);
      if (alreadyLinked) {
        toast('Notes are already linked', { variant: 'info' });
        return;
      }

      const nextSourceIds = Array.from(new Set([...sourceRelatedIds, targetNoteId]));

      const targetRelatedIds =
        targetNote.relationsFrom?.map((rel: { targetNote: { id: string } }) => rel.targetNote.id) || [];
      const nextTargetIds = Array.from(new Set([...targetRelatedIds, sourceNoteId]));

      await Promise.all([
        updateNoteMutation.mutateAsync({ id: sourceNoteId, relatedNoteIds: nextSourceIds }),
        updateNoteMutation.mutateAsync({ id: targetNoteId, relatedNoteIds: nextTargetIds }),
      ]);

      toast('Notes linked');
    } catch (error: unknown) {
      logClientError(error, { context: { source: 'useNoteOperations.handleRelateNotes', sourceNoteId, targetNoteId } });
      toast('Failed to link notes', { variant: 'error' });
    }
  }, [updateNoteMutation, toast, queryClient]);

  return {
    handleCreateFolder,
    handleDeleteFolder,
    handleRenameFolder,
    handleDuplicateNote,
    handleDeleteNoteFromTree,
    handleRenameNote,
    handleMoveNoteToFolder,
    handleMoveFolderToFolder,
    handleReorderFolder,
    handleRelateNotes,
  };
}
