"use client";

import React, { useState, useRef, useEffect } from "react";
import { FileText, Edit2, Copy, Trash2, FilePlus } from "lucide-react";
import { useToast } from "@/components/ui/toast";
import type { NoteItemProps } from "@/types/notes-ui";

export const NoteItem = React.memo(function NoteItem({
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
  const renameInputRef = useRef<HTMLInputElement>(null);
  const renameValueRef = useRef(note.title);
  const [isDragOver, setIsDragOver] = useState(false);

  const getDraggedNoteId = (event: React.DragEvent) =>
    event.dataTransfer.getData("noteId") ||
    event.dataTransfer.getData("text/plain") ||
    draggedNoteId ||
    "";

  // Focus input when entering rename mode
  useEffect(() => {
    if (isRenaming && renameInputRef.current) {
      renameValueRef.current = note.title;
      renameInputRef.current.value = note.title;
      renameInputRef.current.focus();
      renameInputRef.current.select();
    }
  }, [isRenaming, note.title]);

  const handleRenameSubmit = () => {
    const nextTitle = renameValueRef.current.trim();
    if (nextTitle && nextTitle !== note.title) {
      onRenameNote(note.id, nextTitle);
    }
    onCancelRename();
  };

  const handleRenameKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleRenameSubmit();
    } else if (e.key === "Escape") {
      e.preventDefault();
      renameValueRef.current = note.title;
      if (renameInputRef.current) {
        renameInputRef.current.value = note.title;
      }
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
      className={`group flex items-center gap-2 rounded px-2 py-1.5 cursor-pointer active:cursor-grabbing transition ${
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
          defaultValue={note.title}
          onChange={(e) => {
            renameValueRef.current = e.target.value;
          }}
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
});
