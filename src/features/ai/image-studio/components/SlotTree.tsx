'use client';

import { Folder, FolderOpen, GripVertical, LayoutGrid } from 'lucide-react';
import React, { useCallback, useEffect, useMemo, useRef } from 'react';

import {
  buildMasterNodesFromStudioTree,
  findMasterNodeAncestorIds,
  fromFolderMasterNodeId,
  fromSlotMasterNodeId,
  toFolderMasterNodeId,
  toSlotMasterNodeId,
} from '@/features/ai/image-studio/utils/master-folder-tree';
import { createImageStudioMasterTreeAdapter } from '@/features/ai/image-studio/utils/studio-master-tree-adapter';
import {
  canDropImageStudioExternalNode,
  resolveImageStudioExternalDropAction,
} from '@/features/ai/image-studio/utils/studio-master-tree-external-drop';
import {
  FolderTreeViewportV2,
  handleMasterTreeDrop,
  isInternalMasterTreeNode,
  resolveFolderTreeIconSet,
  useMasterFolderTreeShell,
} from '@/shared/lib/foldertree/public';
import type { ImageStudioSlotRecord } from '@/shared/contracts/image-studio';
import type { IdDataDto } from '@/shared/contracts/base';
import { MasterTreeSettingsButton } from '@/shared/ui/navigation-and-layout.public';
import { getFolderTreeInstanceSettingsHref } from '@/shared/utils/folder-tree-profiles-v2';
import { getMotionSafeScrollBehavior } from '@/shared/utils/motion-accessibility';
import {
  type MasterTreeDropPosition,
  type MasterTreeId,
  type MasterTreeNode,
} from '@/shared/utils/master-folder-tree-contract';
import {
  DRAG_KEYS,
  getFirstDragValue,
  resolveVerticalDropPosition,
} from '@/shared/utils/drag-drop';
import { normalizeTreePath } from '@/shared/utils/tree-operations';

import { useSlotsState } from '../context/SlotsContext';
import { useSlotsActions } from '../context/SlotsContext';
import { CardNodeItem } from './slot-tree/CardNodeItem';
import { FolderNodeItem } from './slot-tree/FolderNodeItem';
import { SlotTreeContext, type SlotTreeContextValue } from './slot-tree/SlotTreeContext';
import { useSlotTreeActions } from './slot-tree/useSlotTreeActions';

type SlotTreeRevealRequest = {
  slotId: string;
  nonce: number;
};

type SlotTreeDropInput = Parameters<typeof handleMasterTreeDrop>[0]['input'];

const resolveExternalDraggedNodeId = (dataTransfer: DataTransfer): MasterTreeId | null => {
  const slotId = getFirstDragValue(dataTransfer, [DRAG_KEYS.ASSET_ID], null);
  if (slotId) return toSlotMasterNodeId(slotId);

  const folderPath = getFirstDragValue(dataTransfer, [DRAG_KEYS.FOLDER_PATH], null);
  if (folderPath) return toFolderMasterNodeId(folderPath);

  return null;
};

