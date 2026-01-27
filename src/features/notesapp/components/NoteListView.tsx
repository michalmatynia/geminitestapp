import React from "react";
import { Plus, Pin, Archive, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/shared/ui/button";
import { ListPanel } from "@/shared/components/list-panel";
import { NotesFilters } from "./NotesFilters";
import { NoteCard } from "./NoteCard";
import { buildBreadcrumbPath } from "../utils";
import type { NoteListViewProps } from "@/features/notesapp/types/notes-ui";

export function NoteListView({
  loading,
  sortedNotes,
  pagedNotes,
  page,
  totalPages,
  setPage,
  pageSize,
  setPageSize,
  selectedFolderId,
  folderTree,
  isFolderTreeCollapsed,
  onExpandFolderTree,
  onCreateNote,
  selectedFolderThemeId,
  themes,
  onThemeChange,
  availableTagsInScope,
  filterTagIds,
  setFilterTagIds,
  searchQuery,
  setSearchQuery,
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
  filterPinned,
  setFilterPinned,
  filterArchived,
  setFilterArchived,
  noteLayoutClassName,
  getThemeForNote,
  onSelectNote,
  onSelectFolderFromCard,
  onToggleFavorite,
  onDragStart,
  onDragEnd,
  setSelectedFolderId,
  setSelectedNote,
  setIsEditing,
}: NoteListViewProps) {
  return (
    <ListPanel
      variant="flat"
      className="flex min-h-0 flex-1 flex-col"
      header={
        <div className="flex items-center gap-3">
          {isFolderTreeCollapsed && (
            <Button
              onClick={onExpandFolderTree}
              variant="outline"
              className="border text-gray-300 hover:bg-muted/50 hover:text-white"
            >
              <ChevronLeft className="-scale-x-100" size={16} />
              <span className="ml-2">Show Folders</span>
            </Button>
          )}
          <Button
            onClick={onCreateNote}
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
              onChange={(e) => onThemeChange(e.target.value || null)}
              className="rounded border bg-gray-800 px-2 py-1 text-xs text-gray-300"
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
            <Button
              type="button"
              onClick={() => setPage(Math.max(1, page - 1))}
              disabled={page <= 1}
              className="rounded px-2 py-1 text-xs bg-gray-800 text-gray-400 hover:bg-gray-700 transition disabled:opacity-50"
            >
              Prev
            </Button>
            <span className="text-xs text-gray-300">
              {page} / {totalPages}
            </span>
            <Button
              type="button"
              onClick={() => setPage(Math.min(totalPages, page + 1))}
              disabled={page >= totalPages}
              className="rounded px-2 py-1 text-xs bg-gray-800 text-gray-400 hover:bg-gray-700 transition disabled:opacity-50"
            >
              Next
            </Button>
            <select
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value));
                setPage(1);
              }}
              className="rounded bg-gray-800 px-2 py-1 text-xs text-gray-300 border border"
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
      }
      filters={
        <div className="flex gap-4">
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
                : "border bg-gray-800 text-gray-300"
            }`}
          >
            <Pin size={20} />
          </Button>
          <Button
            onClick={() => setFilterArchived(filterArchived === true ? undefined : true)}
            className={`rounded-lg border px-4 py-2 ${
              filterArchived === true
                ? "border-gray-500 bg-gray-700 text-white"
                : "border bg-gray-800 text-gray-300"
            }`}
          >
            <Archive size={20} />
          </Button>
        </div>
      }
      contentClassName="flex min-h-0 flex-1 flex-col overflow-y-auto pr-1"
    >
        {/* Breadcrumb */}
        {selectedFolderId && (
          <div className="mb-6 flex items-center gap-2 text-sm text-gray-400">
            {buildBreadcrumbPath(selectedFolderId, null, folderTree).map((crumb, index, array) => (
              <React.Fragment key={index}>
                <Button
                  onClick={() => {
                    setSelectedFolderId(crumb.id);
                    setSelectedNote(null);
                    setIsEditing(false);
                  }}
                  className="hover:text-blue-400 transition"
                >
                  {crumb.name}
                </Button>
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
          <div className="rounded-lg border border-dashed border p-12 text-center text-gray-400">
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
                onSelectNote={onSelectNote}
                onSelectFolder={onSelectFolderFromCard}
                onToggleFavorite={onToggleFavorite}
                onDragStart={onDragStart}
                onDragEnd={onDragEnd}
                buildBreadcrumbPath={buildBreadcrumbPath}
              />
            ))}
          </div>
        )}
        {sortedNotes.length > pageSize && (
          <div className="mt-6 flex items-center justify-center gap-3 text-sm text-gray-300">
            <Button
              type="button"
              onClick={() => setPage(Math.max(1, page - 1))}
              disabled={page <= 1}
              className="rounded border px-3 py-1.5 text-gray-300 hover:bg-muted/50 disabled:opacity-50"
            >
              Previous
            </Button>
            <span>
              Page {page} of {totalPages}
            </span>
            <Button
              type="button"
              onClick={() => setPage(Math.min(totalPages, page + 1))}
              disabled={page >= totalPages}
              className="rounded border px-3 py-1.5 text-gray-300 hover:bg-muted/50 disabled:opacity-50"
            >
              Next
            </Button>
          </div>
        )}
    </ListPanel>
  );
}
