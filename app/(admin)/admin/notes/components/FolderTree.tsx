"use client";

import React, { useState } from "react";
import { Folder, FolderOpen, ChevronRight, ChevronDown, Plus, Trash2, Edit2, FileText, FilePlus, FolderPlus, Copy, ChevronLeft } from "lucide-react";
import type { CategoryWithChildren } from "@/types/notes";
import type { FolderTreeProps, FolderNodeProps, NoteItemProps } from "@/types/notes-ui";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";

function NoteItem({
  note,
  level,
  isSelected,
  isRenaming,
  folderId,
  onSelectNote,
  onCreateNote,
  onDuplicateNote,
  onDeleteNote,
  onRenameNote,
  onStartRename,
  onCancelRename,
  onRelateNotes,
  draggedNoteId,
  setDraggedNoteId,
}: NoteItemProps) {
  const { toast } = useToast();
  const [renameValue, setRenameValue] = useState(note.title);
  const renameInputRef = React.useRef<HTMLInputElement>(null);
  const [isDragOver, setIsDragOver] = useState(false);

  const getDraggedNoteId = (event: React.DragEvent) =>
    event.dataTransfer.getData("noteId") ||
    event.dataTransfer.getData("text/plain") ||
    draggedNoteId ||
    "";

  // Focus input when entering rename mode
  React.useEffect(() => {
    if (isRenaming && renameInputRef.current) {
      setRenameValue(note.title);
      renameInputRef.current.focus();
      renameInputRef.current.select();
    }
  }, [isRenaming, note.title]);

  const handleRenameSubmit = () => {
    if (renameValue.trim() && renameValue.trim() !== note.title) {
      onRenameNote(note.id, renameValue.trim());
    }
    onCancelRename();
  };

  const handleRenameKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleRenameSubmit();
    } else if (e.key === "Escape") {
      e.preventDefault();
      setRenameValue(note.title);
      onCancelRename();
    }
  };

  return (
    <div
      draggable={!isRenaming}
      data-note-id={note.id}
      onDragOver={(e) => {
        const types = Array.from(e.dataTransfer.types);
        const isNoteDrag =
          types.includes("noteId") ||
          types.includes("text/plain") ||
          Boolean(draggedNoteId);
        if (!isNoteDrag) return;
        e.preventDefault();
        e.stopPropagation();
        e.dataTransfer.dropEffect = "move";
        setIsDragOver(true);
      }}
      onDragLeave={() => {
        setIsDragOver(false);
      }}
      onDrop={(e) => {
        const noteId = getDraggedNoteId(e);
        e.preventDefault();
        e.stopPropagation();
        setIsDragOver(false);
        if (!noteId || noteId === note.id) {
          if (noteId === note.id) {
            toast("Can't link a note to itself", { variant: "info" });
          }
          return;
        }
        onRelateNotes(noteId, note.id);
      }}
      onDragStart={(e) => {
        if (isRenaming) {
          e.preventDefault();
          return;
        }
        e.stopPropagation();
        e.dataTransfer.setData("noteId", note.id);
        e.dataTransfer.setData("text/plain", note.id);
        e.dataTransfer.effectAllowed = "linkMove";
        const target = e.currentTarget as HTMLElement;
        target.style.opacity = "0.5";
        setDraggedNoteId(note.id);
      }}
      onDragEnd={(e) => {
        const target = e.currentTarget as HTMLElement;
        target.style.opacity = "1";
        setDraggedNoteId(null);
      }}
      onClick={(e) => {
        e.stopPropagation();
        if (!isRenaming) {
          onSelectNote(note.id);
        }
      }}
      className={`group flex items-center gap-2 rounded px-2 py-1.5 cursor-grab active:cursor-grabbing transition ${
        isSelected
          ? "bg-blue-600 text-white"
          : isDragOver
          ? "bg-emerald-600 text-white"
          : "text-gray-300 hover:bg-gray-800 hover:text-white"
      }`}
      style={{ paddingLeft: `${(level + 1) * 16 + 28}px` }}
    >
      <FileText className={`size-4 flex-shrink-0 ${isSelected ? "text-white" : "text-gray-500 group-hover:text-gray-300"}`} />
      {isRenaming ? (
        <input
          ref={renameInputRef}
          type="text"
          value={renameValue}
          onChange={(e) => setRenameValue(e.target.value)}
          onKeyDown={handleRenameKeyDown}
          onBlur={handleRenameSubmit}
          onClick={(e) => e.stopPropagation()}
          className="text-sm bg-gray-800 border border-blue-500 rounded px-1 py-0.5 text-white outline-none flex-1 min-w-0"
        />
      ) : (
        <span className="text-sm truncate flex-1">{note.title}</span>
      )}
      {isDragOver && (
        <span className="ml-auto rounded bg-emerald-500/20 px-2 py-0.5 text-[10px] text-emerald-100">
          Drop to link
        </span>
      )}
      {!isRenaming && (
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onCreateNote(folderId);
            }}
            className="p-1 hover:bg-gray-700 rounded"
            title="Add note"
          >
            <FilePlus className="size-3" />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onStartRename(note.id);
            }}
            className="p-1 hover:bg-gray-700 rounded"
            title="Rename note"
          >
            <Edit2 className="size-3" />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDuplicateNote(note.id);
            }}
            className="p-1 hover:bg-gray-700 rounded"
            title="Duplicate note"
          >
            <Copy className="size-3" />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDeleteNote(note.id);
            }}
            className="p-1 hover:bg-red-600 rounded"
            title="Delete note"
          >
            <Trash2 className="size-3" />
          </button>
        </div>
      )}
    </div>
  );
}

