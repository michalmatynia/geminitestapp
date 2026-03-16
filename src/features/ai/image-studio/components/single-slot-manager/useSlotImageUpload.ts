'use client';

import { useCallback } from 'react';

import type { StudioAssetImportResult } from '@/features/ai/image-studio/hooks/useImageStudioMutations';
import type {
  ImageStudioSlotDto as ImageStudioSlot,
  ImageStudioAssetDto as ImageStudioUploadedAsset,
  UpdateImageStudioSlotDto,
  CreateImageStudioSlotDto,
} from '@/shared/contracts/image-studio';
import type { IdDataDto } from '@/shared/contracts/base';
import { invalidateImageStudioSlots } from '@/shared/lib/query-invalidation';

import {
  OBJECT_SLOT_INDEX,
  resolveSlotIdCandidates,
  REVEAL_IN_TREE_EVENT,
} from './single-slot-manager-utils';

import type { QueryClient, UseMutationResult } from '@tanstack/react-query';
import { logClientError } from '@/shared/utils/observability/client-error-logger';


interface SlotImageUploadProps {
  projectId: string;
  temporaryObjectUpload: ImageStudioUploadedAsset | null;
  uploadMutation: UseMutationResult<
    StudioAssetImportResult,
    Error,
    { files: File[]; folder: string }
  >;
  getFolderForNewSlot: () => string;
  objectSlot: ImageStudioSlot | null;
  createSlots: (slots: CreateImageStudioSlotDto[]) => Promise<ImageStudioSlot[]>;
  updateSlotMutation: UseMutationResult<
    ImageStudioSlot,
    Error,
    IdDataDto<UpdateImageStudioSlotDto>
  >;
  setTemporaryObjectUpload: (asset: ImageStudioUploadedAsset | null) => void;
  setSelectedSlotId: (id: string | null) => void;
  setObjectImageLinkDraft: (link: string) => void;
  setObjectImageBase64Draft: (base64: string) => void;
  deleteUploadedAsset: (asset: ImageStudioUploadedAsset) => Promise<void>;
  queryClient: QueryClient;
  setUploadError: (error: string | null) => void;
  lastConsumedTemporaryUploadIdRef: React.MutableRefObject<string | null>;
  lastConsumedSlotIdRef: React.MutableRefObject<string | null>;
}

export function useSlotImageUpload({
  projectId,
  temporaryObjectUpload,
  uploadMutation,
  getFolderForNewSlot,
  objectSlot,
  createSlots,
  updateSlotMutation,
  setTemporaryObjectUpload,
  setSelectedSlotId,
  setObjectImageLinkDraft,
  setObjectImageBase64Draft,
  deleteUploadedAsset,
  queryClient,
  setUploadError,
  lastConsumedTemporaryUploadIdRef,
  lastConsumedSlotIdRef,
}: SlotImageUploadProps) {
  const handleSlotImageChange = useCallback(
    async (file: File | null, index: number): Promise<void> => {
      if (!file || index !== OBJECT_SLOT_INDEX) return;
      const normalizedProjectId = projectId.trim();
      if (!normalizedProjectId) {
        setUploadError('Select a project first.');
        return;
      }
      setUploadError(null);
      try {
        const previousTemp = temporaryObjectUpload;
        const result = await uploadMutation.mutateAsync({
          files: [file],
          folder: getFolderForNewSlot(),
        });
        const importedFile = result.importedFiles[0];
        const uploaded: ImageStudioUploadedAsset | null = importedFile
          ? {
            id: importedFile.id,
            filepath: importedFile.filepath,
            filename: importedFile.filename,
            width: importedFile.width ?? null,
            height: importedFile.height ?? null,
          }
          : null;
        if (!uploaded) {
          throw new Error(result.warnings[0] || 'Upload failed');
        }

        lastConsumedTemporaryUploadIdRef.current = null;
        lastConsumedSlotIdRef.current = null;
        const selectedSlotId = objectSlot?.id?.trim() ?? '';
        if (selectedSlotId) {
          const updatePayload: UpdateImageStudioSlotDto = {
            imageFileId: uploaded.id,
            imageUrl: uploaded.filepath,
            imageBase64: null,
          };
          const slotIdCandidates = resolveSlotIdCandidates(selectedSlotId);
          let updatedSlot: ImageStudioSlot | null = null;
          let updateError: unknown = null;
          for (const candidate of slotIdCandidates) {
            try {
              updatedSlot = await updateSlotMutation.mutateAsync({
                id: candidate,
                data: updatePayload,
              });
              if (updatedSlot) break;
            } catch (error) {
              logClientError(error);
              updateError = error;
            }
          }
          if (!updatedSlot) {
            throw updateError instanceof Error
              ? updateError
              : new Error('Failed to attach image to selected card.');
          }

          setTemporaryObjectUpload(null);
          setSelectedSlotId(updatedSlot.id);
          setObjectImageLinkDraft(uploaded.filepath);
          setObjectImageBase64Draft('');
          if (previousTemp && previousTemp.id !== uploaded.id) {
            await deleteUploadedAsset(previousTemp).catch(() => {
              // Best effort cleanup.
            });
          }
          if (typeof window !== 'undefined') {
            window.dispatchEvent(
              new CustomEvent(REVEAL_IN_TREE_EVENT, { detail: { slotId: updatedSlot.id } })
            );
          }
          void invalidateImageStudioSlots(queryClient, normalizedProjectId);
          return;
        }

        const createdSlots = await createSlots([
          {
            name: uploaded.filename?.trim() || `Card ${Date.now()}`,
            ...(getFolderForNewSlot() ? { folderPath: getFolderForNewSlot() } : {}),
            imageFileId: uploaded.id,
            imageUrl: uploaded.filepath,
            imageBase64: null,
          },
        ]);
        const createdSlot = createdSlots[0] ?? null;
        if (!createdSlot?.id) {
          throw new Error('Failed to create card from uploaded image.');
        }

        setTemporaryObjectUpload(null);
        setSelectedSlotId(createdSlot.id);
        setObjectImageLinkDraft(uploaded.filepath);
        setObjectImageBase64Draft('');
        if (previousTemp && previousTemp.id !== uploaded.id) {
          await deleteUploadedAsset(previousTemp).catch(() => {
            // Best effort cleanup.
          });
        }
        if (typeof window !== 'undefined') {
          window.dispatchEvent(
            new CustomEvent(REVEAL_IN_TREE_EVENT, { detail: { slotId: createdSlot.id } })
          );
        }
        void invalidateImageStudioSlots(queryClient, normalizedProjectId);
      } catch (error) {
        logClientError(error);
        setUploadError(error instanceof Error ? error.message : 'Failed to upload image');
      }
    },
    [
      projectId,
      setUploadError,
      temporaryObjectUpload,
      uploadMutation,
      getFolderForNewSlot,
      lastConsumedTemporaryUploadIdRef,
      lastConsumedSlotIdRef,
      objectSlot?.id,
      setTemporaryObjectUpload,
      setSelectedSlotId,
      setObjectImageLinkDraft,
      setObjectImageBase64Draft,
      deleteUploadedAsset,
      updateSlotMutation,
      createSlots,
      queryClient,
    ]
  );

  return {
    handleSlotImageChange,
  };
}
