'use client';

import { ChevronLeft, ChevronRight, Folder, FolderOpen, GripVertical, LayoutGrid, Trash2 } from 'lucide-react';
import React, { useCallback, useEffect, useMemo, useRef } from 'react';

import {
  applyInternalMasterTreeDrop,
  isInternalMasterTreeNode,
  MasterFolderTree,
  useMasterFolderTreeInstance,
} from '@/features/foldertree';
import { TreeCaret, TreeContextMenu, TreeRow, Button, useToast } from '@/shared/ui';
import {
  canNestTreeNodeV2,
  cn,
  type MasterTreeDropPosition,
  type MasterTreeId,
  type MasterTreeNode,
} from '@/shared/utils';
import {
  DRAG_KEYS,
  getFirstDragValue,
  resolveVerticalDropPosition,
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
  toFolderMasterNodeId,
  toSlotMasterNodeId,
} from '../utils/master-folder-tree';
import { createImageStudioMasterTreeAdapter } from '../utils/studio-master-tree-adapter';
import {
  canDropImageStudioExternalNode,
  resolveImageStudioExternalDropAction,
} from '../utils/studio-master-tree-external-drop';

import type { ImageStudioSlotRecord } from '../types';

type SlotTreeRevealRequest = {
  slotId: string;
  nonce: number;
};

