'use client';

import { useCallback } from 'react';
import type { ImageStudioSlotRecord } from '@/shared/contracts/image-studio';
import { useConfirm } from '@/shared/hooks/ui/useConfirm';
import { useToast } from '@/shared/ui';
import { 
  type MasterTreeId, 
  type MasterTreeNode, 
  normalizeTreePath, 
  canMoveTreePath, 
  getTreePathLeaf,
} from '@/shared/utils';
import type { MasterFolderTreeController } from '@/shared/contracts/master-folder-tree';
import { 
  fromFolderMasterNodeId, 
  fromSlotMasterNodeId 
} from '../../utils/master-folder-tree';
import { useSlotsActions } from '../../context/SlotsContext';

export function useSlotTreeActions({
  controller,
  slotById,
}: {
  controller: MasterFolderTreeController;
  slotById: Map<string, ImageStudioSlotRecord>;
  stickySelectionMode: boolean;
}) {
  const { toast } = useToast();
  const { confirm, ConfirmationModal } = useConfirm();
  const {
    setSelectedFolder: onSelectFolder,
    setSelectedSlotId,
    updateSlotMutation,
    moveSlot,
    deleteSlotMutation,
    handleMoveFolder: onMoveFolder,
    handleRenameFolder: onRenameFolder,
    handleDeleteFolder: onDeleteFolderPath,
  } = useSlotsActions();

  const updateSlot = useCallback(
    async (input: { id: string; data: { name: string } }): Promise<void> => {
      await updateSlotMutation.mutateAsync(input);
    },
    [updateSlotMutation]
  );

  const onSelectSlot = useCallback((slot: ImageStudioSlotRecord): void => {
    setSelectedSlotId(slot.id);
  }, [setSelectedSlotId]);

  const resolveOwnerCardSlotId = useCallback((nodeId: MasterTreeId): string | null => {
    const nodesById = new Map<MasterTreeId, MasterTreeNode>(
      controller.nodes.map((candidate: MasterTreeNode) => [candidate.id, candidate])
    );
    let cursorId: MasterTreeId | null = nodeId;
    let ownerSlotId: string | null = fromSlotMasterNodeId(nodeId);

    while (cursorId) {
      const cursorNode = nodesById.get(cursorId);
      if (!cursorNode) break;
      const isDerivedNode = Boolean(cursorNode.metadata?.['derivedFromCard']);
      if (!isDerivedNode) break;
      const parentId = cursorNode.parentId;
      if (!parentId) break;
      const parentSlotId = fromSlotMasterNodeId(parentId);
      if (!parentSlotId) break;
      ownerSlotId = parentSlotId;
      cursorId = parentId;
    }

    return ownerSlotId;
  }, [controller.nodes]);

  const onSelectCardNode = useCallback((slot: ImageStudioSlotRecord, nodeId: MasterTreeId): void => {
    const ownerSlotId = resolveOwnerCardSlotId(nodeId);
    const isDerivedGeneration = ownerSlotId !== null && ownerSlotId !== slot.id;
    if (isDerivedGeneration) {
      setSelectedSlotId(ownerSlotId);
      return;
    }
    onSelectSlot(slot);
  }, [onSelectSlot, resolveOwnerCardSlotId, setSelectedSlotId]);

  const onMoveSlot = useCallback((slot: ImageStudioSlotRecord, targetFolder: string): void => {
    void moveSlot({ slot, targetFolder });
  }, [moveSlot]);

  const onDeleteSlot = useCallback((slot: ImageStudioSlotRecord): void => {
    const cardLabel = slot.name?.trim() || slot.id;
    confirm({
      title: 'Delete Card?',
      message: `Are you sure you want to delete card "${cardLabel}"? This action cannot be undone.`,
      confirmText: 'Delete',
      isDangerous: true,
      onConfirm: () => {
        deleteSlotMutation.mutate(slot.id, {
          onError: (error: unknown) => {
            toast(error instanceof Error ? error.message : 'Failed to delete card.', { variant: 'error' });
          },
        });
      },
    });
  }, [confirm, deleteSlotMutation, toast]);

  const onDeleteFolder = useCallback((folderPath: string): void => {
    if (!folderPath) return;
    confirm({
      title: 'Delete Folder?',
      message: `Are you sure you want to delete folder "${folderPath}" and all cards inside it? This action cannot be undone.`,
      confirmText: 'Delete Folder',
      isDangerous: true,
      onConfirm: async () => {
        try {
          await onDeleteFolderPath(folderPath);
        } catch (error: unknown) {
          toast(error instanceof Error ? error.message : 'Failed to delete folder.', { variant: 'error' });
        }
      }
    });
  }, [confirm, onDeleteFolderPath, toast]);

  const clearSelection = useCallback((): void => {
    onSelectFolder('');
    setSelectedSlotId(null);
    controller.selectNode(null);
  }, [onSelectFolder, controller, setSelectedSlotId]);

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

  return {
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
    deleteSlotMutationPending: deleteSlotMutation.isPending,
  };
}
