'use client';

import { Folder, FolderOpen, GripVertical, Image as ImageIcon, Trash2 } from 'lucide-react';
import React, { useCallback, useEffect, useMemo, useRef } from 'react';

import { MasterFolderTree, useMasterFolderTree } from '@/features/foldertree/master';
import { ICON_LIBRARY_MAP } from '@/features/icons';
import { useFolderTreeProfile } from '@/shared/hooks/use-folder-tree-profile';
import { TreeCaret, TreeContextMenu, TreeRow, useToast } from '@/shared/ui';
import {
  canNestTreeNodeV2,
  cn,
  getFolderTreePlaceholderClasses,
  resolveFolderTreeIconV2,
  type MasterTreeId,
  type MasterTreeNode,
} from '@/shared/utils';
import {
  DRAG_KEYS,
  getFirstDragValue,
} from '@/shared/utils/drag-drop';
import {
  canMoveTreePath,
  getTreePathLeaf,
  normalizeTreePath,
} from '@/shared/utils/tree-operations';

import { useSlotsActions, useSlotsState } from '../context/SlotsContext';
import {
  buildMasterNodesFromStudioTree,
  findMasterNodeAncestorIds,
  fromFolderMasterNodeId,
  fromSlotMasterNodeId,
  resolveFolderTargetPathForMasterNode,
  toFolderMasterNodeId,
  toSlotMasterNodeId,
} from '../utils/master-folder-tree';

import type { ImageStudioSlotRecord } from '../types';

type SlotTreeRevealRequest = {
  slotId: string;
  nonce: number;
};

const resolveExternalDraggedNodeId = (dataTransfer: DataTransfer): MasterTreeId | null => {
  const slotId = getFirstDragValue(dataTransfer, [DRAG_KEYS.ASSET_ID], null);
  if (slotId) return toSlotMasterNodeId(slotId);

  const folderPath = getFirstDragValue(dataTransfer, [DRAG_KEYS.FOLDER_PATH], null);
  if (folderPath) return toFolderMasterNodeId(folderPath);

  return null;
};

