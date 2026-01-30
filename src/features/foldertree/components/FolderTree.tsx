"use client";

import { Button, useToast } from "@/shared/ui";
import React, { useState, useCallback, useEffect, useMemo } from "react";
import { Folder, Plus, ChevronRight, ChevronDown, ChevronLeft, Star, Upload } from "lucide-react";


import type { CategoryWithChildren } from "@/shared/types/notes";
import type { FolderTreeProps } from "@/features/foldertree/types/folder-tree-ui";
import { FolderNode } from "./tree/FolderNode";
import { parseMultipleFolders, countMultipleFolders } from "@/features/foldertree/utils/folderImporter";

function FolderTreeBase({
  folders,
  selectedFolderId,
  selectedNotebookId,
  onSelectFolder,
  onCreateFolder,
  onCreateNote,
  onDeleteFolder,
  onRenameFolder,
  onSelectNote,
  onDuplicateNote,
  onDeleteNote,
  onRenameNote,
  onRelateNotes,
  selectedNoteId,
  onDropNote,
  onDropFolder,
  draggedNoteId,
  setDraggedNoteId,
  onToggleCollapse,
  isFavoritesActive,
  onToggleFavorites,
  canUndo,
  onUndo,
  undoHistory,
  onUndoAtIndex,
  onRefreshFolders,
}: FolderTreeProps) {
  const { toast } = useToast();
  const [isAllNotesDragOver, setIsAllNotesDragOver] = useState(false);
  const [draggedFolderId, setDraggedFolderId] = useState<string | null>(null);
  const [renamingFolderId, setRenamingFolderId] = useState<string | null>(null);
  const [renamingNoteId, setRenamingNoteId] = useState<string | null>(null);
  const [isHistoryExpanded, setIsHistoryExpanded] = useState(true);
  const [expandedFolderIds, setExpandedFolderIds] = useState<Set<string>>(new Set());
  const [isDropzoneActive, setIsDropzoneActive] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [showDropzone, setShowDropzone] = useState(false);

  const collectFolderIds = useCallback((foldersToScan: CategoryWithChildren[]) => {
    const ids: string[] = [];
    const walk = (nodes: CategoryWithChildren[]) => {
      nodes.forEach((node) => {
        ids.push(node.id);
        if (node.children.length > 0) {
          walk(node.children);
        }
      });
    };
    walk(foldersToScan);
    return ids;
  }, []);

  /*
  const findFolderPathIds = useCallback(
    (foldersToScan: CategoryWithChildren[], targetId: string) => {
      const path: string[] = [];
      const walk = (nodes: CategoryWithChildren[]): boolean => {
        for (const node of nodes) {
          if (node.id === targetId) {
            path.push(node.id);
            return true;
          }
          if (node.children.length > 0) {
            if (walk(node.children)) {
              path.unshift(node.id);
              return true;
            }
          }
        }
        return false;
      };
      walk(foldersToScan);
      return path;
    },
    []
  );
  */

  const findFolderById = useCallback(
    function findFolderById(
      foldersToScan: CategoryWithChildren[],
      id: string
    ): CategoryWithChildren | null {
      for (const node of foldersToScan) {
        if (node.id === id) return node;
        const found = findFolderById(node.children, id);
        if (found) return found;
      }
      return null;
    },
    []
  );

  // Track if initial expansion has happened to avoid re-expanding on folder tree refresh
  const hasInitiallyExpandedRef = React.useRef(false);

  useEffect(() => {
    if (folders.length === 0) return;
    if (hasInitiallyExpandedRef.current) return; // Don't re-expand after initial load

    setExpandedFolderIds(new Set(collectFolderIds(folders)));
    hasInitiallyExpandedRef.current = true;
  }, [folders, collectFolderIds]);

  const handleFolderDragStart = useCallback((folderId: string) => {
    setDraggedFolderId(folderId);
  }, []);

  const handleFolderDragEnd = useCallback(() => {
    setDraggedFolderId(null);
  }, []);

  const handleToggleExpand = useCallback((folderId: string) => {
    setExpandedFolderIds((prev) => {
      const next = new Set(prev);
      if (next.has(folderId)) {
        next.delete(folderId);
      } else {
        next.add(folderId);
      }
      return next;
    });
  }, []);

  const handleToggleSelectedCollapse = useCallback(() => {
    if (!selectedFolderId) return;
    const target = findFolderById(folders, selectedFolderId);
    if (!target) return;
    const targetIds = [target.id, ...collectFolderIds(target.children)];
    setExpandedFolderIds((prev) => {
      const next = new Set(prev);
      const allExpanded = targetIds.every((id) => next.has(id));
      if (allExpanded) {
        targetIds.forEach((id) => next.delete(id));
      } else {
        targetIds.forEach((id) => next.add(id));
      }
      return next;
    });
  }, [selectedFolderId, folders, collectFolderIds, findFolderById]);

  const isSelectedSubtreeExpanded = useMemo(() => {
    if (!selectedFolderId) return false;
    const target = findFolderById(folders, selectedFolderId);
    if (!target) return false;
    const targetIds = [target.id, ...collectFolderIds(target.children)];
    return targetIds.every((id) => expandedFolderIds.has(id));
  }, [selectedFolderId, folders, collectFolderIds, findFolderById, expandedFolderIds]);

  const handleFolderImport = useCallback(async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDropzoneActive(false);

    if (!selectedNotebookId) {
      toast("Please select a notebook first", { variant: "error" });
      return;
    }

    setIsImporting(true);

    try {
      const structures = await parseMultipleFolders(e.dataTransfer.items);

      if (!structures || structures.length === 0) {
        toast("No valid folder structure found", { variant: "error" });
        setIsImporting(false);
        return;
      }

      const counts = countMultipleFolders(structures);

      const folderNames = structures.map(s => s.name).join(", ");
      const displayName = structures.length === 1
        ? `folder "${structures[0]!.name}"`
        : `${structures.length} folders (${folderNames})`;

      const confirmed = confirm(
        `Import ${displayName} with ${counts.folders} total folders and ${counts.notes} notes?`
      );

      if (!confirmed) {
        setIsImporting(false);
        return;
      }

      const response = await fetch("/api/notes/import-folder", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          notebookId: selectedNotebookId,
          parentFolderId: null,
          structures,
        }),
      });

      if (response.ok) {
        await response.json();
        toast(`Successfully imported ${counts.folders} folders and ${counts.notes} notes`);

        if (onRefreshFolders) {
          await onRefreshFolders();
        }
      } else {
        const error = (await response.json()) as { error?: string };
        toast(error.error || "Failed to import folder structure", { variant: "error" });
      }
    } catch (error) {
      console.error("Failed to import folder:", error);
      toast("An unexpected error occurred while importing", { variant: "error" });
    } finally {
      setIsImporting(false);
    }
  }, [selectedNotebookId, toast, onRefreshFolders]);

  const handleDropzoneDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDropzoneActive(true);
  }, []);

  const handleDropzoneDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDropzoneActive(false);
  }, []);

  const folderNodes = useMemo(
    () =>
      folders.map((folder) => (
        <FolderNode
          key={folder.id}
          folder={folder}
          level={0}
          selectedFolderId={selectedFolderId}
          onSelect={onSelectFolder}
          onCreateSubfolder={onCreateFolder}
          onCreateNote={onCreateNote}
          onDelete={onDeleteFolder}
          onRename={onRenameFolder}
          onSelectNote={onSelectNote}
          onDuplicateNote={onDuplicateNote}
          onDeleteNote={onDeleteNote}
          onRenameNote={onRenameNote}
          selectedNoteId={selectedNoteId}
          onDropNote={onDropNote}
          onDropFolder={onDropFolder}
          onRelateNotes={onRelateNotes}
          draggedFolderId={draggedFolderId}
          draggedNoteId={draggedNoteId}
          setDraggedNoteId={setDraggedNoteId}
          onDragStart={handleFolderDragStart}
          onDragEnd={handleFolderDragEnd}
          allFolders={folders}
          renamingFolderId={renamingFolderId}
          onStartRename={setRenamingFolderId}
          onCancelRename={() => setRenamingFolderId(null)}
          renamingNoteId={renamingNoteId}
          onStartNoteRename={setRenamingNoteId}
          onCancelNoteRename={() => setRenamingNoteId(null)}
          expandedFolderIds={expandedFolderIds}
          onToggleExpand={handleToggleExpand}
        />
      )),
    [
      folders,
      selectedFolderId,
      selectedNoteId,
      onSelectFolder,
      onCreateFolder,
      onCreateNote,
      onDeleteFolder,
      onRenameFolder,
      onSelectNote,
      onDuplicateNote,
      onDeleteNote,
      onRenameNote,
      onDropNote,
      onDropFolder,
      onRelateNotes,
      draggedFolderId,
      draggedNoteId,
      setDraggedNoteId,
      handleFolderDragStart,
      handleFolderDragEnd,
      renamingFolderId,
      renamingNoteId,
      expandedFolderIds,
      handleToggleExpand,
    ]
  );

  return (
    <div
      className="flex h-full flex-col bg-gray-900 border-r border-border"
      onDragEnterCapture={(e) => {
        if (!draggedNoteId) return;
        e.preventDefault();
      }}
      onDragOverCapture={(e) => {
        if (!draggedNoteId) return;
        e.preventDefault();
        e.dataTransfer.dropEffect = "move";
      }}
      onDropCapture={(e) => {
        if (!draggedNoteId) return;
        e.preventDefault();
        const target = (e.target as HTMLElement).closest("[data-note-id]");
        const targetId = target?.getAttribute("data-note-id");
        if (!targetId) {
          toast("Nothing to drop here", { variant: "info" });
          return;
        }
        if (targetId === draggedNoteId) {
          toast("Can't link a note to itself", { variant: "info" });
          return;
        }
        onRelateNotes(draggedNoteId, targetId);
      }}
      onDragOver={(e) => {
        if (!draggedNoteId) return;
        e.preventDefault();
      }}
      onDrop={(e) => {
        if (!draggedNoteId) return;
        e.preventDefault();
        const target = (e.target as HTMLElement).closest("[data-note-id]");
        const targetId = target?.getAttribute("data-note-id");
        if (!targetId) {
          toast("Nothing to drop here", { variant: "info" });
          return;
        }
        if (targetId === draggedNoteId) {
          toast("Can't link a note to itself", { variant: "info" });
          return;
        }
        onRelateNotes(draggedNoteId, targetId);
      }}
    >
      <div className="p-4 border-b border-border">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-white">Folders</h2>
          <div className="flex items-center gap-2">
            <Button
              onClick={() => setShowDropzone(!showDropzone)}
              size="sm"
              variant="outline"
              className={`h-7 w-7 p-0 border hover:bg-muted/50 ${
                showDropzone ? "bg-blue-600/20 text-blue-400" : "text-gray-300"
              }`}
              aria-label={showDropzone ? "Hide dropzone" : "Show dropzone"}
            >
              <Upload className="size-4" />
            </Button>
            <Button
              onClick={() => onCreateFolder(null)}
              size="sm"
              className="h-7 w-7 p-0 bg-blue-600 hover:bg-blue-700"
              aria-label="Add folder"
            >
              <Plus className="size-4" />
            </Button>
            {onUndo && (
              <Button
                onClick={onUndo}
                size="sm"
                variant="outline"
                className="h-7 px-2 border text-gray-300 hover:bg-muted/50"
                disabled={!canUndo}
              >
                Undo
              </Button>
            )}
            <Button
              onClick={handleToggleSelectedCollapse}
              size="sm"
              variant="outline"
              className="h-7 w-7 p-0 border text-gray-300 hover:bg-muted/50"
              disabled={!selectedFolderId}
              aria-label={isSelectedSubtreeExpanded ? "Collapse folder" : "Expand folder"}
            >
              {isSelectedSubtreeExpanded ? (
                <ChevronDown className="size-4" />
              ) : (
                <ChevronRight className="size-4" />
              )}
            </Button>
            {onToggleCollapse && (
              <Button
                onClick={onToggleCollapse}
                size="sm"
                variant="outline"
                className="h-7 w-7 p-0 border text-gray-300 hover:bg-muted/50"
                aria-label="Collapse folder tree"
              >
                <ChevronLeft className="size-4" />
              </Button>
            )}
          </div>
        </div>
        <Button
          onClick={() => onSelectFolder(null)}
          onDragOver={(e) => {
            e.preventDefault();
            setIsAllNotesDragOver(true);
          }}
          onDragLeave={() => {
            setIsAllNotesDragOver(false);
          }}
          onDrop={(e) => {
            e.preventDefault();
            setIsAllNotesDragOver(false);
            const noteId =
              e.dataTransfer.getData("noteId") ||
              e.dataTransfer.getData("text/plain") ||
              draggedNoteId ||
              "";
            const folderId = e.dataTransfer.getData("folderId");
            if (noteId) {
              onDropNote(noteId, null);
            } else if (folderId) {
              onDropFolder(folderId, null);
            } else {
              toast("Nothing to drop here", { variant: "info" });
            }
          }}
          className={`w-full flex items-center gap-2 px-2 py-1.5 rounded text-sm transition ${
            selectedFolderId === null && !selectedNoteId
              ? "bg-blue-600 text-white"
              : isAllNotesDragOver
              ? "bg-green-600 text-white"
              : "text-gray-300 hover:bg-muted/50"
          }`}
        >
          <Folder className="size-4" />
          <span>All Notes</span>
        </Button>
        {onToggleFavorites && (
          <Button
            onClick={() => onToggleFavorites()}
            className={`mt-1 w-full flex items-center gap-2 px-2 py-1.5 rounded text-sm transition ${
              isFavoritesActive
                ? "bg-yellow-500/20 text-yellow-200"
                : "text-gray-300 hover:bg-muted/50"
            }`}
          >
            <Star className="size-4" />
            <span>Favorites</span>
          </Button>
        )}
        {undoHistory && undoHistory.length > 0 && (
          <div className="mt-3 rounded border border-border bg-card/60 p-2 text-xs text-gray-300">
            <Button
              onClick={() => setIsHistoryExpanded(!isHistoryExpanded)}
              className="flex w-full items-center justify-between mb-2 text-[10px] uppercase tracking-wide text-gray-500 hover:text-gray-300 transition"
            >
              <span>History</span>
              {isHistoryExpanded ? (
                <ChevronDown className="size-3" />
              ) : (
                <ChevronRight className="size-3" />
              )}
            </Button>
            {isHistoryExpanded && (
              <div className="space-y-1">
                {undoHistory.slice(0, 10).map((entry, index) => (
                  <Button
                    key={`${entry.label}-${index}`}
                    type="button"
                    onClick={() => onUndoAtIndex?.(index)}
                    className="flex w-full items-center justify-between rounded px-1.5 py-1 text-left text-gray-300 hover:bg-muted/50"
                  >
                    <span className="truncate">{entry.label}</span>
                    <span className="text-[10px] text-gray-500">Undo</span>
                  </Button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {showDropzone && (
        <div
          className={`mx-4 mt-2 mb-3 border-2 border-dashed rounded-lg transition-all ${
            isDropzoneActive
              ? "border-blue-500 bg-blue-500/10"
              : "border bg-gray-800/30"
          } ${isImporting ? "opacity-50 pointer-events-none" : ""}`}
          onDragOver={handleDropzoneDragOver}
          onDragLeave={handleDropzoneDragLeave}
          onDrop={(e) => { void handleFolderImport(e); }}
        >
          <div className="p-4 text-center">
            <Upload
              className={`mx-auto mb-2 size-6 ${
                isDropzoneActive ? "text-blue-400" : "text-gray-500"
              }`}
            />
            <p className="text-xs text-gray-400">
              {isImporting
                ? "Importing folder structure..."
                : "Drop folder(s) here to import"}
            </p>
            <p className="text-[10px] text-gray-600 mt-1">
              Supports multiple folders · Markdown files (.md) will be converted to notes
            </p>
          </div>
        </div>
      )}

      <div className="flex-1 overflow-y-auto p-2">
        {folders.length === 0 ? (
          <div className="p-4 text-center text-sm text-gray-500">
            No folders yet
          </div>
        ) : (
          <div className="space-y-0.5">{folderNodes}</div>
        )}
      </div>
    </div>
  );
}

export const FolderTree = React.memo(FolderTreeBase);
FolderTree.displayName = "FolderTree";
