"use client";

import React, { useState, useEffect } from "react";
import { Plus, Pin, Archive, ChevronRight, ChevronLeft, Star, X } from "lucide-react";
import type { NoteWithRelations, TagRecord, CategoryWithChildren, ThemeRecord, NotebookRecord } from "@/types/notes";
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

type UndoAction =
  | { type: "moveNote"; noteId: string; fromFolderId: string | null; toFolderId: string | null }
  | { type: "moveFolder"; folderId: string; fromParentId: string | null; toParentId: string | null }
  | { type: "renameFolder"; folderId: string; fromName: string; toName: string }
  | { type: "renameNote"; noteId: string; fromTitle: string; toTitle: string };

export default function NotesPage() {
  const { isMenuCollapsed } = useAdminLayout();
  const { settings, updateSettings } = useNoteSettings();
  const { toast } = useToast();
  const [notes, setNotes] = useState<NoteWithRelations[]>([]);
  const [tags, setTags] = useState<TagRecord[]>([]);
  const [themes, setThemes] = useState<ThemeRecord[]>([]);
  const [notebook, setNotebook] = useState<NotebookRecord | null>(null);
  const [folderTree, setFolderTree] = useState<CategoryWithChildren[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterPinned, setFilterPinned] = useState<boolean | undefined>(undefined);
  const [filterArchived, setFilterArchived] = useState<boolean | undefined>(undefined);
  const [filterFavorite, setFilterFavorite] = useState<boolean | undefined>(undefined);
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
  const [isFolderTreeCollapsed, setIsFolderTreeCollapsed] = useState(false);
  const [undoStack, setUndoStack] = useState<UndoAction[]>([]);
  const notesRef = React.useRef(notes);

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
  const setSelectedFolderId = React.useCallback((id: string | null) => {
    updateSettings({ selectedFolderId: id });
  }, [updateSettings]);

  const setSelectedNotebookId = React.useCallback((id: string | null) => {
    updateSettings({ selectedNotebookId: id });
  }, [updateSettings]);

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

  React.useEffect(() => {
    notesRef.current = notes;
  }, [notes]);

  const findFolderById = React.useCallback(
    (foldersToScan: CategoryWithChildren[], id: string): CategoryWithChildren | null => {
      for (const node of foldersToScan) {
        if (node.id === id) return node;
        const found = findFolderById(node.children, id);
        if (found) return found;
      }
      return null;
    },
    []
  );

  const findFolderParentId = React.useCallback(
    (foldersToScan: CategoryWithChildren[], id: string, parentId: string | null = null): string | null => {
      for (const node of foldersToScan) {
        if (node.id === id) return parentId;
        const found = findFolderParentId(node.children, id, node.id);
        if (found !== null) return found;
      }
      return null;
    },
    []
  );

  const themeMap = React.useMemo(
    () => new Map(themes.map((theme) => [theme.id, theme])),
    [themes]
  );

  const defaultTheme = React.useMemo(() => {
    if (!notebook?.defaultThemeId) return null;
    return themeMap.get(String(notebook.defaultThemeId)) ?? null;
  }, [notebook?.defaultThemeId, themeMap]);

  const getThemeForFolderId = React.useCallback(
    (folderId: string | null | undefined) => {
      if (!folderId) return null;
      const folder = findFolderById(folderTree, folderId);
      const themeId = folder?.themeId ? String(folder.themeId) : null;
      if (!themeId) return null;
      return themeMap.get(themeId) ?? null;
    },
    [findFolderById, folderTree, themeMap]
  );

  const selectedFolderTheme = React.useMemo(
    () => getThemeForFolderId(selectedFolderId),
    [getThemeForFolderId, selectedFolderId]
  );

  const selectedFolderThemeId = React.useMemo(() => {
    if (selectedFolderId) {
      const folder = findFolderById(folderTree, selectedFolderId);
      return folder?.themeId ? String(folder.themeId) : "";
    }
    // When no folder selected, show notebook's default theme
    return notebook?.defaultThemeId ? String(notebook.defaultThemeId) : "";
  }, [selectedFolderId, folderTree, findFolderById, notebook?.defaultThemeId]);

  const getThemeForNote = React.useCallback(
    (note: NoteWithRelations | null | undefined) => {
      if (!note) return null;
      // 1. Check selected folder's theme
      if (selectedFolderId) {
        const selectedTheme = getThemeForFolderId(selectedFolderId);
        if (selectedTheme) return selectedTheme;
      }
      // 2. Check note's category themes
      const categoryIds = note.categories?.map((category) => category.categoryId) ?? [];
      for (const categoryId of categoryIds) {
        const theme = getThemeForFolderId(categoryId);
        if (theme) return theme;
      }
      // 3. Fall back to notebook's default theme
      return defaultTheme;
    },
    [getThemeForFolderId, selectedFolderId, defaultTheme]
  );

  const selectedNoteTheme = React.useMemo(
    () => getThemeForNote(selectedNote),
    [getThemeForNote, selectedNote]
  );

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
      if (filterFavorite !== undefined) params.append("isFavorite", String(filterFavorite));
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
  }, [debouncedSearchQuery, searchScope, filterPinned, filterArchived, filterFavorite, selectedFolderId, filterTagIds, selectedNotebookId]);

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

  const fetchThemes = React.useCallback(async () => {
    try {
      if (!selectedNotebookId) return;
      const params = new URLSearchParams({ notebookId: selectedNotebookId });
      const response = await fetch(`/api/notes/themes?${params.toString()}`, { cache: "no-store" });
      const data = (await response.json()) as ThemeRecord[];
      setThemes(data);
    } catch (error) {
      console.error("Failed to fetch themes:", error);
    }
  }, [selectedNotebookId]);

  const fetchNotebook = React.useCallback(async () => {
    if (!selectedNotebookId) {
      setNotebook(null);
      return;
    }
    try {
      const response = await fetch("/api/notes/notebooks", { cache: "no-store" });
      if (!response.ok) return;
      const data = (await response.json()) as NotebookRecord[];
      const found = data.find((n) => n.id === selectedNotebookId);
      setNotebook(found ?? null);
    } catch (error) {
      console.error("Failed to fetch notebook:", error);
    }
  }, [selectedNotebookId]);

  useEffect(() => {
    void fetchTags();
    void fetchFolderTree();
    void fetchThemes();
    void fetchNotebook();
  }, [fetchTags, fetchFolderTree, fetchThemes, fetchNotebook]);

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
    setFilterFavorite(undefined);
    setPage(1);
    setNotes([]);
    setTags([]);
    setFolderTree([]);
  }, [selectedNotebookId]);

  const getReadableTextColor = (hexColor: string) => {
    const normalized = hexColor.replace("#", "");
    if (!/^[0-9a-fA-F]{6}$/.test(normalized)) {
      return "#f8fafc";
    }
    const r = parseInt(normalized.slice(0, 2), 16);
    const g = parseInt(normalized.slice(2, 4), 16);
    const b = parseInt(normalized.slice(4, 6), 16);
    const luminance = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
    return luminance > 0.7 ? "#0f172a" : "#f8fafc";
  };

  const previewStyle = React.useMemo(() => {
    const fallback = "#1f2937";
    const normalizedColor = selectedNote?.color?.toLowerCase().trim();
    const isDefaultColor = !normalizedColor || normalizedColor === "#ffffff";
    const color =
      !isDefaultColor
        ? normalizedColor ?? selectedNote?.color ?? fallback
        : selectedNoteTheme?.backgroundColor || normalizedColor || selectedNote?.color || fallback;
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
  }, [selectedNote?.color, selectedNoteTheme?.backgroundColor]);

  const previewTextColor = React.useMemo(() => {
    const fallback = "#1f2937";
    const normalizedColor = selectedNote?.color?.toLowerCase().trim();
    const isDefaultColor = !normalizedColor || normalizedColor === "#ffffff";
    const background =
      !isDefaultColor
        ? normalizedColor ?? selectedNote?.color ?? fallback
        : selectedNoteTheme?.backgroundColor || normalizedColor || selectedNote?.color || fallback;
    if (selectedNoteTheme?.textColor && !isDefaultColor) {
      return getReadableTextColor(background);
    }
    return selectedNoteTheme?.textColor ?? getReadableTextColor(background);
  }, [selectedNote?.color, selectedNoteTheme?.backgroundColor, selectedNoteTheme?.textColor]);

  const previewTypographyStyle = React.useMemo(
    () => ({
      color: previewTextColor,
      ["--tw-prose-body" as never]: previewTextColor,
      ["--tw-prose-headings" as never]: selectedNoteTheme?.markdownHeadingColor ?? previewTextColor,
      ["--tw-prose-lead" as never]: previewTextColor,
      ["--tw-prose-bold" as never]: previewTextColor,
      ["--tw-prose-counters" as never]: previewTextColor,
      ["--tw-prose-bullets" as never]: previewTextColor,
      ["--tw-prose-quotes" as never]: previewTextColor,
      ["--tw-prose-quote-borders" as never]: "rgba(148, 163, 184, 0.35)",
      ["--tw-prose-hr" as never]: "rgba(148, 163, 184, 0.35)",
      ["--note-link-color" as never]:
        selectedNoteTheme?.markdownLinkColor ?? "#38bdf8",
      ["--note-code-bg" as never]:
        selectedNoteTheme?.markdownCodeBackground ?? "#0f172a",
      ["--note-code-text" as never]:
        selectedNoteTheme?.markdownCodeText ?? "#e2e8f0",
      ["--note-inline-code-bg" as never]:
        selectedNoteTheme?.markdownCodeBackground ?? "rgba(15, 23, 42, 0.12)",
    }),
    [
      previewTextColor,
      selectedNoteTheme?.markdownHeadingColor,
      selectedNoteTheme?.markdownLinkColor,
      selectedNoteTheme?.markdownCodeBackground,
      selectedNoteTheme?.markdownCodeText,
    ]
  );

  const relatedPreviewStyle = React.useMemo(
    () => ({
      borderWidth: `${selectedNoteTheme?.relatedNoteBorderWidth ?? 1}px`,
      borderColor:
        selectedNoteTheme?.relatedNoteBorderColor ?? "rgba(15, 23, 42, 0.2)",
      backgroundColor:
        selectedNoteTheme?.relatedNoteBackgroundColor ?? "rgba(15, 23, 42, 0.05)",
      color: selectedNoteTheme?.relatedNoteTextColor ?? "#f8fafc",
    }),
    [
      selectedNoteTheme?.relatedNoteBorderWidth,
      selectedNoteTheme?.relatedNoteBorderColor,
      selectedNoteTheme?.relatedNoteBackgroundColor,
      selectedNoteTheme?.relatedNoteTextColor,
    ]
  );

  const handleCreateFolder = React.useCallback(async (parentId?: string | null) => {
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
      }
    } catch (error) {
      console.error("Failed to create folder:", error);
    }
  }, [selectedNotebookId, fetchFolderTree]);

  const handleDeleteFolder = React.useCallback(async (folderId: string) => {
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
  }, [fetchFolderTree, fetchNotes, selectedFolderId, selectedNote, setSelectedFolderId]);

  const handleRenameFolder = React.useCallback(async (folderId: string, newName: string) => {
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
      }
    } catch (error) {
      console.error("Failed to rename folder:", error);
    }
  }, [fetchFolderTree, findFolderById]);

  const handleUpdateFolderTheme = React.useCallback(
    async (themeId: string | null) => {
      if (!selectedFolderId) return;
      try {
        const response = await fetch(`/api/notes/categories/${selectedFolderId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ themeId }),
        });
        if (response.ok) {
          await fetchFolderTree();
        }
      } catch (error) {
        console.error("Failed to update folder theme:", error);
      }
    },
    [selectedFolderId, fetchFolderTree]
  );

  const handleUpdateNotebookDefaultTheme = React.useCallback(
    async (themeId: string | null) => {
      if (!selectedNotebookId) return;
      try {
        const response = await fetch(`/api/notes/notebooks/${selectedNotebookId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ defaultThemeId: themeId }),
        });
        if (response.ok) {
          const updated = (await response.json()) as NotebookRecord;
          setNotebook(updated);
        }
      } catch (error) {
        console.error("Failed to update notebook default theme:", error);
      }
    },
    [selectedNotebookId]
  );

  const handleThemeChange = React.useCallback(
    async (themeId: string | null) => {
      if (selectedFolderId) {
        await handleUpdateFolderTheme(themeId);
      } else {
        await handleUpdateNotebookDefaultTheme(themeId);
      }
    },
    [selectedFolderId, handleUpdateFolderTheme, handleUpdateNotebookDefaultTheme]
  );

  const handleCreateNoteInFolder = React.useCallback((folderId: string) => {
    setSelectedFolderId(folderId);
    setIsCreating(true);
    setSelectedNote(null);
  }, [setSelectedFolderId]);

  const handleDuplicateNote = React.useCallback(async (noteId: string) => {
    try {
      // First, fetch the note to duplicate
      const response = await fetch(`/api/notes/${noteId}`, { cache: "no-store" });
      if (!response.ok) return;

      const note: NoteWithRelations = await response.json();

      // Generate a new title with a number suffix
      const baseTitle = note.title.replace(/\s*\(\d+\)$/, ""); // Remove existing number suffix
      let newTitle = `${baseTitle} (1)`;

      // Check existing notes to find the next available number
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
          isFavorite: note.isFavorite,
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
  }, [selectedNotebookId, fetchNotes, fetchFolderTree]);

  const handleDeleteNoteFromTree = React.useCallback(async (noteId: string) => {
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
  }, [fetchNotes, fetchFolderTree, selectedNote]);

  const handleRenameNote = React.useCallback(async (noteId: string, newTitle: string) => {
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
        // Update selected note if it's the one being renamed
        if (selectedNote?.id === noteId) {
          const updatedNote = (await response.json()) as NoteWithRelations;
          setSelectedNote(updatedNote);
        }
      }
    } catch (error) {
      console.error("Failed to rename note:", error);
    }
  }, [fetchNotes, fetchFolderTree, selectedNote]);

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

  const handleSelectNote = React.useCallback((note: NoteWithRelations) => {
    setSelectedNote(note);
    setIsEditing(false);
  }, []);

  const handleSelectFolderFromCard = React.useCallback(
    (folderId: string | null) => {
      setSelectedFolderId(folderId);
      setSelectedNote(null);
      setIsEditing(false);
    },
    [setSelectedFolderId]
  );

  const handleSelectFolderFromTree = React.useCallback(
    (folderId: string | null) => {
      setSelectedFolderId(folderId);
      setSelectedNote(null);
      setIsEditing(false);
    },
    [setSelectedFolderId]
  );

  const handleCollapseFolderTree = React.useCallback(() => {
    setIsFolderTreeCollapsed(true);
  }, []);

  const handleExpandFolderTree = React.useCallback(() => {
    setIsFolderTreeCollapsed(false);
  }, []);

  const handleDragStart = React.useCallback((noteId: string) => {
    setDraggedNoteId(noteId);
  }, []);

  const handleDragEnd = React.useCallback(() => {
    setDraggedNoteId(null);
  }, []);

  const handleFilterByTag = React.useCallback((tagId: string) => {
    setSelectedFolderId(null);
    setFilterTagIds([tagId]);
    setSearchQuery("");
    setSelectedNote(null);
    setIsEditing(false);
    setHighlightTagId(tagId);
  }, [setSelectedFolderId]);

  useEffect(() => {
    if (!highlightTagId) return;
    const timer = setTimeout(() => {
      setHighlightTagId(null);
    }, 2000);
    return () => clearTimeout(timer);
  }, [highlightTagId]);

  const handleSelectNoteFromTree = React.useCallback(async (noteId: string) => {
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

  const handleUpdateSuccess = React.useCallback(() => {
    setIsEditing(false);
    void fetchNotes();
    void fetchFolderTree();
    // Refresh selected note to show updated content
    if (selectedNote) {
      void handleSelectNoteFromTree(selectedNote.id);
    }
  }, [fetchNotes, fetchFolderTree, selectedNote, handleSelectNoteFromTree]);

  const handleToggleFavoritesFilter = React.useCallback(() => {
    setFilterFavorite((prev) => (prev ? undefined : true));
    setSelectedFolderId(null);
    setSelectedNote(null);
    setIsEditing(false);
  }, [setSelectedFolderId]);

  const handleToggleFavorite = React.useCallback(async (note: NoteWithRelations, nextValue?: boolean) => {
    const nextFavorite = nextValue ?? !note.isFavorite;
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
  }, [toast]);

  const handleUnlinkFromPreview = React.useCallback(async (relatedId: string) => {
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
  }, [selectedNote, fetchNotes, handleSelectNoteFromTree, toast]);

  const handleMoveNoteToFolder = React.useCallback(async (noteId: string, folderId: string | null) => {
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
        // Fetch folder tree first, then notes will use the updated tree via ref
        await fetchFolderTree();
        await fetchNotes();
      }
    } catch (error) {
      console.error("Failed to move note:", error);
    }
  }, [fetchFolderTree, fetchNotes]);

  const handleRelateNotes = React.useCallback(async (sourceNoteId: string, targetNoteId: string) => {
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
  }, [fetchFolderTree, fetchNotes, selectedNote, handleSelectNoteFromTree, toast]);

  const handleMoveFolderToFolder = React.useCallback(async (folderId: string, targetParentId: string | null) => {
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
      }
    } catch (error) {
      console.error("Failed to move folder:", error);
    }
  }, [fetchFolderTree, fetchNotes, findFolderParentId]);

  const formatUndoLabel = React.useCallback((action: UndoAction) => {
    if (action.type === "moveNote") return "Moved note";
    if (action.type === "moveFolder") return "Moved folder";
    if (action.type === "renameFolder") return `Renamed folder to "${action.toName}"`;
    return `Renamed note to "${action.toTitle}"`;
  }, []);

  const applyUndoAction = React.useCallback(async (action: UndoAction) => {
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

  const handleUndoFolderTree = React.useCallback(async (count = 1) => {
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

  const handleUndoAtIndex = React.useCallback((index: number) => {
    const count = Math.max(1, index + 1);
    void handleUndoFolderTree(count);
  }, [handleUndoFolderTree]);

  const undoHistory = React.useMemo(
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
        {/* Folder Tree Sidebar */}
        {!isFolderTreeCollapsed && (
          <div className="hidden overflow-hidden rounded-lg border border-gray-800 bg-gray-950 lg:block">
            <FolderTree
              folders={folderTree}
              selectedFolderId={selectedFolderId}
              onSelectFolder={handleSelectFolderFromTree}
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
            onToggleCollapse={handleCollapseFolderTree}
            isFavoritesActive={filterFavorite === true}
            onToggleFavorites={handleToggleFavoritesFilter}
            canUndo={undoStack.length > 0}
            onUndo={() => handleUndoFolderTree(1)}
            undoHistory={undoHistory}
            onUndoAtIndex={handleUndoAtIndex}
          />
          </div>
        )}

        {/* Main Content Area */}
        <div className="flex min-h-0 flex-col overflow-hidden rounded-lg bg-gray-950 p-6 shadow-lg">
          {selectedNote ? (
            <div className="flex h-full flex-col">
              {/* Breadcrumb for selected note */}
              <div className="mb-4 flex items-center gap-2 text-sm text-gray-400">
                {isFolderTreeCollapsed && (
                  <Button
                    onClick={handleExpandFolderTree}
                    variant="outline"
                    className="border-gray-700 text-gray-300 hover:bg-gray-800 hover:text-white"
                  >
                    <ChevronLeft className="-scale-x-100" size={16} />
                    <span className="ml-2">Show Folders</span>
                  </Button>
                )}
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
                        className="cursor-pointer hover:text-blue-400 transition"
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
                <button
                  type="button"
                  onClick={() => handleToggleFavorite(selectedNote)}
                  className="flex items-center gap-2 rounded border border-gray-700 px-3 py-2 text-gray-300 hover:bg-gray-800 hover:text-white"
                >
                  <Star
                    size={16}
                    className={selectedNote.isFavorite ? "fill-yellow-400 text-yellow-500" : ""}
                  />
                  <span className="text-sm">
                    {selectedNote.isFavorite ? "Favorited" : "Favorite"}
                  </span>
                </button>
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
                    folderTheme={selectedNoteTheme}
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
                  <h1
                    className="mb-4 text-3xl font-bold"
                    style={{ color: previewTextColor }}
                  >
                    {selectedNote.title}
                  </h1>
                  <div
                    className="prose max-w-none"
                    style={previewTypographyStyle}
                    dangerouslySetInnerHTML={{
                      __html: renderMarkdownToHtml(selectedNote.content),
                    }}
                    onMouseOver={(e) => {
                      const target = e.target as HTMLElement;
                      const wrapper = target.closest("[data-code]") as HTMLElement | null;
                      const button = wrapper?.querySelector("[data-copy-code]") as HTMLElement | null;
                      if (button) button.style.opacity = "1";
                    }}
                    onMouseOut={(e) => {
                      const target = e.target as HTMLElement;
                      const wrapper = target.closest("[data-code]") as HTMLElement | null;
                      const button = wrapper?.querySelector("[data-copy-code]") as HTMLElement | null;
                      if (button) button.style.opacity = "0";
                    }}
                    onClick={(e) => {
                      const target = e.target as HTMLElement;
                      const copyButton = target.closest("[data-copy-code]") as HTMLButtonElement | null;
                      if (!copyButton) return;
                      const wrapper = copyButton.closest("[data-code]") as HTMLElement | null;
                      const encoded = wrapper?.getAttribute("data-code");
                      if (!encoded) return;
                      const originalLabel = copyButton.textContent;
                      navigator.clipboard
                        .writeText(decodeURIComponent(encoded))
                        .then(() => {
                          copyButton.textContent = "Copied";
                          window.setTimeout(() => {
                            copyButton.textContent = originalLabel ?? "Copy";
                          }, 1500);
                        })
                        .catch(() => toast("Failed to copy code"));
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
                                  className="relative w-40 cursor-pointer rounded-md border px-3 py-2 text-left text-xs transition"
                                  style={relatedPreviewStyle}
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
                                  <div className="line-clamp-2 text-[11px] opacity-80">
                                    {relatedNote?.content ?? "No content"}
                                  </div>
                                  <button
                                    type="button"
                                    onClick={(event) => {
                                      event.stopPropagation();
                                      void handleUnlinkFromPreview(related.id);
                                    }}
                                    className="absolute right-2 top-2 opacity-70 hover:opacity-100"
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
                {isFolderTreeCollapsed && (
                  <Button
                    onClick={handleExpandFolderTree}
                    variant="outline"
                    className="border-gray-700 text-gray-300 hover:bg-gray-800 hover:text-white"
                  >
                    <ChevronLeft className="-scale-x-100" size={16} />
                    <span className="ml-2">Show Folders</span>
                  </Button>
                )}
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
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-500">Theme</span>
                  <select
                    value={selectedFolderThemeId}
                    onChange={(e) =>
                      void handleThemeChange(e.target.value || null)
                    }
                    className="rounded border border-gray-700 bg-gray-800 px-2 py-1 text-xs text-gray-300"
                  >
                    <option value="">Default</option>
                    {themes.map((theme) => (
                      <option key={theme.id} value={theme.id}>
                        {theme.name}
                      </option>
                    ))}
                  </select>
                </div>
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

              <div className="flex min-h-0 flex-1 flex-col overflow-y-auto pr-1">
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
                        theme={getThemeForNote(note)}
                        folderTree={folderTree}
                        showTimestamps={showTimestamps}
                        showBreadcrumbs={showBreadcrumbs}
                        showRelatedNotes={showRelatedNotes}
                        enableDrag={!isFolderTreeCollapsed}
                        onSelectNote={handleSelectNote}
                        onSelectFolder={handleSelectFolderFromCard}
                        onToggleFavorite={handleToggleFavorite}
                        onDragStart={handleDragStart}
                        onDragEnd={handleDragEnd}
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
              </div>
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
                folderTheme={selectedFolderTheme}
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
