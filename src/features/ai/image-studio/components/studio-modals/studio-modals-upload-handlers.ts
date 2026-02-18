import type { ImageFileSelection } from '@/shared/types/domain/files';

import { setImageStudioSlotImageLocked } from '../../utils/slot-image-lock';

import type { EnvironmentReferenceDraftViewModel } from './slot-inline-edit-tab-types';
import type { ImageStudioSlotRecord } from '../../types';


type Toast = (
  message: string,
  options?: { variant?: 'success' | 'error' | 'warning' | 'info' | 'default' }
) => void;

type UploadAssetRecord = {
  id: string;
  filepath: string;
  filename?: string;
  width?: number | null;
  height?: number | null;
  mimetype?: string | null;
  size?: number | null;
  updatedAt?: string | Date | null;
};

type UploadResult = {
  uploaded?: UploadAssetRecord[];
  failures?: Array<{ error?: string }>;
};

type UploadMutationLike = {
  mutateAsync: (args: { files: File[]; folder: string | null }) => Promise<UploadResult>;
  isPending: boolean;
};

type ImportMutationLike = {
  mutateAsync: (args: { files: ImageFileSelection[]; folder: string | null }) => Promise<UploadResult>;
};

type UpdateSlotMutationLike = {
  mutateAsync: (args: {
    id: string;
    data: Record<string, unknown>;
  }) => Promise<unknown>;
};

type LocalUploadMode = 'create' | 'replace' | 'temporary-object' | 'environment';
type DriveImportMode = LocalUploadMode;

type CreateSlotsFn = (drafts: Array<Record<string, unknown>>) => Promise<ImageStudioSlotRecord[]>;

type CreateUploadHandlersDeps = {
  applyEnvironmentReferenceDraft: (asset: UploadAssetRecord) => void;
  clearTemporaryUpload: (asset: { id: string; filepath: string }) => Promise<void>;
  createSlots: CreateSlotsFn;
  driveImportMode: DriveImportMode;
  driveImportTargetId: string | null;
  importFromDriveMutation: ImportMutationLike;
  localUploadMode: LocalUploadMode;
  localUploadTargetId: string | null;
  selectedFolder: string | null;
  selectedSlot: ImageStudioSlotRecord | null;
  setDriveImportMode: (mode: DriveImportMode) => void;
  setDriveImportOpen: (open: boolean) => void;
  setDriveImportTargetId: (targetId: string | null) => void;
  setLocalUploadMode: (mode: LocalUploadMode) => void;
  setLocalUploadTargetId: (targetId: string | null) => void;
  setSelectedSlotId: (slotId: string | null) => void;
  setTemporaryObjectUpload: (value: {
    id: string;
    filepath: string;
    filename: string;
    width: number | null;
    height: number | null;
  } | null) => void;
  slotHasRenderableImage: (slot: ImageStudioSlotRecord | null | undefined) => boolean;
  slotsCount: number;
  temporaryObjectUpload: {
    id: string;
    filepath: string;
    filename: string;
    width: number | null;
    height: number | null;
  } | null;
  toast: Toast;
  toSlotName: (filename: string, index: number) => string;
  updateSlotMutation: UpdateSlotMutationLike;
  uploadMutation: UploadMutationLike;
};

type UploadHandlers = {
  handleDriveSelection: (files: ImageFileSelection[]) => Promise<void>;
  handleCreateEmptySlot: () => Promise<void>;
  handleLocalUpload: (files: File[]) => Promise<void>;
};

const toAssetDraft = (
  primary: UploadAssetRecord
): {
  id: string;
  filepath: string;
  filename: string;
  width: number | null;
  height: number | null;
} => ({
  id: primary.id,
  filepath: primary.filepath,
  filename: primary.filename ?? '',
  width: typeof primary.width === 'number' ? primary.width : null,
  height: typeof primary.height === 'number' ? primary.height : null,
});

