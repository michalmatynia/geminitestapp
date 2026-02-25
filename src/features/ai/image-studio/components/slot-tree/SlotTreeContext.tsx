/* eslint-disable */
// @ts-nocheck
'use client';

import { createContext, useContext } from 'react';
import type { ImageStudioSlotRecord } from '@/shared/contracts/image-studio';
import { type MasterFolderTreeController } from '@/features/foldertree/v2';
import { type MasterTreeId, type MasterTreeNode } from '@/shared/utils';

export interface SlotTreeContextValue {
  controller: MasterFolderTreeController;
  slotById: Map<string, ImageStudioSlotRecord>;
  onSelectFolder: (path: string) => void;
  onDeleteFolder: (path: string) => void;
  onMoveFolder: (source: string, target: string) => Promise<void>;
  onRenameFolder: (source: string, target: string) => Promise<void>;
  onDeleteSlot: (slot: ImageStudioSlotRecord) => void;
  onMoveSlot: (slot: ImageStudioSlotRecord, targetFolder: string) => void;
  updateSlot: (input: { id: string; data: { name: string } }) => Promise<void>;
  setSelectedSlotId: (id: string | null) => void;
  selectedSlotId: string | null;
  clearSelection: () => void;
  startFolderRename: (nodeId: MasterTreeId) => void;
  commitFolderRename: (nodeId: MasterTreeId) => void;
  startCardRename: (nodeId: MasterTreeId) => void;
  commitCardRename: (slot: ImageStudioSlotRecord) => void;
  onSelectCardNode: (slot: ImageStudioSlotRecord, nodeId: MasterTreeId) => void;
  stickySelectionMode: boolean;
  clearSelectionOnAwayClick: boolean;
  profile: any;
  placeholderClasses: any;
  icons: {
    FolderClosedIcon: React.ComponentType<any>;
    FolderOpenIcon: React.ComponentType<any>;
    FileIcon: React.ComponentType<any>;
    DragHandleIcon: React.ComponentType<any>;
  };
  deleteSlotMutationPending: boolean;
}

export const SlotTreeContext = createContext<SlotTreeContextValue | null>(null);

export function useSlotTreeContext(): SlotTreeContextValue {
  const context = useContext(SlotTreeContext);
  if (!context) throw new Error('useSlotTreeContext must be used within SlotTree');
  return context;
}
