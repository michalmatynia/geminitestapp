"use client";

import React from "react";
import { Button, SearchInput, UnifiedSelect } from "@/shared/ui";

import { X, ArrowUp, ArrowDown, Eye, EyeOff } from "lucide-react";
import type { NotesFiltersProps } from "@/features/notesapp/types/notes-ui";
import type { TagRecord } from "@/shared/types/notes";


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
}: NotesFiltersProps): React.JSX.Element {
  return (
    <div className="flex-1">
        <div className="relative">
          <SearchInput
            placeholder={
              selectedFolderId
                ? `Search in ${
                    buildBreadcrumbPath(selectedFolderId, null, folderTree).pop()?.name ||
                    "Folder"
                  }...`
                : "Search in All Notes..."
            }
            value={searchQuery}
            onChange={(e: React.ChangeEvent<HTMLInputElement>): void => setSearchQuery(e.target.value)}
            onClear={() => setSearchQuery("")}
            className="w-full rounded-lg border bg-gray-800 py-2 text-white placeholder-gray-400"
          />
        </div>

        <div className="mt-2 flex gap-2 items-center">
          <div className="relative">
            <UnifiedSelect
              value=""
              onValueChange={(val: string) => {
                if (val && !filterTagIds.includes(val)) {
                  setFilterTagIds([...filterTagIds, val]);
                }
              }}
              options={[
                { value: "", label: "Filter by Tag...", disabled: true },
                ...tags
                  .filter((t: TagRecord) => !filterTagIds.includes(t.id))
                  .map((tag: TagRecord) => ({
                    value: tag.id,
                    label: tag.name,
                  })),
              ]}
              triggerClassName="h-8 w-40 text-xs bg-gray-800 border-border text-gray-300"
              placeholder="Filter by Tag..."
            />
          </div>
          {filterTagIds.map((tagId: string) => {
            const tag = tags.find((t: TagRecord) => t.id === tagId);
            if (!tag) return null;
            return (
              <span
                key={tag.id}
                className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-blue-500/20 text-blue-200 border border-blue-500/30 ${
                  highlightTagId === tag.id ? "ring-2 ring-blue-300/70" : ""
                }`}
              >
                {tag.name}
                <Button
                  onClick={(): void =>
                    setFilterTagIds(filterTagIds.filter((id: string) => id !== tag.id))
                  }
                  className="hover:text-white"
                >
                  <X size={12} />
                </Button>
              </span>
            );
          })}
        </div>

        <div className="mt-2 flex gap-2">
          <UnifiedSelect
            value={searchScope}
            onValueChange={(val: string) => updateSettings({ searchScope: val as "both" | "title" | "content" })}
                          options={[
                            { value: "both", label: "Title + Content" },
                            { value: "title", label: "Title Only" },
                            { value: "content", label: "Content Only" },
                          ]}            triggerClassName="h-8 w-40 text-xs bg-gray-800 border-border text-gray-300"
          />

          <div className="ml-auto flex items-center gap-1">
            <UnifiedSelect
              value={sortBy}
              onValueChange={(val: string) => updateSettings({ sortBy: val as "created" | "updated" | "name" })}
              options={[
                { value: "created", label: "Date Created" },
                { value: "updated", label: "Date Modified" },
                { value: "name", label: "Name" },
              ]}
              triggerClassName="h-8 w-36 text-xs bg-gray-800 border-border text-gray-300"
            />
            <Button
              onClick={(): void =>
                updateSettings({
                  sortOrder: sortOrder === "asc" ? "desc" : "asc",
                })
              }
              className="h-8 rounded px-2 text-xs bg-gray-800 text-gray-400 hover:bg-gray-700 transition border border-border"
              title={
                sortOrder === "asc"
                  ? "Ascending (click to change)"
                  : "Descending (click to change)"
              }
            >
              {sortOrder === "asc" ? <ArrowUp size={14} /> : <ArrowDown size={14} />}
            </Button>
          </div>

          <div className="flex items-center gap-2 ml-2 pl-2 border-l border">
            <span className="text-xs text-gray-500">Show:</span>
            <Button
              onClick={(): void => updateSettings({ showTimestamps: !showTimestamps })}
              className={`flex items-center gap-1 rounded px-2 py-1 text-xs transition ${
                showTimestamps
                  ? "bg-blue-600 text-white"
                  : "bg-gray-800 text-gray-400 hover:bg-gray-700"
              }`}
              title={showTimestamps ? "Hide timestamps" : "Show timestamps"}
            >
              {showTimestamps ? <Eye size={12} /> : <EyeOff size={12} />}
              <span>Dates</span>
            </Button>
            <Button
              onClick={(): void => updateSettings({ showBreadcrumbs: !showBreadcrumbs })}
              className={`flex items-center gap-1 rounded px-2 py-1 text-xs transition ${
                showBreadcrumbs
                  ? "bg-blue-600 text-white"
                  : "bg-gray-800 text-gray-400 hover:bg-gray-700"
              }`}
              title={showBreadcrumbs ? "Hide breadcrumbs" : "Show breadcrumbs"}
            >
              {showBreadcrumbs ? <Eye size={12} /> : <EyeOff size={12} />}
              <span>Path</span>
            </Button>
            <Button
              onClick={(): void => updateSettings({ showRelatedNotes: !showRelatedNotes })}
              className={`flex items-center gap-1 rounded px-2 py-1 text-xs transition ${
                showRelatedNotes
                  ? "bg-blue-600 text-white"
                  : "bg-gray-800 text-gray-400 hover:bg-gray-700"
              }`}
              title={showRelatedNotes ? "Hide related notes" : "Show related notes"}
            >
              {showRelatedNotes ? <Eye size={12} /> : <EyeOff size={12} />}
              <span>Links</span>
            </Button>
          </div>
          <div className="flex items-center gap-2 ml-2 pl-2 border-l border">
            <UnifiedSelect
              value={viewMode === "list" ? "list" : `grid-${gridDensity}`}
              onValueChange={(val: string) => {
                if (val === "list") {
                  updateSettings({ viewMode: "list" });
                } else if (val === "grid-4") {
                  updateSettings({ viewMode: "grid", gridDensity: 4 });
                } else if (val === "grid-8") {
                  updateSettings({ viewMode: "grid", gridDensity: 8 });
                }
              }}
              options={[
                { value: "list", label: "List" },
                { value: "grid-4", label: "Grid (4)" },
                { value: "grid-8", label: "Grid (8)" },
              ]}
              triggerClassName="h-8 w-28 text-xs bg-gray-800 border-border text-gray-300"
            />
          </div>
        </div>
    </div>
  );
}