export function SlotTree({ revealRequest = null }: { revealRequest?: SlotTreeRevealRequest | null }): React.JSX.Element {
  const { slots, virtualFolders: folders, selectedFolder, selectedSlotId } = useSlotsState();
  const {
    setSelectedFolder: onSelectFolder,
    setSelectedSlotId,
    moveSlotMutation,
    deleteSlotMutation,
    handleMoveFolder: onMoveFolder,
    handleRenameFolder: onRenameFolder,
  } = useSlotsActions();
  const profile = useFolderTreeProfile('image_studio');
  const { toast } = useToast();

  const placeholderClasses = useMemo(
    () => getFolderTreePlaceholderClasses(profile.placeholders.preset),
    [profile.placeholders.preset]
  );
  const FolderClosedIcon = useMemo(() => {
    const iconId = resolveFolderTreeIconV2(profile, 'folderClosed', 'folder') ?? 'Folder';
    return ICON_LIBRARY_MAP[iconId] ?? Folder;
  }, [profile]);
  const FolderOpenIcon = useMemo(() => {
    const iconId = resolveFolderTreeIconV2(profile, 'folderOpen', 'folder') ?? 'FolderOpen';
    return ICON_LIBRARY_MAP[iconId] ?? FolderOpen;
  }, [profile]);
  const FileIcon = useMemo(() => {
    const iconId = resolveFolderTreeIconV2(profile, 'file', 'card') ?? 'Image';
    return ICON_LIBRARY_MAP[iconId] ?? ImageIcon;
  }, [profile]);
  const DragHandleIcon = useMemo(() => {
    const iconId = resolveFolderTreeIconV2(profile, 'dragHandle') ?? 'GripVertical';
    return ICON_LIBRARY_MAP[iconId] ?? GripVertical;
  }, [profile]);

  const masterNodes = useMemo(
    () => buildMasterNodesFromStudioTree(slots, folders),
    [slots, folders]
  );
  const selectedMasterNodeId = useMemo((): MasterTreeId | null => {
    if (selectedSlotId) return toSlotMasterNodeId(selectedSlotId);
    const normalizedSelectedFolder = normalizeTreePath(selectedFolder);
    if (!normalizedSelectedFolder) return null;
    return toFolderMasterNodeId(normalizedSelectedFolder);
  }, [selectedFolder, selectedSlotId]);

  const controller = useMasterFolderTree({
    initialNodes: masterNodes,
    initialSelectedNodeId: selectedMasterNodeId,
    profile,
  });
  const { replaceNodes, selectNode, expandNode } = controller;

  useEffect(() => {
    void replaceNodes(masterNodes, 'external_sync');
  }, [masterNodes, replaceNodes]);

  useEffect(() => {
    selectNode(selectedMasterNodeId);
  }, [selectedMasterNodeId, selectNode]);

  const slotById = useMemo(
    () => new Map<string, ImageStudioSlotRecord>(slots.map((slot: ImageStudioSlotRecord) => [slot.id, slot])),
    [slots]
  );

  const onSelectSlot = useCallback((slot: ImageStudioSlotRecord): void => {
    setSelectedSlotId(slot.id);
  }, [setSelectedSlotId]);

  const onMoveSlot = useCallback((slot: ImageStudioSlotRecord, targetFolder: string): void => {
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

  const clearSelection = useCallback((): void => {
    onSelectFolder('');
    setSelectedSlotId(null);
    selectNode(null);
  }, [onSelectFolder, selectNode, setSelectedSlotId]);

  const canDropNodeToTarget = useCallback((
    draggedNodeId: MasterTreeId,
    targetId: MasterTreeId | null,
    nodes: MasterTreeNode[]
  ): boolean => {
    if (targetId) {
      const targetNode = nodes.find((node: MasterTreeNode) => node.id === targetId);
      if (targetNode?.type !== 'folder') return false;
    }

    const targetFolder = resolveFolderTargetPathForMasterNode(nodes, targetId);
    if (targetFolder === null) return false;
    const targetIsRoot = targetFolder.length === 0;

    const slotId = fromSlotMasterNodeId(draggedNodeId);
    if (slotId) {
      return canNestTreeNodeV2({
        profile,
        nodeType: 'file',
        nodeKind: 'card',
        targetType: targetIsRoot ? 'root' : 'folder',
        ...(targetIsRoot ? {} : { targetFolderKind: 'folder' }),
      });
    }

    const folderPath = fromFolderMasterNodeId(draggedNodeId);
    if (folderPath !== null) {
      return (
        canMoveTreePath(folderPath, targetFolder) &&
        canNestTreeNodeV2({
          profile,
          nodeType: 'folder',
          nodeKind: 'folder',
          targetType: targetIsRoot ? 'root' : 'folder',
          ...(targetIsRoot ? {} : { targetFolderKind: 'folder' }),
        })
      );
    }

    return false;
  }, [profile]);

  const treeRef = useRef<HTMLDivElement | null>(null);
  const lastHandledRevealNonceRef = useRef<number>(-1);

  const startFolderRename = useCallback((nodeId: MasterTreeId): void => {
    const folderPath = fromFolderMasterNodeId(nodeId);
    if (!folderPath) return;
    controller.startRename(nodeId);
  }, [controller]);

  const commitFolderRename = useCallback((folderNodeId: MasterTreeId): void => {
    const normalizedSource = fromFolderMasterNodeId(folderNodeId);
    if (!normalizedSource) {
      controller.cancelRename();
      return;
    }

    const sourceLeaf = getTreePathLeaf(normalizedSource);
    const normalizedName = controller.renameDraft.replace(/[\\/]+/g, ' ').trim();
    if (!normalizedName) {
      toast('Folder name cannot be empty.', { variant: 'info' });
      return;
    }
    if (normalizedName === sourceLeaf) {
      controller.cancelRename();
      return;
    }

    const parentPath = normalizedSource.includes('/')
      ? normalizedSource.slice(0, normalizedSource.lastIndexOf('/'))
      : '';
    const nextPath = normalizeTreePath(parentPath ? `${parentPath}/${normalizedName}` : normalizedName);
    if (!canMoveTreePath(normalizedSource, nextPath)) {
      controller.cancelRename();
      return;
    }

    controller.cancelRename();
    void onRenameFolder(normalizedSource, nextPath).catch((error: unknown) => {
      toast(error instanceof Error ? error.message : 'Failed to rename folder.', { variant: 'error' });
    });
  }, [controller, onRenameFolder, toast]);

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

  useEffect(() => {
    if (!revealRequest?.slotId) return;
    if (revealRequest.nonce === lastHandledRevealNonceRef.current) return;

    const targetNodeId = toSlotMasterNodeId(revealRequest.slotId);
    const targetNodeExists = controller.nodes.some((node: MasterTreeNode) => node.id === targetNodeId);
    if (!targetNodeExists) return;

    findMasterNodeAncestorIds(controller.nodes, targetNodeId).forEach((ancestorId: string) => {
      expandNode(ancestorId);
    });
    lastHandledRevealNonceRef.current = revealRequest.nonce;

    if (typeof window === 'undefined') return;
    window.requestAnimationFrame(() => {
      const container = treeRef.current;
      if (!container) return;
      const row = container.querySelector<HTMLElement>(`[data-slot-id="${revealRequest.slotId}"]`);
      row?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    });
  }, [controller.nodes, expandNode, revealRequest]);

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
    >
      <MasterFolderTree
        controller={controller}
        className='space-y-0.5'
        emptyLabel='No folders yet. Create a folder or add cards here.'
        rootDropUi={{
          label: profile.placeholders.rootDropLabel,
          idleClassName: placeholderClasses.rootIdle,
          activeClassName: placeholderClasses.rootActive,
        }}
        resolveDropPosition={(): 'inside' => 'inside'}
        resolveDraggedNodeId={(event: React.DragEvent<HTMLElement>): MasterTreeId | null =>
          resolveExternalDraggedNodeId(event.dataTransfer)
        }
        canDrop={({ draggedNodeId, targetId }, ctlr): boolean => {
          const isInternalNode = ctlr.nodes.some((node: MasterTreeNode) => node.id === draggedNodeId);
          if (isInternalNode) return false;
          return canDropNodeToTarget(draggedNodeId, targetId, ctlr.nodes);
        }}
        onNodeDrop={async ({ draggedNodeId, targetId }): Promise<void> => {
          const targetFolder = resolveFolderTargetPathForMasterNode(controller.nodes, targetId);
          if (targetFolder === null) return;

          const slotId = fromSlotMasterNodeId(draggedNodeId);
          if (slotId) {
            const slot = slotById.get(slotId);
            if (!slot) return;
            onMoveSlot(slot, targetFolder);
            return;
          }

          const folderPath = fromFolderMasterNodeId(draggedNodeId);
          if (folderPath !== null && canMoveTreePath(folderPath, targetFolder)) {
            await onMoveFolder(folderPath, targetFolder);
          }
        }}
        renderNode={({
          node,
          depth,
          hasChildren,
          isExpanded,
          isSelected,
          isRenaming,
          isDropTarget,
          dropPosition,
          select,
          toggleExpand,
          startRename,
        }) => {
          const folderPath = fromFolderMasterNodeId(node.id);
          const slotId = fromSlotMasterNodeId(node.id);
          if (!folderPath && !slotId) return null;

          if (folderPath !== null) {
            const allowMoveFolderToRoot = canNestTreeNodeV2({
              profile,
              nodeType: 'folder',
              nodeKind: 'folder',
              targetType: 'root',
            });
            const showInlineDrop = isDropTarget && dropPosition === 'inside';

            return (
              <TreeContextMenu
                items={[
                  {
                    id: 'select-folder',
                    label: 'Select folder',
                    onSelect: (): void => {
                      onSelectFolder(folderPath);
                      select();
                    },
                  },
                  {
                    id: 'rename-folder',
                    label: 'Rename folder',
                    onSelect: (): void => startFolderRename(node.id),
                  },
                  ...(allowMoveFolderToRoot
                    ? [
                      {
                        id: 'move-folder-root',
                        label: 'Move to root',
                        onSelect: (): void => {
                          void onMoveFolder(folderPath, '');
                        },
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
                    className='relative min-h-8 text-xs'
                  >
                    <div
                      className='flex w-full items-center gap-2'
                      onClick={(event: React.MouseEvent<HTMLDivElement>): void => {
                        event.stopPropagation();
                      }}
                    >
                      <span className='size-3.5 shrink-0' />
                      <TreeCaret
                        isOpen={isExpanded}
                        hasChildren={hasChildren}
                        ariaLabel={isExpanded ? `Collapse ${node.name}` : `Expand ${node.name}`}
                        onToggle={hasChildren ? toggleExpand : undefined}
                        className='text-gray-400'
                        buttonClassName='hover:bg-gray-700'
                        placeholderClassName='w-4'
                      />
                      <FolderOpenIcon className='size-3.5 text-gray-400' />
                      <input
                        autoFocus
                        value={controller.renameDraft}
                        onChange={(event: React.ChangeEvent<HTMLInputElement>): void => {
                          controller.updateRenameDraft(event.target.value);
                        }}
                        onBlur={(): void => commitFolderRename(node.id)}
                        onKeyDown={(event: React.KeyboardEvent<HTMLInputElement>): void => {
                          event.stopPropagation();
                          if (event.key === 'Enter') {
                            event.preventDefault();
                            commitFolderRename(node.id);
                            return;
                          }
                          if (event.key === 'Escape') {
                            event.preventDefault();
                            controller.cancelRename();
                          }
                        }}
                        onPointerDown={(event: React.PointerEvent<HTMLInputElement>): void => {
                          event.stopPropagation();
                        }}
                        onClick={(event: React.MouseEvent<HTMLInputElement>): void => {
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
                    dragOver={showInlineDrop}
                    dragOverClassName='bg-transparent text-gray-100 ring-0'
                    className='relative min-h-8 text-xs'
                  >
                    <button
                      type='button'
                      className='w-full text-left'
                      onClick={(event: React.MouseEvent<HTMLButtonElement>): void => {
                        event.stopPropagation();
                        select();
                        onSelectFolder(folderPath);
                      }}
                      onDoubleClick={(event: React.MouseEvent<HTMLButtonElement>): void => {
                        event.stopPropagation();
                        startRename();
                      }}
                      title={folderPath || 'Project root'}
                      data-folder-path={folderPath}
                    >
                      <span className='flex items-center justify-center opacity-0 group-hover:opacity-100'>
                        <DragHandleIcon className='size-3.5 shrink-0 cursor-grab text-gray-500' />
                      </span>
                      <div
                        className={cn(
                          'pointer-events-none absolute left-2.5 top-2 bottom-2 w-px rounded-full transition-opacity duration-150',
                          placeholderClasses.lineActive,
                          showInlineDrop ? 'opacity-100' : 'opacity-0'
                        )}
                      />
                      <TreeCaret
                        isOpen={isExpanded}
                        hasChildren={hasChildren}
                        ariaLabel={isExpanded ? `Collapse ${node.name}` : `Expand ${node.name}`}
                        onToggle={hasChildren ? toggleExpand : undefined}
                        className='text-gray-400'
                        buttonClassName='hover:bg-gray-700'
                        placeholderClassName='w-4'
                      />
                      {isExpanded ? (
                        <FolderOpenIcon className='size-3.5 text-gray-400' />
                      ) : (
                        <FolderClosedIcon className='size-3.5 text-gray-400' />
                      )}
                      <span className='truncate'>{node.name}</span>
                      <span
                        className={cn(
                          'ml-auto text-[10px] transition-opacity duration-150',
                          showInlineDrop
                            ? `${placeholderClasses.badgeActive} opacity-100`
                            : `${placeholderClasses.badgeIdle} opacity-0`
                        )}
                      >
                        {profile.placeholders.inlineDropLabel}
                      </span>
                    </button>
                  </TreeRow>
                )}
              </TreeContextMenu>
            );
          }

          const card = slotId ? slotById.get(slotId) ?? null : null;
          if (!card || !slotId) return null;

          const roleLabel =
            typeof node.metadata?.['roleLabel'] === 'string'
              ? node.metadata['roleLabel']
              : null;
          const allowMoveCardToRoot = canNestTreeNodeV2({
            profile,
            nodeType: 'file',
            nodeKind: 'card',
            targetType: 'root',
          });

          return (
            <TreeContextMenu
              items={[
                {
                  id: 'select-card',
                  label: 'Select card',
                  onSelect: (): void => {
                    onSelectSlot(card);
                    select();
                  },
                },
                ...(card.folderPath && allowMoveCardToRoot
                  ? [
                    {
                      id: 'move-card-root',
                      label: 'Move to root',
                      onSelect: (): void => onMoveSlot(card, ''),
                    },
                  ]
                  : []),
                {
                  id: 'delete-card',
                  label: 'Delete card',
                  icon: <Trash2 className='size-3.5' />,
                  tone: 'danger',
                  onSelect: (): void => onDeleteSlot(card),
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
                  data-slot-id={card.id}
                  onClick={(event: React.MouseEvent<HTMLButtonElement>): void => {
                    event.stopPropagation();
                    select();
                    onSelectSlot(card);
                  }}
                  onDoubleClick={(event: React.MouseEvent<HTMLButtonElement>): void => {
                    event.stopPropagation();
                    if (hasChildren) toggleExpand();
                  }}
                  title={card.name || card.id}
                >
                  <span className='flex items-center justify-center opacity-0 group-hover:opacity-100'>
                    <DragHandleIcon className='size-3.5 shrink-0 cursor-grab text-gray-500' />
                  </span>
                  <TreeCaret
                    isOpen={isExpanded}
                    hasChildren={hasChildren}
                    ariaLabel={isExpanded ? `Collapse ${node.name}` : `Expand ${node.name}`}
                    onToggle={hasChildren ? toggleExpand : undefined}
                    className='text-gray-400'
                    buttonClassName='hover:bg-gray-700'
                    placeholderClassName='w-4'
                  />
                  <FileIcon className='size-3.5 text-gray-400' />
                  <span className='truncate'>{card.name || node.name}</span>
                  {roleLabel ? (
                    <span className='ml-auto max-w-[90px] truncate text-[10px] uppercase tracking-wide text-gray-500'>
                      {roleLabel}
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
          );
        }}
      />
    </div>
  );
}