function FolderNode({
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
}: FolderNodeProps) {
  const { toast } = useToast();
  const [isExpanded, setIsExpanded] = useState(true);
  const [isDragOver, setIsDragOver] = useState(false);
  const [renameValue, setRenameValue] = useState(folder.name);
  const renameInputRef = React.useRef<HTMLInputElement>(null);
  const hasChildren = folder.children.length > 0;
  const hasNotes = folder.notes && folder.notes.length > 0;
  const isSelected = selectedFolderId === folder.id && !selectedNoteId;
  const isRenaming = renamingFolderId === folder.id;

  // Focus input when entering rename mode
  React.useEffect(() => {
    if (isRenaming && renameInputRef.current) {
      setRenameValue(folder.name);
      renameInputRef.current.focus();
      renameInputRef.current.select();
    }
  }, [isRenaming, folder.name]);

  const handleRenameSubmit = () => {
    if (renameValue.trim() && renameValue.trim() !== folder.name) {
      onRename(folder.id, renameValue.trim());
    }
    onCancelRename();
  };

  const handleRenameKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleRenameSubmit();
    } else if (e.key === "Escape") {
      e.preventDefault();
      setRenameValue(folder.name);
      onCancelRename();
    }
  };

  // Find a folder by ID in the tree
  const findFolder = (folders: CategoryWithChildren[], id: string): CategoryWithChildren | null => {
    for (const f of folders) {
      if (f.id === id) return f;
      const found = findFolder(f.children, id);
      if (found) return found;
    }
    return null;
  };

  // Check if targetId is a descendant of folder (or is the folder itself)
  const isDescendantOf = (checkFolder: CategoryWithChildren, targetId: string): boolean => {
    if (checkFolder.id === targetId) return true;
    return checkFolder.children.some((child) => isDescendantOf(child, targetId));
  };

  // Can drop if:
  // 1. No folder is being dragged, OR
  // 2. We're not dropping onto the dragged folder itself, AND
  // 3. We're not dropping onto a descendant of the dragged folder
  const canDropHere = (() => {
    if (!draggedFolderId) return true;
    if (draggedFolderId === folder.id) return false;

    const draggedFolder = findFolder(allFolders, draggedFolderId);
    if (!draggedFolder) return true;

    // Check if current folder (drop target) is a descendant of the dragged folder
    return !isDescendantOf(draggedFolder, folder.id);
  })();

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
        className={`group flex items-center gap-1 rounded px-2 py-1.5 cursor-grab active:cursor-grabbing transition ${
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
            onClick={() => setIsExpanded(!isExpanded)}
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
              value={renameValue}
              onChange={(e) => setRenameValue(e.target.value)}
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
          {folder.notes?.slice().sort((a, b) => a.title.localeCompare(b.title)).map((note) => {
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
            />
          ))}
        </div>
      )}
    </div>
  );
}

export function FolderTree({
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
}: FolderTreeProps) {
  const { toast } = useToast();
  const [isAllNotesDragOver, setIsAllNotesDragOver] = useState(false);
  const [draggedFolderId, setDraggedFolderId] = useState<string | null>(null);
  const [renamingFolderId, setRenamingFolderId] = useState<string | null>(null);
  const [renamingNoteId, setRenamingNoteId] = useState<string | null>(null);

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
      </div>

      <div className="flex-1 overflow-y-auto p-2">
        {folders.length === 0 ? (
          <div className="p-4 text-center text-sm text-gray-500">
            No folders yet
          </div>
        ) : (
          <div className="space-y-0.5">
            {folders.map((folder) => (
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
                onDragStart={setDraggedFolderId}
                onDragEnd={() => setDraggedFolderId(null)}
                allFolders={folders}
                renamingFolderId={renamingFolderId}
                onStartRename={setRenamingFolderId}
                onCancelRename={() => setRenamingFolderId(null)}
                renamingNoteId={renamingNoteId}
                onStartNoteRename={setRenamingNoteId}
                onCancelNoteRename={() => setRenamingNoteId(null)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
