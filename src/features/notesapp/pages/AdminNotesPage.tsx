"use client";
import { useToast, SectionPanel } from "@/shared/ui";
import React, { useState, useCallback, useMemo } from "react";
import { useAdminLayout } from "@/features/admin/context/AdminLayoutContext";
import { useNoteSettings } from "@/features/notesapp/hooks/NoteSettingsContext";
import { FolderTree } from "@/features/foldertree/components/FolderTree";
import { NoteListView } from "@/features/notesapp/components/NoteListView";
import { NoteDetailView } from "@/features/notesapp/components/NoteDetailView";
import { CreateNoteModal } from "@/features/notesapp/components/CreateNoteModal";
import { 
  useNoteData,
  useUpdateNoteMutation,
  useDeleteNoteMutation,
  useUpdateCategoryMutation
} from "@/features/notesapp/hooks/useNoteData";
import { useNoteFilters } from "@/features/notesapp/hooks/useNoteFilters";
import { useNoteOperations } from "@/features/notesapp/hooks/useNoteOperations";
import { useNoteTheme } from "@/features/notesapp/hooks/useNoteTheme";
import type { NoteWithRelations, TagRecord, NoteTagRecord } from "@/shared/types/notes";
import type { UndoAction } from "@/features/notesapp/types/notes-hooks";

type NoteTagWithDetails = NoteTagRecord & { tag: TagRecord };

