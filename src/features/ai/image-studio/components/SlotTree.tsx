'use client';

import { Folder, Image as ImageIcon } from 'lucide-react';
import React, { useCallback, useMemo, useState } from 'react';

import { TreeCaret, TreeContextMenu, TreeRow } from '@/shared/ui';
import { DRAG_KEYS, getFirstDragValue, hasDragType, setDragData } from '@/shared/utils';

import { useImageStudio } from '../context/ImageStudioContext';
import { normalizeFolderPaths } from '../utils/studio-tree';

import type { ImageStudioSlotRecord } from '../types';

type TreeNode = {
  id: string;
  name: string;
  type: 'folder' | 'file';
  path: string;
  slot?: ImageStudioSlotRecord;
  children: TreeNode[];
};

function buildSlotTree(projectId: string, slots: ImageStudioSlotRecord[], folders: string[]): TreeNode {
  const root: TreeNode = { id: 'root', name: projectId || 'Project', type: 'folder', path: '', children: [] };

  const ensureFolder = (parent: TreeNode, folderName: string, folderPath: string): TreeNode => {
    const existing = parent.children.find((child: TreeNode) => child.type === 'folder' && child.name === folderName);
    if (existing) return existing;
    const node: TreeNode = { id: `folder:${folderPath}`, name: folderName, type: 'folder', path: folderPath, children: [] };
    parent.children.push(node);
    parent.children.sort((a: TreeNode, b: TreeNode) => {
      if (a.type !== b.type) return a.type === 'folder' ? -1 : 1;
      return a.name.localeCompare(b.name);
    });
    return node;
  };

  const normalizedFolders = normalizeFolderPaths(folders);
  normalizedFolders.forEach((folderPath: string) => {
    const normalized = folderPath.replace(/\\/g, '/').replace(/^\/+/, '');
    if (!normalized) return;
    const parts = normalized.split('/').filter(Boolean);
    if (parts.length === 0) return;
    let cursor = root;
    for (let index = 0; index < parts.length; index += 1) {
      const part = parts[index]!;
      const nextFolderPath = parts.slice(0, index + 1).join('/');
      cursor = ensureFolder(cursor, part, nextFolderPath);
    }
  });

  slots.forEach((slot: ImageStudioSlotRecord) => {
    const folderPath = (slot.folderPath ?? '').replace(/\\/g, '/').replace(/^\/+/, '');
    const parts = folderPath ? [...folderPath.split('/'), slot.name || slot.id] : [slot.name || slot.id];
    let cursor = root;
    for (let index = 0; index < parts.length; index += 1) {
      const part = parts[index]!;
      const isLast = index === parts.length - 1;
      if (isLast) {
        cursor.children.push({
          id: `slot:${slot.id}`,
          name: part,
          type: 'file',
          path: parts.slice(0, -1).join('/'),
          slot,
          children: [],
        });
        cursor.children.sort((a: TreeNode, b: TreeNode) => {
          if (a.type !== b.type) return a.type === 'folder' ? -1 : 1;
          return a.name.localeCompare(b.name);
        });
      } else {
        const nextFolderPath = parts.slice(0, index + 1).join('/');
        cursor = ensureFolder(cursor, part, nextFolderPath);
      }
    }
  });

  return root;
}