const getMasterInstanceSettingsHref = (): string =>
  '/admin/settings/folder-trees#folder-tree-instance-image_studio';

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
    updateSlotMutation,
    moveSlotMutation,
    deleteSlotMutation,
    handleMoveFolder: onMoveFolder,
    handleRenameFolder: onRenameFolder,
    handleDeleteFolder: onDeleteFolderPath,
  } = useSlotsActions();
  const moveSlot = useCallback(
    async (input: { slot: ImageStudioSlotRecord; targetFolder: string }): Promise<void> => {
      await moveSlotMutation.mutateAsync(input);
    },
    [moveSlotMutation]
  );
  const updateSlot = useCallback(
    async (input: { id: string; data: { name: string } }): Promise<void> => {
      await updateSlotMutation.mutateAsync(input);
    },
    [updateSlotMutation]
  );
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
  const slotById = useMemo(
    () => new Map<string, ImageStudioSlotRecord>(slots.map((slot: ImageStudioSlotRecord) => [slot.id, slot])),
    [slots]
  );
  const slotTreeAdapter = useMemo(
    () =>
      createImageStudioMasterTreeAdapter({
        slotById,
        moveSlot,
        moveFolder: onMoveFolder,
        renameFolder: onRenameFolder,
        renameSlot: updateSlot,
      }),
    [moveSlot, onMoveFolder, onRenameFolder, slotById, updateSlot]
  );
  const {
    profile,
    appearance: { placeholderClasses, rootDropUi, resolveIcon },
    controller,
    panelCollapsed,
    setPanelCollapsed,
  } = useMasterFolderTreeInstance({
    instance: 'image_studio',
    nodes: masterNodes,
    selectedNodeId: selectedMasterNodeId,
    adapter: slotTreeAdapter,
  });
  const { toast } = useToast();
  const { selectNode, expandNode } = controller;
  const stickySelectionMode = profile.interactions.selectionBehavior === 'toggle_only';
  const clearSelectionOnAwayClick = profile.interactions.selectionBehavior === 'click_away';

  const { FolderClosedIcon, FolderOpenIcon, FileIcon, DragHandleIcon } = useMemo(
    () => ({
      FolderClosedIcon: resolveIcon({
        slot: 'folderClosed',
        kind: 'folder',
        fallback: Folder,
        fallbackId: 'Folder',
      }),
      FolderOpenIcon: resolveIcon({
        slot: 'folderOpen',
        kind: 'folder',
        fallback: FolderOpen,
        fallbackId: 'FolderOpen',
      }),
      FileIcon: resolveIcon({
        slot: 'file',
        kind: 'card',
        fallback: LayoutGrid,
        fallbackId: 'LayoutGrid',
      }),
      DragHandleIcon: resolveIcon({
        slot: 'dragHandle',
        fallback: GripVertical,
        fallbackId: 'GripVertical',
      }),
    }),
    [resolveIcon]
  );

  const onSelectSlot = useCallback((slot: ImageStudioSlotRecord): void => {
    setSelectedSlotId(slot.id);
  }, [setSelectedSlotId]);

  const onMoveSlot = useCallback((slot: ImageStudioSlotRecord, targetFolder: string): void => {
    void moveSlot({ slot, targetFolder });
  }, [moveSlot]);

  const onDeleteSlot = useCallback((slot: ImageStudioSlotRecord): void => {
    const cardLabel = slot.name?.trim() || slot.id;
    if (typeof window !== 'undefined') {
      const confirmed = window.confirm(`Delete card "${cardLabel}"?`);
      if (!confirmed) return;
    }
    void deleteSlotMutation.mutateAsync(slot.id).catch((error: unknown) => {
      toast(error instanceof Error ? error.message : 'Failed to delete card.', { variant: 'error' });
    });
  }, [deleteSlotMutation, toast]);

  const onDeleteFolder = useCallback((folderPath: string): void => {
    if (!folderPath) return;
    if (typeof window !== 'undefined') {
      const confirmed = window.confirm(`Delete folder "${folderPath}" and all cards inside it?`);
      if (!confirmed) return;
    }
    void onDeleteFolderPath(folderPath).catch((error: unknown) => {
      toast(error instanceof Error ? error.message : 'Failed to delete folder.', { variant: 'error' });
    });
  }, [onDeleteFolderPath, toast]);

  const clearSelection = useCallback((): void => {
    onSelectFolder('');
    setSelectedSlotId(null);
    selectNode(null);
  }, [onSelectFolder, selectNode, setSelectedSlotId]);

  const canDropInternalNodeToRoot = useCallback((draggedNodeId: MasterTreeId): boolean => {
    const folderPath = fromFolderMasterNodeId(draggedNodeId);
    if (folderPath !== null) {
      const normalizedFolderPath = normalizeTreePath(folderPath);
      return normalizedFolderPath.includes('/');
    }

    const slotId = fromSlotMasterNodeId(draggedNodeId);
    if (!slotId) return false;
    const slot = slotById.get(slotId);
    if (!slot) return false;
    return normalizeTreePath(slot.folderPath ?? '').length > 0;
  }, [slotById]);

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

  const startCardRename = useCallback((nodeId: MasterTreeId): void => {
    const slotId = fromSlotMasterNodeId(nodeId);
    if (!slotId) return;
    const slot = slotById.get(slotId);
    if (!slot) return;
    controller.startRename(nodeId);
  }, [controller, slotById]);

  const commitCardRename = useCallback((slot: ImageStudioSlotRecord): void => {
    const normalizedName = controller.renameDraft.replace(/[\\/]+/g, ' ').trim();
    if (!normalizedName) {
      toast('Card name cannot be empty.', { variant: 'info' });
      return;
    }

    const currentName = slot.name?.trim() || slot.id;
    if (normalizedName === currentName) {
      controller.cancelRename();
      return;
    }

    controller.cancelRename();
    void updateSlot({
      id: slot.id,
      data: { name: normalizedName },
    }).catch((error: unknown) => {
      toast(error instanceof Error ? error.message : 'Failed to rename card.', { variant: 'error' });
    });
  }, [controller, toast, updateSlot]);

  useEffect(() => {
    if (!clearSelectionOnAwayClick) return;
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
  }, [clearSelection, clearSelectionOnAwayClick]);

  useEffect(() => {
    if (!revealRequest?.slotId) return;
    if (revealRequest.nonce === lastHandledRevealNonceRef.current) return;
    if (panelCollapsed) {
      setPanelCollapsed(false);
    }

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
  }, [controller.nodes, expandNode, panelCollapsed, revealRequest, setPanelCollapsed]);

  if (panelCollapsed) {
    return (
      <div className='relative h-full w-full min-w-0 overflow-hidden rounded border border-border bg-card/40 p-2'>
        <div className='flex h-full items-center justify-center'>
          <Button size='xs'
            type='button'
            variant='outline'
            size='sm'
            className='h-8 px-3 text-xs'
            onClick={(): void => setPanelCollapsed(false)}
            title='Show card tree'
            aria-label='Show card tree'
          >
            <ChevronRight className='mr-1 size-4 -scale-x-100' />
            Show Card Tree
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={treeRef}
      className='relative h-full w-full min-w-0 overflow-y-auto overflow-x-hidden rounded border border-border bg-card/40 p-2'
      role='tree'
      tabIndex={0}
      aria-label='Image card folders and cards'
      onKeyDown={(event: React.KeyboardEvent<HTMLDivElement>): void => {
        if (event.key !== 'Escape') return;
        if (!clearSelectionOnAwayClick) return;
        event.stopPropagation();
        clearSelection();
      }}
      onClick={(): void => {
        if (!clearSelectionOnAwayClick) return;
        clearSelection();
      }}
    >
      <div className='absolute right-2 top-2 z-20' data-preserve-slot-selection='true'>
        <Button size='xs'
          type='button'
          variant='outline'
          size='icon'
          className='size-6'
          onClick={(event: React.MouseEvent<HTMLButtonElement>): void => {
            event.preventDefault();
            event.stopPropagation();
            setPanelCollapsed(true);
          }}
          title='Collapse card tree'
          aria-label='Collapse card tree'
          data-preserve-slot-selection='true'
        >
          <ChevronLeft className='size-3.5' />
        </Button>
      </div>
      <MasterFolderTree
        controller={controller}
        className='space-y-0.5'
        emptyLabel='No folders yet. Create a folder or add cards here.'
        rootDropUi={rootDropUi}
        resolveDropPosition={(event, { targetId }, ctlr): MasterTreeDropPosition => {
          const targetNode = ctlr.nodes.find(
            (candidate: MasterTreeNode): boolean => candidate.id === targetId
          );
          if (targetNode?.type === 'folder') return 'inside';
          const targetRect = event.currentTarget.getBoundingClientRect();
          return resolveVerticalDropPosition(event.clientY, targetRect, {
            thresholdRatio: 0.34,
          }) ?? 'after';
        }}
        resolveDraggedNodeId={(event: React.DragEvent<HTMLElement>): MasterTreeId | null =>
          resolveExternalDraggedNodeId(event.dataTransfer)
        }
        canDrop={({ draggedNodeId, targetId, defaultAllowed }, ctlr): boolean => {
          if (defaultAllowed) return true;
          const isInternalNode = isInternalMasterTreeNode(ctlr.nodes, draggedNodeId);
          if (isInternalNode && targetId === null) {
            return canDropInternalNodeToRoot(draggedNodeId);
          }
          if (isInternalNode && targetId !== null) {
            const targetNode = ctlr.nodes.find(
              (candidate: MasterTreeNode): boolean => candidate.id === targetId
            );
            return targetNode?.type === 'folder';
          }
          return canDropImageStudioExternalNode({
            draggedNodeId,
            targetId,
            nodes: ctlr.nodes,
            profile,
          });
        }}
        onNodeDrop={async (
          { draggedNodeId, targetId, position, rootDropZone },
          ctlr
        ): Promise<void> => {
          const isInternalNode = isInternalMasterTreeNode(ctlr.nodes, draggedNodeId);
          if (isInternalNode) {
            await applyInternalMasterTreeDrop({
              controller: ctlr,
              draggedNodeId,
              targetId,
              position,
              rootDropZone,
            });
            return;
          }

          const action = resolveImageStudioExternalDropAction({
            draggedNodeId,
            targetId,
            nodes: ctlr.nodes,
          });
          if (!action) return;

          if (action.type === 'move_slot') {
            const slot = slotById.get(action.slotId);
            if (!slot) return;
            await moveSlot({ slot, targetFolder: action.targetFolder });
            return;
          }

          await onMoveFolder(action.folderPath, action.targetFolder);
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
                  {
                    id: 'delete-folder',
                    label: 'Delete folder',
                    icon: <Trash2 className='size-3.5' />,
                    tone: 'danger',
                    onSelect: (): void => onDeleteFolder(folderPath),
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
                    selectedClassName='bg-muted text-white hover:bg-muted'
                    className='relative h-8 text-xs'
                  >
                    <div
                      className='flex h-full w-full min-w-0 items-center gap-1'
                      onClick={(event: React.MouseEvent<HTMLDivElement>): void => {
                        event.stopPropagation();
                      }}
                    >
                      <span className='inline-flex h-3.5 w-3.5 shrink-0 items-center justify-center' />
                      <TreeCaret
                        isOpen={isExpanded}
                        hasChildren={hasChildren}
                        ariaLabel={isExpanded ? `Collapse ${node.name}` : `Expand ${node.name}`}
                        onToggle={hasChildren ? toggleExpand : undefined}
                        className='w-3 text-gray-400'
                        buttonClassName='hover:bg-gray-700'
                        placeholderClassName='w-3'
                      />
                      <span className='inline-flex h-3.5 w-3.5 shrink-0 items-center justify-center'>
                        <FolderOpenIcon className='size-3.5 text-gray-400' />
                      </span>
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
                    selectedClassName='bg-muted text-white hover:bg-muted'
                    dragOver={showInlineDrop}
                    dragOverClassName='bg-transparent text-gray-100 ring-0'
                    className='relative h-8 text-xs'
                  >
                    <button
                      type='button'
                      className='flex h-full w-full min-w-0 items-center gap-1 text-left'
                      onClick={(event: React.MouseEvent<HTMLButtonElement>): void => {
                        event.stopPropagation();
                        if (stickySelectionMode && isSelected) {
                          clearSelection();
                          return;
                        }
                        select();
                        onSelectFolder(folderPath);
                      }}
                      title={folderPath || 'Project root'}
                      data-folder-path={folderPath}
                    >
                      <span className='inline-flex h-3.5 w-3.5 shrink-0 items-center justify-center opacity-0 transition-opacity group-hover:opacity-100'>
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
                        className='w-3 text-gray-400'
                        buttonClassName='hover:bg-gray-700'
                        placeholderClassName='w-3'
                      />
                      {isExpanded ? (
                        <span className='inline-flex h-3.5 w-3.5 shrink-0 items-center justify-center'>
                          <FolderOpenIcon className='size-3.5 text-gray-400' />
                        </span>
                      ) : (
                        <span className='inline-flex h-3.5 w-3.5 shrink-0 items-center justify-center'>
                          <FolderClosedIcon className='size-3.5 text-gray-400' />
                        </span>
                      )}
                      <span
                        className='min-w-0 flex-1 truncate cursor-text'
                        onDoubleClick={(event: React.MouseEvent<HTMLSpanElement>): void => {
                          event.preventDefault();
                          event.stopPropagation();
                          startRename();
                        }}
                        title='Double-click name to rename'
                      >
                        {node.name}
                      </span>
                      <span className='ml-1 flex shrink-0 items-center gap-1'>
                        <span
                          className={cn(
                            'text-[10px] transition-opacity duration-150',
                            showInlineDrop
                              ? `${placeholderClasses.badgeActive} opacity-100`
                              : `${placeholderClasses.badgeIdle} opacity-0`
                          )}
                        >
                          {profile.placeholders.inlineDropLabel}
                        </span>
                        <span
                          className='inline-flex items-center justify-center rounded p-0.5 text-gray-400 opacity-0 transition hover:bg-red-500/20 hover:text-red-300 group-hover:opacity-100'
                          onMouseDown={(event: React.MouseEvent<HTMLSpanElement>): void => {
                            event.stopPropagation();
                          }}
                          onClick={(event: React.MouseEvent<HTMLSpanElement>): void => {
                            event.stopPropagation();
                            onDeleteFolder(folderPath);
                          }}
                          title='Delete folder'
                          aria-hidden='true'
                        >
                          <Trash2 className='size-3' />
                        </span>
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
                {
                  id: 'rename-card',
                  label: 'Rename card',
                  onSelect: (): void => startCardRename(node.id),
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
              {isRenaming ? (
                <TreeRow
                  depth={depth}
                  baseIndent={8}
                  indent={12}
                  tone='subtle'
                  selected={isSelected}
                  className='h-8 text-xs'
                >
                  <div
                    className='flex h-full w-full min-w-0 items-center gap-1'
                    onClick={(event: React.MouseEvent<HTMLDivElement>): void => {
                      event.stopPropagation();
                    }}
                  >
                    <span className='inline-flex h-3.5 w-3.5 shrink-0 items-center justify-center' />
                    <TreeCaret
                      isOpen={isExpanded}
                      hasChildren={hasChildren}
                      ariaLabel={isExpanded ? `Collapse ${node.name}` : `Expand ${node.name}`}
                      onToggle={hasChildren ? toggleExpand : undefined}
                      className='w-3 text-gray-400'
                      buttonClassName='hover:bg-gray-700'
                      placeholderClassName='w-3'
                    />
                    <span className='inline-flex h-3.5 w-3.5 shrink-0 items-center justify-center'>
                      <FileIcon className='size-3.5 text-gray-400' />
                    </span>
                    <input
                      autoFocus
                      value={controller.renameDraft}
                      onChange={(event: React.ChangeEvent<HTMLInputElement>): void => {
                        controller.updateRenameDraft(event.target.value);
                      }}
                      onBlur={(): void => commitCardRename(card)}
                      onKeyDown={(event: React.KeyboardEvent<HTMLInputElement>): void => {
                        event.stopPropagation();
                        if (event.key === 'Enter') {
                          event.preventDefault();
                          commitCardRename(card);
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
                      aria-label='Rename card'
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
                  selectedClassName='bg-muted text-white hover:bg-muted'
                  className='relative h-8 text-xs'
                >
                  <button
                    type='button'
                    className='flex h-full w-full min-w-0 items-center gap-1 text-left'
                    data-slot-id={card.id}
                    onClick={(event: React.MouseEvent<HTMLButtonElement>): void => {
                      event.stopPropagation();
                      if (stickySelectionMode && isSelected) {
                        clearSelection();
                        return;
                      }
                      select();
                      onSelectSlot(card);
                    }}
                    onDoubleClick={(event: React.MouseEvent<HTMLButtonElement>): void => {
                      event.stopPropagation();
                      startCardRename(node.id);
                    }}
                    title={card.name || card.id}
                  >
                    <span className='inline-flex h-3.5 w-3.5 shrink-0 items-center justify-center opacity-0 transition-opacity group-hover:opacity-100'>
                      <DragHandleIcon className='size-3.5 shrink-0 cursor-grab text-gray-500' />
                    </span>
                    <TreeCaret
                      isOpen={isExpanded}
                      hasChildren={hasChildren}
                      ariaLabel={isExpanded ? `Collapse ${node.name}` : `Expand ${node.name}`}
                      onToggle={hasChildren ? toggleExpand : undefined}
                      className='w-3 text-gray-400'
                      buttonClassName='hover:bg-gray-700'
                      placeholderClassName='w-3'
                    />
                    <span className='inline-flex h-3.5 w-3.5 shrink-0 items-center justify-center'>
                      <FileIcon className='size-3.5 text-gray-400' />
                    </span>
                    <span className='min-w-0 flex-1 truncate'>{card.name || node.name}</span>
                    <span className='ml-1 flex shrink-0 items-center gap-1'>
                      {roleLabel ? (
                        <span className='max-w-[90px] truncate text-[10px] uppercase tracking-wide text-gray-500'>
                          {roleLabel}
                        </span>
                      ) : null}
                      <span
                        className={cn(
                          'size-1 rounded-full bg-blue-300/55 transition-opacity duration-150',
                          isSelected ? 'opacity-100' : 'opacity-0'
                        )}
                      />
                      <span
                        className={cn(
                          'inline-flex items-center justify-center rounded p-0.5 text-gray-400 transition',
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
                    </span>
                  </button>
                </TreeRow>
              )}
            </TreeContextMenu>
          );
        }}
      />
      <button
        type='button'
        className='absolute bottom-2 right-2 z-20 inline-flex size-6 items-center justify-center rounded-full border border-border bg-muted/80 text-[11px] font-semibold lowercase text-gray-300 shadow-sm transition hover:bg-muted hover:text-white'
        title='Open master tree instance settings'
        aria-label='Open master tree instance settings'
        onMouseDown={(event: React.MouseEvent<HTMLButtonElement>): void => {
          event.stopPropagation();
        }}
        onClick={(event: React.MouseEvent<HTMLButtonElement>): void => {
          event.preventDefault();
          event.stopPropagation();
          if (typeof window === 'undefined') return;
          window.location.assign(getMasterInstanceSettingsHref());
        }}
      >
        m
      </button>
    </div>
  );
}
