
import type { StudioAssetImportResult } from '@/features/ai/image-studio/hooks/useImageStudioMutations';
import type { ImageFileSelection } from '@/shared/contracts/files';
import type { ImageStudioAssetDto as ImageStudioUploadedAsset } from '@/shared/contracts/image-studio/misc';
import type { StudioSlotsResponse } from '@/shared/contracts/image-studio/slot';
import type { ImageStudioSlotRecord } from '@/shared/contracts/image-studio';
import type { IdDataDto, LabeledOptionDto } from '@/shared/contracts/base';
import type { CreateMutation, DeleteMutation, UpdateMutation } from '@/shared/contracts/ui/queries';

import type { StudioUploadMode } from '../components/studio-modals/StudioImportContext';
import type { UseQueryResult } from '@tanstack/react-query';
import type { MutableRefObject } from 'react';

export type StudioPreviewMode = 'image' | '3d';

export type StudioFolderMutation = CreateMutation<string, string>;
export type StudioUpdateSlotMutation = UpdateMutation<
  ImageStudioSlotRecord,
  IdDataDto<Partial<ImageStudioSlotRecord>>
>;
export type StudioDeleteSlotMutation = DeleteMutation<void, string>;
export type StudioUploadMutation = CreateMutation<
  StudioAssetImportResult,
  { files: File[]; folder: string }
>;
export type StudioDriveImportMutation = CreateMutation<
  StudioAssetImportResult,
  { files: ImageFileSelection[]; folder: string }
>;

export type SlotsContextType = {
  slots: ImageStudioSlotRecord[];
  isLoading: boolean;
  isFetching: boolean;
  slotsQuery: UseQueryResult<StudioSlotsResponse>;
  error: Error | null;
  selectedSlotId: string | null;
  workingSlotId: string | null;
  previewMode: StudioPreviewMode;
  slotSelectionLocked: boolean;
  captureRef: MutableRefObject<(() => string | null) | null>;
  temporaryObjectUpload: ImageStudioUploadedAsset | null;
  slotCreateOpen: boolean;
  driveImportOpen: boolean;
  driveImportMode: StudioUploadMode;
  driveImportTargetId: string | null;
  slotInlineEditOpen: boolean;
  slotImageUrlDraft: string;
  slotBase64Draft: string;
  slotUpdateBusy: boolean;
  selectedSlot: ImageStudioSlotRecord | null;
  workingSlot: ImageStudioSlotRecord | null;
  compositeSlot: ImageStudioSlotRecord | null;
  compositeAssets: ImageStudioSlotRecord[];
  compositeAssetIds: string[];
  compositeAssetOptions: Array<LabeledOptionDto<string>>;
  virtualFolders: string[];
  selectedFolder: string;
  setSelectedSlotId: (id: string | null) => void;
  setWorkingSlotId: (id: string | null) => void;
  setPreviewMode: (mode: StudioPreviewMode) => void;
  setSlotSelectionLocked: (locked: boolean) => void;
  setTemporaryObjectUpload: (asset: ImageStudioUploadedAsset | null) => void;
  setCompositeAssetIds: (ids: string[]) => void;
  setSelectedFolder: (folder: string) => void;
  setSlotCreateOpen: (open: boolean) => void;
  setDriveImportOpen: (open: boolean) => void;
  setDriveImportMode: (mode: StudioUploadMode) => void;
  setDriveImportTargetId: (id: string | null) => void;
  setSlotInlineEditOpen: (open: boolean) => void;
  setSlotImageUrlDraft: (url: string) => void;
  setSlotBase64Draft: (base64: string) => void;
  setSlotUpdateBusy: (busy: boolean) => void;
  expandFolderPath: (path: string) => string[];
  createFolder: (folder: string) => Promise<string>;
  deleteFolder: (folder: string) => Promise<void>;
  createSlots: (slots: Array<Partial<ImageStudioSlotRecord>>) => Promise<ImageStudioSlotRecord[]>;
  updateSlot: (id: string, data: Partial<ImageStudioSlotRecord>) => Promise<ImageStudioSlotRecord>;
  deleteSlot: (id: string) => Promise<void>;
  moveSlot: (input: { slot: ImageStudioSlotRecord; targetFolder: string }) => Promise<void>;
  handleMoveFolder: (source: string, target: string) => Promise<void>;
  handleRenameFolder: (source: string, nextName: string) => Promise<void>;
  handleDeleteFolder: (source: string) => Promise<void>;
  uploadAssets: (
    files: File[],
    options?: { folder?: string; slotId?: string }
  ) => Promise<ImageStudioUploadedAsset[]>;
  importAssetsFromDrive: (
    selection: ImageFileSelection,
    options?: { folder?: string; slotId?: string }
  ) => Promise<StudioAssetImportResult>;
  createFolderMutation: StudioFolderMutation;
  updateSlotMutation: StudioUpdateSlotMutation;
  deleteSlotMutation: StudioDeleteSlotMutation;
  uploadMutation: StudioUploadMutation;
  importFromDriveMutation: StudioDriveImportMutation;
  isUploading: boolean;
  isImporting: boolean;
  refreshSlots: () => Promise<void>;
};
