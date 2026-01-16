"use client";

import React, { useState, useEffect } from "react";
import { Plus, Pin, Archive, ChevronRight, X } from "lucide-react";
import type { NoteWithRelations, TagRecord, CategoryWithChildren } from "@/types/notes";
import { Button } from "@/components/ui/button";
import ModalShell from "@/components/ui/modal-shell";
import { FolderTree } from "./components/FolderTree";
import { useToast } from "@/components/ui/toast";
import { useAdminLayout } from "@/lib/context/AdminLayoutContext";
import { useNoteSettings } from "@/lib/context/NoteSettingsContext";
import { NoteForm } from "./components/NoteForm";
import { NotesFilters } from "./components/NotesFilters";
import { NoteCard } from "./components/NoteCard";
import { buildBreadcrumbPath, getCategoryIdsWithDescendants, renderMarkdownToHtml } from "./utils";

export default function NotesPage() {
  const { isMenuCollapsed } = useAdminLayout();
  const { settings, updateSettings } = useNoteSettings();
  const { toast } = useToast();
  const [notes, setNotes] = useState<NoteWithRelations[]>([]);
  const [tags, setTags] = useState<TagRecord[]>([]);
  const [folderTree, setFolderTree] = useState<CategoryWithChildren[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterPinned, setFilterPinned] = useState<boolean | undefined>(undefined);
  const [filterArchived, setFilterArchived] = useState<boolean | undefined>(undefined);
  const [selectedNote, setSelectedNote] = useState<NoteWithRelations | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [creatingFolderParentId, setCreatingFolderParentId] = useState<string | null | undefined>(undefined);
  const [filterTagIds, setFilterTagIds] = useState<string[]>([]);
  const [draggedNoteId, setDraggedNoteId] = useState<string | null>(null);
  const [relatedPreviewNotes, setRelatedPreviewNotes] = useState<Record<string, NoteWithRelations>>({});
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState(searchQuery);
  const hasLoadedNotesRef = React.useRef(false);
  const [highlightTagId, setHighlightTagId] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(24);

  // Use settings from context (including selectedFolderId)
  const {
    sortBy,
    sortOrder,
    showTimestamps,
    showBreadcrumbs,
    showRelatedNotes,
    searchScope,
    selectedFolderId,
    selectedNotebookId,
    viewMode,
    gridDensity,
  } = settings;

  // Helper to update selectedFolderId in settings
  const setSelectedFolderId = (id: string | null) => {
    updateSettings({ selectedFolderId: id });
  };

  const setSelectedNotebookId = (id: string | null) => {
    updateSettings({ selectedNotebookId: id });
  };

  const notesInScope = React.useMemo(() => {
    if (!selectedFolderId) return notes;
    const descendantIds = getCategoryIdsWithDescendants(selectedFolderId, folderTree);
    const categoryIds =
      descendantIds.length > 0 ? descendantIds : [selectedFolderId];
    const categoryIdSet = new Set(categoryIds);
    return notes.filter((note) =>
      note.categories.some((category) => categoryIdSet.has(category.categoryId))
    );
  }, [notes, selectedFolderId, folderTree]);

  // Sort notes based on current sort settings
  const sortedNotes = React.useMemo(() => {
    const sorted = [...notesInScope].sort((a, b) => {
      if (sortBy === "name") {
        return a.title.localeCompare(b.title);
      }
      if (sortBy === "updated") {
        return new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime();
      }
      return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
    });
    return sortOrder === "desc" ? sorted.reverse() : sorted;
  }, [notesInScope, sortBy, sortOrder]);

  const totalPages = React.useMemo(() => {
    return Math.max(1, Math.ceil(sortedNotes.length / pageSize));
  }, [sortedNotes.length, pageSize]);

  const pagedNotes = React.useMemo(() => {
    const clampedPage = Math.min(page, totalPages);
    const start = (clampedPage - 1) * pageSize;
    return sortedNotes.slice(start, start + pageSize);
  }, [sortedNotes, page, pageSize, totalPages]);

  useEffect(() => {
    if (page > totalPages) {
      setPage(totalPages);
    }
  }, [page, totalPages]);

  useEffect(() => {
    setPage(1);
  }, [
    debouncedSearchQuery,
    filterPinned,
    filterArchived,
    filterTagIds,
    selectedFolderId,
    sortBy,
    sortOrder,
    selectedNotebookId,
  ]);

  const noteLayoutClassName = React.useMemo(() => {
    if (viewMode === "list") {
      return "grid grid-cols-1 gap-3";
    }
    if (gridDensity === 8) {
      return "grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6 2xl:grid-cols-8";
    }
    return "grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4";
  }, [viewMode, gridDensity]);

  const availableTagsInScope = React.useMemo(() => {
    const tagMap = new Map<string, TagRecord>();
    notesInScope.forEach((note) => {
      note.tags.forEach((noteTag) => {
        tagMap.set(noteTag.tagId, noteTag.tag);
      });
    });
    return Array.from(tagMap.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [notesInScope]);

  const fetchFolderTree = React.useCallback(async () => {
    try {
      if (!selectedNotebookId) return;
      const params = new URLSearchParams({ notebookId: selectedNotebookId });
      const response = await fetch(`/api/notes/categories/tree?${params.toString()}`, { cache: "no-store" });
      const data = (await response.json()) as CategoryWithChildren[];
      setFolderTree(data);
    } catch (error) {
      console.error("Failed to fetch folder tree:", error);
    }
  }, [selectedNotebookId]);


  const folderTreeRef = React.useRef(folderTree);
  React.useEffect(() => {
    folderTreeRef.current = folderTree;
  }, [folderTree]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
    }, 250);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const fetchNotes = React.useCallback(async () => {
    try {
      if (!selectedNotebookId) {
        setLoading(false);
        return;
      }
      setLoading(!hasLoadedNotesRef.current);
      const params = new URLSearchParams();
      params.append("notebookId", selectedNotebookId);
      if (debouncedSearchQuery) {
        params.append("search", debouncedSearchQuery);
        params.append("searchScope", searchScope);
      }
      if (filterPinned !== undefined) params.append("isPinned", String(filterPinned));
      if (filterArchived !== undefined) params.append("isArchived", String(filterArchived));
      if (filterTagIds.length > 0) params.append("tagIds", filterTagIds.join(","));

      if (selectedFolderId) {
        const descendantIds = getCategoryIdsWithDescendants(selectedFolderId, folderTreeRef.current);
        if (descendantIds.length > 0) {
          params.append("categoryIds", descendantIds.join(","));
        } else {
          params.append("categoryIds", selectedFolderId);
        }
      }

      const response = await fetch(`/api/notes?${params}`, { cache: "no-store" });
      const data = (await response.json()) as NoteWithRelations[];
      setNotes(data);
      hasLoadedNotesRef.current = true;
    } catch (error) {
      console.error("Failed to fetch notes:", error);
    } finally {
      setLoading(false);
    }
  }, [debouncedSearchQuery, searchScope, filterPinned, filterArchived, selectedFolderId, filterTagIds, selectedNotebookId]);

  const fetchTags = React.useCallback(async () => {
    try {
      if (!selectedNotebookId) return;
      const params = new URLSearchParams({ notebookId: selectedNotebookId });
      const response = await fetch(`/api/notes/tags?${params.toString()}`, { cache: "no-store" });
      const data = (await response.json()) as TagRecord[];
      setTags(data);
    } catch (error) {
      console.error("Failed to fetch tags:", error);
    }
  }, [selectedNotebookId]);

  useEffect(() => {
    void fetchTags();
    void fetchFolderTree();
  }, [fetchTags, fetchFolderTree]);

  useEffect(() => {
    void fetchNotes();
  }, [fetchNotes]);

  useEffect(() => {
    if (selectedNotebookId) return;
    let isActive = true;
    const loadNotebooks = async () => {
      try {
        const response = await fetch("/api/notes/notebooks", { cache: "no-store" });
        if (!response.ok) return;
        const data = (await response.json()) as Array<{ id: string }>;
        const firstId = data[0]?.id;
        if (isActive && firstId) {
          setSelectedNotebookId(firstId);
        }
      } catch (error) {
        console.error("Failed to load notebooks:", error);
      }
    };
    void loadNotebooks();
    return () => {
      isActive = false;
    };
  }, [selectedNotebookId]);

  useEffect(() => {
    setSelectedFolderId(null);
    setSelectedNote(null);
    setIsEditing(false);
    setFilterTagIds([]);
    setPage(1);
    setNotes([]);
    setTags([]);
    setFolderTree([]);
  }, [selectedNotebookId]);

  const previewStyle = React.useMemo(() => {
    const fallback = "#1f2937";
    const color = selectedNote?.color || fallback;
    const hex = color.replace("#", "");
    if (!/^[0-9a-fA-F]{6}$/.test(hex)) {
      return { backgroundColor: color };
    }
    const r = parseInt(hex.slice(0, 2), 16);
    const g = parseInt(hex.slice(2, 4), 16);
    const b = parseInt(hex.slice(4, 6), 16);
    const luminance = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
    const borderColor = luminance > 0.78 ? "rgba(15, 23, 42, 0.35)" : "rgba(148, 163, 184, 0.2)";
    return {
      backgroundColor: color,
      borderColor,
      boxShadow: luminance > 0.78 ? "0 0 0 1px rgba(15, 23, 42, 0.12)" : undefined,
    };
  }, [selectedNote?.color]);

  const handleCreateFolder = async (parentId?: string | null) => {
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
        await fetchFolderTree();
      }
    } catch (error) {
      console.error("Failed to create folder:", error);
    }
  };

  const handleDeleteFolder = async (folderId: string) => {
    if (!confirm("Delete this folder and all its contents (subfolders, notes, and attachments)? This action cannot be undone.")) return;

    try {
      const response = await fetch(`/api/notes/categories/${folderId}?recursive=true`, {
        method: "DELETE",
      });

      if (response.ok) {
        await fetchFolderTree();
        await fetchNotes();
        if (selectedFolderId === folderId) {
          setSelectedFolderId(null);
        }
        if (selectedNote) {
          // Check if the selected note was in the deleted folder
          const noteCategory = selectedNote.categories[0]?.categoryId;
          if (noteCategory === folderId) {
            setSelectedNote(null);
          }
        }
      }
    } catch (error) {
      console.error("Failed to delete folder:", error);
    }
  };

  const handleRenameFolder = async (folderId: string, newName: string) => {
    try {
      const response = await fetch(`/api/notes/categories/${folderId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newName }),
      });

      if (response.ok) {
        await fetchFolderTree();
      }
    } catch (error) {
      console.error("Failed to rename folder:", error);
    }
  };

  const handleCreateNoteInFolder = (folderId: string) => {
    setSelectedFolderId(folderId);
    setIsCreating(true);
    setSelectedNote(null);
  };

  const handleDuplicateNote = async (noteId: string) => {
    try {
      // First, fetch the note to duplicate
      const response = await fetch(`/api/notes/${noteId}`, { cache: "no-store" });
      if (!response.ok) return;

      const note: NoteWithRelations = await response.json();

      // Generate a new title with a number suffix
      const baseTitle = note.title.replace(/\s*\(\d+\)$/, ""); // Remove existing number suffix
      let newTitle = `${baseTitle} (1)`;

      // Check existing notes to find the next available number
      const existingNotes = notes.filter((n) =>
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

      // Create the duplicate note
      const createResponse = await fetch("/api/notes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: newTitle,
          content: note.content,
          color: note.color,
          isPinned: note.isPinned,
          isArchived: note.isArchived,
          tagIds: note.tags.map((t) => t.tagId),
          categoryIds: note.categories.map((c) => c.categoryId),
          notebookId: note.notebookId ?? selectedNotebookId ?? null,
        }),
      });

      if (createResponse.ok) {
        await fetchNotes();
        await fetchFolderTree();
      }
    } catch (error) {
      console.error("Failed to duplicate note:", error);
    }
  };

  const handleDeleteNoteFromTree = async (noteId: string) => {
    if (!confirm("Are you sure you want to delete this note?")) return;

    try {
      const response = await fetch(`/api/notes/${noteId}`, { method: "DELETE" });
      if (response.ok) {
        await fetchNotes();
        await fetchFolderTree();
        if (selectedNote?.id === noteId) {
          setSelectedNote(null);
        }
      }
    } catch (error) {
      console.error("Failed to delete note:", error);
    }
  };

  const handleRenameNote = async (noteId: string, newTitle: string) => {
    try {
      const response = await fetch(`/api/notes/${noteId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: newTitle }),
      });

      if (response.ok) {
        await fetchNotes();
        await fetchFolderTree();
        // Update selected note if it's the one being renamed
        if (selectedNote?.id === noteId) {
          const updatedNote = (await response.json()) as NoteWithRelations;
          setSelectedNote(updatedNote);
        }
      }
    } catch (error) {
      console.error("Failed to rename note:", error);
    }
  };

  const handleOpenCreateModal = () => {
    setIsCreating(true);
    setSelectedNote(null);
  };

  const handleCloseCreateModal = () => {
    setIsCreating(false);
  };

  const handleCreateSuccess = () => {
    setIsCreating(false);
    void fetchNotes();
    void fetchFolderTree();
  };

  const handleSelectNote = (note: NoteWithRelations) => {
    setSelectedNote(note);
    setIsEditing(false);
  };

  const handleFilterByTag = (tagId: string) => {
    setSelectedFolderId(null);
    setFilterTagIds([tagId]);
    setSearchQuery("");
    setSelectedNote(null);
    setIsEditing(false);
    setHighlightTagId(tagId);
  };

  useEffect(() => {
    if (!highlightTagId) return;
    const timer = setTimeout(() => {
      setHighlightTagId(null);
    }, 2000);
    return () => clearTimeout(timer);
  }, [highlightTagId]);

  const handleSelectNoteFromTree = async (noteId: string) => {
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
  };

  useEffect(() => {
    if (!selectedNote) {
      setRelatedPreviewNotes({});
      return;
    }
    const relationIds =
      selectedNote.relations?.map((rel) => rel.id) ||
      [
        ...(selectedNote.relationsFrom ?? []).map((rel) => rel.targetNote.id),
        ...(selectedNote.relationsTo ?? []).map((rel) => rel.sourceNote.id),
      ].filter(
        (id, index, array) => array.findIndex((entry) => entry === id) === index
      );

    if (!relationIds || relationIds.length === 0) {
      setRelatedPreviewNotes({});
      return;
    }

    let isActive = true;
    const fetchRelated = async () => {
      try {
        const notes = await Promise.all(
          relationIds.map(async (id) => {
            try {
              const res = await fetch(`/api/notes/${id}`, { cache: "no-store" });
              if (!res.ok) return null;
              return (await res.json()) as NoteWithRelations;
            } catch {
              return null;
            }
          })
        );
        if (!isActive) return;
        const nextMap: Record<string, NoteWithRelations> = {};
        notes.filter(Boolean).forEach((note) => {
          if (note) nextMap[note.id] = note;
        });
        setRelatedPreviewNotes(nextMap);
      } catch (error) {
        console.error("Failed to load related notes:", error);
      }
    };

    void fetchRelated();
    return () => {
      isActive = false;
    };
  }, [selectedNote]);

  const handleUpdateSuccess = () => {
    setIsEditing(false);
    void fetchNotes();
    void fetchFolderTree();
    // Refresh selected note to show updated content
    if (selectedNote) {
      void handleSelectNoteFromTree(selectedNote.id);
    }
  };

  const handleUnlinkFromPreview = async (relatedId: string) => {
    if (!selectedNote) return;
    const relationIds =
      selectedNote.relations?.map((rel) => rel.id) ||
      [
        ...(selectedNote.relationsFrom ?? []).map((rel) => rel.targetNote.id),
        ...(selectedNote.relationsTo ?? []).map((rel) => rel.sourceNote.id),
      ].filter(
        (id, index, array) => array.findIndex((entry) => entry === id) === index
      );
    const nextIds = relationIds.filter((id) => id !== relatedId);
    try {
      const response = await fetch(`/api/notes/${selectedNote.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ relatedNoteIds: nextIds }),
      });
      if (!response.ok) {
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
  };

  const handleMoveNoteToFolder = async (noteId: string, folderId: string | null) => {
    try {
      const response = await fetch(`/api/notes/${noteId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          categoryIds: folderId ? [folderId] : [],
        }),
      });

      if (response.ok) {
        // Fetch folder tree first, then notes will use the updated tree via ref
        await fetchFolderTree();
        await fetchNotes();
      }
    } catch (error) {
      console.error("Failed to move note:", error);
    }
  };

  const handleRelateNotes = async (sourceNoteId: string, targetNoteId: string) => {
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
      const alreadyLinked =
        sourceRelatedIds.includes(targetNoteId);
      if (alreadyLinked) {
        toast("Notes are already linked", { variant: "info" });
        return;
      }

      const nextSourceIds = Array.from(
        new Set([...sourceRelatedIds, targetNoteId])
      );

      const targetRelatedIds =
        targetNote.relationsFrom?.map((rel) => rel.targetNote.id) || [];
      const nextTargetIds = Array.from(
        new Set([...targetRelatedIds, sourceNoteId])
      );

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
      if (selectedNote?.id) {
        void handleSelectNoteFromTree(selectedNote.id);
      }
      toast("Notes linked");
    } catch (error) {
      console.error("Failed to relate notes:", error);
      toast("Failed to link notes", { variant: "error" });
    }
  };

  const handleMoveFolderToFolder = async (folderId: string, targetParentId: string | null) => {
    try {
      const response = await fetch(`/api/notes/categories/${folderId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          parentId: targetParentId,
        }),
      });

      if (response.ok) {
        await fetchFolderTree();
        await fetchNotes();
      }
    } catch (error) {
      console.error("Failed to move folder:", error);
    }
  };

  return (
    <div className="container mx-auto py-10">
      <div className={`grid grid-cols-1 gap-6 h-[calc(100vh-120px)] ${isMenuCollapsed ? "lg:grid-cols-3" : "lg:grid-cols-4"}`}>
        {/* Folder Tree Sidebar */}
        <div className="hidden lg:block lg:col-span-1 overflow-hidden rounded-lg border border-gray-800 bg-gray-950">
          <FolderTree
            folders={folderTree}
            selectedFolderId={selectedFolderId}
            onSelectFolder={(id) => {
              setSelectedFolderId(id);
              setSelectedNote(null);
              setIsEditing(false);
            }}
            onCreateFolder={handleCreateFolder}
            onCreateNote={handleCreateNoteInFolder}
            onDeleteFolder={handleDeleteFolder}
            onRenameFolder={handleRenameFolder}
            onSelectNote={handleSelectNoteFromTree}
            onDuplicateNote={handleDuplicateNote}
            onDeleteNote={handleDeleteNoteFromTree}
            onRenameNote={handleRenameNote}
            onRelateNotes={handleRelateNotes}
            selectedNoteId={selectedNote?.id}
            onDropNote={handleMoveNoteToFolder}
            onDropFolder={handleMoveFolderToFolder}
            draggedNoteId={draggedNoteId}
            setDraggedNoteId={setDraggedNoteId}
          />
        </div>

        {/* Main Content Area */}
        <div className={`rounded-lg bg-gray-950 p-6 shadow-lg overflow-hidden flex flex-col ${isMenuCollapsed ? "lg:col-span-2" : "lg:col-span-3"}`}>
          {selectedNote ? (
            <div className="flex h-full flex-col">
              {/* Breadcrumb for selected note */}
              <div className="mb-4 flex items-center gap-2 text-sm text-gray-400">
                {buildBreadcrumbPath(
                  selectedNote.categories[0]?.categoryId || null,
                  selectedNote.title,
                  folderTree
                ).map((crumb, index, array) => (
                  <React.Fragment key={index}>
                    {crumb.isNote ? (
                      <span className="text-gray-300">{crumb.name}</span>
                    ) : (
                      <button
                        onClick={() => {
                          setSelectedFolderId(crumb.id);
                          setSelectedNote(null);
                          setIsEditing(false);
                        }}
                        className="hover:text-blue-400 transition"
                      >
                        {crumb.name}
                      </button>
                    )}
                    {index < array.length - 1 && (
                      <ChevronRight size={16} className="text-gray-600" />
                    )}
                  </React.Fragment>
                ))}
              </div>

              <div className="mb-4 flex items-center gap-4">
                <Button
                  onClick={() => {
                    if (isEditing) {
                      setIsEditing(false);
                    } else {
                      setSelectedNote(null);
                    }
                  }}
                  variant="outline"
                  className="border-gray-700 text-gray-300 hover:bg-gray-800 hover:text-white"
                >
                  Back
                </Button>
                {!isEditing ? (
                  <Button
                    onClick={() => setIsEditing(true)}
                    className="bg-blue-600 text-white hover:bg-blue-700"
                  >
                    Edit
                  </Button>
                ) : (
                  <>
                    <Button
                      type="button"
                      form="note-edit-form"
                      onClick={() => {
                        const form = document.getElementById("note-edit-form") as HTMLFormElement;
                        form?.requestSubmit();
                      }}
                      className="bg-blue-600 text-white hover:bg-blue-700"
                    >
                      Update
                    </Button>
                    <Button
                      type="button"
                      onClick={() => setIsEditing(false)}
                      variant="outline"
                      className="border-gray-700 text-gray-300 hover:bg-gray-800 hover:text-white"
                    >
                      Cancel
                    </Button>
                    <Button
                      type="button"
                      onClick={async () => {
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
                      }}
                      className="bg-red-600 text-white hover:bg-red-700"
                    >
                      Delete
                    </Button>
                  </>
                )}
              </div>

              {isEditing ? (
                <div className="flex-1 overflow-y-auto">
                  <NoteForm
                    note={selectedNote}
                    folderTree={folderTree}
                    defaultFolderId={selectedFolderId}
                    availableTags={tags}
                    notebookId={selectedNotebookId}
                    onSuccess={handleUpdateSuccess}
                    onTagCreated={fetchTags}
                    onSelectRelatedNote={(noteId) => {
                      void handleSelectNoteFromTree(noteId);
                    }}
                    onTagClick={handleFilterByTag}
                  />
                </div>
              ) : (
                <div
                  className="flex-1 overflow-y-auto rounded-lg border border-gray-800 bg-gray-900 p-6 cursor-text"
                  onDoubleClick={() => setIsEditing(true)}
                  style={previewStyle}
                >
                  <h1 className="mb-4 text-3xl font-bold text-white">{selectedNote.title}</h1>
                  <div
                    className="prose max-w-none text-gray-300"
                    dangerouslySetInnerHTML={{
                      __html: renderMarkdownToHtml(selectedNote.content),
                    }}
                  />
                  {((selectedNote.relations?.length ?? 0) > 0 ||
                    selectedNote.relationsFrom?.length ||
                    selectedNote.relationsTo?.length) && (
                    <div className="mt-6 space-y-4">
                      <div className="space-y-2">
                        <div className="text-xs uppercase tracking-wide text-gray-400">
                          Related Notes
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {(selectedNote.relations ?? [
                            ...(selectedNote.relationsFrom ?? []).map((relation) => ({
                              id: relation.targetNote.id,
                              title: relation.targetNote.title,
                              color: relation.targetNote.color ?? null,
                            })),
                            ...(selectedNote.relationsTo ?? []).map((relation) => ({
                              id: relation.sourceNote.id,
                              title: relation.sourceNote.title,
                              color: relation.sourceNote.color ?? null,
                            })),
                          ])
                            .filter(
                              (noteItem, index, array) =>
                                array.findIndex((item) => item.id === noteItem.id) === index
                            )
                            .map((related) => {
                              const relatedNote = relatedPreviewNotes[related.id];
                              return (
                                <div
                                  key={related.id}
                                  className="relative w-40 cursor-pointer rounded-md border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-left text-xs text-emerald-100 hover:border-emerald-400/60"
                                  role="button"
                                  tabIndex={0}
                                  onClick={() => void handleSelectNoteFromTree(related.id)}
                                  onKeyDown={(event) => {
                                    if (event.key === "Enter" || event.key === " ") {
                                      event.preventDefault();
                                      void handleSelectNoteFromTree(related.id);
                                    }
                                  }}
                                >
                                  <div className="truncate font-semibold">
                                    {relatedNote?.title ?? related.title}
                                  </div>
                                  <div className="line-clamp-2 text-[11px] text-emerald-200/80">
                                    {relatedNote?.content ?? "No content"}
                                  </div>
                                  <button
                                    type="button"
                                    onClick={(event) => {
                                      event.stopPropagation();
                                      void handleUnlinkFromPreview(related.id);
                                    }}
                                    className="absolute right-2 top-2 text-emerald-100/70 hover:text-white"
                                    aria-label="Unlink related note"
                                  >
                                    <X size={12} />
                                  </button>
                                </div>
                              );
                            })}
                        </div>
                      </div>
                    </div>
                  )}
                  <div className="mt-8 pt-4 border-t border-gray-800 flex gap-6 text-sm text-gray-500">
                    <span>Created: {new Date(selectedNote.createdAt).toLocaleString()}</span>
                    <span>Modified: {new Date(selectedNote.updatedAt).toLocaleString()}</span>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <>
              <div className="mb-4 flex items-center gap-3">
                <Button
                  onClick={handleOpenCreateModal}
                  className="size-11 rounded-full bg-primary p-0 text-primary-foreground hover:bg-primary/90"
                  aria-label="Create note"
                >
                  <Plus className="size-5" />
                </Button>
                <h1 className="text-3xl font-bold text-white">
                  {selectedFolderId
                    ? buildBreadcrumbPath(selectedFolderId, null, folderTree).slice(-1)[0]?.name
                    : "Notes"}
                </h1>
                <div className="ml-auto flex items-center gap-2">
                  <span className="text-xs text-gray-500">Page</span>
                  <button
                    type="button"
                    onClick={() => setPage(Math.max(1, page - 1))}
                    disabled={page <= 1}
                    className="rounded px-2 py-1 text-xs bg-gray-800 text-gray-400 hover:bg-gray-700 transition disabled:opacity-50"
                  >
                    Prev
                  </button>
                  <span className="text-xs text-gray-300">
                    {page} / {totalPages}
                  </span>
                  <button
                    type="button"
                    onClick={() => setPage(Math.min(totalPages, page + 1))}
                    disabled={page >= totalPages}
                    className="rounded px-2 py-1 text-xs bg-gray-800 text-gray-400 hover:bg-gray-700 transition disabled:opacity-50"
                  >
                    Next
                  </button>
                  <select
                    value={pageSize}
                    onChange={(e) => {
                      setPageSize(Number(e.target.value));
                      setPage(1);
                    }}
                    className="rounded bg-gray-800 px-2 py-1 text-xs text-gray-300 border border-gray-700"
                    aria-label="Notes per page"
                  >
                    {[12, 24, 48].map((size) => (
                      <option key={size} value={size}>
                        {size} / page
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Filters */}
              <div className="mb-4 flex gap-4">
                <NotesFilters
                  selectedFolderId={selectedFolderId}
                  folderTree={folderTree}
                  searchQuery={searchQuery}
                  setSearchQuery={setSearchQuery}
                  tags={availableTagsInScope}
                  filterTagIds={filterTagIds}
                  setFilterTagIds={setFilterTagIds}
                  searchScope={searchScope}
                  updateSettings={updateSettings}
                  sortBy={sortBy}
                  sortOrder={sortOrder}
                  showTimestamps={showTimestamps}
                  showBreadcrumbs={showBreadcrumbs}
                  showRelatedNotes={showRelatedNotes}
                  viewMode={viewMode}
                  gridDensity={gridDensity}
                  highlightTagId={highlightTagId}
                  buildBreadcrumbPath={buildBreadcrumbPath}
                />
                <Button
                  onClick={() => setFilterPinned(filterPinned === true ? undefined : true)}
                  className={`rounded-lg border px-4 py-2 ${
                    filterPinned === true
                      ? "border-blue-500 bg-blue-600 text-white"
                      : "border-gray-700 bg-gray-800 text-gray-300"
                  }`}
                >
                  <Pin size={20} />
                </Button>
                <Button
                  onClick={() => setFilterArchived(filterArchived === true ? undefined : true)}
                  className={`rounded-lg border px-4 py-2 ${
                    filterArchived === true
                      ? "border-gray-500 bg-gray-700 text-white"
                      : "border-gray-700 bg-gray-800 text-gray-300"
                  }`}
                >
                  <Archive size={20} />
                </Button>
              </div>

              {/* Breadcrumb */}
              {selectedFolderId && (
                <div className="mb-6 flex items-center gap-2 text-sm text-gray-400">
                  {buildBreadcrumbPath(selectedFolderId, null, folderTree).map((crumb, index, array) => (
                    <React.Fragment key={index}>
                      <button
                        onClick={() => {
                          setSelectedFolderId(crumb.id);
                          setSelectedNote(null);
                          setIsEditing(false);
                        }}
                        className="hover:text-blue-400 transition"
                      >
                        {crumb.name}
                      </button>
                      {index < array.length - 1 && (
                        <ChevronRight size={16} className="text-gray-600" />
                      )}
                    </React.Fragment>
                  ))}
                </div>
              )}

              {/* Notes Grid */}
              {loading ? (
                <div className="text-center text-gray-400">Loading...</div>
              ) : sortedNotes.length === 0 ? (
                <div className="rounded-lg border border-dashed border-gray-700 p-12 text-center text-gray-400">
                  No notes found. Create your first note!
                </div>
              ) : (
                <div className={noteLayoutClassName}>
                  {pagedNotes.map((note) => (
                    <NoteCard
                      key={note.id}
                      note={note}
                      folderTree={folderTree}
                      showTimestamps={showTimestamps}
                      showBreadcrumbs={showBreadcrumbs}
                      showRelatedNotes={showRelatedNotes}
                      onSelectNote={handleSelectNote}
                      onSelectFolder={(folderId) => {
                        setSelectedFolderId(folderId);
                        setSelectedNote(null);
                        setIsEditing(false);
                      }}
                      onDragStart={(noteId) => {
                        setDraggedNoteId(noteId);
                      }}
                      onDragEnd={() => {
                        setDraggedNoteId(null);
                      }}
                      buildBreadcrumbPath={buildBreadcrumbPath}
                    />
                  ))}
                </div>
              )}
              {sortedNotes.length > pageSize && (
                <div className="mt-6 flex items-center justify-center gap-3 text-sm text-gray-300">
                  <button
                    type="button"
                    onClick={() => setPage(Math.max(1, page - 1))}
                    disabled={page <= 1}
                    className="rounded border border-gray-700 px-3 py-1.5 text-gray-300 hover:bg-gray-800 disabled:opacity-50"
                  >
                    Previous
                  </button>
                  <span>
                    Page {page} of {totalPages}
                  </span>
                  <button
                    type="button"
                    onClick={() => setPage(Math.min(totalPages, page + 1))}
                    disabled={page >= totalPages}
                    className="rounded border border-gray-700 px-3 py-1.5 text-gray-300 hover:bg-gray-800 disabled:opacity-50"
                  >
                    Next
                  </button>
                </div>
              )}
            </>
          )}
        </div>

      {/* Create Modal */}
      {isCreating && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
          onClick={handleCloseCreateModal}
        >
          <div onClick={(e) => e.stopPropagation()}>
            <ModalShell title="Create Note" onClose={handleCloseCreateModal}>
              <NoteForm
                folderTree={folderTree}
                defaultFolderId={selectedFolderId}
                availableTags={tags}
                notebookId={selectedNotebookId}
                onSuccess={handleCreateSuccess}
                onTagCreated={fetchTags}
                onSelectRelatedNote={(noteId) => {
                  setIsCreating(false);
                  void handleSelectNoteFromTree(noteId);
                }}
              />
            </ModalShell>
          </div>
        </div>
      )}
      </div>
    </div>
  );
}
