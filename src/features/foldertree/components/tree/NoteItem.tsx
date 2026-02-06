'use client';

import { FileText, Edit2, Copy, Trash2, FilePlus } from 'lucide-react';
import React, { useState, useRef, useEffect, useMemo } from 'react';

import type { NoteItemProps } from '@/features/foldertree/types/folder-tree-ui';
import type { TreeContextMenuItem } from '@/shared/ui';
import { useToast, Input, TreeContextMenu } from '@/shared/ui';
import { TreeRow, TreeActionButton, TreeActionSlot } from '@/shared/ui';
import { getNoteDragId, hasDragType, setNoteDragData, DRAG_KEYS } from '@/shared/utils/drag-drop';


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
}: NoteItemProps): React.JSX.Element {
  const { toast } = useToast();
  const renameInputRef = useRef<HTMLInputElement>(null);
  const renameValueRef = useRef(note.title);
  const [isDragOver, setIsDragOver] = useState(false);
  const contextMenuItems = useMemo<TreeContextMenuItem[]>(
    () => [
      { id: 'new-note', label: 'New note', icon: <FilePlus className="size-3.5" />, onSelect: (): void => onCreateNote(folderId) },
      { id: 'duplicate', label: 'Duplicate', icon: <Copy className="size-3.5" />, onSelect: (): void => onDuplicateNote(note.id) },
      { id: 'rename', label: 'Rename', icon: <Edit2 className="size-3.5" />, onSelect: (): void => onStartRename(note.id) },
      { id: 'separator-1', separator: true },
      { id: 'delete', label: 'Delete', icon: <Trash2 className="size-3.5" />, tone: 'danger', onSelect: (): void => onDeleteNote(note.id) },
    ],
    [folderId, note.id, onCreateNote, onDuplicateNote, onStartRename, onDeleteNote]
  );

  const getDraggedNoteId = (event: React.DragEvent): string =>
    getNoteDragId(event.dataTransfer, draggedNoteId) || '';

  // Focus input when entering rename mode
  useEffect(() => {
    if (isRenaming && renameInputRef.current) {
      renameValueRef.current = note.title;
      renameInputRef.current.value = note.title;
      renameInputRef.current.focus();
      renameInputRef.current.select();
    }
  }, [isRenaming, note.title]);

  const handleRenameSubmit = (): void => {
    const nextTitle = renameValueRef.current.trim();
    if (nextTitle && nextTitle !== note.title) {
      onRenameNote(note.id, nextTitle);
    }
    onCancelRename();
  };

  const handleRenameKeyDown = (e: React.KeyboardEvent): void => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleRenameSubmit();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      renameValueRef.current = note.title;
      if (renameInputRef.current) {
        renameInputRef.current.value = note.title;
      }
      onCancelRename();
    }
  };

  return (
    <TreeContextMenu items={contextMenuItems}>
      <TreeRow
        tone="primary"
        selected={isSelected}
        dragOver={isDragOver}
        dragOverClassName="bg-emerald-600 text-white"
        depth={level + 1}
        baseIndent={28}
        indent={16}
        className="cursor-pointer active:cursor-grabbing text-sm"
        draggable={!isRenaming}
        data-note-id={note.id}
        onDragOver={(e: React.DragEvent<HTMLDivElement>): void => {
          const isNoteDrag =
          Boolean(draggedNoteId) ||
          hasDragType(e.dataTransfer, [DRAG_KEYS.NOTE_ID, DRAG_KEYS.TEXT]);
          if (!isNoteDrag) return;
          e.preventDefault();
          e.stopPropagation();
          e.dataTransfer.dropEffect = 'move';
          setIsDragOver(true);
        }}
        onDragLeave={(): void => {
          setIsDragOver(false);
        }}
        onDrop={(e: React.DragEvent<HTMLDivElement>): void => {
          const noteId = getDraggedNoteId(e);
          e.preventDefault();
          e.stopPropagation();
          setIsDragOver(false);
          if (!noteId || noteId === note.id) {
            if (noteId === note.id) {
              toast('Can\'t link a note to itself', { variant: 'info' });
            }
            return;
          }
          onRelateNotes(noteId, note.id);
        }}
        onDragStart={(e: React.DragEvent<HTMLDivElement>): void => {
          if (isRenaming) {
            e.preventDefault();
            return;
          }
          e.stopPropagation();
          setNoteDragData(e.dataTransfer, note.id);
          const target = e.currentTarget as HTMLElement;
          target.style.opacity = '0.5';
          setDraggedNoteId(note.id);
        }}
        onDragEnd={(e: React.DragEvent<HTMLDivElement>): void => {
          const target = e.currentTarget as HTMLElement;
          target.style.opacity = '1';
          setDraggedNoteId(null);
        }}
        onClick={(e: React.MouseEvent<HTMLDivElement>): void => {
          e.stopPropagation();
          if (!isRenaming) {
            onSelectNote(note.id);
          }
        }}
      >
        <FileText className={`size-4 flex-shrink-0 ${isSelected ? 'text-white' : 'text-gray-500 group-hover:text-gray-300'}`} />
        {isRenaming ? (
          <Input
            ref={renameInputRef}
            type="text"
            defaultValue={note.title}
            onChange={(e: React.ChangeEvent<HTMLInputElement>): void => {
              renameValueRef.current = e.target.value;
            }}
            onKeyDown={handleRenameKeyDown}
            onBlur={handleRenameSubmit}
            onClick={(e: React.MouseEvent<HTMLInputElement>): void => e.stopPropagation()}
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
          <TreeActionSlot show="hover" isVisible={isSelected}>
            <TreeActionButton
              onClick={(e: React.MouseEvent<HTMLButtonElement>): void => {
                e.stopPropagation();
                onCreateNote(folderId);
              }}
              size="sm"
              tone="muted"
              title="Add note"
            >
              <FilePlus className="size-3" />
            </TreeActionButton>
            <TreeActionButton
              onClick={(e: React.MouseEvent<HTMLButtonElement>): void => {
                e.stopPropagation();
                onStartRename(note.id);
              }}
              size="sm"
              tone="muted"
              title="Rename note"
            >
              <Edit2 className="size-3" />
            </TreeActionButton>
            <TreeActionButton
              onClick={(e: React.MouseEvent<HTMLButtonElement>): void => {
                e.stopPropagation();
                onDuplicateNote(note.id);
              }}
              size="sm"
              tone="muted"
              title="Duplicate note"
            >
              <Copy className="size-3" />
            </TreeActionButton>
            <TreeActionButton
              onClick={(e: React.MouseEvent<HTMLButtonElement>): void => {
                e.stopPropagation();
                onDeleteNote(note.id);
              }}
              size="sm"
              tone="danger"
              title="Delete note"
            >
              <Trash2 className="size-3" />
            </TreeActionButton>
          </TreeActionSlot>
        )}
      </TreeRow>
    </TreeContextMenu>
  );
});
