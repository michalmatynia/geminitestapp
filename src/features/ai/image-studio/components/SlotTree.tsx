'use client';

import { Folder, Image as ImageIcon } from 'lucide-react';
import React, { useCallback, useMemo, useRef, useState } from 'react';

import { TreeCaret, TreeContextMenu, TreeRow } from '@/shared/ui';
import { cn } from '@/shared/utils';
import { DRAG_KEYS, getFirstDragValue, hasDragType, setDragData } from '@/shared/utils';

import { useProjectsState } from '../context/ProjectsContext';
import { useSlotsState, useSlotsActions } from '../context/SlotsContext';
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
  const { projectId } = useProjectsState();
  const { slots, virtualFolders: folders, selectedFolder, selectedSlotId } = useSlotsState();
  const { setSelectedFolder: onSelectFolder, setSelectedSlotId, moveSlotMutation, handleMoveFolder: onMoveFolder } = useSlotsActions();

  const onSelectSlot = useCallback((slot: ImageStudioSlotRecord) => {
    setSelectedSlotId(slot.id);
  }, [setSelectedSlotId]);

  const onMoveSlot = useCallback((slot: ImageStudioSlotRecord, targetFolder: string) => {
    void moveSlotMutation.mutateAsync({ slot, targetFolder });
  }, [moveSlotMutation]);

  const tree = useMemo(() => buildSlotTree(projectId, slots, folders), [projectId, slots, folders]);
  const [expanded, setExpanded] = useState<Set<string>>(() => new Set(['root']));
  const [dragOverPath, setDragOverPath] = useState<string | null>(null);
  const draggedSlotIdRef = useRef<string | null>(null);
  const draggedFolderPathRef = useRef<string | null>(null);
  const lastDropTargetPathRef = useRef<string | null>(null);
  const rootOpen = expanded.has('root');
  const canHandleDrop = useCallback((dataTransfer: DataTransfer): boolean => {
    if (hasDragType(dataTransfer, [DRAG_KEYS.ASSET_ID, DRAG_KEYS.FOLDER_PATH])) return true;
    return Boolean(draggedSlotIdRef.current || draggedFolderPathRef.current);
  }, []);
  const clearDragState = useCallback((): void => {
    draggedSlotIdRef.current = null;
    draggedFolderPathRef.current = null;
    lastDropTargetPathRef.current = null;
    setDragOverPath(null);
  }, []);
  const getFolderPathFromEventTarget = useCallback((target: EventTarget | null): string | null => {
    if (!(target instanceof Element)) return null;
    const folderElement = target.closest<HTMLElement>('[data-folder-path]');
    if (!folderElement) return null;
    return folderElement.dataset['folderPath'] ?? null;
  }, []);

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
      const isSelected = !selectedSlotId && node.path === selectedFolder;
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
              indent={12}
              tone='subtle'
              selected={isSelected}
              dragOver={isDragOver}
              dragOverClassName='bg-transparent text-gray-100 ring-0'
              className='relative min-h-8 text-xs'
            >
              <button
                type='button'
                className='w-full text-left cursor-grab active:cursor-grabbing'
                onClick={(event: React.MouseEvent<HTMLButtonElement>) => {
                  event.stopPropagation();
                  onSelectFolder(node.path);
                }}
                onDoubleClick={() => toggle(node.id)}
                title={node.path || 'Project root'}
                data-folder-path={node.path}
                draggable
                onDragStart={(e: React.DragEvent<HTMLButtonElement>): void => {
                  setDragData(e.dataTransfer, { [DRAG_KEYS.FOLDER_PATH]: node.path }, { effectAllowed: 'move' });
                  draggedSlotIdRef.current = null;
                  draggedFolderPathRef.current = node.path;
                }}
                onDragEnd={clearDragState}
                onDragOver={(e: React.DragEvent<HTMLButtonElement>): void => {
                  if (!canHandleDrop(e.dataTransfer)) return;
                  e.preventDefault();
                  e.stopPropagation();
                  setDragOverPath(node.path);
                  lastDropTargetPathRef.current = node.path;
                  e.dataTransfer.dropEffect = 'move';
                }}
                onDragLeave={() => {
                  if (dragOverPath === node.path) setDragOverPath(null);
                }}
                onDrop={(e: React.DragEvent<HTMLButtonElement>): void => {
                  e.preventDefault();
                  e.stopPropagation();
                  const slotId = getFirstDragValue(e.dataTransfer, [DRAG_KEYS.ASSET_ID], draggedSlotIdRef.current);
                  const folderPath =
                    getFirstDragValue(e.dataTransfer, [DRAG_KEYS.FOLDER_PATH], draggedFolderPathRef.current);
                  clearDragState();
                  if (slotId) {
                    const slot = slots.find((item: ImageStudioSlotRecord) => item.id === slotId);
                    if (slot) { onMoveSlot(slot, node.path); }
                    return;
                  }
                  if (folderPath) {
                    void onMoveFolder(folderPath, node.path);
                  }
                }}
              >
                <div
                  className={cn(
                    'pointer-events-none absolute left-2.5 top-2 bottom-2 w-px rounded-full bg-sky-300/35 transition-opacity duration-150',
                    isDragOver ? 'opacity-100' : 'opacity-0'
                  )}
                />
                <TreeCaret
                  isOpen={isOpen}
                  hasChildren={node.children.length > 0}
                  ariaLabel={isOpen ? `Collapse ${node.name}` : `Expand ${node.name}`}
                  onToggle={() => toggle(node.id)}
                  className='text-gray-400'
                  buttonClassName='hover:bg-gray-700'
                  placeholderClassName='w-4'
                />
                <Folder className='size-3.5 text-gray-400' />
                <span className='truncate'>{node.name}</span>
                <span
                  className={cn(
                    'ml-auto text-[10px] text-sky-200/70 transition-opacity duration-150',
                    isDragOver ? 'opacity-100' : 'opacity-0'
                  )}
                >
                  drop
                </span>
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
          baseIndent={20}
          indent={12}
          tone='subtle'
          selected={isSelected}
          className='min-h-8 text-xs'
        >
          <button
            type='button'
            className='w-full text-left cursor-grab active:cursor-grabbing'
            onClick={(event: React.MouseEvent<HTMLButtonElement>) => {
              event.stopPropagation();
              onSelectSlot(slot);
            }}
            title={slot.name || slot.id}
            draggable
            onDragStart={(e: React.DragEvent<HTMLButtonElement>): void => {
              setDragData(e.dataTransfer, { [DRAG_KEYS.ASSET_ID]: slot.id }, { effectAllowed: 'move' });
              draggedFolderPathRef.current = null;
              draggedSlotIdRef.current = slot.id;
            }}
            onDragEnd={clearDragState}
          >
            <ImageIcon className='size-3.5 text-gray-400' />
            <span className='truncate'>{slot.name || node.name}</span>
            <span
              className={cn(
                'ml-auto size-1 rounded-full bg-blue-300/55 transition-opacity duration-150',
                isSelected ? 'opacity-100' : 'opacity-0'
              )}
            />
          </button>
        </TreeRow>
      </TreeContextMenu>
    );
  };

  return (
    <div
      className='relative h-full overflow-auto rounded border border-border bg-card/40 p-2'
      role='tree'
      tabIndex={0}
      aria-label='Image slot folders and files'
      onKeyDown={(event: React.KeyboardEvent<HTMLDivElement>): void => {
        if (event.key !== 'Escape') return;
        event.stopPropagation();
        setSelectedSlotId(null);
      }}
      onClick={() => setSelectedSlotId(null)}
      onDragOver={(e: React.DragEvent<HTMLDivElement>): void => {
        if (!canHandleDrop(e.dataTransfer)) return;
        e.preventDefault();
        const hoveredFolderPath = getFolderPathFromEventTarget(e.target);
        const resolvedPath = hoveredFolderPath ?? '';
        setDragOverPath(resolvedPath);
        lastDropTargetPathRef.current = resolvedPath;
      }}
      onDragLeave={() => {
        if (dragOverPath === '') setDragOverPath(null);
      }}
      onDrop={(e: React.DragEvent<HTMLDivElement>): void => {
        e.preventDefault();
        const hoveredFolderPath = getFolderPathFromEventTarget(e.target);
        const targetFolder = hoveredFolderPath ?? lastDropTargetPathRef.current ?? '';
        const slotId = getFirstDragValue(e.dataTransfer, [DRAG_KEYS.ASSET_ID], draggedSlotIdRef.current);
        const folderPath =
          getFirstDragValue(e.dataTransfer, [DRAG_KEYS.FOLDER_PATH], draggedFolderPathRef.current);
        clearDragState();
        if (slotId) {
          const slot = slots.find((item: ImageStudioSlotRecord) => item.id === slotId);
          if (slot) { onMoveSlot(slot, targetFolder); }
          return;
        }
        if (folderPath) {
          void onMoveFolder(folderPath, targetFolder);
        }
      }}
    >
      <div
        className={cn(
          'pointer-events-none absolute left-3 right-3 top-2 h-px rounded-full bg-sky-300/35 transition-opacity duration-150',
          dragOverPath === '' ? 'opacity-100' : 'opacity-0'
        )}
      />
      <div
        className={cn(
          'pointer-events-none absolute right-3 top-3 text-[9px] uppercase tracking-wide text-sky-200/55 transition-opacity duration-150',
          dragOverPath === '' ? 'opacity-100' : 'opacity-0'
        )}
      >
        Drop To Root
      </div>
      {tree.children.length === 0 ? (
        <div className='flex h-full items-center justify-center px-2 text-center text-xs text-gray-500'>
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