export function AdminNotesPage(): React.JSX.Element {
  const { isMenuCollapsed } = useAdminLayout();
  const { settings, updateSettings } = useNoteSettings();
  const { toast } = useToast();
  
  // Mutations
  const updateNoteMutation = useUpdateNoteMutation();
  const deleteNoteMutation = useDeleteNoteMutation();
  const updateCategoryMutation = useUpdateCategoryMutation();

  // Local UI State
  const [selectedNote, setSelectedNote] = useState<NoteWithRelations | null>(null);
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [isCreating, setIsCreating] = useState<boolean>(false);
  const [draggedNoteId, setDraggedNoteId] = useState<string | null>(null);
  const [isFolderTreeCollapsed, setIsFolderTreeCollapsed] = useState<boolean>(false);
  const [undoStack, setUndoStack] = useState<UndoAction[]>([]);

  // Settings helpers
  const setSelectedFolderId = useCallback((id: string | null): void => {
    updateSettings({ selectedFolderId: id });
  }, [updateSettings]);

  const setSelectedNotebookId = useCallback((id: string | null): void => {
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
  const notesInScope: NoteWithRelations[] = useMemo((): NoteWithRelations[] => {
    return notes;
  }, [notes]);

  const sortedNotes: NoteWithRelations[] = useMemo((): NoteWithRelations[] => {
    const sorted: NoteWithRelations[] = [...notesInScope].sort((a: NoteWithRelations, b: NoteWithRelations): number => {
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

  const totalPages: number = useMemo((): number => {
    return Math.max(1, Math.ceil(sortedNotes.length / (filters.pageSize || 1)));
  }, [sortedNotes.length, filters.pageSize]);

  const pagedNotes: NoteWithRelations[] = useMemo((): NoteWithRelations[] => {
    const clampedPage: number = Math.min(filters.page, totalPages);
    const start: number = (clampedPage - 1) * filters.pageSize;
    return sortedNotes.slice(start, start + filters.pageSize);
  }, [sortedNotes, filters.page, filters.pageSize, totalPages]);

  const noteLayoutClassName: string = useMemo((): string => {
    if (settings.viewMode === "list") {
      return "grid grid-cols-1 gap-3";
    }
    if (settings.gridDensity === 8) {
      return "grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6 2xl:grid-cols-8";
    }
    return "grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4";
  }, [settings.viewMode, settings.gridDensity]);

  const availableTagsInScope: TagRecord[] = useMemo((): TagRecord[] => {
    const tagMap: Map<string, TagRecord> = new Map<string, TagRecord>();
    notesInScope.forEach((note: NoteWithRelations): void => {
      (note.tags as NoteTagWithDetails[]).forEach((noteTag: NoteTagWithDetails): void => {
        tagMap.set(noteTag.tagId, noteTag.tag);
      });
    });
    return Array.from(tagMap.values()).sort((a: TagRecord, b: TagRecord): number => a.name.localeCompare(b.name));
  }, [notesInScope]);

  // Handlers
  const handleSelectNoteFromTree = useCallback(async (noteId: string): Promise<void> => {
    try {
      const response: Response = await fetch(`/api/notes/${noteId}`, { cache: "no-store" });
      if (response.ok) {
        const note: NoteWithRelations = (await response.json()) as NoteWithRelations;
        setSelectedNote(note);
        setIsEditing(false);
      }
    } catch (error: unknown) {
      console.error("Failed to fetch note:", error);
    }
  }, []);

  const handleCreateSuccess = useCallback((): void => {
    setIsCreating(false);
    void fetchNotes();
    void fetchFolderTree();
  }, [fetchNotes, fetchFolderTree]);

  const handleUpdateSuccess = useCallback((): void => {
    setIsEditing(false);
    void fetchNotes();
    void fetchFolderTree();
    if (selectedNote) {
      void handleSelectNoteFromTree(selectedNote.id);
    }
  }, [fetchNotes, fetchFolderTree, selectedNote, handleSelectNoteFromTree]);

  const handleToggleFavorite = useCallback(async (note: NoteWithRelations): Promise<void> => {
    const nextFavorite: boolean = !note.isFavorite;
    try {
      await updateNoteMutation.mutateAsync({ id: note.id, isFavorite: nextFavorite });
      
      // Optimistic or manual state update for reactivity if needed, 
      // though mutation invalidation should trigger refresh via useNoteData -> useNotes
      // But AdminNotesPage uses manual setNotes sometimes?
      // With TanStack Query, the refetch (via invalidation) will update `notes` which updates `notesRef`.
      // The `setNotes` in `useNoteData` calls `queryClient.setQueryData`.
      
      // The original code updated local state:
      setNotes((prev: NoteWithRelations[] | undefined): NoteWithRelations[] =>
        (prev || []).map((item: NoteWithRelations): NoteWithRelations =>
          item.id === note.id ? { ...item, isFavorite: nextFavorite } : item
        )
      );
      
      setSelectedNote((prev: NoteWithRelations | null): NoteWithRelations | null =>
        prev && prev.id === note.id ? { ...prev, isFavorite: nextFavorite } : prev
      );
    } catch (error: unknown) {
      console.error("Failed to toggle favorite:", error);
      toast("Failed to update favorite", { variant: "error" });
    }
  }, [toast, setNotes, updateNoteMutation]);

  const handleUnlinkRelatedNote = useCallback(async (relatedId: string): Promise<void> => {
    if (!selectedNote) return;
    try {
      const sourceRelations: string[] =
        selectedNote.relations?.map((rel: { id: string }): string => rel.id) ||
        [
          ...(selectedNote.relationsFrom ?? []).map((rel: { targetNote: { id: string } }): string => rel.targetNote.id),
          ...(selectedNote.relationsTo ?? []).map((rel: { sourceNote: { id: string } }): string => rel.sourceNote.id),
        ].filter(
          (id: string, index: number, array: string[]): boolean => array.indexOf(id) === index
        );

      const nextSourceIds: string[] = sourceRelations.filter((id: string): boolean => id !== relatedId);

      await updateNoteMutation.mutateAsync({ id: selectedNote.id, relatedNoteIds: nextSourceIds });

      toast("Note unlinked");
      await fetchNotes();
      void handleSelectNoteFromTree(selectedNote.id);
    } catch (error: unknown) {
      console.error("Failed to unlink note:", error);
      toast("Failed to unlink note", { variant: "error" });
    }
  }, [selectedNote, fetchNotes, handleSelectNoteFromTree, toast, updateNoteMutation]);

  const handleDeleteNote = useCallback(async (): Promise<void> => {
    if (!selectedNote) return;
    if (!confirm("Are you sure you want to delete this note?")) return;
    try {
      await deleteNoteMutation.mutateAsync(selectedNote.id);
      setSelectedNote(null);
      setIsEditing(false);
      // await fetchNotes(); // Mutation handles invalidation
      // await fetchFolderTree(); // Mutation handles invalidation
    } catch (error: unknown) {
      console.error("Failed to delete note:", error);
      toast("Failed to delete note", { variant: "error" });
    }
  }, [selectedNote, deleteNoteMutation, toast]);

  // Undo Logic
  const formatUndoLabel = useCallback((action: UndoAction): string => {
    if (action.type === "moveNote") return "Moved note";
    if (action.type === "moveFolder") return "Moved folder";
    if (action.type === "renameFolder") return `Renamed folder to "${action.toName}"`;
    return `Renamed note to "${action.toTitle}"`;
  }, []);

  const applyUndoAction = useCallback(async (action: UndoAction): Promise<void> => {
    if (action.type === "moveNote") {
      await updateNoteMutation.mutateAsync({
        id: action.noteId,
        categoryIds: action.fromFolderId ? [action.fromFolderId] : [],
      });
      return;
    }
    if (action.type === "moveFolder") {
      await updateCategoryMutation.mutateAsync({
        id: action.folderId,
        parentId: action.fromParentId ?? null,
      });
      return;
    }
    if (action.type === "renameFolder") {
      await updateCategoryMutation.mutateAsync({
        id: action.folderId,
        name: action.fromName,
      });
      return;
    }
    if (action.type === "renameNote") {
      await updateNoteMutation.mutateAsync({
        id: action.noteId,
        title: action.fromTitle,
      });
    }
  }, [updateNoteMutation, updateCategoryMutation]);

  const handleUndoFolderTree = useCallback(async (count: number = 1): Promise<void> => {
    const actionsToUndo: UndoAction[] = undoStack.slice(0, count);
    if (actionsToUndo.length === 0) return;
    setUndoStack((prev: UndoAction[]): UndoAction[] => prev.slice(count));
    try {
      for (const action of actionsToUndo) {
        await applyUndoAction(action);
      }
      // Invalidation handled by mutations, but force refresh to sync UI might be good?
      // Usually query invalidation is enough.
      // await fetchFolderTree();
      // await fetchNotes();
    } catch (error: unknown) {
      console.error("Failed to undo folder tree action:", error);
      toast("Failed to undo", { variant: "error" });
    }
  }, [undoStack, applyUndoAction, toast]);

  const handleUndoAtIndex = useCallback((index: number): void => {
    const count: number = Math.max(1, index + 1);
    void handleUndoFolderTree(count);
  }, [handleUndoFolderTree]);

  const undoHistory: { label: string }[] = useMemo(
    (): { label: string }[] => undoStack.map((action: UndoAction): { label: string } => ({ label: formatUndoLabel(action) })),
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
          <SectionPanel className="hidden overflow-hidden p-0 lg:block">
            <FolderTree
              folders={folderTree}
              selectedFolderId={settings.selectedFolderId}
              selectedNotebookId={settings.selectedNotebookId}
              onSelectFolder={(id: string | null): void => {
                setSelectedFolderId(id);
                setSelectedNote(null);
                setIsEditing(false);
              }}
              onCreateFolder={(parentId?: string | null): void => { void operations.handleCreateFolder(parentId ?? null); }}
              onCreateNote={(folderId: string | null): void => {
                setSelectedFolderId(folderId);
                setIsCreating(true);
                setSelectedNote(null);
              }}
              onDeleteFolder={(id: string): void => { void operations.handleDeleteFolder(id); }}
              onRenameFolder={(id: string, name: string): void => { void operations.handleRenameFolder(id, name); }}
              onSelectNote={(id: string): void => { void handleSelectNoteFromTree(id); }}
              onDuplicateNote={(id: string): void => { void operations.handleDuplicateNote(id); }}
              onDeleteNote={(id: string): void => { void operations.handleDeleteNoteFromTree(id); }}
              onRenameNote={(id: string, title: string): void => { void operations.handleRenameNote(id, title); }}
              onRelateNotes={(id1: string, id2: string): void => { void operations.handleRelateNotes(id1, id2); }}
              selectedNoteId={selectedNote?.id}
              onDropNote={(id: string, folderId: string | null): void => { void operations.handleMoveNoteToFolder(id, folderId); }}
              onDropFolder={(id: string, parentId: string | null): void => { void operations.handleMoveFolderToFolder(id, parentId); }}
              onReorderFolder={(id: string, targetId: string, position: "before" | "after"): void => {
                void operations.handleReorderFolder(id, targetId, position);
              }}
              draggedNoteId={draggedNoteId}
              setDraggedNoteId={setDraggedNoteId}
              onToggleCollapse={(): void => setIsFolderTreeCollapsed(true)}
              isFavoritesActive={filters.filterFavorite === true}
              onToggleFavorites={(): void => filters.handleToggleFavoritesFilter(setSelectedFolderId, setSelectedNote, setIsEditing)}
              canUndo={undoStack.length > 0}
              onUndo={(): void => { void handleUndoFolderTree(1); }}
              undoHistory={undoHistory}
              onUndoAtIndex={handleUndoAtIndex}
              onRefreshFolders={async (): Promise<void> => { await fetchFolderTree(); }}
            />
          </SectionPanel>
        )}

        {/* Main Content */}
        <SectionPanel className="flex min-h-0 flex-col overflow-hidden p-6">
          {selectedNote ? (
            <NoteDetailView
              selectedNote={selectedNote}
              folderTree={folderTree}
              selectedFolderId={settings.selectedFolderId}
              isFolderTreeCollapsed={isFolderTreeCollapsed}
              onExpandFolderTree={(): void => setIsFolderTreeCollapsed(false)}
              setSelectedFolderId={setSelectedFolderId}
              setSelectedNote={setSelectedNote}
              isEditing={isEditing}
              setIsEditing={setIsEditing}
              onToggleFavorite={(note: NoteWithRelations): void => { void handleToggleFavorite(note); }}
              onDeleteNote={handleDeleteNote}
              tags={tags}
              selectedNotebookId={settings.selectedNotebookId}
              onUpdateSuccess={handleUpdateSuccess}
              fetchTags={(): void => { void fetchTags(); }}
              selectedNoteTheme={themeLogic.selectedNoteTheme}
              onSelectRelatedNote={(id: string): void => { void handleSelectNoteFromTree(id); }}
              onFilterByTag={(tagId: string): void => filters.handleFilterByTag(tagId, setSelectedFolderId, setSelectedNote, setIsEditing)}
              onUnlinkRelatedNote={async (id: string): Promise<void> => { await handleUnlinkRelatedNote(id); }}
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
              onExpandFolderTree={(): void => setIsFolderTreeCollapsed(false)}
              onCreateNote={(): void => {
                setIsCreating(true);
                setSelectedNote(null);
              }}
              selectedFolderThemeId={themeLogic.selectedFolderThemeId}
              themes={themes}
              onThemeChange={(themeId: string | null): void => { void themeLogic.handleThemeChange(themeId); }}
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
              onSelectNote={(note: NoteWithRelations): void => {
                setSelectedNote(note);
                setIsEditing(false);
              }}
              onSelectFolderFromCard={(id: string | null): void => {
                setSelectedFolderId(id);
                setSelectedNote(null);
                setIsEditing(false);
              }}
              onToggleFavorite={(note: NoteWithRelations): void => { void handleToggleFavorite(note); }}
              onDragStart={setDraggedNoteId}
              onDragEnd={(): void => setDraggedNoteId(null)}
              setSelectedFolderId={setSelectedFolderId}
              setSelectedNote={setSelectedNote}
              setIsEditing={setIsEditing}
            />
          )}
        </SectionPanel>

        {/* Modals */}
        <CreateNoteModal
          isOpen={isCreating}
          onClose={(): void => setIsCreating(false)}
          folderTree={folderTree}
          selectedFolderId={settings.selectedFolderId}
          tags={tags}
          selectedNotebookId={settings.selectedNotebookId}
          onSuccess={handleCreateSuccess}
          onTagCreated={(): void => { void fetchTags(); }}
          folderTheme={themeLogic.selectedFolderTheme}
          onSelectRelatedNote={(id: string): void => {
            setIsCreating(false);
            void handleSelectNoteFromTree(id);
          }}
        />
      </div>
    </div>
  );
}