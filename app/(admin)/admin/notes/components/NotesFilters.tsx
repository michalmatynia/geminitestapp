"use client";

import React from "react";
import { Search, FileText, Heading, X, ArrowUp, ArrowDown, Eye, EyeOff, LayoutGrid, List, ChevronDown, Check } from "lucide-react";
import type { CategoryWithChildren, TagRecord } from "@/types/notes";

export function NotesFilters({
  selectedFolderId,
  folderTree,
  searchQuery,
  setSearchQuery,
  tags,
  filterTagIds,
  setFilterTagIds,
  searchScope,
  updateSettings,
  sortBy,
  sortOrder,
  showTimestamps,
  showBreadcrumbs,
  showRelatedNotes,
  viewMode,
  gridDensity,
  highlightTagId,
  buildBreadcrumbPath,
}: {
  selectedFolderId: string | null;
  folderTree: CategoryWithChildren[];
  searchQuery: string;
  setSearchQuery: (value: string) => void;
  tags: TagRecord[];
  filterTagIds: string[];
  setFilterTagIds: (value: string[]) => void;
  searchScope: "both" | "title" | "content";
  updateSettings: (updates: {
    sortBy?: "created" | "updated" | "name";
    sortOrder?: "asc" | "desc";
    showTimestamps?: boolean;
    showBreadcrumbs?: boolean;
    showRelatedNotes?: boolean;
    searchScope?: "both" | "title" | "content";
    viewMode?: "grid" | "list";
    gridDensity?: 4 | 8;
  }) => void;
  sortBy: "created" | "updated" | "name";
  sortOrder: "asc" | "desc";
  showTimestamps: boolean;
  showBreadcrumbs: boolean;
  showRelatedNotes: boolean;
  viewMode: "grid" | "list";
  gridDensity: 4 | 8;
  highlightTagId?: string | null;
  buildBreadcrumbPath: (
    categoryId: string | null,
    noteTitle: string | null,
    categories: CategoryWithChildren[]
  ) => Array<{ id: string | null; name: string; isNote?: boolean }>;
}) {
  const [isLayoutOpen, setIsLayoutOpen] = React.useState(false);
  const layoutLabel =
    viewMode === "list" ? "List" : gridDensity === 8 ? "Grid 8" : "Grid 4";

  return (
    <div className="flex-1">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
          <input
            type="text"
            placeholder={
              selectedFolderId
                ? `Search in ${
                    buildBreadcrumbPath(selectedFolderId, null, folderTree).pop()?.name ||
                    "Folder"
                  }...`
                : "Search in All Notes..."
            }
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-lg border border-gray-700 bg-gray-800 py-2 pl-10 pr-4 text-white placeholder-gray-400"
          />
        </div>

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
                className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-blue-500/20 text-blue-200 border border-blue-500/30 ${
                  highlightTagId === tag.id ? "ring-2 ring-blue-300/70" : ""
                }`}
              >
                {tag.name}
                <button
                  onClick={() =>
                    setFilterTagIds(filterTagIds.filter((id) => id !== tag.id))
                  }
                  className="hover:text-white"
                >
                  <X size={12} />
                </button>
              </span>
            );
          })}
        </div>

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
              onClick={() => updateSettings({ sortBy: "updated" })}
              className={`rounded px-2 py-1 text-xs transition ${
                sortBy === "updated"
                  ? "bg-blue-600 text-white"
                  : "bg-gray-800 text-gray-400 hover:bg-gray-700"
              }`}
              title="Sort by modified date"
            >
              Modified
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
              onClick={() =>
                updateSettings({
                  sortOrder: sortOrder === "asc" ? "desc" : "asc",
                })
              }
              className="rounded px-2 py-1 text-xs bg-gray-800 text-gray-400 hover:bg-gray-700 transition"
              title={
                sortOrder === "asc"
                  ? "Ascending (click to change)"
                  : "Descending (click to change)"
              }
            >
              {sortOrder === "asc" ? <ArrowUp size={14} /> : <ArrowDown size={14} />}
            </button>
          </div>

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
            <button
              onClick={() => updateSettings({ showRelatedNotes: !showRelatedNotes })}
              className={`flex items-center gap-1 rounded px-2 py-1 text-xs transition ${
                showRelatedNotes
                  ? "bg-blue-600 text-white"
                  : "bg-gray-800 text-gray-400 hover:bg-gray-700"
              }`}
              title={showRelatedNotes ? "Hide related notes" : "Show related notes"}
            >
              {showRelatedNotes ? <Eye size={12} /> : <EyeOff size={12} />}
              <span>Links</span>
            </button>
          </div>
          <div className="relative flex items-center gap-2 ml-2 pl-2 border-l border-gray-700">
            <button
              type="button"
              onClick={() => setIsLayoutOpen((prev) => !prev)}
              className="flex items-center gap-1 rounded px-2 py-1 text-xs bg-gray-800 text-gray-400 hover:bg-gray-700 transition"
              title="Layout options"
            >
              {viewMode === "list" ? <List size={14} /> : <LayoutGrid size={14} />}
              <span>{layoutLabel}</span>
              <ChevronDown size={12} />
            </button>
            {isLayoutOpen && (
              <>
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setIsLayoutOpen(false)}
                />
                <div className="absolute right-0 top-full z-50 mt-2 w-44 rounded-md border border-gray-700 bg-gray-900 p-1 shadow-lg">
                  <button
                    type="button"
                    onClick={() => {
                      updateSettings({ viewMode: "grid", gridDensity: 4 });
                      setIsLayoutOpen(false);
                    }}
                    className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-xs text-gray-200 hover:bg-gray-800"
                  >
                    <LayoutGrid size={14} />
                    <span className="flex-1 text-left">Grid (4 per row)</span>
                    {viewMode === "grid" && gridDensity === 4 && <Check size={12} />}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      updateSettings({ viewMode: "grid", gridDensity: 8 });
                      setIsLayoutOpen(false);
                    }}
                    className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-xs text-gray-200 hover:bg-gray-800"
                  >
                    <LayoutGrid size={14} />
                    <span className="flex-1 text-left">Grid (8 per row)</span>
                    {viewMode === "grid" && gridDensity === 8 && <Check size={12} />}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      updateSettings({ viewMode: "list" });
                      setIsLayoutOpen(false);
                    }}
                    className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-xs text-gray-200 hover:bg-gray-800"
                  >
                    <List size={14} />
                    <span className="flex-1 text-left">List</span>
                    {viewMode === "list" && <Check size={12} />}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
    </div>
  );
}
