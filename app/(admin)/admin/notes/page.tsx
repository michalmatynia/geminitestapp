"use client";

import React, { useState, useEffect, useRef } from "react";
import { Plus, Search, Pin, Archive, ChevronRight, ChevronLeft, FileText, Heading, X, ArrowUp, ArrowDown, Eye, EyeOff } from "lucide-react";
import type { NoteWithRelations, TagRecord, CategoryWithChildren } from "@/types/notes";
import { Button } from "@/components/ui/button";
import ModalShell from "@/components/ui/modal-shell";
import { FolderTree } from "./components/FolderTree";
import { useToast } from "@/components/ui/toast";
import { useAdminLayout } from "@/lib/context/AdminLayoutContext";
import { useNoteSettings } from "@/lib/context/NoteSettingsContext";

function NoteForm({
  note,
  folderTree,
  defaultFolderId,
  availableTags,
  onSuccess,
  onTagCreated,
  onSelectRelatedNote,
}: {
  note?: NoteWithRelations | null;
  folderTree: CategoryWithChildren[];
  defaultFolderId?: string | null;
  availableTags: TagRecord[];
  onSuccess: () => void;
  onTagCreated: () => void;
  onSelectRelatedNote: (noteId: string) => void;
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
  const [selectedRelatedNotes, setSelectedRelatedNotes] = useState<
    Array<{ id: string; title: string; color: string | null; content: string }>
  >(
    note?.relationsFrom?.map((rel) => ({
      id: rel.targetNote.id,
      title: rel.targetNote.title,
      color: rel.targetNote.color ?? null,
      content: "",
    })) || []
  );
  const [incomingRelatedNotes, setIncomingRelatedNotes] = useState<
    Array<{ id: string; title: string; color: string | null; content: string }>
  >(
    note?.relationsTo?.map((rel) => ({
      id: rel.sourceNote.id,
      title: rel.sourceNote.title,
      color: rel.sourceNote.color ?? null,
      content: "",
    })) || []
  );
  const [relatedNoteQuery, setRelatedNoteQuery] = useState("");
  const [isRelatedDropdownOpen, setIsRelatedDropdownOpen] = useState(false);
  const [relatedNoteResults, setRelatedNoteResults] = useState<NoteWithRelations[]>([]);
  const [isRelatedLoading, setIsRelatedLoading] = useState(false);
  const relatedSearchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
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

  useEffect(() => {
    let isActive = true;
    if (!note) {
      setSelectedRelatedNotes([]);
      setIncomingRelatedNotes([]);
      setRelatedNoteQuery("");
      setIsRelatedDropdownOpen(false);
      setRelatedNoteResults([]);
      return;
    }
    const initialRelated =
      note.relationsFrom?.map((rel) => ({
        id: rel.targetNote.id,
        title: rel.targetNote.title,
        color: rel.targetNote.color ?? null,
        content: "",
      })) || [];
    const initialIncoming =
      note.relationsTo?.map((rel) => ({
        id: rel.sourceNote.id,
        title: rel.sourceNote.title,
        color: rel.sourceNote.color ?? null,
        content: "",
      })) || [];
    setSelectedRelatedNotes(initialRelated);
    setIncomingRelatedNotes(initialIncoming);
    setRelatedNoteQuery("");
    setIsRelatedDropdownOpen(false);
    setRelatedNoteResults([]);

    const hydrateRelatedNotes = async () => {
      const relatedIds = [...initialRelated, ...initialIncoming].map(
        (rel) => rel.id
      );
      if (relatedIds.length === 0) return;
      try {
        const details = await Promise.all(
          relatedIds.map(async (relId) => {
            try {
              const response = await fetch(`/api/notes/${relId}`, {
                cache: "no-store",
              });
              if (!response.ok) return null;
              return (await response.json()) as NoteWithRelations;
            } catch {
              return null;
            }
          })
        );
        if (!isActive) return;
        setSelectedRelatedNotes((prev) =>
          prev.map((item) => {
            const found = details.find((detail) => detail?.id === item.id);
            if (!found) return item;
            return {
              ...item,
              content: found.content ?? "",
              title: found.title ?? item.title,
              color: found.color ?? item.color ?? null,
            };
          })
        );
        setIncomingRelatedNotes((prev) =>
          prev.map((item) => {
            const found = details.find((detail) => detail?.id === item.id);
            if (!found) return item;
            return {
              ...item,
              content: found.content ?? "",
              title: found.title ?? item.title,
              color: found.color ?? item.color ?? null,
            };
          })
        );
      } catch (error) {
        console.error("Failed to load related note details:", error);
      }
    };

    void hydrateRelatedNotes();
    return () => {
      isActive = false;
    };
  }, [note]);

  useEffect(() => {
    if (!relatedNoteQuery) {
      setRelatedNoteResults([]);
      setIsRelatedLoading(false);
      if (relatedSearchTimerRef.current) {
        clearTimeout(relatedSearchTimerRef.current);
        relatedSearchTimerRef.current = null;
      }
      return;
    }

    if (relatedSearchTimerRef.current) {
      clearTimeout(relatedSearchTimerRef.current);
    }

    const timer = setTimeout(() => {
      let isActive = true;
      const fetchResults = async () => {
        setIsRelatedLoading(true);
        try {
          const params = new URLSearchParams({
            search: relatedNoteQuery,
            searchScope: "title",
          });
          const response = await fetch(`/api/notes?${params.toString()}`, {
            cache: "no-store",
          });
          if (!response.ok) return;
          const data = (await response.json()) as NoteWithRelations[];
          if (isActive) {
            setRelatedNoteResults(data);
          }
        } catch (error) {
          console.error("Failed to search related notes:", error);
        } finally {
          if (isActive) {
            setIsRelatedLoading(false);
          }
        }
      };

      void fetchResults();
      return () => {
        isActive = false;
      };
    }, 250);

    relatedSearchTimerRef.current = timer;

    return () => {
      clearTimeout(timer);
    };
  }, [relatedNoteQuery]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !content) return;

    setIsSubmitting(true);
    try {
      const url = note ? `/api/notes/${note.id}` : "/api/notes";
      const method = note ? "PATCH" : "POST";
      const previousRelatedIds =
        note?.relationsFrom?.map((rel) => rel.targetNote.id) || [];

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
          relatedNoteIds: selectedRelatedNotes.map((rel) => rel.id),
          categoryIds: selectedFolderId ? [selectedFolderId] : [],
        }),
      });

      if (response.ok) {
        const savedNote = (await response.json()) as NoteWithRelations;
        const currentNoteId = savedNote.id;
        const nextRelatedIds = selectedRelatedNotes.map((rel) => rel.id);

        const addedRelations = nextRelatedIds.filter(
          (id) => !previousRelatedIds.includes(id) && id !== currentNoteId
        );
        const removedRelations = previousRelatedIds.filter(
          (id) => !nextRelatedIds.includes(id) && id !== currentNoteId
        );

        const updatePeerRelations = async (
          peerNoteId: string,
          shouldAdd: boolean
        ) => {
          try {
            const peerResponse = await fetch(`/api/notes/${peerNoteId}`, {
              cache: "no-store",
            });
            if (!peerResponse.ok) return;
            const peerNote = (await peerResponse.json()) as NoteWithRelations;
            const peerRelatedIds =
              peerNote.relationsFrom?.map((rel) => rel.targetNote.id) || [];
            const nextPeerIds = shouldAdd
              ? Array.from(new Set([...peerRelatedIds, currentNoteId]))
              : peerRelatedIds.filter((id) => id !== currentNoteId);

            await fetch(`/api/notes/${peerNoteId}`, {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ relatedNoteIds: nextPeerIds }),
            });
          } catch (error) {
            console.error("Failed to sync related note:", error);
          }
        };

        await Promise.all([
          ...addedRelations.map((id) => updatePeerRelations(id, true)),
          ...removedRelations.map((id) => updatePeerRelations(id, false)),
        ]);

        toast(note ? "Note updated successfully" : "Note created successfully");
        onSuccess();
      }
    } catch (error) {
      console.error("Failed to save note:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRemoveIncomingRelation = async (sourceNoteId: string) => {
    if (!note) return;
    try {
      const response = await fetch(`/api/notes/${sourceNoteId}`, {
        cache: "no-store",
      });
      if (!response.ok) return;
      const sourceNote = (await response.json()) as NoteWithRelations;
      const relatedNoteIds =
        sourceNote.relationsFrom?.map((rel) => rel.targetNote.id) || [];
      const nextRelatedIds = relatedNoteIds.filter((id) => id !== note.id);
      const updateResponse = await fetch(`/api/notes/${sourceNoteId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ relatedNoteIds: nextRelatedIds }),
      });
      if (!updateResponse.ok) return;
      setIncomingRelatedNotes((prev) =>
        prev.filter((item) => item.id !== sourceNoteId)
      );
    } catch (error) {
      console.error("Failed to remove incoming relation:", error);
    }
  };

  return (
    <form id={note ? "note-edit-form" : undefined} onSubmit={handleSubmit} className="space-y-4">
      {/* Action Buttons at Top - Only show for Create mode, Edit mode buttons are in the header */}
      {!note && (
        <div className="flex gap-2 pb-4 border-b border-gray-700">
          <Button
            type="submit"
            disabled={isSubmitting}
            className="flex-1 bg-blue-600 text-white hover:bg-blue-700"
          >
            {isSubmitting ? "Saving..." : "Create"}
          </Button>
        </div>
      )}

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
                {tagInput && !filteredTags.find((t) => t.name.toLowerCase() === tagInput.toLowerCase()) && (
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

      <div className="space-y-2">
        <label className="mb-2 block text-sm font-medium text-white">
          Related Notes
        </label>
        <div className="flex flex-wrap gap-2">
          {[
            ...selectedRelatedNotes,
            ...incomingRelatedNotes.filter(
              (incoming) =>
                !selectedRelatedNotes.some((outgoing) => outgoing.id === incoming.id)
            ),
          ].map((related) => {
            const isIncoming = incomingRelatedNotes.some(
              (incoming) => incoming.id === related.id
            );
            return (
              <div
                key={related.id}
                className="relative flex min-w-[180px] max-w-[240px] cursor-pointer flex-col gap-1 rounded-md border border-emerald-500/30 bg-emerald-500/10 p-2 text-left transition hover:border-emerald-400/60"
                role="button"
                tabIndex={0}
                onClick={() => onSelectRelatedNote(related.id)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    onSelectRelatedNote(related.id);
                  }
                }}
              >
                <div className="text-xs font-semibold text-emerald-100 truncate">
                  {related.title}
                </div>
                <div className="text-[11px] text-emerald-200/80 leading-snug max-h-8 overflow-hidden">
                  {related.content ? related.content : "No content"}
                </div>
                <button
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation();
                    if (isIncoming && !selectedRelatedNotes.some((item) => item.id === related.id)) {
                      void handleRemoveIncomingRelation(related.id);
                      return;
                    }
                    setSelectedRelatedNotes((prev) =>
                      prev.filter((item) => item.id !== related.id)
                    );
                  }}
                  className="absolute right-1 top-1 text-emerald-100/70 hover:text-white"
                  aria-label="Remove related note"
                >
                  <X size={12} />
                </button>
              </div>
            );
          })}
        </div>
        <div className="relative">
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="Search notes to relate..."
              value={relatedNoteQuery}
              onChange={(e) => {
                setRelatedNoteQuery(e.target.value);
                setIsRelatedDropdownOpen(true);
              }}
              onFocus={() => setIsRelatedDropdownOpen(true)}
              className="flex-1 rounded-none border-x-0 border-t border-b border-gray-700 bg-transparent px-0 py-2 text-white text-sm focus:outline-none focus:border-gray-500 placeholder:text-gray-500"
            />
          </div>

          {isRelatedDropdownOpen && relatedNoteQuery && (
            <div className="absolute z-10 mt-1 w-full rounded-md border border-gray-700 bg-gray-800 shadow-lg">
              <ul className="max-h-60 overflow-auto py-1 text-sm text-gray-300">
                {isRelatedLoading && (
                  <li className="px-4 py-2 text-gray-500">Searching...</li>
                )}
                {relatedNoteResults
                  .filter((candidate) =>
                    note?.id ? candidate.id !== note.id : true
                  )
                  .filter(
                    (candidate) =>
                      candidate.title
                        .toLowerCase()
                        .includes(relatedNoteQuery.toLowerCase()) &&
                      !selectedRelatedNotes.some(
                        (selected) => selected.id === candidate.id
                      )
                  )
                  .map((candidate) => (
                    <li
                      key={candidate.id}
                      onClick={() => {
                        setSelectedRelatedNotes((prev) => [
                          ...prev,
                          {
                            id: candidate.id,
                            title: candidate.title,
                            color: candidate.color ?? null,
                            content: candidate.content ?? "",
                          },
                        ]);
                        setRelatedNoteQuery("");
                        setIsRelatedDropdownOpen(false);
                      }}
                      className="cursor-pointer px-4 py-2 hover:bg-gray-700 hover:text-white"
                    >
                      {candidate.title}
                    </li>
                  ))}
                {!isRelatedLoading &&
                  relatedNoteResults.filter(
                    (candidate) =>
                      (note?.id ? candidate.id !== note.id : true) &&
                      candidate.title
                        .toLowerCase()
                        .includes(relatedNoteQuery.toLowerCase()) &&
                      !selectedRelatedNotes.some(
                        (selected) => selected.id === candidate.id
                      )
                  ).length === 0 && (
                    <li className="px-4 py-2 text-gray-500">No matches</li>
                  )}
              </ul>
            </div>
          )}
          {isRelatedDropdownOpen && (
            <div
              className="fixed inset-0 z-0"
              onClick={() => setIsRelatedDropdownOpen(false)}
            />
          )}
        </div>
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

function BreadcrumbScroller({
  backgroundColor,
  children,
}: {
  backgroundColor: string;
  children: React.ReactNode;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const updateScrollState = React.useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    const maxScrollLeft = el.scrollWidth - el.clientWidth;
    setCanScrollLeft(el.scrollLeft > 0);
    setCanScrollRight(el.scrollLeft < maxScrollLeft - 1);
  }, []);

  React.useEffect(() => {
    updateScrollState();
    const el = scrollRef.current;
    if (!el) return;
    const handleScroll = () => updateScrollState();
    el.addEventListener("scroll", handleScroll, { passive: true });
    window.addEventListener("resize", handleScroll);
    return () => {
      el.removeEventListener("scroll", handleScroll);
      window.removeEventListener("resize", handleScroll);
    };
  }, [updateScrollState]);

  const handleScroll = (direction: "left" | "right") => {
    const el = scrollRef.current;
    if (!el) return;
    const offset = direction === "left" ? -140 : 140;
    el.scrollBy({ left: offset, behavior: "smooth" });
  };

  return (
    <div
      className="relative -mx-4 -mb-4 rounded-b-lg"
      style={{ backgroundColor }}
    >
      {canScrollLeft && (
        <button
          type="button"
          aria-label="Scroll breadcrumb left"
          onClick={() => handleScroll("left")}
          className="absolute left-1 top-1/2 z-10 -translate-y-1/2 rounded-full bg-black/20 p-1 text-gray-700 hover:bg-black/30"
        >
          <ChevronLeft size={12} />
        </button>
      )}
      {canScrollRight && (
        <button
          type="button"
          aria-label="Scroll breadcrumb right"
          onClick={() => handleScroll("right")}
          className="absolute right-1 top-1/2 z-10 -translate-y-1/2 rounded-full bg-black/20 p-1 text-gray-700 hover:bg-black/30"
        >
          <ChevronRight size={12} />
        </button>
      )}
      <div
        ref={scrollRef}
        className="flex items-center gap-1 overflow-x-auto px-5 py-2 pb-3 text-[10px] text-gray-700 scrollbar-hidden"
      >
        {children}
      </div>
    </div>
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

// Helper to darken a hex color by a percentage
const darkenColor = (hex: string, percent: number): string => {
  // Remove # if present
  const cleanHex = hex.replace("#", "");

  // Parse RGB values
  const r = parseInt(cleanHex.substring(0, 2), 16);
  const g = parseInt(cleanHex.substring(2, 4), 16);
  const b = parseInt(cleanHex.substring(4, 6), 16);

  // Darken each component
  const darkenAmount = 1 - percent / 100;
  const newR = Math.round(r * darkenAmount);
  const newG = Math.round(g * darkenAmount);
  const newB = Math.round(b * darkenAmount);

  // Convert back to hex
  return `#${newR.toString(16).padStart(2, "0")}${newG.toString(16).padStart(2, "0")}${newB.toString(16).padStart(2, "0")}`;
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
  const { isMenuCollapsed } = useAdminLayout();
  const { settings, updateSettings } = useNoteSettings();
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

  // Use settings from context (including selectedFolderId)
  const { sortBy, sortOrder, showTimestamps, showBreadcrumbs, searchScope, selectedFolderId } = settings;

  // Helper to update selectedFolderId in settings
  const setSelectedFolderId = (id: string | null) => {
    updateSettings({ selectedFolderId: id });
  };

  // Sort notes based on current sort settings
  const sortedNotes = React.useMemo(() => {
    const sorted = [...notes].sort((a, b) => {
      if (sortBy === "name") {
        return a.title.localeCompare(b.title);
      } else {
        // Sort by created date
        return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      }
    });
    return sortOrder === "desc" ? sorted.reverse() : sorted;
  }, [notes, sortBy, sortOrder]);

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
          const updatedNote = await response.json();
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
            selectedNoteId={selectedNote?.id}
            onDropNote={handleMoveNoteToFolder}
            onDropFolder={handleMoveFolderToFolder}
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
                    onSuccess={handleUpdateSuccess}
                    onTagCreated={fetchTags}
                    onSelectRelatedNote={(noteId) => {
                      void handleSelectNoteFromTree(noteId);
                    }}
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
                  {(selectedNote.relationsFrom?.length || selectedNote.relationsTo?.length) && (
                    <div className="mt-6 space-y-4">
                      <div className="space-y-2">
                        <div className="text-xs uppercase tracking-wide text-gray-400">
                          Related Notes
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {[
                            ...(selectedNote.relationsFrom ?? []).map((relation) => ({
                              id: relation.targetNote.id,
                              title: relation.targetNote.title,
                            })),
                            ...(selectedNote.relationsTo ?? []).map((relation) => ({
                              id: relation.sourceNote.id,
                              title: relation.sourceNote.title,
                            })),
                          ]
                            .filter(
                              (noteItem, index, array) =>
                                array.findIndex((item) => item.id === noteItem.id) === index
                            )
                            .map((related) => (
                              <button
                                key={related.id}
                                type="button"
                                onClick={() => void handleSelectNoteFromTree(related.id)}
                                className="rounded-md border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-left text-xs text-emerald-100 hover:border-emerald-400/60"
                              >
                                {related.title}
                              </button>
                            ))}
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
                      onClick={() => updateSettings({ searchScope: "both" })}
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
                      onClick={() => updateSettings({ searchScope: "title" })}
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
                      onClick={() => updateSettings({ searchScope: "content" })}
                      className={`flex items-center gap-1 rounded px-2 py-1 text-xs transition ${
                        searchScope === "content"
                          ? "bg-blue-600 text-white"
                          : "bg-gray-800 text-gray-400 hover:bg-gray-700"
                      }`}
                      title="Search in content only"
                    >
                      <FileText size={14} />
                    </button>

                    {/* Sort Controls */}
                    <div className="ml-auto flex items-center gap-1">
                      <span className="text-xs text-gray-500 mr-1">Sort:</span>
                      <button
                        onClick={() => updateSettings({ sortBy: "created" })}
                        className={`rounded px-2 py-1 text-xs transition ${
                          sortBy === "created"
                            ? "bg-blue-600 text-white"
                            : "bg-gray-800 text-gray-400 hover:bg-gray-700"
                        }`}
                        title="Sort by created date"
                      >
                        Date
                      </button>
                      <button
                        onClick={() => updateSettings({ sortBy: "name" })}
                        className={`rounded px-2 py-1 text-xs transition ${
                          sortBy === "name"
                            ? "bg-blue-600 text-white"
                            : "bg-gray-800 text-gray-400 hover:bg-gray-700"
                        }`}
                        title="Sort by name"
                      >
                        Name
                      </button>
                      <button
                        onClick={() => updateSettings({ sortOrder: sortOrder === "asc" ? "desc" : "asc" })}
                        className="rounded px-2 py-1 text-xs bg-gray-800 text-gray-400 hover:bg-gray-700 transition"
                        title={sortOrder === "asc" ? "Ascending (click to change)" : "Descending (click to change)"}
                      >
                        {sortOrder === "asc" ? <ArrowUp size={14} /> : <ArrowDown size={14} />}
                      </button>
                    </div>

                    {/* Visibility Controls */}
                    <div className="flex items-center gap-2 ml-2 pl-2 border-l border-gray-700">
                      <span className="text-xs text-gray-500">Show:</span>
                      <button
                        onClick={() => updateSettings({ showTimestamps: !showTimestamps })}
                        className={`flex items-center gap-1 rounded px-2 py-1 text-xs transition ${
                          showTimestamps
                            ? "bg-blue-600 text-white"
                            : "bg-gray-800 text-gray-400 hover:bg-gray-700"
                        }`}
                        title={showTimestamps ? "Hide timestamps" : "Show timestamps"}
                      >
                        {showTimestamps ? <Eye size={12} /> : <EyeOff size={12} />}
                        <span>Dates</span>
                      </button>
                      <button
                        onClick={() => updateSettings({ showBreadcrumbs: !showBreadcrumbs })}
                        className={`flex items-center gap-1 rounded px-2 py-1 text-xs transition ${
                          showBreadcrumbs
                            ? "bg-blue-600 text-white"
                            : "bg-gray-800 text-gray-400 hover:bg-gray-700"
                        }`}
                        title={showBreadcrumbs ? "Hide breadcrumbs" : "Show breadcrumbs"}
                      >
                        {showBreadcrumbs ? <Eye size={12} /> : <EyeOff size={12} />}
                        <span>Path</span>
                      </button>
                    </div>
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
              ) : sortedNotes.length === 0 ? (
                <div className="rounded-lg border border-dashed border-gray-700 p-12 text-center text-gray-400">
                  No notes found. Create your first note!
                </div>
              ) : (
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                  {sortedNotes.map((note) => (
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
                      {showTimestamps && (
                        <div className="mt-3 flex flex-col gap-0.5 text-[10px] text-gray-500">
                          <span>Created: {new Date(note.createdAt).toLocaleString()}</span>
                          <span>Modified: {new Date(note.updatedAt).toLocaleString()}</span>
                        </div>
                      )}
                      {/* Breadcrumbs */}
                      {showBreadcrumbs && (
                        <div className={showTimestamps ? "mt-3" : "mt-2"}>
                          <BreadcrumbScroller
                            backgroundColor={darkenColor(note.color || "#ffffff", 20)}
                          >
                            {buildBreadcrumbPath(
                              note.categories[0]?.categoryId || null,
                              null,
                              folderTree
                            ).map((crumb, index, array) => (
                              <React.Fragment key={index}>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setSelectedFolderId(crumb.id);
                                    setSelectedNote(null);
                                    setIsEditing(false);
                                  }}
                                  className="hover:underline whitespace-nowrap"
                                >
                                  {crumb.name}
                                </button>
                                {index < array.length - 1 && (
                                  <ChevronRight size={10} className="flex-shrink-0" />
                                )}
                              </React.Fragment>
                            ))}
                          </BreadcrumbScroller>
                        </div>
                      )}
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
