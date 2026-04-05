'use client';

import { createStrictContext } from '@/shared/lib/react/createStrictContext';

import type { ImageStudioSlotRecord } from '@/shared/contracts/image-studio';
import type {
  MasterFolderTreeController,
  FolderTreeProfileV2,
} from '@/shared/contracts/master-folder-tree';
import type { IdDataDto } from '@/shared/contracts/base';
import { internalError } from '@/shared/errors/app-error';
import type { MasterTreeId } from '@/shared/utils/master-folder-tree-contract';
import type { FolderTreePlaceholderClassSet } from '@/shared/utils/folder-tree-profiles-v2';

export interface SlotTreeContextValue {
  controller: MasterFolderTreeController;
  slotById: Map<string, ImageStudioSlotRecord>;
  onSelectFolder: (path: string) => void;
  onDeleteFolder: (path: string) => void;
  onMoveFolder: (source: string, target: string) => Promise<void>;
  onRenameFolder: (source: string, target: string) => Promise<void>;
  onDeleteSlot: (slot: ImageStudioSlotRecord) => void;
  onMoveSlot: (slot: ImageStudioSlotRecord, targetFolder: string) => void;
  updateSlot: (input: IdDataDto<{ name: string }>) => Promise<void>;
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
  profile: FolderTreeProfileV2;
  placeholderClasses: FolderTreePlaceholderClassSet;
  icons: {
    FolderClosedIcon: React.ComponentType<{ className?: string }>;
    FolderOpenIcon: React.ComponentType<{ className?: string }>;
    FileIcon: React.ComponentType<{ className?: string }>;
    DragHandleIcon: React.ComponentType<{ className?: string }>;
  };
  deleteSlotMutationPending: boolean;
}

const { Context: SlotTreeContext, useStrictContext: useSlotTreeContext } =
  createStrictContext<SlotTreeContextValue>({
    hookName: 'useSlotTreeContext',
    providerName: 'SlotTree',
    displayName: 'SlotTreeContext',
    errorFactory: internalError,
  });

export { SlotTreeContext, useSlotTreeContext };
