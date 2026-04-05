import { setImageStudioSlotImageLocked } from '@/features/ai/image-studio/utils/slot-image-lock';
import type { Toast } from '@/shared/contracts/ui/base';
import type { ImageFileSelection } from '@/shared/contracts/files';
import type { ImageStudioAssetDto } from '@/shared/contracts/image-studio/misc';
import type { ImageStudioSlotRecord } from '@/shared/contracts/image-studio';
import type { IdDataDto } from '@/shared/contracts/base';


import type { EnvironmentReferenceDraftViewModel } from './slot-inline-edit-tab-types';
import { logClientError } from '@/shared/utils/observability/client-error-logger';

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

type LocalUploadMode = 'create' | 'replace' | 'temporary-object' | 'environment';
type DriveImportMode = LocalUploadMode;

type UploadResultFailure = { error?: string | null };

type UploadMutationResult = {
  uploaded?: UploadAssetRecord[] | null;
  importedFiles?: UploadAssetRecord[] | null;
  warnings?: string[] | null;
  failures?: UploadResultFailure[] | null;
};

type AsyncMutation<TInput, TResult> = {
  mutateAsync: (input: TInput) => Promise<TResult>;
};

type TemporaryObjectUploadDraft = ImageStudioAssetDto;

type CreateUploadHandlersDeps = {
  applyEnvironmentReferenceDraft: (asset: UploadAssetRecord) => void;
  clearTemporaryUpload: (asset: { id: string; filepath: string }) => Promise<void>;
  createSlots: (slots: Array<Partial<ImageStudioSlotRecord>>) => Promise<ImageStudioSlotRecord[]>;
  driveImportMode: DriveImportMode;
  driveImportTargetId: string | null;
  importFromDriveMutation: AsyncMutation<
    { files: ImageFileSelection[]; folder: string },
    UploadMutationResult
  >;
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
  setTemporaryObjectUpload: (asset: TemporaryObjectUploadDraft | null) => void;
  slotHasRenderableImage: (slot: ImageStudioSlotRecord | null | undefined) => boolean;
  slotsCount: number;
  temporaryObjectUpload: TemporaryObjectUploadDraft | null;
  toast: Toast;
  toSlotName: (filename: string, index: number) => string;
  updateSlotMutation: AsyncMutation<IdDataDto<Partial<ImageStudioSlotRecord>>, unknown>;
  uploadMutation: AsyncMutation<{ files: File[]; folder: string }, UploadMutationResult>;
};

type UploadHandlers = {
  handleDriveSelection: (files: ImageFileSelection[]) => Promise<void>;
  handleCreateEmptySlot: () => Promise<void>;
  handleLocalUpload: (files: File[]) => Promise<void>;
};

const toAssetDraft = (primary: UploadAssetRecord): TemporaryObjectUploadDraft => ({
  id: primary.id,
  filepath: primary.filepath,
  filename: primary.filename ?? '',
  width: typeof primary.width === 'number' ? primary.width : null,
  height: typeof primary.height === 'number' ? primary.height : null,
});

const getUploadedAssets = (result: UploadMutationResult): UploadAssetRecord[] => {
  if (Array.isArray(result.importedFiles) && result.importedFiles.length > 0) {
    return result.importedFiles;
  }
  if (Array.isArray(result.uploaded) && result.uploaded.length > 0) {
    return result.uploaded;
  }
  return [];
};

const getUploadFailureMessage = (result: UploadMutationResult, fallback: string): string => {
  const warning = Array.isArray(result.warnings) ? result.warnings[0] : null;
  const failure =
    Array.isArray(result.failures) && result.failures.length > 0
      ? (result.failures[0]?.error ?? null)
      : null;
  const message = failure ?? warning;
  return typeof message === 'string' && message.trim().length > 0 ? message : fallback;
};

export const createUploadHandlers = (deps: CreateUploadHandlersDeps): UploadHandlers => {
  const handleDriveSelection = async (files: ImageFileSelection[]): Promise<void> => {
    deps.setDriveImportOpen(false);
    if (files.length === 0) return;

    try {
      const previousTemporary = deps.temporaryObjectUpload;
      const result = await deps.importFromDriveMutation.mutateAsync({
        files,
        folder: deps.selectedFolder ?? '',
      });
      const imported = getUploadedAssets(result);
      if (imported.length === 0) {
        throw new Error(getUploadFailureMessage(result, 'No files imported.'));
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
      logClientError(error);
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
      logClientError(error);
      deps.toast(error instanceof Error ? error.message : 'Failed to create card', {
        variant: 'error',
      });
    }
  };

  const handleLocalUpload = async (files: File[]): Promise<void> => {
    if (files.length === 0) return;
    try {
      const previousTemporary = deps.temporaryObjectUpload;
      const result = await deps.uploadMutation.mutateAsync({
        files,
        folder: deps.selectedFolder ?? '',
      });
      const uploaded = getUploadedAssets(result);
      if (uploaded.length === 0) {
        throw new Error(getUploadFailureMessage(result, 'No files uploaded.'));
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
      logClientError(error);
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
