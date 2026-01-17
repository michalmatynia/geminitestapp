import { useCallback } from "react";
import type { NoteWithRelations } from "@/types/notes";
import type { UndoAction, UseNoteOperationsProps } from "@/types/notes-hooks";
import { findFolderParentId, findFolderById } from "../utils";

export function useNoteOperations({
  selectedNotebookId,
  notesRef,
  folderTreeRef,
  fetchNotes,
  fetchFolderTree,
  setUndoStack,
  toast,
  setSelectedFolderId,
  setSelectedNote,
  selectedNote,
}: UseNoteOperationsProps) {

  const handleCreateFolder = useCallback(async (parentId?: string | null) => {
    const folderName = prompt("Enter folder name:");
    if (!folderName) return;

    try {
      if (!selectedNotebookId) return;
      const response = await fetch("/api/notes/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: folderName,
          parentId: parentId ?? null,
          notebookId: selectedNotebookId,
        }),
      });

      if (response.ok) {
        const created = (await response.json()) as { id?: string };
        await fetchFolderTree();
        if (created?.id) {
          setSelectedFolderId(created.id);
        }
        toast("Folder created successfully");
      } else {
        toast("Failed to create folder", { variant: "error" });
      }
    } catch (error) {
      console.error("Failed to create folder:", error);
      toast("An unexpected error occurred while creating the folder", { variant: "error" });
    }
  }, [selectedNotebookId, fetchFolderTree, setSelectedFolderId, toast]);

  const handleDeleteFolder = useCallback(async (folderId: string) => {
    if (!confirm("Delete this folder and all its contents (subfolders, notes, and attachments)? This action cannot be undone.")) return;

    try {
      const response = await fetch(`/api/notes/categories/${folderId}?recursive=true`, {
        method: "DELETE",
      });

      if (response.ok) {
        await fetchFolderTree();
        await fetchNotes();
        toast("Folder deleted successfully");
        // Since we don't have access to current selectedFolderId in state directly here (only via setter),
        // we might rely on the parent component to handle clearing selection if needed,
        // or pass current selection as prop.
        // For now, assuming caller handles side-effects if needed or we re-fetch.
      } else {
        toast("Failed to delete folder", { variant: "error" });
      }
    } catch (error) {
      console.error("Failed to delete folder:", error);
      toast("An unexpected error occurred while deleting the folder", { variant: "error" });
    }
  }, [fetchFolderTree, fetchNotes, toast]);

  const handleRenameFolder = useCallback(async (folderId: string, newName: string) => {
    const currentFolder = findFolderById(folderTreeRef.current, folderId);
    const previousName = currentFolder?.name ?? "";
    try {
      const response = await fetch(`/api/notes/categories/${folderId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newName }),
      });

      if (response.ok) {
        if (previousName && previousName !== newName) {
          setUndoStack((prev) => [
            { type: "renameFolder", folderId, fromName: previousName, toName: newName },
            ...prev,
          ]);
        }
        await fetchFolderTree();
        toast("Folder renamed successfully");
      } else {
        toast("Failed to rename folder", { variant: "error" });
      }
    } catch (error) {
      console.error("Failed to rename folder:", error);
      toast("An unexpected error occurred while renaming the folder", { variant: "error" });
    }
  }, [fetchFolderTree, folderTreeRef, setUndoStack, toast]);

  const handleDuplicateNote = useCallback(async (noteId: string) => {
    try {
      const response = await fetch(`/api/notes/${noteId}`, { cache: "no-store" });
      if (!response.ok) {
        toast("Failed to fetch note details for duplication", { variant: "error" });
        return;
      }

      const note: NoteWithRelations = await response.json();

      const baseTitle = note.title.replace(/\s*\(\d+\)$/, "");
      let newTitle = `${baseTitle} (1)`;

      const existingNotes = notesRef.current.filter((n) =>
        n.title.startsWith(baseTitle) && n.title !== note.title
      );
      if (existingNotes.length > 0) {
        const numbers = existingNotes
          .map((n) => {
            const match = n.title.match(/\((\d+)\)$/);
            return match ? parseInt(match[1], 10) : 0;
          })
          .filter((n) => n > 0);
        const maxNumber = Math.max(0, ...numbers);
        newTitle = `${baseTitle} (${maxNumber + 1})`;
      }

      const createResponse = await fetch("/api/notes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: newTitle,
          content: note.content,
          color: note.color,
          isPinned: note.isPinned,
          isArchived: note.isArchived,
          isFavorite: note.isFavorite,
          tagIds: note.tags.map((t) => t.tagId),
          categoryIds: note.categories.map((c) => c.categoryId),
          notebookId: note.notebookId ?? selectedNotebookId ?? null,
        }),
      });

      if (createResponse.ok) {
        await fetchNotes();
        await fetchFolderTree();
        toast("Note duplicated successfully");
      } else {
        toast("Failed to create duplicated note", { variant: "error" });
      }
    } catch (error) {
      console.error("Failed to duplicate note:", error);
      toast("An unexpected error occurred while duplicating the note", { variant: "error" });
    }
  }, [selectedNotebookId, fetchNotes, fetchFolderTree, notesRef, toast]);

  const handleDeleteNoteFromTree = useCallback(async (noteId: string) => {
    if (!confirm("Are you sure you want to delete this note?")) return;

    try {
      const response = await fetch(`/api/notes/${noteId}`, { method: "DELETE" });
      if (response.ok) {
        await fetchNotes();
        await fetchFolderTree();
        if (selectedNote?.id === noteId) {
          setSelectedNote(null);
        }
        toast("Note deleted successfully");
      } else {
        toast("Failed to delete note", { variant: "error" });
      }
    } catch (error) {
      console.error("Failed to delete note:", error);
      toast("An unexpected error occurred while deleting the note", { variant: "error" });
    }
  }, [fetchNotes, fetchFolderTree, selectedNote, setSelectedNote, toast]);

  const handleRenameNote = useCallback(async (noteId: string, newTitle: string) => {
    const currentNote = notesRef.current.find((note) => note.id === noteId);
    const previousTitle = currentNote?.title ?? "";
    try {
      const response = await fetch(`/api/notes/${noteId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: newTitle }),
      });

      if (response.ok) {
        if (previousTitle && previousTitle !== newTitle) {
          setUndoStack((prev) => [
            { type: "renameNote", noteId, fromTitle: previousTitle, toTitle: newTitle },
            ...prev,
          ]);
        }
        await fetchNotes();
        await fetchFolderTree();
        if (selectedNote?.id === noteId) {
          const updatedNote = (await response.json()) as NoteWithRelations;
          setSelectedNote(updatedNote);
        }
        toast("Note renamed successfully");
      } else {
        toast("Failed to rename note", { variant: "error" });
      }
    } catch (error) {
      console.error("Failed to rename note:", error);
      toast("An unexpected error occurred while renaming the note", { variant: "error" });
    }
  }, [fetchNotes, fetchFolderTree, selectedNote, setSelectedNote, notesRef, setUndoStack, toast]);

  const handleMoveNoteToFolder = useCallback(async (noteId: string, folderId: string | null) => {
    const currentNote = notesRef.current.find((note) => note.id === noteId);
    const previousFolderId = currentNote?.categories?.[0]?.categoryId ?? null;
    try {
      const response = await fetch(`/api/notes/${noteId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          categoryIds: folderId ? [folderId] : [],
        }),
      });

      if (response.ok) {
        if (previousFolderId !== folderId) {
          setUndoStack((prev) => [
            { type: "moveNote", noteId, fromFolderId: previousFolderId, toFolderId: folderId },
            ...prev,
          ]);
        }
        await fetchFolderTree();
        await fetchNotes();
        toast("Note moved successfully");
      } else {
        toast("Failed to move note", { variant: "error" });
      }
    } catch (error) {
      console.error("Failed to move note:", error);
      toast("An unexpected error occurred while moving the note", { variant: "error" });
    }
  }, [fetchFolderTree, fetchNotes, notesRef, setUndoStack, toast]);

  const handleMoveFolderToFolder = useCallback(async (folderId: string, targetParentId: string | null) => {
    const previousParentId = findFolderParentId(folderTreeRef.current, folderId);
    try {
      const response = await fetch(`/api/notes/categories/${folderId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          parentId: targetParentId,
        }),
      });

      if (response.ok) {
        if (previousParentId !== targetParentId) {
          setUndoStack((prev) => [
            { type: "moveFolder", folderId, fromParentId: previousParentId, toParentId: targetParentId },
            ...prev,
          ]);
        }
        await fetchFolderTree();
        await fetchNotes();
        toast("Folder moved successfully");
      } else {
        toast("Failed to move folder", { variant: "error" });
      }
    } catch (error) {
      console.error("Failed to move folder:", error);
      toast("An unexpected error occurred while moving the folder", { variant: "error" });
    }
  }, [fetchFolderTree, fetchNotes, findFolderParentId, folderTreeRef, setUndoStack, toast]);

  const handleRelateNotes = useCallback(async (sourceNoteId: string, targetNoteId: string) => {
    if (!sourceNoteId || !targetNoteId) return;
    if (sourceNoteId === targetNoteId) return;
    try {
      const [sourceRes, targetRes] = await Promise.all([
        fetch(`/api/notes/${sourceNoteId}`, { cache: "no-store" }),
        fetch(`/api/notes/${targetNoteId}`, { cache: "no-store" }),
      ]);
      if (!sourceRes.ok || !targetRes.ok) {
        toast("Failed to link notes", { variant: "error" });
        return;
      }
      const [sourceNote, targetNote] = (await Promise.all([
        sourceRes.json(),
        targetRes.json(),
      ])) as [NoteWithRelations, NoteWithRelations];

      const sourceRelatedIds =
        sourceNote.relationsFrom?.map((rel) => rel.targetNote.id) || [];
      const alreadyLinked = sourceRelatedIds.includes(targetNoteId);
      if (alreadyLinked) {
        toast("Notes are already linked", { variant: "info" });
        return;
      }

      const nextSourceIds = Array.from(new Set([...sourceRelatedIds, targetNoteId]));

      const targetRelatedIds =
        targetNote.relationsFrom?.map((rel) => rel.targetNote.id) || [];
      const nextTargetIds = Array.from(new Set([...targetRelatedIds, sourceNoteId]));

      const [sourcePatch, targetPatch] = await Promise.all([
        fetch(`/api/notes/${sourceNoteId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ relatedNoteIds: nextSourceIds }),
        }),
        fetch(`/api/notes/${targetNoteId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ relatedNoteIds: nextTargetIds }),
        }),
      ]);

      if (!sourcePatch.ok || !targetPatch.ok) {
        toast("Failed to link notes", { variant: "error" });
        return;
      }

      await fetchFolderTree();
      await fetchNotes();
      toast("Notes linked");
    } catch (error) {
      console.error("Failed to relate notes:", error);
      toast("Failed to link notes", { variant: "error" });
    }
  }, [fetchFolderTree, fetchNotes, toast]);

  return {
    handleCreateFolder,
    handleDeleteFolder,
    handleRenameFolder,
    handleDuplicateNote,
    handleDeleteNoteFromTree,
    handleRenameNote,
    handleMoveNoteToFolder,
    handleMoveFolderToFolder,
    handleRelateNotes,
  };
}
