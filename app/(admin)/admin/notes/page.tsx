"use client";

import React, { useState, useEffect } from "react";
import { Plus, Search, Pin, Archive } from "lucide-react";
import type { NoteWithRelations, TagRecord, CategoryRecord, CategoryWithChildren } from "@/types/notes";
import { Button } from "@/components/ui/button";
import ModalShell from "@/components/ui/modal-shell";
import { FolderTree } from "./components/FolderTree";

function NoteForm({
  note,
  categories,
  defaultFolderId,
  onClose,
  onSuccess,
}: {
  note?: NoteWithRelations | null;
  categories: CategoryRecord[];
  defaultFolderId?: string | null;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [title, setTitle] = useState(note?.title || "");
  const [content, setContent] = useState(note?.content || "");
  const [color, setColor] = useState(note?.color || "#ffffff");
  const [isPinned, setIsPinned] = useState(note?.isPinned || false);
  const [isArchived, setIsArchived] = useState(note?.isArchived || false);
  const [selectedFolderId, setSelectedFolderId] = useState<string>(
    note?.categories[0]?.categoryId || defaultFolderId || ""
  );
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !content) return;

    setIsSubmitting(true);
    try {
      const url = note ? `/api/notes/${note.id}` : "/api/notes";
      const method = note ? "PATCH" : "POST";

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          content,
          color,
          isPinned,
          isArchived,
          tagIds: [],
          categoryIds: selectedFolderId ? [selectedFolderId] : [],
        }),
      });

      if (response.ok) {
        onSuccess();
      }
    } catch (error) {
      console.error("Failed to save note:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!note || !confirm("Are you sure you want to delete this note?")) return;

    try {
      const response = await fetch(`/api/notes/${note.id}`, { method: "DELETE" });
      if (response.ok) {
        onSuccess();
      }
    } catch (error) {
      console.error("Failed to delete note:", error);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="mb-2 block text-sm font-medium text-white">Title</label>
        <input
          type="text"
          placeholder="Enter note title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="w-full rounded-lg border border-gray-700 bg-gray-800 px-4 py-2 text-white"
          required
        />
      </div>

      <div>
        <label className="mb-2 block text-sm font-medium text-white">Content</label>
        <textarea
          placeholder="Enter note content"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          rows={12}
          className="w-full rounded-lg border border-gray-700 bg-gray-800 px-4 py-2 text-white"
          required
        />
      </div>

      <div>
        <label className="mb-2 block text-sm font-medium text-white">Folder</label>
        <select
          value={selectedFolderId}
          onChange={(e) => setSelectedFolderId(e.target.value)}
          className="w-full rounded-lg border border-gray-700 bg-gray-800 px-4 py-2 text-white"
        >
          <option value="">No Folder</option>
          {categories.map((cat) => (
            <option key={cat.id} value={cat.id}>
              {cat.name}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="mb-2 block text-sm font-medium text-white">Color</label>
        <input
          type="color"
          value={color}
          onChange={(e) => setColor(e.target.value)}
          className="h-10 w-full cursor-pointer rounded-lg border border-gray-700 bg-gray-800"
        />
      </div>

      <div className="flex gap-4">
        <label className="flex items-center gap-2 text-white">
          <input
            type="checkbox"
            checked={isPinned}
            onChange={(e) => setIsPinned(e.target.checked)}
            className="rounded"
          />
          <span className="text-sm">Pinned</span>
        </label>
        <label className="flex items-center gap-2 text-white">
          <input
            type="checkbox"
            checked={isArchived}
            onChange={(e) => setIsArchived(e.target.checked)}
            className="rounded"
          />
          <span className="text-sm">Archived</span>
        </label>
      </div>

      <div className="flex gap-2 pt-4">
        <Button
          type="submit"
          disabled={isSubmitting}
          className="flex-1 bg-blue-600 text-white hover:bg-blue-700"
        >
          {isSubmitting ? "Saving..." : note ? "Update" : "Create"}
        </Button>
        {note && (
          <Button
            type="button"
            onClick={handleDelete}
            className="bg-red-600 text-white hover:bg-red-700"
          >
            Delete
          </Button>
        )}
        <Button
          type="button"
          onClick={onClose}
          className="bg-gray-700 text-white hover:bg-gray-600"
        >
          Cancel
        </Button>
      </div>
    </form>
  );
}

const getCategoryIdsWithDescendants = (
  targetId: string,
  categories: CategoryWithChildren[]
): string[] => {
  const ids: string[] = [];
  
  for (const cat of categories) {
    if (cat.id === targetId) {
      ids.push(cat.id);
      if (cat.children) {
        const traverse = (nodes: CategoryWithChildren[]) => {
          for (const node of nodes) {
            ids.push(node.id);
            if (node.children) traverse(node.children);
          }
        };
        traverse(cat.children);
      }
      return ids;
    }
    
    if (cat.children) {
      const found = getCategoryIdsWithDescendants(targetId, cat.children);
      if (found.length > 0) return found;
    }
  }
  
  return [];
};

export default function NotesPage() {
  const [notes, setNotes] = useState<NoteWithRelations[]>([]);
  const [tags, setTags] = useState<TagRecord[]>([]);
  const [categories, setCategories] = useState<CategoryRecord[]>([]);
  const [folderTree, setFolderTree] = useState<CategoryWithChildren[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterPinned, setFilterPinned] = useState<boolean | undefined>(undefined);
  const [filterArchived, setFilterArchived] = useState<boolean | undefined>(undefined);
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);
  const [selectedNote, setSelectedNote] = useState<NoteWithRelations | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [creatingFolderParentId, setCreatingFolderParentId] = useState<string | null | undefined>(undefined);

  const fetchFolderTree = React.useCallback(async () => {
    try {
      const response = await fetch("/api/notes/categories/tree");
      const data = await response.json();
      setFolderTree(data);
    } catch (error) {
      console.error("Failed to fetch folder tree:", error);
    }
  }, []);

  const fetchFolderTree = React.useCallback(async () => {
    try {
      const response = await fetch("/api/notes/categories/tree");
      const data = await response.json();
      setFolderTree(data);
    } catch (error) {
      console.error("Failed to fetch folder tree:", error);
    }
  }, []);

  const fetchNotes = React.useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (searchQuery) params.append("search", searchQuery);
      if (filterPinned !== undefined) params.append("isPinned", String(filterPinned));
      if (filterArchived !== undefined) params.append("isArchived", String(filterArchived));
      
      if (selectedFolderId) {
        // Note: we need to pass the current tree to this function or use a ref/functional update if tree updates
        // However, selectedFolderId updates usually trigger a re-fetch.
        // To be safe and avoid circular dependencies with fetchFolderTree (which updates tree),
        // we might need to rely on the current state of folderTree.
        // But folderTree is in state.
        const descendantIds = getCategoryIdsWithDescendants(selectedFolderId, folderTree);
        if (descendantIds.length > 0) {
          descendantIds.forEach((id) => params.append("categoryIds", id));
        } else {
          params.append("categoryIds", selectedFolderId);
        }
      }

      const response = await fetch(`/api/notes?${params}`);
      const data = await response.json();
      setNotes(data);
    } catch (error) {
      console.error("Failed to fetch notes:", error);
    } finally {
      setLoading(false);
    }
  }, [searchQuery, filterPinned, filterArchived, selectedFolderId, folderTree]);

  const fetchTags = React.useCallback(async () => {
    try {
      const response = await fetch("/api/notes/tags");
      const data = await response.json();
      setTags(data);
    } catch (error) {
      console.error("Failed to fetch tags:", error);
    }
  }, []);

  const fetchCategories = React.useCallback(async () => {
    try {
      const response = await fetch("/api/notes/categories");
      const data = await response.json();
      setCategories(data);
    } catch (error) {
      console.error("Failed to fetch categories:", error);
    }
  }, []);

  useEffect(() => {
    void fetchNotes();
    void fetchTags();
    void fetchCategories();
    void fetchFolderTree();
  }, [fetchNotes, fetchTags, fetchCategories, fetchFolderTree]);

  const handleCreateFolder = async (parentId?: string | null) => {
    const folderName = prompt("Enter folder name:");
    if (!folderName) return;

    try {
      const response = await fetch("/api/notes/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: folderName,
          parentId: parentId ?? null,
        }),
      });

      if (response.ok) {
        await fetchFolderTree();
        await fetchCategories();
      }
    } catch (error) {
      console.error("Failed to create folder:", error);
    }
  };

  const handleDeleteFolder = async (folderId: string) => {
    if (!confirm("Delete this folder? Subfolders will be moved up one level.")) return;

    try {
      const response = await fetch(`/api/notes/categories/${folderId}`, {
        method: "DELETE",
      });

      if (response.ok) {
        await fetchFolderTree();
        await fetchCategories();
        if (selectedFolderId === folderId) {
          setSelectedFolderId(null);
        }
      }
    } catch (error) {
      console.error("Failed to delete folder:", error);
    }
  };

  const handleRenameFolder = async (folderId: string) => {
    const newName = prompt("Enter new folder name:");
    if (!newName) return;

    try {
      const response = await fetch(`/api/notes/categories/${folderId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newName }),
      });

      if (response.ok) {
        await fetchFolderTree();
        await fetchCategories();
      }
    } catch (error) {
      console.error("Failed to rename folder:", error);
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
  };

  const handleSelectNote = (note: NoteWithRelations) => {
    setSelectedNote(note);
    setIsEditing(false);
  };

  const handleSelectNoteFromTree = async (noteId: string) => {
    try {
      const response = await fetch(`/api/notes/${noteId}`);
      if (response.ok) {
        const note = await response.json();
        setSelectedNote(note);
        setIsEditing(false);
      }
    } catch (error) {
      console.error("Failed to fetch note:", error);
    }
  };

  const handleUpdateSuccess = () => {
    setIsEditing(false);
    void fetchNotes();
    // Refresh selected note to show updated content
    if (selectedNote) {
      void handleSelectNoteFromTree(selectedNote.id);
    }
  };

  return (
    <div className="container mx-auto py-10">
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 h-[calc(100vh-120px)]">
        {/* Folder Tree Sidebar */}
        <div className="hidden lg:block overflow-hidden rounded-lg border border-gray-800 bg-gray-950">
          <FolderTree
            folders={folderTree}
            selectedFolderId={selectedFolderId}
            onSelectFolder={(id) => {
              setSelectedFolderId(id);
              setSelectedNote(null);
              setIsEditing(false);
            }}
            onCreateFolder={handleCreateFolder}
            onDeleteFolder={handleDeleteFolder}
            onRenameFolder={handleRenameFolder}
            onSelectNote={handleSelectNoteFromTree}
            selectedNoteId={selectedNote?.id}
          />
        </div>

        {/* Main Content Area */}
        <div className="lg:col-span-4 rounded-lg bg-gray-950 p-6 shadow-lg overflow-hidden flex flex-col">
          {selectedNote ? (
            <div className="flex h-full flex-col">
              <div className="mb-4 flex items-center justify-between">
                <Button
                  onClick={() => setSelectedNote(null)}
                  variant="outline"
                  className="border-gray-700 text-gray-300 hover:bg-gray-800 hover:text-white"
                >
                  Back to List
                </Button>
                {!isEditing && (
                  <Button
                    onClick={() => setIsEditing(true)}
                    className="bg-blue-600 text-white hover:bg-blue-700"
                  >
                    Edit
                  </Button>
                )}
              </div>
              
              {isEditing ? (
                <div className="flex-1 overflow-y-auto">
                  <NoteForm
                    note={selectedNote}
                    categories={categories}
                    onClose={() => setIsEditing(false)}
                    onSuccess={handleUpdateSuccess}
                  />
                </div>
              ) : (
                <div className="flex-1 overflow-y-auto rounded-lg border border-gray-800 bg-gray-900 p-6">
                  <h1 className="mb-4 text-3xl font-bold text-white">{selectedNote.title}</h1>
                  <div className="prose prose-invert max-w-none whitespace-pre-wrap text-gray-300">
                    {selectedNote.content}
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
                <h1 className="text-3xl font-bold text-white">Notes</h1>
              </div>

              {/* Filters */}
              <div className="mb-6 flex gap-4">
                <div className="flex-1">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                    <input
                      type="text"
                      placeholder="Search notes..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full rounded-lg border border-gray-700 bg-gray-800 py-2 pl-10 pr-4 text-white placeholder-gray-400"
                    />
                  </div>
                </div>
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

              {/* Notes Grid */}
              {loading ? (
                <div className="text-center text-gray-400">Loading...</div>
              ) : notes.length === 0 ? (
                <div className="rounded-lg border border-dashed border-gray-700 p-12 text-center text-gray-400">
                  No notes found. Create your first note!
                </div>
              ) : (
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                  {notes.map((note) => (
                    <div
                      key={note.id}
                      onClick={() => handleSelectNote(note)}
                      style={{ backgroundColor: note.color || "#ffffff" }}
                      className="cursor-pointer rounded-lg border border-gray-700 p-4 shadow-sm transition hover:shadow-md"
                    >
                      <div className="mb-2 flex items-start justify-between">
                        <h3 className="font-semibold text-gray-900">{note.title}</h3>
                        {note.isPinned && <Pin size={16} className="text-blue-600" />}
                      </div>
                      <p className="mb-3 line-clamp-3 text-sm text-gray-700">{note.content}</p>
                      <div className="flex flex-wrap gap-2">
                        {note.tags.map((nt) => (
                          <span
                            key={nt.tagId}
                            style={{ backgroundColor: nt.tag.color || "#3b82f6" }}
                            className="rounded-full px-2 py-1 text-xs text-white"
                          >
                            {nt.tag.name}
                          </span>
                        ))}
                      </div>
                    </div>
                  ))}
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
                categories={categories}
                defaultFolderId={selectedFolderId}
                onClose={handleCloseCreateModal}
                onSuccess={handleCreateSuccess}
              />
            </ModalShell>
          </div>
        </div>
      )}
      </div>
    </div>
  );
}
