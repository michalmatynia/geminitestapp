"use client";

import React, { useState, useRef, useEffect, useMemo } from "react";
import { Folder, FolderOpen, ChevronRight, ChevronDown, FilePlus, FolderPlus, Edit2, Trash2 } from "lucide-react";
import { useToast } from "@/components/ui/toast";
import type { CategoryWithChildren } from "@/types/notes";
import type { FolderNodeProps } from "@/types/notes-ui";
import { NoteItem } from "./NoteItem";

export const FolderNode = React.memo(function FolderNode({
  folder,
  level,
  selectedFolderId,
  onSelect,
  onCreateSubfolder,
  onCreateNote,
  onDelete,
  onRename,
  onSelectNote,
  onDuplicateNote,
  onDeleteNote,
  onRenameNote,
  selectedNoteId,
  onDropNote,
  onDropFolder,
  onRelateNotes,
  draggedFolderId,
  draggedNoteId,
  setDraggedNoteId,
  onDragStart: onDragStartProp,
  onDragEnd: onDragEndProp,
  allFolders,
  renamingFolderId,
  onStartRename,
  onCancelRename,
  renamingNoteId,
  onStartNoteRename,
  onCancelNoteRename,
  expandedFolderIds,
  onToggleExpand,
}: FolderNodeProps) {
  const { toast } = useToast();
  const [isDragOver, setIsDragOver] = useState(false);
  const renameInputRef = useRef<HTMLInputElement>(null);
  const renameValueRef = useRef(folder.name);
  const hasChildren = folder.children.length > 0;
  const hasNotes = folder.notes && folder.notes.length > 0;
  const isExpanded = expandedFolderIds.has(folder.id);
  const isSelected = selectedFolderId === folder.id && !selectedNoteId;
  const isRenaming = renamingFolderId === folder.id;

  // Focus input when entering rename mode
  useEffect(() => {
    if (isRenaming && renameInputRef.current) {
      renameValueRef.current = folder.name;
      renameInputRef.current.value = folder.name;
      renameInputRef.current.focus();
      renameInputRef.current.select();
    }
  }, [isRenaming, folder.name]);

  const handleRenameSubmit = () => {
    const nextName = renameValueRef.current.trim();
    if (nextName && nextName !== folder.name) {
      onRename(folder.id, nextName);
    }
    onCancelRename();
  };

  const handleRenameKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleRenameSubmit();
    } else if (e.key === "Escape") {
      e.preventDefault();
      renameValueRef.current = folder.name;
      if (renameInputRef.current) {
        renameInputRef.current.value = folder.name;
      }
      onCancelRename();
    }
  };

  const canDropHere = useMemo(() => {
    const findFolder = (folders: CategoryWithChildren[], id: string): CategoryWithChildren | null => {
      for (const f of folders) {
        if (f.id === id) return f;
        const found = findFolder(f.children, id);
        if (found) return found;
      }
      return null;
    };

    const isDescendantOf = (checkFolder: CategoryWithChildren, targetId: string): boolean => {
      if (checkFolder.id === targetId) return true;
      return checkFolder.children.some((child) => isDescendantOf(child, targetId));
    };

    if (!draggedFolderId) return true;
    if (draggedFolderId === folder.id) return false;

    const draggedFolder = findFolder(allFolders, draggedFolderId);
    if (!draggedFolder) return true;

    return !isDescendantOf(draggedFolder, folder.id);
  }, [draggedFolderId, folder.id, allFolders]);

  const sortedNotes = useMemo(() => {
    if (!folder.notes || folder.notes.length === 0) return [];
    return folder.notes.slice().sort((a, b) => a.title.localeCompare(b.title));
  }, [folder.notes]);

  return (
    <div
      onDragOver={(e) => {
        if (!draggedNoteId) return;
        e.preventDefault();
        e.stopPropagation();
        setIsDragOver(true);
      }}
      onDragLeave={() => {
        setIsDragOver(false);
      }}
      onDrop={(e) => {
        if (!draggedNoteId) return;
        e.preventDefault();
        e.stopPropagation();
        setIsDragOver(false);
        if (draggedNoteId === folder.id) {
          toast("Can't link a note to itself", { variant: "info" });
          return;
        }
        onRelateNotes(draggedNoteId, folder.id);
      }}
    >
      <div
        draggable
        onDragStart={(e) => {
          e.stopPropagation();
          e.dataTransfer.setData("folderId", folder.id);
          e.dataTransfer.effectAllowed = "move";
          onDragStartProp(folder.id);
          const target = e.currentTarget as HTMLElement;
          target.style.opacity = "0.5";
        }}
        onDragEnd={(e) => {
          const target = e.currentTarget as HTMLElement;
          target.style.opacity = "1";
          onDragEndProp();
        }}
        className={`group flex items-center gap-1 rounded px-2 py-1.5 cursor-pointer active:cursor-grabbing transition ${
          isSelected
            ? "bg-blue-600 text-white"
            : isDragOver && canDropHere
            ? "bg-green-600 text-white"
            : "text-gray-300 hover:bg-gray-800"
        }`}
        style={{ paddingLeft: `${level * 16 + 8}px` }}
        onDragOver={(e) => {
          e.preventDefault();
          e.stopPropagation();
          if (canDropHere) {
            setIsDragOver(true);
          }
        }}
        onDragLeave={(e) => {
          e.stopPropagation();
          setIsDragOver(false);
        }}
        onDrop={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setIsDragOver(false);

          const noteId =
            e.dataTransfer.getData("noteId") ||
            e.dataTransfer.getData("text/plain") ||
            draggedNoteId ||
            "";
          const folderId = e.dataTransfer.getData("folderId");

          if (noteId) {
            if (noteId === folder.id) {
              toast("Can't link a note to itself", { variant: "info" });
              return;
            }
            onDropNote(noteId, folder.id);
          } else if (folderId) {
            if (!canDropHere) {
              toast("Can't move a folder into itself", { variant: "info" });
              return;
            }
            onDropFolder(folderId, folder.id);
          } else {
            toast("Nothing to drop here", { variant: "info" });
          }
        }}
      >
        {hasChildren || hasNotes ? (
          <button
            onClick={() => onToggleExpand(folder.id)}
            className="p-0.5 hover:bg-gray-700 rounded"
          >
            {isExpanded ? (
              <ChevronDown className="size-4" />
            ) : (
              <ChevronRight className="size-4" />
            )}
          </button>
        ) : (
          <div className="w-5" />
        )}

        <div
          onClick={() => !isRenaming && onSelect(folder.id)}
          className="flex items-center gap-2 flex-1 min-w-0"
        >
          {isExpanded || !hasChildren ? (
            <FolderOpen className="size-4 flex-shrink-0" />
          ) : (
            <Folder className="size-4 flex-shrink-0" />
          )}
          {isRenaming ? (
            <input
              ref={renameInputRef}
              type="text"
              defaultValue={folder.name}
              onChange={(e) => {
                renameValueRef.current = e.target.value;
              }}
              onKeyDown={handleRenameKeyDown}
              onBlur={handleRenameSubmit}
              onClick={(e) => e.stopPropagation()}
              className="text-sm bg-gray-800 border border-blue-500 rounded px-1 py-0.5 text-white outline-none flex-1 min-w-0"
            />
          ) : (
            <span className="text-sm truncate">{folder.name}</span>
          )}
        </div>

        {!isRenaming && (
          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition">
            <button
              onClick={(e) => {
                e.stopPropagation();
                onCreateNote(folder.id);
              }}
              className="p-1 hover:bg-gray-700 rounded"
              title="Add note"
            >
              <FilePlus className="size-3" />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onCreateSubfolder(folder.id);
              }}
              className="p-1 hover:bg-gray-700 rounded"
              title="Add subfolder"
            >
              <FolderPlus className="size-3" />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onStartRename(folder.id);
              }}
              className="p-1 hover:bg-gray-700 rounded"
              title="Rename folder"
            >
              <Edit2 className="size-3" />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDelete(folder.id);
              }}
              className="p-1 hover:bg-red-600 rounded"
              title="Delete folder and all contents"
            >
              <Trash2 className="size-3" />
            </button>
          </div>
        )}
      </div>

      {isExpanded && (
        <div>
          {folder.children.map((child) => (
            <FolderNode
              key={child.id}
              folder={child}
              level={level + 1}
              selectedFolderId={selectedFolderId}
              onSelect={onSelect}
              onCreateSubfolder={onCreateSubfolder}
              onCreateNote={onCreateNote}
              onDelete={onDelete}
              onRename={onRename}
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
              onDragStart={onDragStartProp}
              onDragEnd={onDragEndProp}
              allFolders={allFolders}
              renamingFolderId={renamingFolderId}
              onStartRename={onStartRename}
              onCancelRename={onCancelRename}
              renamingNoteId={renamingNoteId}
              onStartNoteRename={onStartNoteRename}
              onCancelNoteRename={onCancelNoteRename}
              expandedFolderIds={expandedFolderIds}
              onToggleExpand={onToggleExpand}
            />
          ))}
          {sortedNotes.map((note) => {
            const isNoteSelected = selectedNoteId === note.id;
            const isNoteRenaming = renamingNoteId === note.id;
            return (
              <NoteItem
                key={note.id}
                note={note}
                level={level}
                isSelected={isNoteSelected}
                isRenaming={isNoteRenaming}
                folderId={folder.id}
                onSelectNote={onSelectNote}
                onCreateNote={onCreateNote}
                onDuplicateNote={onDuplicateNote}
                onDeleteNote={onDeleteNote}
                onRenameNote={onRenameNote}
                onStartRename={onStartNoteRename}
                onCancelRename={onCancelNoteRename}
                onRelateNotes={onRelateNotes}
                draggedNoteId={draggedNoteId}
                setDraggedNoteId={setDraggedNoteId}
              />
            );
          })}
        </div>
      )}
    </div>
  );
});
