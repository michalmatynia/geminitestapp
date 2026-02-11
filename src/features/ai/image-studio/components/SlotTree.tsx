'use client';

import { Folder, GripVertical, Image as ImageIcon, Trash2 } from 'lucide-react';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { TreeCaret, TreeContextMenu, TreeRow, useToast } from '@/shared/ui';
import { cn } from '@/shared/utils';
import { DRAG_KEYS, getFirstDragValue, hasDragType, setDragData } from '@/shared/utils';

import { useProjectsState } from '../context/ProjectsContext';
import { useSlotsState, useSlotsActions } from '../context/SlotsContext';
import { normalizeFolderPaths } from '../utils/studio-tree';

import type { ImageStudioSlotRecord } from '../types';

type TreeNode = {
  id: string;
  name: string;
  type: 'folder' | 'card';
  path: string;
  slot?: ImageStudioSlotRecord;
  roleLabel?: string | null;
  derivedFromCard?: boolean;
  children: TreeNode[];
};

const SLOT_DRAG_TEXT_PREFIX = 'image-studio-slot:';
const FOLDER_DRAG_TEXT_PREFIX = 'image-studio-folder:';

type TreeDragPayload = {
  slotId: string | null;
  folderPath: string | null;
};

function parseTreeDragText(value: string | null | undefined): TreeDragPayload {
  const raw = value?.trim() ?? '';
  if (!raw) return { slotId: null, folderPath: null };
  if (raw.startsWith(SLOT_DRAG_TEXT_PREFIX)) {
    const slotId = raw.slice(SLOT_DRAG_TEXT_PREFIX.length).trim();
    return { slotId: slotId || null, folderPath: null };
  }
  if (raw.startsWith(FOLDER_DRAG_TEXT_PREFIX)) {
    const folderPath = raw.slice(FOLDER_DRAG_TEXT_PREFIX.length).trim();
    return { slotId: null, folderPath: folderPath || null };
  }
  return { slotId: null, folderPath: null };
}

