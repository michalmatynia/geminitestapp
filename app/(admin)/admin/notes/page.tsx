"use client";

import React, { useState, useCallback, useMemo } from "react";
import { useAdminLayout } from "@/lib/context/AdminLayoutContext";
import { useNoteSettings } from "@/lib/context/NoteSettingsContext";
import { useToast } from "@/components/ui/toast";
import { FolderTree } from "./components/FolderTree";
import { NoteListView } from "./components/NoteListView";
import { NoteDetailView } from "./components/NoteDetailView";
import { CreateNoteModal } from "./components/CreateNoteModal";
import { useNoteData } from "./hooks/useNoteData";
import { useNoteFilters } from "./hooks/useNoteFilters";
import { useNoteOperations } from "./hooks/useNoteOperations";
import { useNoteTheme } from "./hooks/useNoteTheme";
import type { NoteWithRelations } from "@/types/notes";
import type { UndoAction } from "@/types/notes-hooks";

export default function NotesPage() {
  const { isMenuCollapsed } = useAdminLayout();
  const { settings, updateSettings } = useNoteSettings();
  const { toast } = useToast();

  // Local UI State
  const [selectedNote, setSelectedNote] = useState<NoteWithRelations | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [draggedNoteId, setDraggedNoteId] = useState<string | null>(null);
  const [isFolderTreeCollapsed, setIsFolderTreeCollapsed] = useState(false);
  const [undoStack, setUndoStack] = useState<UndoAction[]>([]);

  // Settings helpers
  const setSelectedFolderId = useCallback((id: string | null) => {
    updateSettings({ selectedFolderId: id });
  }, [updateSettings]);

  const setSelectedNotebookId = useCallback((id: string | null) => {
    updateSettings({ selectedNotebookId: id });
  }, [updateSettings]);

  // Hooks
  const filters = useNoteFilters({ settings, updateSettings });
  
  const {
    notes,
    setNotes,
    tags,
    themes,
    notebook,
    setNotebook,
    folderTree,
    loading,
    notesRef,
    folderTreeRef,
    fetchNotes,
    fetchFolderTree,
    fetchTags,
  } = useNoteData({
    selectedNotebookId: settings.selectedNotebookId,
    selectedFolderId: settings.selectedFolderId,
    searchQuery: filters.debouncedSearchQuery,
    searchScope: settings.searchScope,
    filterPinned: filters.filterPinned,
    filterArchived: filters.filterArchived,
    filterFavorite: filters.filterFavorite,
    filterTagIds: filters.filterTagIds,
    setSelectedNotebookId,
  });

  const operations = useNoteOperations({
    selectedNotebookId: settings.selectedNotebookId,
    notesRef,
    folderTreeRef,
    fetchNotes,
    fetchFolderTree,
    setUndoStack,
    toast,
    setSelectedFolderId,
    setSelectedNote,
    selectedNote,
  });

  const themeLogic = useNoteTheme({
    themes,
    notebook,
    folderTree,
    selectedFolderId: settings.selectedFolderId,
    selectedNotebookId: settings.selectedNotebookId,
    selectedNote,
    fetchFolderTree,
    setNotebook,
  });

  // Derived Logic (Sorting & Pagination)
  // We can keep this here or move to a separate utility/hook if needed, 
  // but it's lightweight enough to stay for now given dependencies on 'notes' and 'filters'.
  const notesInScope = useMemo(() => {
    // Note: useNoteData already fetches scoped notes if we rely on API filtering.
    // However, the original code did client-side filtering for descendants if selectedFolderId was set.
    // Our useNoteData passes categoryIds to API, so API returns correct subset.
    // But we might still need to ensure we aren't showing stale data if we just switched folders.
    // The original code was:
    // return notes.filter((note) => ...);
    // Since we fetch based on folder ID now, 'notes' should be correct.
    return notes;
  }, [notes]);

  const sortedNotes = useMemo(() => {
    const sorted = [...notesInScope].sort((a, b) => {
      if (settings.sortBy === "name") {
        return a.title.localeCompare(b.title);
      }
      if (settings.sortBy === "updated") {
        return new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime();
      }
      return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
    });
    return settings.sortOrder === "desc" ? sorted.reverse() : sorted;
  }, [notesInScope, settings.sortBy, settings.sortOrder]);

  const totalPages = useMemo(() => {
    return Math.max(1, Math.ceil(sortedNotes.length / filters.pageSize));
  }, [sortedNotes.length, filters.pageSize]);

  const pagedNotes = useMemo(() => {
    const clampedPage = Math.min(filters.page, totalPages);
    const start = (clampedPage - 1) * filters.pageSize;
    return sortedNotes.slice(start, start + filters.pageSize);
  }, [sortedNotes, filters.page, filters.pageSize, totalPages]);

  const noteLayoutClassName = useMemo(() => {
    if (settings.viewMode === "list") {
      return "grid grid-cols-1 gap-3";
    }
    if (settings.gridDensity === 8) {
      return "grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6 2xl:grid-cols-8";
    }
    return "grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4";
  }, [settings.viewMode, settings.gridDensity]);

  const availableTagsInScope = useMemo(() => {
    const tagMap = new Map<string, typeof tags[0]>();
    notesInScope.forEach((note) => {
      note.tags.forEach((noteTag) => {
        tagMap.set(noteTag.tagId, noteTag.tag);
      });
    });
    return Array.from(tagMap.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [notesInScope, tags]);

  // Handlers
  const handleSelectNoteFromTree = useCallback(async (noteId: string) => {
    try {
      const response = await fetch(`/api/notes/${noteId}`, { cache: "no-store" });
      if (response.ok) {
        const note = (await response.json()) as NoteWithRelations;
        setSelectedNote(note);
        setIsEditing(false);
      }
    } catch (error) {
      console.error("Failed to fetch note:", error);
    }
  }, []);

  const handleCreateSuccess = useCallback(() => {
    setIsCreating(false);
    void fetchNotes();
    void fetchFolderTree();
  }, [fetchNotes, fetchFolderTree]);

  const handleUpdateSuccess = useCallback(() => {
    setIsEditing(false);
    void fetchNotes();
    void fetchFolderTree();
    if (selectedNote) {
      void handleSelectNoteFromTree(selectedNote.id);
    }
  }, [fetchNotes, fetchFolderTree, selectedNote, handleSelectNoteFromTree]);

  const handleToggleFavorite = useCallback(async (note: NoteWithRelations) => {
    const nextFavorite = !note.isFavorite;
    try {
      const response = await fetch(`/api/notes/${note.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isFavorite: nextFavorite }),
      });
      if (!response.ok) {
        toast("Failed to update favorite", { variant: "error" });
        return;
      }
      setNotes((prev) =>
        prev.map((item) =>
          item.id === note.id ? { ...item, isFavorite: nextFavorite } : item
        )
      );
      setSelectedNote((prev) =>
        prev && prev.id === note.id ? { ...prev, isFavorite: nextFavorite } : prev
      );
    } catch (error) {
      console.error("Failed to toggle favorite:", error);
      toast("Failed to update favorite", { variant: "error" });
    }
  }, [toast, setNotes]);

  const handleUnlinkRelatedNote = useCallback(async (relatedId: string) => {
    if (!selectedNote) return;
    try {
      // Logic from original component
      const [sourceRes, targetRes] = await Promise.all([
        fetch(`/api/notes/${selectedNote.id}`, { cache: "no-store" }),
        fetch(`/api/notes/${relatedId}`, { cache: "no-store" }),
      ]);
      if (!sourceRes.ok || !targetRes.ok) {
        toast("Failed to unlink note", { variant: "error" });
        return;
      }
      const [sourceNote, targetNote] = (await Promise.all([
        sourceRes.json(),
        targetRes.json(),
      ])) as [NoteWithRelations, NoteWithRelations];

      const sourceRelations =
        sourceNote.relations?.map((rel) => rel.id) ||
        [
          ...(sourceNote.relationsFrom ?? []).map((rel) => rel.targetNote.id),
          ...(sourceNote.relationsTo ?? []).map((rel) => rel.sourceNote.id),
        ].filter(
          (id, index, array) => array.findIndex((entry) => entry === id) === index
        );
      const targetRelations =
        targetNote.relations?.map((rel) => rel.id) ||
        [
          ...(targetNote.relationsFrom ?? []).map((rel) => rel.targetNote.id),
          ...(targetNote.relationsTo ?? []).map((rel) => rel.sourceNote.id),
        ].filter(
          (id, index, array) => array.findIndex((entry) => entry === id) === index
        );

      const nextSourceIds = sourceRelations.filter((id) => id !== relatedId);
      const nextTargetIds = targetRelations.filter((id) => id !== selectedNote.id);

      const [sourcePatch, targetPatch] = await Promise.all([
        fetch(`/api/notes/${selectedNote.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ relatedNoteIds: nextSourceIds }),
        }),
        fetch(`/api/notes/${relatedId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ relatedNoteIds: nextTargetIds }),
        }),
      ]);

      if (!sourcePatch.ok || !targetPatch.ok) {
        toast("Failed to unlink note", { variant: "error" });
        return;
      }

      toast("Note unlinked");
      await fetchNotes();
      void handleSelectNoteFromTree(selectedNote.id);
    } catch (error) {
      console.error("Failed to unlink note:", error);
      toast("Failed to unlink note", { variant: "error" });
    }
  }, [selectedNote, fetchNotes, handleSelectNoteFromTree, toast]);

  const handleDeleteNote = useCallback(async () => {
    if (!selectedNote) return;
    if (!confirm("Are you sure you want to delete this note?")) return;
    try {
      const response = await fetch(`/api/notes/${selectedNote.id}`, { method: "DELETE" });
      if (response.ok) {
        setSelectedNote(null);
        setIsEditing(false);
        await fetchNotes();
        await fetchFolderTree();
      }
    } catch (error) {
      console.error("Failed to delete note:", error);
    }
  }, [selectedNote, fetchNotes, fetchFolderTree]);

  // Undo Logic
  const formatUndoLabel = useCallback((action: UndoAction) => {
    if (action.type === "moveNote") return "Moved note";
    if (action.type === "moveFolder") return "Moved folder";
    if (action.type === "renameFolder") return `Renamed folder to "${action.toName}"`;
    return `Renamed note to "${action.toTitle}"`;
  }, []);

  const applyUndoAction = useCallback(async (action: UndoAction) => {
    if (action.type === "moveNote") {
      await fetch(`/api/notes/${action.noteId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          categoryIds: action.fromFolderId ? [action.fromFolderId] : [],
        }),
      });
      return;
    }
    if (action.type === "moveFolder") {
      await fetch(`/api/notes/categories/${action.folderId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ parentId: action.fromParentId ?? null }),
      });
      return;
    }
    if (action.type === "renameFolder") {
      await fetch(`/api/notes/categories/${action.folderId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: action.fromName }),
      });
      return;
    }
    await fetch(`/api/notes/${action.noteId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: action.fromTitle }),
    });
  }, []);

  const handleUndoFolderTree = useCallback(async (count = 1) => {
    const actionsToUndo = undoStack.slice(0, count);
    if (actionsToUndo.length === 0) return;
    setUndoStack((prev) => prev.slice(count));
    try {
      for (const action of actionsToUndo) {
        await applyUndoAction(action);
      }
      await fetchFolderTree();
      await fetchNotes();
    } catch (error) {
      console.error("Failed to undo folder tree action:", error);
      toast("Failed to undo", { variant: "error" });
    }
  }, [undoStack, applyUndoAction, fetchFolderTree, fetchNotes, toast]);

  const handleUndoAtIndex = useCallback((index: number) => {
    const count = Math.max(1, index + 1);
    void handleUndoFolderTree(count);
  }, [handleUndoFolderTree]);

  const undoHistory = useMemo(
    () => undoStack.map((action) => ({ label: formatUndoLabel(action) })),
    [undoStack, formatUndoLabel]
  );

  return (
    <div className="w-full">
      <div
        className={`grid h-[calc(100vh-120px)] w-full grid-cols-1 gap-6 ${
          isFolderTreeCollapsed
            ? ""
            : isMenuCollapsed
              ? "lg:grid-cols-[360px_minmax(0,1fr)]"
              : "lg:grid-cols-[420px_minmax(0,1fr)]"
        }`}
      >
        {/* Sidebar */}
        {!isFolderTreeCollapsed && (
          <div className="hidden overflow-hidden rounded-lg border border-gray-800 bg-gray-950 lg:block">
            <FolderTree
              folders={folderTree}
              selectedFolderId={settings.selectedFolderId}
              onSelectFolder={(id) => {
                setSelectedFolderId(id);
                setSelectedNote(null);
                setIsEditing(false);
              }}
              onCreateFolder={operations.handleCreateFolder}
              onCreateNote={(folderId) => {
                setSelectedFolderId(folderId);
                setIsCreating(true);
                setSelectedNote(null);
              }}
              onDeleteFolder={operations.handleDeleteFolder}
              onRenameFolder={operations.handleRenameFolder}
              onSelectNote={handleSelectNoteFromTree}
              onDuplicateNote={operations.handleDuplicateNote}
              onDeleteNote={operations.handleDeleteNoteFromTree}
              onRenameNote={operations.handleRenameNote}
              onRelateNotes={operations.handleRelateNotes}
              selectedNoteId={selectedNote?.id}
              onDropNote={operations.handleMoveNoteToFolder}
              onDropFolder={operations.handleMoveFolderToFolder}
              draggedNoteId={draggedNoteId}
              setDraggedNoteId={setDraggedNoteId}
              onToggleCollapse={() => setIsFolderTreeCollapsed(true)}
              isFavoritesActive={filters.filterFavorite === true}
              onToggleFavorites={() => filters.handleToggleFavoritesFilter(setSelectedFolderId, setSelectedNote, setIsEditing)}
              canUndo={undoStack.length > 0}
              onUndo={() => handleUndoFolderTree(1)}
              undoHistory={undoHistory}
              onUndoAtIndex={handleUndoAtIndex}
            />
          </div>
        )}

        {/* Main Content */}
        <div className="flex min-h-0 flex-col overflow-hidden rounded-lg bg-gray-950 p-6 shadow-lg">
          {selectedNote ? (
            <NoteDetailView
              selectedNote={selectedNote}
              folderTree={folderTree}
              selectedFolderId={settings.selectedFolderId}
              isFolderTreeCollapsed={isFolderTreeCollapsed}
              onExpandFolderTree={() => setIsFolderTreeCollapsed(false)}
              setSelectedFolderId={setSelectedFolderId}
              setSelectedNote={setSelectedNote}
              isEditing={isEditing}
              setIsEditing={setIsEditing}
              onToggleFavorite={handleToggleFavorite}
              onDeleteNote={handleDeleteNote}
              tags={tags}
              selectedNotebookId={settings.selectedNotebookId}
              onUpdateSuccess={handleUpdateSuccess}
              fetchTags={fetchTags}
              selectedNoteTheme={themeLogic.selectedNoteTheme}
              onSelectRelatedNote={(id) => void handleSelectNoteFromTree(id)}
              onFilterByTag={(tagId) => filters.handleFilterByTag(tagId, setSelectedFolderId, setSelectedNote, setIsEditing)}
              onUnlinkRelatedNote={handleUnlinkRelatedNote}
            />
          ) : (
            <NoteListView
              loading={loading}
              sortedNotes={sortedNotes}
              pagedNotes={pagedNotes}
              page={filters.page}
              totalPages={totalPages}
              setPage={filters.setPage}
              pageSize={filters.pageSize}
              setPageSize={filters.setPageSize}
              selectedFolderId={settings.selectedFolderId}
              folderTree={folderTree}
              isFolderTreeCollapsed={isFolderTreeCollapsed}
              onExpandFolderTree={() => setIsFolderTreeCollapsed(false)}
              onCreateNote={() => {
                setIsCreating(true);
                setSelectedNote(null);
              }}
              selectedFolderThemeId={themeLogic.selectedFolderThemeId}
              themes={themes}
              onThemeChange={themeLogic.handleThemeChange}
              availableTagsInScope={availableTagsInScope}
              filterTagIds={filters.filterTagIds}
              setFilterTagIds={filters.setFilterTagIds}
              searchQuery={filters.searchQuery}
              setSearchQuery={filters.setSearchQuery}
              searchScope={settings.searchScope}
              updateSettings={updateSettings}
              sortBy={settings.sortBy}
              sortOrder={settings.sortOrder}
              showTimestamps={settings.showTimestamps}
              showBreadcrumbs={settings.showBreadcrumbs}
              showRelatedNotes={settings.showRelatedNotes}
              viewMode={settings.viewMode}
              gridDensity={settings.gridDensity}
              highlightTagId={filters.highlightTagId}
              filterPinned={filters.filterPinned}
              setFilterPinned={filters.setFilterPinned}
              filterArchived={filters.filterArchived}
              setFilterArchived={filters.setFilterArchived}
              noteLayoutClassName={noteLayoutClassName}
              getThemeForNote={themeLogic.getThemeForNote}
              onSelectNote={(note) => {
                setSelectedNote(note);
                setIsEditing(false);
              }}
              onSelectFolderFromCard={(id) => {
                setSelectedFolderId(id);
                setSelectedNote(null);
                setIsEditing(false);
              }}
              onToggleFavorite={handleToggleFavorite}
              onDragStart={setDraggedNoteId}
              onDragEnd={() => setDraggedNoteId(null)}
              setSelectedFolderId={setSelectedFolderId}
              setSelectedNote={setSelectedNote}
              setIsEditing={setIsEditing}
            />
          )}
        </div>

        {/* Modals */}
        <CreateNoteModal
          isOpen={isCreating}
          onClose={() => setIsCreating(false)}
          folderTree={folderTree}
          selectedFolderId={settings.selectedFolderId}
          tags={tags}
          selectedNotebookId={settings.selectedNotebookId}
          onSuccess={handleCreateSuccess}
          onTagCreated={fetchTags}
          folderTheme={themeLogic.selectedFolderTheme}
          onSelectRelatedNote={(id) => {
            setIsCreating(false);
            void handleSelectNoteFromTree(id);
          }}
        />
      </div>
    </div>
  );
}