export const createUploadHandlers = (
  deps: CreateUploadHandlersDeps
): UploadHandlers => {
  const handleDriveSelection = async (files: ImageFileSelection[]): Promise<void> => {
    deps.setDriveImportOpen(false);
    if (files.length === 0) return;

    try {
      const previousTemporary = deps.temporaryObjectUpload;
      const result = await deps.importFromDriveMutation.mutateAsync({
        files,
        folder: deps.selectedFolder,
      });
      const imported = result.uploaded ?? [];
      if (imported.length === 0) {
        throw new Error(result.failures?.[0]?.error || 'No files imported.');
      }

      if (deps.driveImportMode === 'temporary-object') {
        const primary = imported[0]!;
        const selectedSlotId = deps.selectedSlot?.id?.trim() ?? '';
        const selectedSlotIsEmpty = Boolean(
          selectedSlotId && !deps.slotHasRenderableImage(deps.selectedSlot)
        );
        if (selectedSlotIsEmpty) {
          await deps.updateSlotMutation.mutateAsync({
            id: selectedSlotId,
            data: {
              imageFileId: primary.id,
              imageUrl: primary.filepath,
              imageBase64: null,
              metadata: setImageStudioSlotImageLocked(deps.selectedSlot?.metadata ?? null, true),
            },
          });
          deps.setTemporaryObjectUpload(null);
          deps.setSelectedSlotId(selectedSlotId);
          if (previousTemporary && previousTemporary.id !== primary.id) {
            await deps.clearTemporaryUpload(previousTemporary);
          }
          deps.toast('Imported image attached to selected card.', { variant: 'success' });
        } else {
          deps.setTemporaryObjectUpload(toAssetDraft(primary));
          if (previousTemporary && previousTemporary.id !== primary.id) {
            await deps.clearTemporaryUpload(previousTemporary);
          }
          deps.toast('Imported to temporary object slot. Load to canvas to create a card.', {
            variant: 'success',
          });
        }
      } else if (deps.driveImportMode === 'environment') {
        const targetId = deps.driveImportTargetId ?? deps.selectedSlot?.id ?? null;
        if (!targetId) {
          throw new Error('No target card selected for environment reference.');
        }
        const primary = imported[0]!;
        deps.setSelectedSlotId(targetId);
        deps.applyEnvironmentReferenceDraft(primary);
        deps.toast('Environment reference selected. Save Card to apply.', { variant: 'success' });
      } else if (deps.driveImportMode === 'replace') {
        const targetId = deps.driveImportTargetId ?? deps.selectedSlot?.id ?? null;
        if (!targetId) {
          throw new Error('No target card selected for replacement.');
        }
        const primary = imported[0]!;
        await deps.updateSlotMutation.mutateAsync({
          id: targetId,
          data: {
            imageFileId: primary.id,
            imageUrl: primary.filepath,
            imageBase64: null,
          },
        });
        deps.setSelectedSlotId(targetId);
        deps.toast('Card image updated.', { variant: 'success' });
      } else {
        const primary = imported[0]!;
        const created = await deps.createSlots([
          {
            name: deps.toSlotName(primary.filename || '', 0),
            ...(deps.selectedFolder ? { folderPath: deps.selectedFolder } : {}),
            imageFileId: primary.id,
            imageUrl: primary.filepath,
            imageBase64: null,
          },
        ]);
        if (created[0]) {
          deps.setSelectedSlotId(created[0].id);
        }
        deps.toast('Created card from import.', { variant: 'success' });
      }
    } catch (error: unknown) {
      deps.toast(error instanceof Error ? error.message : 'Import failed', { variant: 'error' });
    } finally {
      deps.setDriveImportMode('create');
      deps.setDriveImportTargetId(null);
    }
  };

  const handleCreateEmptySlot = async (): Promise<void> => {
    try {
      const created = await deps.createSlots([
        {
          name: `Card ${deps.slotsCount + 1}`,
          ...(deps.selectedFolder ? { folderPath: deps.selectedFolder } : {}),
        },
      ]);
      if (created[0]) deps.setSelectedSlotId(created[0].id);
    } catch (error: unknown) {
      deps.toast(error instanceof Error ? error.message : 'Failed to create card', { variant: 'error' });
    }
  };

  const handleLocalUpload = async (files: File[]): Promise<void> => {
    if (files.length === 0) return;
    try {
      const previousTemporary = deps.temporaryObjectUpload;
      const result = await deps.uploadMutation.mutateAsync({
        files,
        folder: deps.selectedFolder,
      });
      const uploaded = result.uploaded ?? [];
      if (uploaded.length === 0) {
        throw new Error(result.failures?.[0]?.error || 'No files uploaded.');
      }

      if (deps.localUploadMode === 'temporary-object') {
        const primary = uploaded[0]!;
        const selectedSlotId = deps.selectedSlot?.id?.trim() ?? '';
        const selectedSlotIsEmpty = Boolean(
          selectedSlotId && !deps.slotHasRenderableImage(deps.selectedSlot)
        );
        if (selectedSlotIsEmpty) {
          await deps.updateSlotMutation.mutateAsync({
            id: selectedSlotId,
            data: {
              imageFileId: primary.id,
              imageUrl: primary.filepath,
              imageBase64: null,
              metadata: setImageStudioSlotImageLocked(deps.selectedSlot?.metadata ?? null, true),
            },
          });
          deps.setTemporaryObjectUpload(null);
          deps.setSelectedSlotId(selectedSlotId);
          if (previousTemporary && previousTemporary.id !== primary.id) {
            await deps.clearTemporaryUpload(previousTemporary);
          }
          deps.toast('Uploaded image attached to selected card.', { variant: 'success' });
        } else {
          deps.setTemporaryObjectUpload(toAssetDraft(primary));
          if (previousTemporary && previousTemporary.id !== primary.id) {
            await deps.clearTemporaryUpload(previousTemporary);
          }
          deps.toast('Uploaded to temporary object slot. Load to canvas to create a card.', {
            variant: 'success',
          });
        }
      } else if (deps.localUploadMode === 'environment') {
        const targetId = deps.localUploadTargetId ?? deps.selectedSlot?.id ?? null;
        if (!targetId) {
          throw new Error('No target card selected for environment reference.');
        }
        const primary = uploaded[0]!;
        deps.setSelectedSlotId(targetId);
        deps.applyEnvironmentReferenceDraft(primary);
        deps.toast('Environment reference uploaded. Save Card to apply.', { variant: 'success' });
      } else if (deps.localUploadMode === 'replace') {
        const targetId = deps.localUploadTargetId ?? deps.selectedSlot?.id ?? null;
        if (!targetId) {
          throw new Error('No target card selected for replacement.');
        }
        const primary = uploaded[0]!;
        await deps.updateSlotMutation.mutateAsync({
          id: targetId,
          data: {
            imageFileId: primary.id,
            imageUrl: primary.filepath,
            imageBase64: null,
          },
        });
        deps.setSelectedSlotId(targetId);
        deps.toast('Card image uploaded and attached.', { variant: 'success' });
      } else {
        const primary = uploaded[0]!;
        const created = await deps.createSlots([
          {
            name: deps.toSlotName(primary.filename || '', 0),
            ...(deps.selectedFolder ? { folderPath: deps.selectedFolder } : {}),
            imageFileId: primary.id,
            imageUrl: primary.filepath,
            imageBase64: null,
          },
        ]);
        if (created[0]) {
          deps.setSelectedSlotId(created[0].id);
        }
        deps.toast('Uploaded and created card.', { variant: 'success' });
      }
    } catch (error: unknown) {
      deps.toast(error instanceof Error ? error.message : 'Upload failed', { variant: 'error' });
    } finally {
      deps.setLocalUploadTargetId(null);
      deps.setLocalUploadMode('create');
    }
  };

  return {
    handleDriveSelection,
    handleCreateEmptySlot,
    handleLocalUpload,
  };
};

export const applyEnvironmentReferenceAssetToDraft = (
  asset: UploadAssetRecord
): EnvironmentReferenceDraftViewModel => ({
  imageFileId: asset.id,
  imageUrl: asset.filepath,
  filename: asset.filename?.trim() ?? '',
  mimetype: asset.mimetype?.trim() ?? '',
  size: typeof asset.size === 'number' && Number.isFinite(asset.size) ? asset.size : null,
  width: typeof asset.width === 'number' && Number.isFinite(asset.width) ? asset.width : null,
  height: typeof asset.height === 'number' && Number.isFinite(asset.height) ? asset.height : null,
  updatedAt: asset.updatedAt ?? new Date().toISOString(),
});
