"use client";

import React, { useState, useEffect, useRef } from "react";
import { Plus, Search, Pin, Archive, ChevronRight, FileText, Heading, X } from "lucide-react";
import type { NoteWithRelations, TagRecord, CategoryWithChildren } from "@/types/notes";
import { Button } from "@/components/ui/button";
import ModalShell from "@/components/ui/modal-shell";
import { FolderTree } from "./components/FolderTree";
import { useToast } from "@/components/ui/toast";

function NoteForm({
  note,
  folderTree,
  defaultFolderId,
  availableTags,
  onClose,
  onSuccess,
  onTagCreated,
}: {
  note?: NoteWithRelations | null;
  folderTree: CategoryWithChildren[];
  defaultFolderId?: string | null;
  availableTags: TagRecord[];
  onClose: () => void;
  onSuccess: () => void;
  onTagCreated: () => void;
}) {
  const [title, setTitle] = useState(note?.title || "");
  const [content, setContent] = useState(note?.content || "");
  const [color, setColor] = useState(note?.color || "#ffffff");
  const [isPinned, setIsPinned] = useState(note?.isPinned || false);
  const [isArchived, setIsArchived] = useState(note?.isArchived || false);
  const [selectedFolderId, setSelectedFolderId] = useState<string>(
    note?.categories[0]?.categoryId || defaultFolderId || ""
  );
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>(
    note?.tags.map((t) => t.tagId) || []
  );
  const [tagInput, setTagInput] = useState("");
  const [isTagDropdownOpen, setIsTagDropdownOpen] = useState(false);
  const tagInputRef = useRef<HTMLInputElement>(null);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  // Flatten the folder tree with hierarchy markers
  const flattenFolderTree = (folders: CategoryWithChildren[], level = 0): Array<{ id: string; name: string; level: number }> => {
    const result: Array<{ id: string; name: string; level: number }> = [];
    for (const folder of folders) {
      result.push({ id: folder.id, name: folder.name, level });
      if (folder.children.length > 0) {
        result.push(...flattenFolderTree(folder.children, level + 1));
      }
    }
    return result;
  };

  const flatFolders = flattenFolderTree(folderTree);

  const filteredTags = availableTags.filter(
    (tag) =>
      tag.name.toLowerCase().includes(tagInput.toLowerCase()) &&
      !selectedTagIds.includes(tag.id)
  );

  const handleAddTag = (tag: TagRecord) => {
    setSelectedTagIds([...selectedTagIds, tag.id]);
    setTagInput("");
    setIsTagDropdownOpen(false);
  };

  const handleCreateTag = async () => {
    if (!tagInput.trim()) return;
    
    // Check if tag already exists (case-insensitive)
    const existingTag = availableTags.find(
      (t) => t.name.toLowerCase() === tagInput.trim().toLowerCase()
    );

    if (existingTag) {
      if (!selectedTagIds.includes(existingTag.id)) {
        handleAddTag(existingTag);
      } else {
        setTagInput("");
        setIsTagDropdownOpen(false);
      }
      return;
    }

    try {
      const response = await fetch("/api/notes/tags", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: tagInput.trim() }),
      });

      if (response.ok) {
        const newTag = await response.json();
        onTagCreated(); // Refresh tags in parent
        setSelectedTagIds((prev) => [...prev, newTag.id]);
        setTagInput("");
        setIsTagDropdownOpen(false);
      }
    } catch (error) {
      console.error("Failed to create tag:", error);
    }
  };

  const handleRemoveTag = (tagId: string) => {
    setSelectedTagIds(selectedTagIds.filter((id) => id !== tagId));
  };

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
          tagIds: selectedTagIds,
          categoryIds: selectedFolderId ? [selectedFolderId] : [],
        }),
      });

      if (response.ok) {
        toast(note ? "Note updated successfully" : "Note created successfully");
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
      {/* Action Buttons at Top */}
      <div className="flex gap-2 pb-4 border-b border-gray-700">
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
        {note && (
          <Button
            type="button"
            onClick={onClose}
            className="bg-gray-700 text-white hover:bg-gray-600"
          >
            Cancel
          </Button>
        )}
      </div>

      {/* Tags Section */}
      <div className="space-y-2">
        <div className="flex flex-wrap gap-2">
          {selectedTagIds.map((tagId) => {
            const tag = availableTags.find((t) => t.id === tagId);
            if (!tag) return null;
            return (
              <span
                key={tag.id}
                className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-blue-500/20 text-blue-200 border border-blue-500/30"
              >
                {tag.name}
                <button
                  type="button"
                  onClick={() => handleRemoveTag(tag.id)}
                  className="hover:text-white"
                >
                  <X size={12} />
                </button>
              </span>
            );
          })}
        </div>
        <div className="relative">
          <div className="flex gap-2">
            <input
              ref={tagInputRef}
              type="text"
              placeholder={selectedTagIds.length === 0 ? "Tags" : "Add tag..."}
              value={tagInput}
              onChange={(e) => {
                setTagInput(e.target.value);
                setIsTagDropdownOpen(true);
              }}
              onFocus={() => setIsTagDropdownOpen(true)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  if (tagInput.trim()) {
                    void handleCreateTag();
                  }
                }
              }}
              className="flex-1 rounded-none border-x-0 border-t border-b border-gray-700 bg-transparent px-0 py-2 text-white text-sm focus:outline-none focus:border-gray-500 placeholder:text-gray-500"
            />
          </div>
          
          {isTagDropdownOpen && (tagInput || filteredTags.length > 0) && (
            <div className="absolute z-10 mt-1 w-full rounded-md border border-gray-700 bg-gray-800 shadow-lg">
              <ul className="max-h-60 overflow-auto py-1 text-sm text-gray-300">
                {filteredTags.map((tag) => (
                  <li
                    key={tag.id}
                    onClick={() => handleAddTag(tag)}
                    className="cursor-pointer px-4 py-2 hover:bg-gray-700 hover:text-white"
                  >
                    {tag.name}
                  </li>
                ))}
                {tagInput && !filteredTags.find(t => t.name.toLowerCase() === tagInput.toLowerCase()) && (
                  <li
                    onClick={() => void handleCreateTag()}
                    className="cursor-pointer px-4 py-2 text-blue-400 hover:bg-gray-700"
                  >
                    Create "{tagInput}"
                  </li>
                )}
              </ul>
            </div>
          )}
          {/* Overlay to close dropdown when clicking outside */}
          {isTagDropdownOpen && (
            <div
              className="fixed inset-0 z-0"
              onClick={() => setIsTagDropdownOpen(false)}
            />
          )}
        </div>
      </div>

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
          {flatFolders.map((folder) => (
            <option key={folder.id} value={folder.id}>
              {"\u00A0\u00A0".repeat(folder.level)}{folder.name}
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
    </form>
  );
}

const getCategoryIdsWithDescendants = (
  targetId: string,
  categories: CategoryWithChildren[]
): string[] => {
  // Helper to recursively collect all descendant IDs
  const collectAllDescendantIds = (node: CategoryWithChildren): string[] => {
    const ids = [node.id];
    if (node.children && node.children.length > 0) {
      for (const child of node.children) {
        ids.push(...collectAllDescendantIds(child));
      }
    }
    return ids;
  };

  // Find the target category in the tree
  const findCategory = (cats: CategoryWithChildren[]): CategoryWithChildren | null => {
    for (const cat of cats) {
      if (cat.id === targetId) {
        return cat;
      }
      if (cat.children && cat.children.length > 0) {
        const found = findCategory(cat.children);
        if (found) return found;
      }
    }
    return null;
  };

  const targetCategory = findCategory(categories);
  if (!targetCategory) {
    return [];
  }

  return collectAllDescendantIds(targetCategory);
};

// Helper to build breadcrumb path from root to current folder/note
const buildBreadcrumbPath = (
  folderId: string | null,
  noteTitle: string | null,
  folderTree: CategoryWithChildren[]
): Array<{ id: string | null; name: string; isNote: boolean }> => {
  const path: Array<{ id: string | null; name: string; isNote: boolean }> = [
    { id: null, name: "All Notes", isNote: false },
  ];

  if (!folderId) {
    if (noteTitle) {
      path.push({ id: null, name: noteTitle, isNote: true });
    }
    return path;
  }

  // Find the folder and build path to root
  const findPath = (
    categories: CategoryWithChildren[],
    targetId: string,
    currentPath: Array<{ id: string; name: string }>
  ): Array<{ id: string; name: string }> | null => {
    for (const cat of categories) {
      if (cat.id === targetId) {
        return [...currentPath, { id: cat.id, name: cat.name }];
      }
      if (cat.children.length > 0) {
        const found = findPath(cat.children, targetId, [...currentPath, { id: cat.id, name: cat.name }]);
        if (found) return found;
      }
    }
    return null;
  };

  const folderPath = findPath(folderTree, folderId, []);
  if (folderPath) {
    folderPath.forEach((folder) => {
      path.push({ id: folder.id, name: folder.name, isNote: false });
    });
  }

  if (noteTitle) {
    path.push({ id: null, name: noteTitle, isNote: true });
  }

  return path;
};

export default function NotesPage() {
  const [notes, setNotes] = useState<NoteWithRelations[]>([]);
  const [tags, setTags] = useState<TagRecord[]>([]);
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
  const [searchScope, setSearchScope] = useState<"both" | "title" | "content">("both");
  const [filterTagIds, setFilterTagIds] = useState<string[]>([]);

  const fetchFolderTree = React.useCallback(async () => {
    try {
      const response = await fetch("/api/notes/categories/tree", { cache: "no-store" });
      const data = await response.json();
      setFolderTree(data);
    } catch (error) {
      console.error("Failed to fetch folder tree:", error);
    }
  }, []);


  const folderTreeRef = React.useRef(folderTree);
  React.useEffect(() => {
    folderTreeRef.current = folderTree;
  }, [folderTree]);

  const fetchNotes = React.useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (searchQuery) {
        params.append("search", searchQuery);
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
      const data = await response.json();
      setNotes(data);
    } catch (error) {
      console.error("Failed to fetch notes:", error);
    } finally {
      setLoading(false);
    }
  }, [searchQuery, searchScope, filterPinned, filterArchived, selectedFolderId, filterTagIds]);

  const fetchTags = React.useCallback(async () => {
    try {
      const response = await fetch("/api/notes/tags", { cache: "no-store" });
      const data = await response.json();
      setTags(data);
    } catch (error) {
      console.error("Failed to fetch tags:", error);
    }
  }, []);

  useEffect(() => {
    void fetchTags();
    void fetchFolderTree();
  }, [fetchTags, fetchFolderTree]);

  useEffect(() => {
    void fetchNotes();
  }, [fetchNotes]);

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
    void fetchFolderTree();
  };

  const handleSelectNote = (note: NoteWithRelations) => {
    setSelectedNote(note);
    setIsEditing(false);
  };

  const handleSelectNoteFromTree = async (noteId: string) => {
    try {
      const response = await fetch(`/api/notes/${noteId}`, { cache: "no-store" });
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
    void fetchFolderTree();
    // Refresh selected note to show updated content
    if (selectedNote) {
      void handleSelectNoteFromTree(selectedNote.id);
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
            onDropNote={handleMoveNoteToFolder}
            onDropFolder={handleMoveFolderToFolder}
          />
        </div>

        {/* Main Content Area */}
        <div className="lg:col-span-4 rounded-lg bg-gray-950 p-6 shadow-lg overflow-hidden flex flex-col">
          {selectedNote ? (
            <div className="flex h-full flex-col">
              <div className="mb-4 flex items-center gap-4">
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

              {isEditing ? (
                <div className="flex-1 overflow-y-auto">
                  <NoteForm
                    note={selectedNote}
                    folderTree={folderTree}
                    defaultFolderId={selectedFolderId}
                    availableTags={tags}
                    onClose={() => setIsEditing(false)}
                    onSuccess={handleUpdateSuccess}
                    onTagCreated={fetchTags}
                  />
                </div>
              ) : (
                <div
                  className="flex-1 overflow-y-auto rounded-lg border border-gray-800 bg-gray-900 p-6 cursor-text"
                  onDoubleClick={() => setIsEditing(true)}
                >
                  <h1 className="mb-4 text-3xl font-bold text-white">{selectedNote.title}</h1>
                  <div className="prose prose-invert max-w-none whitespace-pre-wrap text-gray-300">
                    {selectedNote.content}
                  </div>
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
              </div>

              {/* Filters */}
              <div className="mb-4 flex gap-4">
                <div className="flex-1">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                    <input
                      type="text"
                      placeholder={
                        selectedFolderId
                          ? `Search in ${
                              buildBreadcrumbPath(selectedFolderId, null, folderTree).pop()?.name || "Folder"
                            }...`
                          : "Search in All Notes..."
                      }
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full rounded-lg border border-gray-700 bg-gray-800 py-2 pl-10 pr-4 text-white placeholder-gray-400"
                    />
                  </div>
                  
                  {/* Tag Filter */}
                  <div className="mt-2 flex gap-2 items-center">
                    <div className="relative">
                      <select
                        onChange={(e) => {
                          const val = e.target.value;
                          if (val && !filterTagIds.includes(val)) {
                            setFilterTagIds([...filterTagIds, val]);
                          }
                          e.target.value = "";
                        }}
                        className="rounded-lg border border-gray-700 bg-gray-800 px-3 py-1 text-xs text-white"
                      >
                        <option value="">Filter by Tag...</option>
                        {tags
                          .filter((t) => !filterTagIds.includes(t.id))
                          .map((tag) => (
                            <option key={tag.id} value={tag.id}>
                              {tag.name}
                            </option>
                          ))}
                      </select>
                    </div>
                    {filterTagIds.map((tagId) => {
                      const tag = tags.find((t) => t.id === tagId);
                      if (!tag) return null;
                      return (
                        <span
                          key={tag.id}
                          className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-blue-500/20 text-blue-200 border border-blue-500/30"
                        >
                          {tag.name}
                          <button
                            onClick={() => setFilterTagIds(filterTagIds.filter((id) => id !== tag.id))}
                            className="hover:text-white"
                          >
                            <X size={12} />
                          </button>
                        </span>
                      );
                    })}
                  </div>

                  {/* Search Scope Toggle */}
                  <div className="mt-2 flex gap-2">
                    <button
                      onClick={() => setSearchScope("both")}
                      className={`flex items-center gap-1 rounded px-2 py-1 text-xs transition ${
                        searchScope === "both"
                          ? "bg-blue-600 text-white"
                          : "bg-gray-800 text-gray-400 hover:bg-gray-700"
                      }`}
                      title="Search in title and content"
                    >
                      <FileText size={14} />
                      <Heading size={14} />
                    </button>
                    <button
                      onClick={() => setSearchScope("title")}
                      className={`flex items-center gap-1 rounded px-2 py-1 text-xs transition ${
                        searchScope === "title"
                          ? "bg-blue-600 text-white"
                          : "bg-gray-800 text-gray-400 hover:bg-gray-700"
                      }`}
                      title="Search in title only"
                    >
                      <Heading size={14} />
                    </button>
                    <button
                      onClick={() => setSearchScope("content")}
                      className={`flex items-center gap-1 rounded px-2 py-1 text-xs transition ${
                        searchScope === "content"
                          ? "bg-blue-600 text-white"
                          : "bg-gray-800 text-gray-400 hover:bg-gray-700"
                      }`}
                      title="Search in content only"
                    >
                      <FileText size={14} />
                    </button>
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
              ) : notes.length === 0 ? (
                <div className="rounded-lg border border-dashed border-gray-700 p-12 text-center text-gray-400">
                  No notes found. Create your first note!
                </div>
              ) : (
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                  {notes.map((note) => (
                    <div
                      key={note.id}
                      draggable
                      onDragStart={(e) => {
                        e.dataTransfer.setData("noteId", note.id);
                        e.dataTransfer.effectAllowed = "move";
                        const target = e.currentTarget as HTMLElement;
                        target.style.opacity = "0.5";
                      }}
                      onDragEnd={(e) => {
                        const target = e.currentTarget as HTMLElement;
                        target.style.opacity = "1";
                      }}
                      onClick={() => handleSelectNote(note)}
                      style={{ backgroundColor: note.color || "#ffffff" }}
                      className="cursor-grab active:cursor-grabbing rounded-lg border border-gray-700 p-4 shadow-sm transition hover:shadow-md"
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
                      <div className="mt-3 flex flex-col gap-0.5 text-[10px] text-gray-500">
                        <span>Created: {new Date(note.createdAt).toLocaleString()}</span>
                        <span>Modified: {new Date(note.updatedAt).toLocaleString()}</span>
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
                folderTree={folderTree}
                defaultFolderId={selectedFolderId}
                availableTags={tags}
                onClose={handleCloseCreateModal}
                onSuccess={handleCreateSuccess}
                onTagCreated={fetchTags}
              />
            </ModalShell>
          </div>
        </div>
      )}
      </div>
    </div>
  );
}
