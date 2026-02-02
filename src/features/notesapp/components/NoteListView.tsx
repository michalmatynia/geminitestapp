import React from "react";
import { Button, ListPanel, EmptyState, Pagination, UnifiedSelect } from "@/shared/ui";

import { Plus, Pin, Archive, ChevronLeft, ChevronRight, FileText } from "lucide-react";


import { NotesFilters } from "./NotesFilters";
import { NoteCard } from "./NoteCard";
import { buildBreadcrumbPath } from "../utils";
import type { NoteListViewProps } from "@/features/notesapp/types/notes-ui";
import type { NoteWithRelations, ThemeRecord } from "@/shared/types/notes";

type BreadcrumbItem = { id: string | null; name: string; isNote?: boolean };

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
}: NoteListViewProps): React.JSX.Element {
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
            <UnifiedSelect
              value={selectedFolderThemeId || ""}
              onValueChange={(val: string) => onThemeChange(val || null)}
              options={[
                { value: "", label: "Default" },
                ...themes.map((theme: ThemeRecord) => ({
                  value: theme.id,
                  label: theme.name,
                })),
              ]}
              triggerClassName="h-8 w-32 text-xs bg-gray-800 border-border text-gray-300"
            />
          </div>
          <div className="ml-auto">
            <Pagination
              page={page}
              totalPages={totalPages}
              onPageChange={setPage}
              pageSize={pageSize}
              onPageSizeChange={setPageSize}
              pageSizeOptions={[12, 24, 48]}
              showPageSize
              variant="compact"
            />
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
            onClick={(): void => setFilterPinned(filterPinned === true ? undefined : true)}
            className={`rounded-lg border px-4 py-2 ${
              filterPinned === true
                ? "border-blue-500 bg-blue-600 text-white"
                : "border bg-gray-800 text-gray-300"
            }`}
          >
            <Pin size={20} />
          </Button>
          <Button
            onClick={(): void => setFilterArchived(filterArchived === true ? undefined : true)}
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
            {buildBreadcrumbPath(selectedFolderId, null, folderTree).map((crumb: BreadcrumbItem, index: number, array: BreadcrumbItem[]) => (
              <React.Fragment key={index}>
                <Button
                  onClick={(): void => {
                    if (crumb.id) setSelectedFolderId(crumb.id);
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
          <EmptyState
            title="No notes found"
            description="Create your first note to get started!"
            icon={<FileText className="size-12" />}
            action={
              <Button onClick={onCreateNote}>
                <Plus className="mr-2 size-4" />
                Create Note
              </Button>
            }
          />
        ) : (
          <div className={noteLayoutClassName}>
            {pagedNotes.map((note: NoteWithRelations) => (
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
    </ListPanel>
  );
}