function buildSlotTree(projectId: string, slots: ImageStudioSlotRecord[], folders: string[]): TreeNode {
  const root: TreeNode = { id: 'root', name: projectId || 'Project', type: 'folder', path: '', children: [] };

  const getSlotMetadata = (slot: ImageStudioSlotRecord): Record<string, unknown> | null => {
    if (!slot.metadata || typeof slot.metadata !== 'object' || Array.isArray(slot.metadata)) return null;
    return slot.metadata;
  };

  const getSlotRole = (slot: ImageStudioSlotRecord): string | null => {
    const metadata = getSlotMetadata(slot);
    const role = metadata?.['role'];
    if (typeof role !== 'string') return null;
    const normalized = role.trim().toLowerCase();
    return normalized || null;
  };

  const getSlotSourceId = (slot: ImageStudioSlotRecord): string | null => {
    const metadata = getSlotMetadata(slot);
    const sourceSlotId = metadata?.['sourceSlotId'];
    if (typeof sourceSlotId !== 'string') return null;
    const normalized = sourceSlotId.trim();
    return normalized || null;
  };

  const getSlotRelationType = (slot: ImageStudioSlotRecord): string | null => {
    const metadata = getSlotMetadata(slot);
    const relationType = metadata?.['relationType'];
    if (typeof relationType !== 'string') return null;
    const normalized = relationType.trim().toLowerCase();
    return normalized || null;
  };

  const getRoleLabel = (slot: ImageStudioSlotRecord, derivedFromCard: boolean): string | null => {
    const metadata = getSlotMetadata(slot);
    const role = getSlotRole(slot);
    if (role === 'mask') {
      const variant = typeof metadata?.['variant'] === 'string' ? metadata['variant'].trim().toLowerCase() : '';
      const inverted = Boolean(metadata?.['inverted']);
      if (variant) return inverted ? `mask ${variant} inv` : `mask ${variant}`;
      return inverted ? 'mask inv' : 'mask';
    }
    if (role === 'generation') return 'generation';
    if (role === 'version') return 'version';
    if (role === 'part') return 'part';
    if (role === 'variant') return 'variant';
    const relationType = getSlotRelationType(slot);
    if (relationType?.startsWith('mask:')) {
      return relationType.replace(':', ' ');
    }
    if (derivedFromCard) return 'derived';
    return null;
  };

  const compareNodes = (a: TreeNode, b: TreeNode): number => {
    if (a.type !== b.type) return a.type === 'folder' ? -1 : 1;
    return a.name.localeCompare(b.name);
  };

  const sortNodes = (nodes: TreeNode[]): void => {
    nodes.sort(compareNodes);
  };

  const compareSlots = (a: ImageStudioSlotRecord, b: ImageStudioSlotRecord): number => {
    const left = (a.name ?? a.id).trim().toLowerCase();
    const right = (b.name ?? b.id).trim().toLowerCase();
    return left.localeCompare(right);
  };

  const slotById = new Map<string, ImageStudioSlotRecord>(
    slots.map((slot: ImageStudioSlotRecord) => [slot.id, slot])
  );
  const linkedSlotsBySource = new Map<string, ImageStudioSlotRecord[]>();
  const rootCardSlots: ImageStudioSlotRecord[] = [];

  slots.forEach((slot: ImageStudioSlotRecord) => {
    const sourceSlotId = getSlotSourceId(slot);
    if (sourceSlotId && sourceSlotId !== slot.id && slotById.has(sourceSlotId)) {
      const current = linkedSlotsBySource.get(sourceSlotId) ?? [];
      current.push(slot);
      linkedSlotsBySource.set(sourceSlotId, current);
      return;
    }
    rootCardSlots.push(slot);
  });

  linkedSlotsBySource.forEach((children: ImageStudioSlotRecord[]) => {
    children.sort(compareSlots);
  });
  rootCardSlots.sort(compareSlots);

  const ensureFolder = (parent: TreeNode, folderName: string, folderPath: string): TreeNode => {
    const existing = parent.children.find((child: TreeNode) => child.type === 'folder' && child.name === folderName);
    if (existing) return existing;
    const node: TreeNode = { id: `folder:${folderPath}`, name: folderName, type: 'folder', path: folderPath, children: [] };
    parent.children.push(node);
    sortNodes(parent.children);
    return node;
  };

  const buildCardChildren = (sourceSlotId: string, lineage: Set<string>): TreeNode[] => {
    const children = linkedSlotsBySource.get(sourceSlotId) ?? [];
    if (children.length === 0) return [];
    const nodes: TreeNode[] = [];
    children.forEach((child: ImageStudioSlotRecord) => {
      if (lineage.has(child.id)) return;
      const nextLineage = new Set(lineage);
      nextLineage.add(child.id);
      nodes.push({
        id: `card:${child.id}`,
        name: child.name || child.id,
        type: 'card',
        path: (child.folderPath ?? '').replace(/\\/g, '/').replace(/^\/+/, ''),
        slot: child,
        roleLabel: getRoleLabel(child, true),
        derivedFromCard: true,
        children: buildCardChildren(child.id, nextLineage),
      });
    });
    sortNodes(nodes);
    return nodes;
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

  rootCardSlots.forEach((slot: ImageStudioSlotRecord) => {
    const folderPath = (slot.folderPath ?? '').replace(/\\/g, '/').replace(/^\/+/, '');
    const parts = folderPath ? folderPath.split('/').filter(Boolean) : [];
    let cursor = root;
    for (let index = 0; index < parts.length; index += 1) {
      const part = parts[index]!;
      const nextFolderPath = parts.slice(0, index + 1).join('/');
      cursor = ensureFolder(cursor, part, nextFolderPath);
    }
    cursor.children.push({
      id: `card:${slot.id}`,
      name: slot.name || slot.id,
      type: 'card',
      path: folderPath,
      slot,
      roleLabel: getRoleLabel(slot, false),
      derivedFromCard: false,
      children: buildCardChildren(slot.id, new Set([slot.id])),
    });
    sortNodes(cursor.children);
  });

  return root;
}

export function SlotTree(): React.JSX.Element {
  const { projectId } = useProjectsState();
  const { slots, virtualFolders: folders, selectedFolder, selectedSlotId } = useSlotsState();
  const {
    setSelectedFolder: onSelectFolder,
    setSelectedSlotId,
    moveSlotMutation,
    deleteSlotMutation,
    handleMoveFolder: onMoveFolder,
    handleRenameFolder: onRenameFolder,
  } = useSlotsActions();
  const { toast } = useToast();

  const onSelectSlot = useCallback((slot: ImageStudioSlotRecord) => {
    setSelectedSlotId(slot.id);
  }, [setSelectedSlotId]);

  const onMoveSlot = useCallback((slot: ImageStudioSlotRecord, targetFolder: string) => {
    void moveSlotMutation.mutateAsync({ slot, targetFolder });
  }, [moveSlotMutation]);
  const onDeleteSlot = useCallback((slot: ImageStudioSlotRecord): void => {
    const cardLabel = slot.name?.trim() || slot.id;
    if (typeof window !== 'undefined') {
      const confirmed = window.confirm(`Delete card "${cardLabel}"?`);
      if (!confirmed) return;
    }
    void deleteSlotMutation.mutateAsync(slot.id);
  }, [deleteSlotMutation]);

  const tree = useMemo(() => buildSlotTree(projectId, slots, folders), [projectId, slots, folders]);
  const [expanded, setExpanded] = useState<Set<string>>(() => new Set(['root']));
  const [dragOverPath, setDragOverPath] = useState<string | null>(null);
  const [renamingFolderPath, setRenamingFolderPath] = useState<string | null>(null);
  const [renameFolderDraft, setRenameFolderDraft] = useState('');
  const draggedSlotIdRef = useRef<string | null>(null);
  const draggedFolderPathRef = useRef<string | null>(null);
  const treeRef = useRef<HTMLDivElement | null>(null);
  const rootOpen = expanded.has('root');
  const resolveDropPayload = useCallback((dataTransfer: DataTransfer): TreeDragPayload => {
    const parsedText = parseTreeDragText(getFirstDragValue(dataTransfer, [DRAG_KEYS.TEXT]));
    const slotId = getFirstDragValue(
      dataTransfer,
      [DRAG_KEYS.ASSET_ID],
      draggedSlotIdRef.current ?? parsedText.slotId ?? null
    );
    const folderPath = getFirstDragValue(
      dataTransfer,
      [DRAG_KEYS.FOLDER_PATH],
      draggedFolderPathRef.current ?? parsedText.folderPath ?? null
    );
    return { slotId, folderPath };
  }, []);
  const canHandleDrop = useCallback((dataTransfer: DataTransfer): boolean => {
    if (hasDragType(dataTransfer, [DRAG_KEYS.ASSET_ID, DRAG_KEYS.FOLDER_PATH])) return true;
    const parsedText = parseTreeDragText(getFirstDragValue(dataTransfer, [DRAG_KEYS.TEXT]));
    if (parsedText.slotId || parsedText.folderPath) return true;
    return Boolean(draggedSlotIdRef.current || draggedFolderPathRef.current);
  }, []);
  const clearDragState = useCallback((): void => {
    draggedSlotIdRef.current = null;
    draggedFolderPathRef.current = null;
    setDragOverPath(null);
  }, []);
  const clearDragStateDeferred = useCallback((): void => {
    if (typeof window === 'undefined') {
      clearDragState();
      return;
    }
    window.setTimeout(() => {
      clearDragState();
    }, 0);
  }, [clearDragState]);
  const applyDropToTarget = useCallback((dataTransfer: DataTransfer, targetFolder: string): void => {
    const { slotId, folderPath } = resolveDropPayload(dataTransfer);
    clearDragState();
    if (slotId) {
      const slot = slots.find((item: ImageStudioSlotRecord) => item.id === slotId);
      if (slot) {
        onMoveSlot(slot, targetFolder);
      }
      return;
    }
    if (folderPath && folderPath !== targetFolder) {
      void onMoveFolder(folderPath, targetFolder);
    }
  }, [clearDragState, onMoveFolder, onMoveSlot, resolveDropPayload, slots]);
  const handleRootDragOver = useCallback((event: React.DragEvent<HTMLDivElement>): void => {
    if (!canHandleDrop(event.dataTransfer)) return;
    event.preventDefault();
    event.stopPropagation();
    setDragOverPath('');
    event.dataTransfer.dropEffect = 'move';
  }, [canHandleDrop]);
  const handleRootDrop = useCallback((event: React.DragEvent<HTMLDivElement>): void => {
    event.preventDefault();
    event.stopPropagation();
    applyDropToTarget(event.dataTransfer, '');
  }, [applyDropToTarget]);
  const clearSelection = useCallback((): void => {
    onSelectFolder('');
    setSelectedSlotId(null);
  }, [onSelectFolder, setSelectedSlotId]);
  const startFolderRename = useCallback((node: TreeNode): void => {
    if (!node.path) return;
    setRenamingFolderPath(node.path);
    setRenameFolderDraft(node.name);
  }, []);
  const cancelFolderRename = useCallback((): void => {
    setRenamingFolderPath(null);
    setRenameFolderDraft('');
  }, []);
  const commitFolderRename = useCallback((folderPath: string): void => {
    const normalizedSource = folderPath.replace(/\\/g, '/').replace(/^\/+|\/+$/g, '');
    if (!normalizedSource) {
      cancelFolderRename();
      return;
    }
    const sourceLeaf = normalizedSource.split('/').pop() ?? normalizedSource;
    const normalizedName = renameFolderDraft.replace(/[\\/]+/g, ' ').trim();
    if (!normalizedName) {
      toast('Folder name cannot be empty.', { variant: 'info' });
      return;
    }
    if (normalizedName === sourceLeaf) {
      cancelFolderRename();
      return;
    }
    const parentPath = normalizedSource.includes('/')
      ? normalizedSource.slice(0, normalizedSource.lastIndexOf('/'))
      : '';
    const nextPath = parentPath ? `${parentPath}/${normalizedName}` : normalizedName;
    cancelFolderRename();
    void onRenameFolder(normalizedSource, nextPath).catch((error: unknown) => {
      toast(error instanceof Error ? error.message : 'Failed to rename folder.', { variant: 'error' });
    });
  }, [cancelFolderRename, onRenameFolder, renameFolderDraft, toast]);

  useEffect(() => {
    const handleDocumentPointerDown = (event: PointerEvent): void => {
      const container = treeRef.current;
      if (!container) return;
      const target = event.target;
      if (!(target instanceof Node)) return;
      if (target instanceof Element && target.closest('[data-preserve-slot-selection="true"]')) return;
      if (container.contains(target)) return;
      clearSelection();
    };

    document.addEventListener('pointerdown', handleDocumentPointerDown);
    return (): void => {
      document.removeEventListener('pointerdown', handleDocumentPointerDown);
    };
  }, [clearSelection]);

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
      const isRenaming = Boolean(node.path) && renamingFolderPath === node.path;
      return (
        <div key={node.id}>
          <TreeContextMenu
            items={[
              { id: 'select-folder', label: 'Select folder', onSelect: () => onSelectFolder(node.path) },
              ...(node.path
                ? [
                  {
                    id: 'rename-folder',
                    label: 'Rename folder',
                    onSelect: () => startFolderRename(node),
                  },
                  {
                    id: 'move-folder-root',
                    label: 'Move to root',
                    onSelect: () => onMoveFolder(node.path, ''),
                  },
                ]
                : []),
            ]}
          >
            {isRenaming ? (
              <TreeRow
                depth={depth}
                baseIndent={8}
                indent={12}
                tone='subtle'
                selected={isSelected}
                dragOver={false}
                className='relative min-h-8 text-xs'
              >
                <div
                  className='flex w-full items-center gap-2'
                  onClick={(event: React.MouseEvent<HTMLDivElement>) => {
                    event.stopPropagation();
                  }}
                >
                  <span className='size-3.5 shrink-0' />
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
                  <input
                    autoFocus
                    value={renameFolderDraft}
                    onChange={(event: React.ChangeEvent<HTMLInputElement>) => {
                      setRenameFolderDraft(event.target.value);
                    }}
                    onBlur={() => commitFolderRename(node.path)}
                    onKeyDown={(event: React.KeyboardEvent<HTMLInputElement>) => {
                      event.stopPropagation();
                      if (event.key === 'Enter') {
                        event.preventDefault();
                        commitFolderRename(node.path);
                        return;
                      }
                      if (event.key === 'Escape') {
                        event.preventDefault();
                        cancelFolderRename();
                      }
                    }}
                    onPointerDown={(event: React.PointerEvent<HTMLInputElement>) => {
                      event.stopPropagation();
                    }}
                    onClick={(event: React.MouseEvent<HTMLInputElement>) => {
                      event.stopPropagation();
                    }}
                    className='h-6 w-full rounded border border-border/70 bg-card/80 px-2 text-xs text-gray-100 outline-none ring-0 focus:border-sky-400'
                    aria-label='Rename folder'
                  />
                </div>
              </TreeRow>
            ) : (
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
                  className='w-full text-left'
                  onClick={(event: React.MouseEvent<HTMLButtonElement>) => {
                    event.stopPropagation();
                    onSelectFolder(node.path);
                  }}
                  onDoubleClick={(event: React.MouseEvent<HTMLButtonElement>) => {
                    event.stopPropagation();
                    if (!node.path) return;
                    startFolderRename(node);
                  }}
                  title={node.path || 'Project root'}
                  data-folder-path={node.path}
                  onDragOver={(e: React.DragEvent<HTMLButtonElement>): void => {
                    if (!canHandleDrop(e.dataTransfer)) return;
                    e.preventDefault();
                    e.stopPropagation();
                    setDragOverPath(node.path);
                    e.dataTransfer.dropEffect = 'move';
                  }}
                  onDragLeave={() => {
                    // Keep current drag target until another target claims it.
                    // Clearing aggressively here causes drag placeholder flicker.
                  }}
                  onDrop={(e: React.DragEvent<HTMLButtonElement>): void => {
                    e.preventDefault();
                    e.stopPropagation();
                    applyDropToTarget(e.dataTransfer, node.path);
                  }}
                >
                  <span
                    draggable={Boolean(node.path)}
                    onDragStart={(event: React.DragEvent<HTMLSpanElement>): void => {
                      if (!node.path) return;
                      event.stopPropagation();
                      setDragData(
                        event.dataTransfer,
                        { [DRAG_KEYS.FOLDER_PATH]: node.path },
                        { text: `${FOLDER_DRAG_TEXT_PREFIX}${node.path}`, effectAllowed: 'move' }
                      );
                      draggedSlotIdRef.current = null;
                      draggedFolderPathRef.current = node.path;
                    }}
                    onDragEnd={clearDragStateDeferred}
                    onMouseDown={(event: React.MouseEvent): void => event.stopPropagation()}
                    onClick={(event: React.MouseEvent): void => event.stopPropagation()}
                    className='flex items-center justify-center opacity-0 group-hover:opacity-100'
                    aria-label={`Drag folder ${node.name}`}
                    title='Drag folder'
                  >
                    <GripVertical className='size-3.5 shrink-0 cursor-grab text-gray-500 active:cursor-grabbing' />
                  </span>
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
            )}
          </TreeContextMenu>
          {isOpen ? (
            <div>
              {node.children.map((child: TreeNode) => renderNode(child, depth + 1))}
            </div>
          ) : null}
        </div>
      );
    }

    const card = node.slot;
    if (!card) return null;
    const isOpen = node.children.length > 0 && expanded.has(node.id);
    const isSelected = card.id === selectedSlotId;
    return (
      <div key={node.id}>
        <TreeContextMenu
          items={[
            { id: 'select-card', label: 'Select card', onSelect: () => onSelectSlot(card) },
            ...(card.folderPath
              ? [
                {
                  id: 'move-card-root',
                  label: 'Move to root',
                  onSelect: () => onMoveSlot(card, ''),
                },
              ]
              : []),
            {
              id: 'delete-card',
              label: 'Delete card',
              icon: <Trash2 className='size-3.5' />,
              tone: 'danger',
              onSelect: () => onDeleteSlot(card),
            },
          ]}
        >
          <TreeRow
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
              className='w-full text-left'
              onClick={(event: React.MouseEvent<HTMLButtonElement>) => {
                event.stopPropagation();
                onSelectSlot(card);
              }}
              onDoubleClick={() => {
                if (node.children.length > 0) toggle(node.id);
              }}
              title={card.name || card.id}
            >
              <span
                draggable
                onDragStart={(event: React.DragEvent<HTMLSpanElement>): void => {
                  event.stopPropagation();
                  setDragData(
                    event.dataTransfer,
                    { [DRAG_KEYS.ASSET_ID]: card.id },
                    { text: `${SLOT_DRAG_TEXT_PREFIX}${card.id}`, effectAllowed: 'move' }
                  );
                  draggedFolderPathRef.current = null;
                  draggedSlotIdRef.current = card.id;
                }}
                onDragEnd={clearDragStateDeferred}
                onMouseDown={(event: React.MouseEvent): void => event.stopPropagation()}
                onClick={(event: React.MouseEvent): void => event.stopPropagation()}
                className='flex items-center justify-center opacity-0 group-hover:opacity-100'
                aria-label={`Drag card ${card.name || card.id}`}
                title='Drag card'
              >
                <GripVertical className='size-3.5 shrink-0 cursor-grab text-gray-500 active:cursor-grabbing' />
              </span>
              <TreeCaret
                isOpen={isOpen}
                hasChildren={node.children.length > 0}
                ariaLabel={isOpen ? `Collapse ${node.name}` : `Expand ${node.name}`}
                onToggle={() => toggle(node.id)}
                className='text-gray-400'
                buttonClassName='hover:bg-gray-700'
                placeholderClassName='w-4'
              />
              <ImageIcon className='size-3.5 text-gray-400' />
              <span className='truncate'>{card.name || node.name}</span>
              {node.roleLabel ? (
                <span className='ml-auto max-w-[90px] truncate text-[10px] uppercase tracking-wide text-gray-500'>
                  {node.roleLabel}
                </span>
              ) : null}
              <span
                className={cn(
                  'ml-1 size-1 rounded-full bg-blue-300/55 transition-opacity duration-150',
                  isSelected ? 'opacity-100' : 'opacity-0'
                )}
              />
              <span
                className={cn(
                  'ml-1 inline-flex items-center justify-center rounded p-0.5 text-gray-400 transition',
                  'opacity-0 group-hover:opacity-100 hover:bg-red-500/20 hover:text-red-300',
                  deleteSlotMutation.isPending ? 'pointer-events-none opacity-40' : 'cursor-pointer'
                )}
                onMouseDown={(event: React.MouseEvent<HTMLSpanElement>): void => {
                  event.stopPropagation();
                }}
                onClick={(event: React.MouseEvent<HTMLSpanElement>): void => {
                  event.stopPropagation();
                  onDeleteSlot(card);
                }}
                title='Delete card'
                aria-hidden='true'
              >
                <Trash2 className='size-3' />
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
  };

  return (
    <div
      ref={treeRef}
      className='relative h-full overflow-y-auto overflow-x-hidden rounded border border-border bg-card/40 p-2'
      role='tree'
      tabIndex={0}
      aria-label='Image card folders and cards'
      onKeyDown={(event: React.KeyboardEvent<HTMLDivElement>): void => {
        if (event.key !== 'Escape') return;
        event.stopPropagation();
        clearSelection();
      }}
      onClick={clearSelection}
      onDragOver={(e: React.DragEvent<HTMLDivElement>): void => {
        if (!canHandleDrop(e.dataTransfer)) return;
        e.preventDefault();
        setDragOverPath('');
        e.dataTransfer.dropEffect = 'move';
      }}
      onDragLeave={() => {
        if (dragOverPath === '') setDragOverPath(null);
      }}
      onDrop={(e: React.DragEvent<HTMLDivElement>): void => {
        e.preventDefault();
        applyDropToTarget(e.dataTransfer, '');
      }}
    >
      {tree.children.length === 0 ? (
        <div className='flex h-full items-center justify-center px-2 text-center text-xs text-gray-500'>
          No folders yet. Create a folder or add cards here.
        </div>
      ) : rootOpen ? (
        <div>
          {dragOverPath !== null ? (
            <div
              className={cn(
                'mx-1 mb-1 mt-0.5 flex h-9 items-center justify-center rounded border border-dashed text-[10px] uppercase tracking-wide transition-colors duration-150',
                dragOverPath === ''
                  ? 'border-sky-300/80 bg-sky-500/10 text-sky-100'
                  : 'border-sky-300/35 bg-sky-500/5 text-sky-200/70'
              )}
              onDragOver={handleRootDragOver}
              onDragEnter={handleRootDragOver}
              onDrop={handleRootDrop}
            >
              Drop To Root
            </div>
          ) : null}
          {tree.children.map((child: TreeNode) => renderNode(child, 0))}
          {dragOverPath !== null ? (
            <div
              className={cn(
                'mx-1 mb-0.5 mt-1 flex h-9 items-center justify-center rounded border border-dashed text-[10px] uppercase tracking-wide transition-colors duration-150',
                dragOverPath === ''
                  ? 'border-sky-300/80 bg-sky-500/10 text-sky-100'
                  : 'border-sky-300/35 bg-sky-500/5 text-sky-200/70'
              )}
              onDragOver={handleRootDragOver}
              onDragEnter={handleRootDragOver}
              onDrop={handleRootDrop}
            >
              Drop To Root
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
