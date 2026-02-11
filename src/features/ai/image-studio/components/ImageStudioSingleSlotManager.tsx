'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import ProductImageManager, {
  type ProductImageManagerController,
} from '@/features/products/components/ProductImageManager';
import type { ProductImageSlot } from '@/features/products/types/products-ui';

import { useProjectsState } from '../context/ProjectsContext';
import { useSlotsState, useSlotsActions } from '../context/SlotsContext';

import type { ImageStudioSlotRecord } from '../types';

function toManagedSlot(slot: ImageStudioSlotRecord | null): ProductImageSlot {
  if (!slot?.imageFileId) return null;
  const previewPath = slot.imageFile?.filepath || slot.imageUrl || null;
  if (!previewPath) return null;
  return {
    type: 'existing',
    data: {
      id: slot.imageFileId,
      filepath: previewPath,
    },
    previewUrl: previewPath,
    slotId: slot.id,
  };
}

export function ImageStudioSingleSlotManager(): React.JSX.Element {
  const { projectId } = useProjectsState();
  const { selectedFolder, selectedSlot } = useSlotsState();
  const {
    setSelectedSlotId,
    createSlots,
    updateSlotMutation,
    uploadMutation,
    setDriveImportOpen,
    setDriveImportMode,
    setDriveImportTargetId,
  } = useSlotsActions();

  const [uploadError, setUploadError] = useState<string | null>(null);
  const [imageLinkDraft, setImageLinkDraft] = useState<string>('');
  const [imageBase64Draft, setImageBase64Draft] = useState<string>('');

  const linkSyncTimeoutRef = useRef<number | null>(null);
  const base64SyncTimeoutRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (linkSyncTimeoutRef.current) {
        window.clearTimeout(linkSyncTimeoutRef.current);
      }
      if (base64SyncTimeoutRef.current) {
        window.clearTimeout(base64SyncTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    setUploadError(null);
    setImageLinkDraft(selectedSlot?.imageUrl ?? '');
    setImageBase64Draft(selectedSlot?.imageBase64 ?? '');
  }, [selectedSlot?.id, selectedSlot?.imageUrl, selectedSlot?.imageBase64]);

  const upsertFromUploadedFile = useCallback(
    async (uploaded: { id: string; filepath: string; filename?: string }): Promise<void> => {
      if (selectedSlot) {
        await updateSlotMutation.mutateAsync({
          id: selectedSlot.id,
          data: {
            imageFileId: uploaded.id,
            imageUrl: uploaded.filepath,
            imageBase64: null,
          },
        });
        setSelectedSlotId(selectedSlot.id);
        return;
      }

      const created = await createSlots([
        {
          name: uploaded.filename?.trim() || `Slot ${Date.now()}`,
          ...(selectedFolder ? { folderPath: selectedFolder } : {}),
          imageFileId: uploaded.id,
          imageUrl: uploaded.filepath,
          imageBase64: null,
        },
      ]);
      if (created[0]) {
        setSelectedSlotId(created[0].id);
      }
    },
    [createSlots, selectedFolder, selectedSlot, setSelectedSlotId, updateSlotMutation],
  );

  const handleSlotImageChange = useCallback(
    async (file: File | null, _index: number): Promise<void> => {
      if (!file) return;
      if (!projectId) {
        setUploadError('Select a project first.');
        return;
      }
      setUploadError(null);
      try {
        const result = await uploadMutation.mutateAsync({
          files: [file],
          folder: selectedFolder,
        });
        const uploaded = result.uploaded?.[0] ?? null;
        if (!uploaded) {
          throw new Error(result.failures?.[0]?.error || 'Upload failed');
        }
        await upsertFromUploadedFile(uploaded);
      } catch (error: unknown) {
        setUploadError(error instanceof Error ? error.message : 'Failed to upload image');
      }
    },
    [projectId, selectedFolder, uploadMutation, upsertFromUploadedFile],
  );

  const setImageLinkAt = useCallback(
    (_index: number, value: string): void => {
      setImageLinkDraft(value);
      if (!selectedSlot) return;
      if (linkSyncTimeoutRef.current) {
        window.clearTimeout(linkSyncTimeoutRef.current);
      }
      linkSyncTimeoutRef.current = window.setTimeout(() => {
        void updateSlotMutation
          .mutateAsync({
            id: selectedSlot.id,
            data: {
              imageUrl: value.trim() || null,
            },
          })
          .catch(() => {
            // Preserve draft value even on API failures.
          });
      }, 450);
    },
    [selectedSlot, updateSlotMutation],
  );

  const setImageBase64At = useCallback(
    (_index: number, value: string): void => {
      setImageBase64Draft(value);
      if (!selectedSlot) return;
      if (base64SyncTimeoutRef.current) {
        window.clearTimeout(base64SyncTimeoutRef.current);
      }
      base64SyncTimeoutRef.current = window.setTimeout(() => {
        void updateSlotMutation
          .mutateAsync({
            id: selectedSlot.id,
            data: {
              imageBase64: value.trim() || null,
              ...(value.trim() ? { imageFileId: null } : {}),
            },
          })
          .catch(() => {
            // Preserve draft value even on API failures.
          });
      }, 450);
    },
    [selectedSlot, updateSlotMutation],
  );

  const handleSlotDisconnectImage = useCallback(
    async (_index: number): Promise<void> => {
      if (!selectedSlot) return;
      setUploadError(null);
      await updateSlotMutation.mutateAsync({
        id: selectedSlot.id,
        data: {
          imageFileId: null,
          imageUrl: null,
          imageBase64: null,
        },
      });
      setImageLinkDraft('');
      setImageBase64Draft('');
    },
    [selectedSlot, updateSlotMutation],
  );

  const setShowFileManager = useCallback(
    (show: boolean): void => {
      if (!show || !projectId) return;
      setDriveImportMode(selectedSlot ? 'replace' : 'create');
      setDriveImportTargetId(selectedSlot?.id ?? null);
      setDriveImportOpen(true);
    },
    [projectId, selectedSlot, setDriveImportMode, setDriveImportOpen, setDriveImportTargetId],
  );

  const controller = useMemo<ProductImageManagerController>(
    () => ({
      imageSlots: [toManagedSlot(selectedSlot)],
      imageLinks: [imageLinkDraft],
      imageBase64s: [imageBase64Draft],
      setImageLinkAt,
      setImageBase64At,
      handleSlotImageChange: (file: File | null, index: number): void => {
        void handleSlotImageChange(file, index);
      },
      handleSlotDisconnectImage,
      setShowFileManager,
      swapImageSlots: (): void => {
        // single-slot mode
      },
      setImagesReordering: (): void => {
        // single-slot mode
      },
      uploadError,
    }),
    [
      handleSlotDisconnectImage,
      handleSlotImageChange,
      imageBase64Draft,
      imageLinkDraft,
      selectedSlot,
      setImageBase64At,
      setImageLinkAt,
      setShowFileManager,
      uploadError,
    ],
  );

  return <ProductImageManager controller={controller} minimalUi />;
}