export function SlotTree(): React.JSX.Element {
  const {
    projectId,
    slots,
    virtualFolders: folders,
    selectedFolder,
    selectedSlotId,
    setSelectedFolder: onSelectFolder,
    setSelectedSlotId,
    moveSlotMutation,
    handleMoveFolder: onMoveFolder,
  } = useImageStudio();

  const onSelectSlot = useCallback((slot: ImageStudioSlotRecord) => {
    setSelectedSlotId(slot.id);
  }, [setSelectedSlotId]);

  const onMoveSlot = useCallback((slot: ImageStudioSlotRecord, targetFolder: string) => {
    void moveSlotMutation.mutateAsync({ slot, targetFolder });
  }, [moveSlotMutation]);

  const tree = useMemo(() => buildSlotTree(projectId, slots, folders), [projectId, slots, folders]);
  const [expanded, setExpanded] = useState<Set<string>>(() => new Set(['root']));
  const [dragOverPath, setDragOverPath] = useState<string | null>(null);
  const [_draggedSlotId, setDraggedSlotId] = useState<string | null>(null);
  const [_draggedFolderPath, setDraggedFolderPath] = useState<string | null>(null);
  const rootOpen = expanded.has('root');

  const toggle = useCallback((id: string): void => {
    setExpanded((prev: Set<string>) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const renderNode = (node: TreeNode, depth: number): React.JSX.Element | null => {
    if (node.type === 'folder') {
      const isOpen = expanded.has(node.id);
      const isSelected = node.path === selectedFolder;
      const isDragOver = dragOverPath === node.path;
      return (
        <div key={node.id}>
          <TreeContextMenu
            items={[
              { id: 'select-folder', label: 'Select folder', onSelect: () => onSelectFolder(node.path) },
              ...(node.path
                ? [
                  {
                    id: 'move-folder-root',
                    label: 'Move to root',
                    onSelect: () => onMoveFolder(node.path, ''),
                  },
                ]
                : []),
            ]}
          >
            <TreeRow
              asChild
              depth={depth}
              baseIndent={8}
              indent={10}
              tone="subtle"
              selected={isSelected}
              dragOver={isDragOver}
              className="text-xs"
            >
              <button
                type="button"
                className="w-full text-left cursor-grab active:cursor-grabbing"
                onClick={() => onSelectFolder(node.path)}
                onDoubleClick={() => toggle(node.id)}
                title={node.path || 'Project root'}
                draggable
                onDragStart={(e: React.DragEvent<HTMLButtonElement>): void => {
                  setDragData(e.dataTransfer, { [DRAG_KEYS.FOLDER_PATH]: node.path }, { effectAllowed: 'move' });
                  setDraggedFolderPath(node.path);
                }}
                onDragEnd={() => {
                  setDraggedFolderPath(null);
                  setDragOverPath(null);
                }}
                onDragOver={(e: React.DragEvent<HTMLButtonElement>): void => {
                  if (!hasDragType(e.dataTransfer, [DRAG_KEYS.ASSET_ID, DRAG_KEYS.FOLDER_PATH])) return;
                  e.preventDefault();
                  e.stopPropagation();
                  setDragOverPath(node.path);
                  e.dataTransfer.dropEffect = 'move';
                }}
                onDragLeave={() => {
                  if (dragOverPath === node.path) setDragOverPath(null);
                }}
                onDrop={(e: React.DragEvent<HTMLButtonElement>): void => {
                  e.preventDefault();
                  e.stopPropagation();
                  const slotId = getFirstDragValue(e.dataTransfer, [DRAG_KEYS.ASSET_ID]);
                  const folderPath =
                    getFirstDragValue(e.dataTransfer, [DRAG_KEYS.FOLDER_PATH]) ?? _draggedFolderPath;
                  setDragOverPath(null);
                  if (slotId) {
                    const slot = slots.find((item: ImageStudioSlotRecord) => item.id === slotId);
                    if (slot) onMoveSlot(slot, node.path);
                    return;
                  }
                  if (folderPath) {
                    onMoveFolder(folderPath, node.path);
                  }
                }}
              >
                <TreeCaret
                  isOpen={isOpen}
                  hasChildren={node.children.length > 0}
                  ariaLabel={isOpen ? `Collapse ${node.name}` : `Expand ${node.name}`}
                  onToggle={() => toggle(node.id)}
                  className="text-gray-400"
                  buttonClassName="hover:bg-gray-700"
                  placeholderClassName="w-4"
                />
                <Folder className="size-4 text-gray-400" />
                <span className="truncate">{node.name}</span>
              </button>
            </TreeRow>
          </TreeContextMenu>
          {isOpen ? (
            <div>
              {node.children.map((child: TreeNode) => renderNode(child, depth + 1))}
            </div>
          ) : null}
        </div>
      );
    }

    const slot = node.slot;
    if (!slot) return null;
    const isSelected = slot.id === selectedSlotId;
    return (
      <TreeContextMenu
        key={node.id}
        items={[
          { id: 'select-slot', label: 'Select slot', onSelect: () => onSelectSlot(slot) },
          ...(slot.folderPath
            ? [
              {
                id: 'move-slot-root',
                label: 'Move to root',
                onSelect: () => onMoveSlot(slot, ''),
              },
            ]
            : []),
        ]}
      >
        <TreeRow
          key={node.id}
          asChild
          depth={depth}
          baseIndent={18}
          indent={10}
          tone="subtle"
          selected={isSelected}
          className="text-xs"
        >
          <button
            type="button"
            className="w-full text-left cursor-grab active:cursor-grabbing"
            onClick={() => onSelectSlot(slot)}
            title={slot.name || slot.id}
            draggable
            onDragStart={(e: React.DragEvent<HTMLButtonElement>): void => {
              setDragData(e.dataTransfer, { [DRAG_KEYS.ASSET_ID]: slot.id }, { effectAllowed: 'move' });
              setDraggedSlotId(slot.id);
            }}
            onDragEnd={() => {
              setDraggedSlotId(null);
              setDragOverPath(null);
            }}
          >
            <ImageIcon className="size-4 text-gray-400" />
            <span className="truncate">{slot.name || node.name}</span>
          </button>
        </TreeRow>
      </TreeContextMenu>
    );
  };

  return (
    <div
      className="h-full overflow-auto rounded border border-border bg-card/40 p-2"
      onDragOver={(e: React.DragEvent<HTMLDivElement>): void => {
        if (!hasDragType(e.dataTransfer, [DRAG_KEYS.ASSET_ID, DRAG_KEYS.FOLDER_PATH])) return;
        e.preventDefault();
        setDragOverPath('');
      }}
      onDragLeave={() => {
        if (dragOverPath === '') setDragOverPath(null);
      }}
      onDrop={(e: React.DragEvent<HTMLDivElement>): void => {
        e.preventDefault();
        const slotId = getFirstDragValue(e.dataTransfer, [DRAG_KEYS.ASSET_ID]);
        const folderPath =
          getFirstDragValue(e.dataTransfer, [DRAG_KEYS.FOLDER_PATH]) ?? _draggedFolderPath;
        setDragOverPath(null);
        if (slotId) {
          const slot = slots.find((item: ImageStudioSlotRecord) => item.id === slotId);
          if (slot) onMoveSlot(slot, '');
          return;
        }
        if (folderPath) {
          onMoveFolder(folderPath, '');
        }
      }}
    >
      {tree.children.length === 0 ? (
        <div className="flex h-full items-center justify-center px-2 text-center text-xs text-gray-500">
          No folders yet. Create a folder or add slots here.
        </div>
      ) : rootOpen ? (
        <div>
          {tree.children.map((child: TreeNode) => renderNode(child, 0))}
        </div>
      ) : null}
    </div>
  );
}