export function SlotTree({
  revealRequest = null,
}: {
  revealRequest?: SlotTreeRevealRequest | null;
}): React.JSX.Element {
  const { slots, virtualFolders: folders, selectedFolder, selectedSlotId } = useSlotsState();
  const {
    moveSlot: persistMoveSlot,
    handleMoveFolder: persistMoveFolder,
    handleRenameFolder: persistRenameFolder,
    updateSlotMutation,
  } = useSlotsActions();

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
    () =>
      new Map<string, ImageStudioSlotRecord>(
        slots.map((slot: ImageStudioSlotRecord) => [slot.id, slot])
      ),
    [slots]
  );

  const renameSlot = useCallback(
    async (input: IdDataDto<{ name: string }>): Promise<void> => {
      await updateSlotMutation.mutateAsync(input);
    },
    [updateSlotMutation]
  );

  const slotTreeAdapter = useMemo(
    () =>
      createImageStudioMasterTreeAdapter({
        slotById,
        moveSlot: async ({ slot, targetFolder }) => {
          await persistMoveSlot({ slot, targetFolder });
        },
        moveFolder: persistMoveFolder,
        renameFolder: persistRenameFolder,
        renameSlot,
      }),
    [persistMoveFolder, persistMoveSlot, persistRenameFolder, renameSlot, slotById]
  );

  const {
    profile,
    appearance: { placeholderClasses, rootDropUi, resolveIcon },
    controller,
    panel: { collapsed: panelCollapsed, setCollapsed: setPanelCollapsed },
    viewport: { scrollToNodeRef },
  } = useMasterFolderTreeShell({
    instance: 'image_studio',
    nodes: masterNodes,
    selectedNodeId: selectedMasterNodeId,
    adapter: slotTreeAdapter,
  });

  const stickySelectionMode = profile.interactions.selectionBehavior === 'toggle_only';
  const clearSelectionOnAwayClick = profile.interactions.selectionBehavior === 'click_away';

  const actions = useSlotTreeActions({
    controller,
    slotById,
    stickySelectionMode,
  });

  const {
    setSelectedSlotId,
    moveSlot,
    onSelectFolder,
    onDeleteFolder,
    onMoveFolder,
    onRenameFolder,
    onDeleteSlot,
    onMoveSlot,
    updateSlot,
    onSelectCardNode,
    clearSelection,
    startFolderRename,
    commitFolderRename,
    startCardRename,
    commitCardRename,
    ConfirmationModal,
    deleteSlotMutationPending,
  } = actions;

  const icons = useMemo(
    () =>
      resolveFolderTreeIconSet(resolveIcon, {
        FolderClosedIcon: {
          slot: 'folderClosed',
          kind: 'folder',
          fallback: Folder,
          fallbackId: 'Folder',
        },
        FolderOpenIcon: {
          slot: 'folderOpen',
          kind: 'folder',
          fallback: FolderOpen,
          fallbackId: 'FolderOpen',
        },
        FileIcon: {
          slot: 'file',
          kind: 'card',
          fallback: LayoutGrid,
          fallbackId: 'LayoutGrid',
        },
        DragHandleIcon: {
          slot: 'dragHandle',
          fallback: GripVertical,
          fallbackId: 'GripVertical',
        },
      }),
    [resolveIcon]
  );

  const canDropInternalNodeToRoot = useCallback(
    (draggedNodeId: MasterTreeId): boolean => {
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
    },
    [slotById]
  );

  const treeRef = useRef<HTMLDivElement | null>(null);
  const lastHandledRevealNonceRef = useRef<number>(-1);

  useEffect(() => {
    if (!clearSelectionOnAwayClick) return;
    const handleDocumentPointerDown = (event: PointerEvent): void => {
      const container = treeRef.current;
      if (!container) return;
      const target = event.target;
      if (!(target instanceof Node)) return;
      if (target instanceof Element && target.closest('[data-preserve-slot-selection="true"]'))
        return;
      if (container.contains(target)) return;
      clearSelection();
    };

    document.addEventListener('pointerdown', handleDocumentPointerDown);
    return (): void => {
      document.removeEventListener('pointerdown', handleDocumentPointerDown);
    };
  }, [clearSelection, clearSelectionOnAwayClick]);

  useEffect(() => {
    if (!panelCollapsed) return;
    setPanelCollapsed(false);
  }, [panelCollapsed, setPanelCollapsed]);

  useEffect(() => {
    if (!revealRequest?.slotId) return;
    if (revealRequest.nonce === lastHandledRevealNonceRef.current) return;

    const targetNodeId = toSlotMasterNodeId(revealRequest.slotId);
    const targetNodeExists = controller.nodes.some(
      (node: MasterTreeNode) => node.id === targetNodeId
    );
    if (!targetNodeExists) return;
    if (panelCollapsed) {
      setPanelCollapsed(false);
    }

    findMasterNodeAncestorIds(controller.nodes, targetNodeId).forEach((ancestorId: string) => {
      controller.expandNode(ancestorId);
    });
    lastHandledRevealNonceRef.current = revealRequest.nonce;

    if (typeof window === 'undefined') return;
    window.requestAnimationFrame(() => {
      const container = treeRef.current;
      if (!container) return;
      const row = container.querySelector<HTMLButtonElement>(
        `button[data-slot-id="${revealRequest.slotId}"]`
      );
      if (!row) return;
      row.scrollIntoView({
        behavior: getMotionSafeScrollBehavior('smooth'),
        block: 'nearest',
      });
      row.focus({ preventScroll: true });
    });
  }, [controller.nodes, controller.expandNode, panelCollapsed, revealRequest, setPanelCollapsed]);

  const contextValue = useMemo<SlotTreeContextValue>(
    () => ({
      controller,
      slotById,
      onSelectFolder,
      onDeleteFolder,
      onMoveFolder,
      onRenameFolder,
      onDeleteSlot,
      onMoveSlot,
      updateSlot,
      setSelectedSlotId,
      selectedSlotId,
      clearSelection,
      startFolderRename,
      commitFolderRename,
      startCardRename,
      commitCardRename,
      onSelectCardNode,
      stickySelectionMode,
      clearSelectionOnAwayClick,
      profile,
      placeholderClasses,
      icons,
      deleteSlotMutationPending,
    }),
    [
      controller,
      slotById,
      onSelectFolder,
      onDeleteFolder,
      onMoveFolder,
      onRenameFolder,
      onDeleteSlot,
      onMoveSlot,
      updateSlot,
      setSelectedSlotId,
      selectedSlotId,
      clearSelection,
      startFolderRename,
      commitFolderRename,
      startCardRename,
      commitCardRename,
      onSelectCardNode,
      stickySelectionMode,
      clearSelectionOnAwayClick,
      profile,
      placeholderClasses,
      icons,
      deleteSlotMutationPending,
    ]
  );

  return (
    <SlotTreeContext.Provider value={contextValue}>
      <div className='relative h-full w-full min-w-0'>
        <div
          ref={treeRef}
          className='h-full overflow-y-auto overflow-x-hidden rounded border border-border bg-card/40 p-2'
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
          <FolderTreeViewportV2
            controller={controller}
            scrollToNodeRef={scrollToNodeRef}
            className='space-y-0.5'
            emptyLabel='No folders yet. Create a folder or add cards here.'
            rootDropUi={rootDropUi}
            resolveDropPosition={(event, { targetId }, ctlr): MasterTreeDropPosition => {
              const targetNode = ctlr.nodes.find(
                (candidate: MasterTreeNode): boolean => candidate.id === targetId
              );
              if (targetNode?.type === 'folder') return 'inside';
              const targetRect = event.currentTarget.getBoundingClientRect();
              return (
                resolveVerticalDropPosition(event.clientY, targetRect, {
                  thresholdRatio: 0.34,
                }) ?? 'after'
              );
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
              { draggedNodeId, targetId, position, rootDropZone }: SlotTreeDropInput,
              ctlr
            ): Promise<void> => {
              await handleMasterTreeDrop({
                input: {
                  draggedNodeId,
                  targetId,
                  position,
                  rootDropZone,
                },
                controller: ctlr,
                onExternalDrop: async ({ input, controller }): Promise<void> => {
                  const action = resolveImageStudioExternalDropAction({
                    draggedNodeId: input.draggedNodeId,
                    targetId: input.targetId,
                    nodes: controller.nodes,
                  });
                  if (!action) return;

                  if (action.type === 'move_slot') {
                    const slot = slotById.get(action.slotId);
                    if (!slot) return;
                    await moveSlot({ slot, targetFolder: action.targetFolder });
                    return;
                  }

                  await onMoveFolder(action.folderPath, action.targetFolder);
                },
              });
            }}
            renderNode={(props) => {
              if (fromFolderMasterNodeId(props.node.id) !== null) {
                return <FolderNodeItem {...props} />;
              }
              return <CardNodeItem {...props} />;
            }}
          />
        </div>
        <MasterTreeSettingsButton
          instance='image_studio'
          href={getFolderTreeInstanceSettingsHref('image_studio')}
        />
        <ConfirmationModal />
      </div>
    </SlotTreeContext.Provider>
  );
}
