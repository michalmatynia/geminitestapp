'use client';

import { Folder, FolderOpen, FilePlus, FolderPlus, Edit2, Trash2 } from 'lucide-react';
import React, { useState, useRef, useEffect, useMemo } from 'react';

import type { CategoryWithChildren } from '@/shared/types/notes';
import type { NoteRecord } from '@/shared/types/notes';
import type { TreeContextMenuItem } from '@/shared/ui';
import { TreeRow, TreeCaret, TreeActionButton, TreeActionSlot } from '@/shared/ui';
import { useToast, Input, TreeContextMenu } from '@/shared/ui';
import { getFolderDragId, getNoteDragId, hasDragType, resolveVerticalDropPosition, setFolderDragData, DRAG_KEYS } from '@/shared/utils/drag-drop';

import { NoteItem } from './NoteItem';
import { useFolderTree } from '../../context/FolderTreeContext';

export const FolderNode = React.memo(function FolderNode({
  folder,
  level,
  onDragStart: onDragStartProp,
  onDragEnd: onDragEndProp,
}: {
  folder: CategoryWithChildren;
  level: number;
  onDragStart: (id: string) => void;
  onDragEnd: () => void;
}): React.JSX.Element {
  const {
    selectedFolderId,
    onSelectFolder: onSelect,
    onCreateFolder: onCreateSubfolder,
    onCreateNote,
    onDeleteFolder: onDelete,
    onRenameFolder: onRename,
    selectedNoteId,
    onDropNote,
    onDropFolder,
    onReorderFolder,
    onRelateNotes,
    draggedFolderId,
    draggedNoteId,
    folders: allFolders,
    renamingFolderId,
    onStartRename,
    onCancelRename,
    expandedFolderIds,
    onToggleExpand,
  } = useFolderTree();

  const { toast } = useToast();
  const [isDragOver, setIsDragOver] = useState(false);
  const [reorderHover, setReorderHover] = useState<'above' | 'below' | null>(null);
  const renameInputRef = useRef<HTMLInputElement>(null);
  const renameValueRef = useRef(folder.name);
  const hasChildren = folder.children.length > 0;
  const hasNotes = folder.notes && folder.notes.length > 0;
  const isExpanded = expandedFolderIds.has(folder.id);
  const isSelected = selectedFolderId === folder.id && !selectedNoteId;
  const isRenaming = renamingFolderId === folder.id;
  const contextMenuItems = useMemo<TreeContextMenuItem[]>(
    () => [
      { id: 'new-note', label: 'New note', icon: <FilePlus className="size-3.5" />, onSelect: (): void => onCreateNote(folder.id) },
      { id: 'new-folder', label: 'New folder', icon: <FolderPlus className="size-3.5" />, onSelect: (): void => onCreateSubfolder(folder.id) },
      { id: 'rename', label: 'Rename', icon: <Edit2 className="size-3.5" />, onSelect: (): void => onStartRename(folder.id) },
      { id: 'separator-1', separator: true },
      { id: 'delete', label: 'Delete', icon: <Trash2 className="size-3.5" />, tone: 'danger', onSelect: (): void => onDelete(folder.id) },
    ],
    [folder.id, onCreateNote, onCreateSubfolder, onStartRename, onDelete]
  );

  // Focus input when entering rename mode
  useEffect(() => {
    if (isRenaming && renameInputRef.current) {
      renameValueRef.current = folder.name;
      renameInputRef.current.value = folder.name;
      renameInputRef.current.focus();
      renameInputRef.current.select();
    }
  }, [isRenaming, folder.name]);

  const handleRenameSubmit = (): void => {
    const nextName = renameValueRef.current.trim();
    if (nextName && nextName !== folder.name) {
      onRename(folder.id, nextName);
    }
    onCancelRename();
  };

  const handleRenameKeyDown = (e: React.KeyboardEvent): void => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleRenameSubmit();
    } else if (e.key === 'Escape') {
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
      return checkFolder.children.some((child: CategoryWithChildren) => isDescendantOf(child, targetId));
    };

    if (!draggedFolderId) return true;
    if (draggedFolderId === folder.id) return false;

    const draggedFolder = findFolder(allFolders, draggedFolderId);
    if (!draggedFolder) return true;

    return !isDescendantOf(draggedFolder, folder.id);
  }, [draggedFolderId, folder.id, allFolders]);

  const showReorderZones = Boolean(onReorderFolder) && Boolean(draggedFolderId) && draggedFolderId !== folder.id;
  const resolveReorderPosition = (clientY: number, rect: DOMRect): 'before' | 'after' | null =>
    resolveVerticalDropPosition(clientY, rect, { thresholdRatio: 0.4, thresholdPx: 10 });

  const handleReorderDragOver = (position: 'above' | 'below') => (e: React.DragEvent<HTMLDivElement>): void => {
    if (!draggedFolderId) return;
    e.preventDefault();
    e.stopPropagation();
    if (!canDropHere) return;
    setReorderHover(position);
    e.dataTransfer.dropEffect = 'move';
  };

  const handleReorderDragLeave = (position: 'above' | 'below') => (): void => {
    if (reorderHover === position) {
      setReorderHover(null);
    }
  };

  const handleReorderDrop = (position: 'before' | 'after') => (e: React.DragEvent<HTMLDivElement>): void => {
    if (!draggedFolderId) return;
    e.preventDefault();
    e.stopPropagation();
    setReorderHover(null);
    if (!canDropHere) {
      toast('Can\'t move a folder into itself', { variant: 'info' });
      return;
    }
    onReorderFolder?.(draggedFolderId, folder.id, position);
  };

  const sortedNotes = useMemo(() => {
    if (!folder.notes || folder.notes.length === 0) return [];
    return folder.notes.slice().sort((a: NoteRecord, b: NoteRecord) => a.title.localeCompare(b.title));
  }, [folder.notes]);

  return (
    <div
      onDragOver={(e: React.DragEvent<HTMLDivElement>): void => {
        const hasNotePayload =
          Boolean(draggedNoteId) ||
          hasDragType(e.dataTransfer, [DRAG_KEYS.NOTE_ID, DRAG_KEYS.TEXT]);
        if (!hasNotePayload) return;
        e.preventDefault();
        e.stopPropagation();
        setIsDragOver(true);
      }}
      onDragLeave={(): void => {
        setIsDragOver(false);
      }}
      onDrop={(e: React.DragEvent<HTMLDivElement>): void => {
        const noteId = getNoteDragId(e.dataTransfer, draggedNoteId);
        if (!noteId) return;
        e.preventDefault();
        e.stopPropagation();
        setIsDragOver(false);
        if (noteId === folder.id) {
          toast('Can\'t link a note to itself', { variant: 'info' });
          return;
        }
        onRelateNotes(noteId, folder.id);
      }}
    >
      {showReorderZones && (
        <div
          onDragOver={handleReorderDragOver('above')}
          onDragLeave={handleReorderDragLeave('above')}
          onDrop={handleReorderDrop('before')}
          className={`h-1 rounded transition ${
            reorderHover === 'above' ? 'bg-blue-500/80' : 'bg-transparent'
          }`}
          style={{ marginLeft: `${level * 16 + 8}px` }}
        />
      )}
      <TreeContextMenu items={contextMenuItems}>
        <TreeRow
          draggable
          tone="primary"
          selected={isSelected}
          dragOver={isDragOver && canDropHere}
          dragOverClassName="bg-green-600 text-white"
          depth={level}
          className="cursor-pointer active:cursor-grabbing gap-1"
          onDragStart={(e: React.DragEvent<HTMLDivElement>): void => {
            e.stopPropagation();
            setFolderDragData(e.dataTransfer, folder.id);
            onDragStartProp(folder.id);
            const target = e.currentTarget as HTMLElement;
            target.style.opacity = '0.5';
          }}
          onDragEnd={(e: React.DragEvent<HTMLDivElement>): void => {
            const target = e.currentTarget as HTMLElement;
            target.style.opacity = '1';
            setReorderHover(null);
            onDragEndProp();
          }}
          onDragOver={(e: React.DragEvent<HTMLDivElement>): void => {
            e.preventDefault();
            e.stopPropagation();
            if (draggedFolderId) {
              if (!canDropHere) return;
              const rect = e.currentTarget.getBoundingClientRect();
              const position = resolveReorderPosition(e.clientY, rect);
              setReorderHover(position === 'before' ? 'above' : position === 'after' ? 'below' : null);
              setIsDragOver(!position);
              e.dataTransfer.dropEffect = 'move';
              return;
            }
            if (canDropHere) setIsDragOver(true);
          }}
          onDragLeave={(e: React.DragEvent<HTMLDivElement>): void => {
            e.stopPropagation();
            setIsDragOver(false);
            if (draggedFolderId) {
              setReorderHover(null);
            }
          }}
          onDrop={(e: React.DragEvent<HTMLDivElement>): void => {
            e.preventDefault();
            e.stopPropagation();
            setIsDragOver(false);
            setReorderHover(null);

            const noteId = getNoteDragId(e.dataTransfer, draggedNoteId) || '';
            const folderId = getFolderDragId(e.dataTransfer, draggedFolderId) || '';

            if (noteId) {
              if (noteId === folder.id) {
                toast('Can\'t link a note to itself', { variant: 'info' });
                return;
              }
              onDropNote(noteId, folder.id);
            } else if (folderId) {
              if (!canDropHere) {
                toast('Can\'t move a folder into itself', { variant: 'info' });
                return;
              }
              const rect = e.currentTarget.getBoundingClientRect();
              const position = resolveReorderPosition(e.clientY, rect);
              if (position && onReorderFolder) {
                onReorderFolder(folderId, folder.id, position);
                return;
              }
              onDropFolder(folderId, folder.id);
            } else {
              toast('Nothing to drop here', { variant: 'info' });
            }
          }}
        >
          {reorderHover === 'above' && (
            <div className="absolute left-2 right-2 top-0 h-0.5 rounded bg-blue-400/90" />
          )}
          {reorderHover === 'below' && (
            <div className="absolute left-2 right-2 bottom-0 h-0.5 rounded bg-blue-400/90" />
          )}
          <TreeCaret
            isOpen={isExpanded}
            hasChildren={hasChildren || hasNotes}
            ariaLabel={isExpanded ? `Collapse ${folder.name}` : `Expand ${folder.name}`}
            onToggle={(): void => onToggleExpand(folder.id)}
            iconClassName="size-4"
            buttonClassName="hover:bg-gray-700"
            placeholderClassName="w-5"
          />

          <div
            onClick={(): void => { if (!isRenaming) onSelect(folder.id); }}
            className="flex items-center gap-2 flex-1 min-w-0"
          >
            {isExpanded || !hasChildren ? (
              <FolderOpen className="size-4 flex-shrink-0" />
            ) : (
              <Folder className="size-4 flex-shrink-0" />
            )}
            {isRenaming ? (
              <Input
                ref={renameInputRef}
                type="text"
                defaultValue={folder.name}
                onChange={(e: React.ChangeEvent<HTMLInputElement>): void => {
                  renameValueRef.current = e.target.value;
                }}
                onKeyDown={handleRenameKeyDown}
                onBlur={handleRenameSubmit}
                onClick={(e: React.MouseEvent<HTMLInputElement>): void => e.stopPropagation()}
                className="text-sm bg-gray-800 border border-blue-500 rounded px-1 py-0.5 text-white outline-none flex-1 min-w-0"
              />
            ) : (
              <span className="text-sm truncate">{folder.name}</span>
            )}
          </div>

          {!isRenaming && (
            <TreeActionSlot show="hover" isVisible={isSelected}>
              <TreeActionButton
                onClick={(e: React.MouseEvent<HTMLButtonElement>): void => {
                  e.stopPropagation();
                  onCreateNote(folder.id);
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
                  onCreateSubfolder(folder.id);
                }}
                size="sm"
                tone="muted"
                title="Add subfolder"
              >
                <FolderPlus className="size-3" />
              </TreeActionButton>
              <TreeActionButton
                onClick={(e: React.MouseEvent<HTMLButtonElement>): void => {
                  e.stopPropagation();
                  onStartRename(folder.id);
                }}
                size="sm"
                tone="muted"
                title="Rename folder"
              >
                <Edit2 className="size-3" />
              </TreeActionButton>
              <TreeActionButton
                onClick={(e: React.MouseEvent<HTMLButtonElement>): void => {
                  e.stopPropagation();
                  onDelete(folder.id);
                }}
                size="sm"
                tone="danger"
                title="Delete folder and all contents"
              >
                <Trash2 className="size-3" />
              </TreeActionButton>
            </TreeActionSlot>
          )}
        </TreeRow>
      </TreeContextMenu>
      {showReorderZones && (
        <div
          onDragOver={handleReorderDragOver('below')}
          onDragLeave={handleReorderDragLeave('below')}
          onDrop={handleReorderDrop('after')}
          className={`h-1 rounded transition ${
            reorderHover === 'below' ? 'bg-blue-500/80' : 'bg-transparent'
          }`}
          style={{ marginLeft: `${level * 16 + 8}px` }}
        />
      )}

      {isExpanded && (
        <div>
          {folder.children.map((child: CategoryWithChildren) => (
            <FolderNode
              key={child.id}
              folder={child}
              level={level + 1}
              onDragStart={onDragStartProp}
              onDragEnd={onDragEndProp}
            />
          ))}
          {sortedNotes.map((note: NoteRecord) => (
            <NoteItem
              key={note.id}
              note={note}
              level={level}
              folderId={folder.id}
            />
          ))}
        </div>
      )}
    </div>
  );
});
