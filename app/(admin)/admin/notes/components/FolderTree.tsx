"use client";

import React, { useState, useCallback, useEffect, useMemo } from "react";
import { Folder, Plus, ChevronRight, ChevronDown, ChevronLeft, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import type { CategoryWithChildren } from "@/types/notes";
import type { FolderTreeProps } from "@/types/notes-ui";
import { FolderNode } from "./tree/FolderNode";

function FolderTreeBase({
  folders,
  selectedFolderId,
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
}: FolderTreeProps) {
  const { toast } = useToast();
  const [isAllNotesDragOver, setIsAllNotesDragOver] = useState(false);
  const [draggedFolderId, setDraggedFolderId] = useState<string | null>(null);
  const [renamingFolderId, setRenamingFolderId] = useState<string | null>(null);
  const [renamingNoteId, setRenamingNoteId] = useState<string | null>(null);
  const [expandedFolderIds, setExpandedFolderIds] = useState<Set<string>>(new Set());

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

  useEffect(() => {
    if (folders.length === 0) return;
    setExpandedFolderIds((prev) => {
      if (prev.size > 0) return prev;
      return new Set(collectFolderIds(folders));
    });
  }, [folders, collectFolderIds]);

  useEffect(() => {
    if (!selectedFolderId) return;
    const pathIds = findFolderPathIds(folders, selectedFolderId);
    if (pathIds.length === 0) return;
    setExpandedFolderIds((prev) => {
      const next = new Set(prev);
      pathIds.forEach((id) => next.add(id));
      return next;
    });
  }, [selectedFolderId, folders, findFolderPathIds]);

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
      className="flex h-full flex-col bg-gray-900 border-r border-gray-800"
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
      <div className="p-4 border-b border-gray-800">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-white">Folders</h2>
          <div className="flex items-center gap-2">
            <Button
              onClick={() => onCreateFolder(null)}
              size="sm"
              className="h-7 w-7 p-0 bg-blue-600 hover:bg-blue-700"
            >
              <Plus className="size-4" />
            </Button>
            {onUndo && (
              <Button
                onClick={onUndo}
                size="sm"
                variant="outline"
                className="h-7 px-2 border-gray-700 text-gray-300 hover:bg-gray-800"
                disabled={!canUndo}
              >
                Undo
              </Button>
            )}
            <Button
              onClick={handleToggleSelectedCollapse}
              size="sm"
              variant="outline"
              className="h-7 w-7 p-0 border-gray-700 text-gray-300 hover:bg-gray-800"
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
                className="h-7 w-7 p-0 border-gray-700 text-gray-300 hover:bg-gray-800"
                aria-label="Collapse folder tree"
              >
                <ChevronLeft className="size-4" />
              </Button>
            )}
          </div>
        </div>
        <button
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
              : "text-gray-300 hover:bg-gray-800"
          }`}
        >
          <Folder className="size-4" />
          <span>All Notes</span>
        </button>
        {onToggleFavorites && (
          <button
            onClick={() => onToggleFavorites()}
            className={`mt-1 w-full flex items-center gap-2 px-2 py-1.5 rounded text-sm transition ${
              isFavoritesActive
                ? "bg-yellow-500/20 text-yellow-200"
                : "text-gray-300 hover:bg-gray-800"
            }`}
          >
            <Star className="size-4" />
            <span>Favorites</span>
          </button>
        )}
        {undoHistory && undoHistory.length > 0 && (
          <div className="mt-3 rounded border border-gray-800 bg-gray-900/60 p-2 text-xs text-gray-300">
            <div className="mb-2 text-[10px] uppercase tracking-wide text-gray-500">
              History
            </div>
            <div className="space-y-1">
              {undoHistory.slice(0, 10).map((entry, index) => (
                <button
                  key={`${entry.label}-${index}`}
                  type="button"
                  onClick={() => onUndoAtIndex?.(index)}
                  className="flex w-full items-center justify-between rounded px-1.5 py-1 text-left text-gray-300 hover:bg-gray-800"
                >
                  <span className="truncate">{entry.label}</span>
                  <span className="text-[10px] text-gray-500">Undo</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

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
