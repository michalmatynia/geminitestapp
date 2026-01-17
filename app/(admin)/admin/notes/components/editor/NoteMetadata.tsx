"use client";

import React from "react";
import { X } from "lucide-react";
import type { TagRecord, NoteWithRelations } from "@/types/notes";

interface NoteMetadataProps {
  title: string;
  setTitle: (title: string) => void;
  showTitle?: boolean;
  selectedFolderId: string;
  setSelectedFolderId: (id: string) => void;
  flatFolders: Array<{ id: string; name: string; level: number }>;
  color: string;
  setColor: (color: string) => void;
  isPinned: boolean;
  setIsPinned: (isPinned: boolean) => void;
  isArchived: boolean;
  setIsArchived: (isArchived: boolean) => void;
  isFavorite: boolean;
  setIsFavorite: (isFavorite: boolean) => void;
  selectedTagIds: string[];
  availableTags: TagRecord[];
  tagInput: string;
  setTagInput: (input: string) => void;
  isTagDropdownOpen: boolean;
  setIsTagDropdownOpen: (isOpen: boolean) => void;
  filteredTags: TagRecord[];
  onAddTag: (tag: TagRecord) => void;
  onCreateTag: () => Promise<void>;
  onRemoveTag: (tagId: string) => void;
  onTagClick?: (tagId: string) => void;
  selectedRelatedNotes: Array<{ id: string; title: string; color: string | null; content: string }>;
  setSelectedRelatedNotes: React.Dispatch<React.SetStateAction<Array<{ id: string; title: string; color: string | null; content: string }>>>;
  relatedNoteQuery: string;
  setRelatedNoteQuery: (query: string) => void;
  isRelatedDropdownOpen: boolean;
  setIsRelatedDropdownOpen: (isOpen: boolean) => void;
  relatedNoteResults: NoteWithRelations[];
  isRelatedLoading: boolean;
  onSelectRelatedNote: (noteId: string) => void;
  effectiveTheme: any; // Using any for simplicity as theme object structure is complex and derived in parent
  noteId?: string;
}

export function NoteMetadata({
  title,
  setTitle,
  showTitle = true,
  selectedFolderId,
  setSelectedFolderId,
  flatFolders,
  color,
  setColor,
  isPinned,
  setIsPinned,
  isArchived,
  setIsArchived,
  isFavorite,
  setIsFavorite,
  selectedTagIds,
  availableTags,
  tagInput,
  setTagInput,
  isTagDropdownOpen,
  setIsTagDropdownOpen,
  filteredTags,
  onAddTag,
  onCreateTag,
  onRemoveTag,
  onTagClick,
  selectedRelatedNotes,
  setSelectedRelatedNotes,
  relatedNoteQuery,
  setRelatedNoteQuery,
  isRelatedDropdownOpen,
  setIsRelatedDropdownOpen,
  relatedNoteResults,
  isRelatedLoading,
  onSelectRelatedNote,
  effectiveTheme,
  noteId,
}: NoteMetadataProps) {
  const tagInputRef = React.useRef<HTMLInputElement>(null);

  const relatedNoteStyle = {
    borderWidth: `${effectiveTheme.relatedNoteBorderWidth ?? 1}px`,
    borderColor: effectiveTheme.relatedNoteBorderColor,
    backgroundColor: effectiveTheme.relatedNoteBackgroundColor,
    color: effectiveTheme.relatedNoteTextColor,
  };

  return (
    <div className="space-y-4">
      {showTitle ? (
        <div>
          <label className="mb-2 block text-sm font-medium text-white">
            Title
          </label>
          <input
            type="text"
            placeholder="Enter note title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full rounded-lg border border-gray-700 bg-gray-800 px-4 py-2 text-white"
            required
          />
        </div>
      ) : null}

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
              {Array.from({ length: folder.level }).map(() => "- ").join("")}
              {folder.name}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="mb-2 block text-sm font-medium text-white">Color</label>
        <div className="flex items-center gap-2">
          <input
            type="color"
            value={color}
            onChange={(e) => setColor(e.target.value)}
            className="h-10 w-full cursor-pointer rounded-lg border border-gray-700 bg-gray-800"
          />
          <button
            type="button"
            onClick={() => setColor("#ffffff")}
            className="whitespace-nowrap rounded-lg border border-gray-700 px-3 py-2 text-xs text-gray-200 hover:bg-gray-800"
            title="Use folder theme background"
          >
            Use Folder Theme
          </button>
        </div>
      </div>

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
                <button
                  type="button"
                  onClick={() => onTagClick?.(tag.id)}
                  className="hover:text-white"
                >
                  {tag.name}
                </button>
                <button
                  type="button"
                  onClick={() => onRemoveTag(tag.id)}
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
                    void onCreateTag();
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
                    onClick={() => onAddTag(tag)}
                    className="cursor-pointer px-4 py-2 hover:bg-gray-700 hover:text-white"
                  >
                    {tag.name}
                  </li>
                ))}
                {tagInput &&
                  !filteredTags.find(
                    (t) => t.name.toLowerCase() === tagInput.toLowerCase()
                  ) && (
                    <li
                      onClick={() => void onCreateTag()}
                      className="cursor-pointer px-4 py-2 text-blue-400 hover:bg-gray-700"
                    >
                      Create &quot;{tagInput}&quot;
                    </li>
                  )}
              </ul>
            </div>
          )}
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
          {selectedRelatedNotes.map((related) => (
            <div
              key={related.id}
              className="relative flex min-w-[180px] max-w-[240px] cursor-pointer flex-col gap-1 rounded-md border p-2 text-left transition"
              style={relatedNoteStyle}
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
              <div className="text-xs font-semibold truncate">
                {related.title}
              </div>
              <div className="text-[11px] leading-snug max-h-8 overflow-hidden opacity-80">
                {related.content ? related.content : "No content"}
              </div>
              <button
                type="button"
                onClick={(event) => {
                  event.stopPropagation();
                  setSelectedRelatedNotes((prev) =>
                    prev.filter((item) => item.id !== related.id)
                  );
                }}
                className="absolute right-1 top-1 opacity-70 hover:opacity-100"
                aria-label="Remove related note"
              >
                <X size={12} />
              </button>
            </div>
          ))}
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
                    noteId ? candidate.id !== noteId : true
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
                      (noteId ? candidate.id !== noteId : true) &&
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
        <label className="flex items-center gap-2 text-white">
          <input
            type="checkbox"
            checked={isFavorite}
            onChange={(e) => setIsFavorite(e.target.checked)}
            className="rounded"
          />
          <span className="text-sm">Favorite</span>
        </label>
      </div>
    </div>
  );
}
