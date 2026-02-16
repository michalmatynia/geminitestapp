'use client';

import { forwardRef, useCallback, useEffect, useImperativeHandle, useMemo, useRef, useState } from 'react';

import ProductImageManager, {
  type ProductImageManagerController,
} from '@/features/products/components/ProductImageManager';
import { ProductImageManagerControllerProvider } from '@/features/products/components/ProductImageManagerControllerContext';
import type { ProductImageSlot } from '@/features/products/types/products-ui';
import { api } from '@/shared/lib/api-client';

import { useProjectsState } from '../context/ProjectsContext';
import { useSlotsActions, useSlotsState } from '../context/SlotsContext';
import { isLikelyImageStudioErrorText } from '../utils/image-src';

import type { ImageStudioSlotRecord } from '../types';

const OBJECT_SLOT_INDEX = 0;
const TEMP_OBJECT_SLOT_ID = '__image_studio_temp_object__';
const REVEAL_IN_TREE_EVENT = 'image-studio:reveal-in-tree';

type UploadedAsset = {
  id: string;
  filepath: string;
  filename?: string;
};

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

function toManagedUploadedAsset(uploaded: UploadedAsset | null): ProductImageSlot {
  if (!uploaded?.id || !uploaded.filepath) return null;
  return {
    type: 'existing',
    data: {
      id: uploaded.id,
      filepath: uploaded.filepath,
    },
    previewUrl: uploaded.filepath,
    slotId: TEMP_OBJECT_SLOT_ID,
  };
}

export interface ImageStudioSingleSlotManagerHandle {
  consumeTemporaryObjectUpload: (options?: { loadToCanvas?: boolean }) => Promise<boolean>;
}

export const ImageStudioSingleSlotManager = forwardRef<ImageStudioSingleSlotManagerHandle>(
  function ImageStudioSingleSlotManager(_props, ref): React.JSX.Element {
    const { projectId } = useProjectsState();
    const { selectedFolder, selectedSlot, temporaryObjectUpload } = useSlotsState();
    const {
      setSelectedSlotId,
      setWorkingSlotId,
      setPreviewMode,
      createSlots,
      updateSlotMutation,
      uploadMutation,
      setDriveImportOpen,
      setDriveImportMode,
      setDriveImportTargetId,
      setTemporaryObjectUpload,
    } = useSlotsActions();

    const [uploadError, setUploadError] = useState<string | null>(null);
    const [objectImageLinkDraft, setObjectImageLinkDraft] = useState<string>('');
    const [objectImageBase64Draft, setObjectImageBase64Draft] = useState<string>('');

    const objectLinkSyncTimeoutRef = useRef<number | null>(null);
    const objectBase64SyncTimeoutRef = useRef<number | null>(null);

    const objectSlot = selectedSlot;
    const managedObjectSlot = useMemo(
      () => toManagedUploadedAsset(temporaryObjectUpload) ?? toManagedSlot(objectSlot),
      [objectSlot, temporaryObjectUpload]
    );

    useEffect(() => {
      return () => {
        if (objectLinkSyncTimeoutRef.current) {
          window.clearTimeout(objectLinkSyncTimeoutRef.current);
        }
        if (objectBase64SyncTimeoutRef.current) {
          window.clearTimeout(objectBase64SyncTimeoutRef.current);
        }
      };
    }, []);

    useEffect(() => {
      setTemporaryObjectUpload(null);
    }, [projectId, setTemporaryObjectUpload]);

    useEffect(() => {
      const slotImageUrl = objectSlot?.imageUrl ?? '';
      setUploadError(null);
      setObjectImageLinkDraft(
        slotImageUrl && isLikelyImageStudioErrorText(slotImageUrl)
          ? ''
          : slotImageUrl
      );
      setObjectImageBase64Draft(objectSlot?.imageBase64 ?? '');
    }, [objectSlot?.id, objectSlot?.imageUrl, objectSlot?.imageBase64]);

    const getFolderForNewSlot = useCallback(
      (): string => selectedFolder.trim(),
      [selectedFolder]
    );

    const deleteUploadedAsset = useCallback(
      async (uploaded: UploadedAsset): Promise<void> => {
        if (!projectId) return;
        await api.post(`/api/image-studio/projects/${encodeURIComponent(projectId)}/assets/delete`, {
          id: uploaded.id,
          filepath: uploaded.filepath,
        });
      },
      [projectId]
    );

    const consumeTemporaryObjectUpload = useCallback(
      async (options?: { loadToCanvas?: boolean }): Promise<boolean> => {
        if (!temporaryObjectUpload) return false;
        const loadToCanvas = Boolean(options?.loadToCanvas);
        setUploadError(null);
        try {
          const created = await createSlots([
            {
              name: temporaryObjectUpload.filename?.trim() || `Card ${Date.now()}`,
              ...(getFolderForNewSlot() ? { folderPath: getFolderForNewSlot() } : {}),
              imageFileId: temporaryObjectUpload.id,
              imageUrl: temporaryObjectUpload.filepath,
              imageBase64: null,
            },
          ]);
          const nextSlot = created[0] ?? null;
          if (!nextSlot) return false;
          setTemporaryObjectUpload(null);
          setSelectedSlotId(nextSlot.id);
          if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent(REVEAL_IN_TREE_EVENT, { detail: { slotId: nextSlot.id } }));
          }
          if (loadToCanvas) {
            setPreviewMode('image');
            setWorkingSlotId(nextSlot.id);
          }
          return true;
        } catch (error: unknown) {
          setUploadError(error instanceof Error ? error.message : 'Failed to create card from temporary upload');
          return false;
        }
      },
      [
        createSlots,
        getFolderForNewSlot,
        setPreviewMode,
        setSelectedSlotId,
        setTemporaryObjectUpload,
        setWorkingSlotId,
        temporaryObjectUpload,
      ]
    );

    useImperativeHandle(ref, () => ({
      consumeTemporaryObjectUpload,
    }), [consumeTemporaryObjectUpload]);

    const handleSlotImageChange = useCallback(
      async (file: File | null, index: number): Promise<void> => {
        if (!file || index !== OBJECT_SLOT_INDEX) return;
        if (!projectId) {
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
          const uploaded = result.uploaded?.[0] ?? null;
          if (!uploaded) {
            throw new Error(result.failures?.[0]?.error || 'Upload failed');
          }
          setTemporaryObjectUpload({
            id: uploaded.id,
            filepath: uploaded.filepath,
            filename: uploaded.filename,
          });
          setObjectImageLinkDraft(uploaded.filepath);
          setObjectImageBase64Draft('');
          if (previousTemp && previousTemp.id !== uploaded.id) {
            await deleteUploadedAsset(previousTemp).catch(() => {
              // Best effort cleanup of replaced temporary upload.
            });
          }
          setPreviewMode('image');
        } catch (error: unknown) {
          setUploadError(error instanceof Error ? error.message : 'Failed to upload image');
        }
      },
      [
        deleteUploadedAsset,
        getFolderForNewSlot,
        projectId,
        setPreviewMode,
        setTemporaryObjectUpload,
        temporaryObjectUpload,
        uploadMutation,
      ]
    );

    const setImageLinkAt = useCallback(
      (index: number, value: string): void => {
        if (index !== OBJECT_SLOT_INDEX) return;
        setObjectImageLinkDraft(value);
        if (temporaryObjectUpload || !objectSlot) return;

        if (objectLinkSyncTimeoutRef.current) {
          window.clearTimeout(objectLinkSyncTimeoutRef.current);
        }
        objectLinkSyncTimeoutRef.current = window.setTimeout(() => {
          void updateSlotMutation
            .mutateAsync({
              id: objectSlot.id,
              data: {
                imageUrl: value.trim() || null,
              },
            })
            .catch(() => {
              // Preserve draft value even on API failures.
            });
        }, 450);
      },
      [objectSlot, temporaryObjectUpload, updateSlotMutation]
    );

    const setImageBase64At = useCallback(
      (index: number, value: string): void => {
        if (index !== OBJECT_SLOT_INDEX) return;
        setObjectImageBase64Draft(value);
        if (temporaryObjectUpload || !objectSlot) return;

        if (objectBase64SyncTimeoutRef.current) {
          window.clearTimeout(objectBase64SyncTimeoutRef.current);
        }
        objectBase64SyncTimeoutRef.current = window.setTimeout(() => {
          void updateSlotMutation
            .mutateAsync({
              id: objectSlot.id,
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
      [objectSlot, temporaryObjectUpload, updateSlotMutation]
    );

    const handleSlotDisconnectImage = useCallback(
      async (index: number): Promise<void> => {
        if (index !== OBJECT_SLOT_INDEX) return;
        if (temporaryObjectUpload) {
          await deleteUploadedAsset(temporaryObjectUpload).catch(() => {
            // Best effort cleanup.
          });
          setTemporaryObjectUpload(null);
          setObjectImageLinkDraft('');
          setObjectImageBase64Draft('');
          return;
        }
        if (!objectSlot) return;
        setUploadError(null);
        await updateSlotMutation.mutateAsync({
          id: objectSlot.id,
          data: {
            imageFileId: null,
            imageUrl: null,
            imageBase64: null,
          },
        });
        setObjectImageLinkDraft('');
        setObjectImageBase64Draft('');
      },
      [deleteUploadedAsset, objectSlot, setTemporaryObjectUpload, temporaryObjectUpload, updateSlotMutation]
    );

    const openFileManagerForObject = useCallback((): void => {
      if (!projectId) {
        setUploadError('Select a project first.');
        return;
      }
      setUploadError(null);
      setDriveImportMode('temporary-object');
      setDriveImportTargetId(null);
      setDriveImportOpen(true);
    }, [projectId, setDriveImportMode, setDriveImportOpen, setDriveImportTargetId]);

    const setShowFileManager = useCallback(
      (show: boolean): void => {
        if (!show) return;
        openFileManagerForObject();
      },
      [openFileManagerForObject]
    );

    const controller = useMemo<ProductImageManagerController>(
      () => ({
        imageSlots: [managedObjectSlot],
        imageLinks: [objectImageLinkDraft],
        imageBase64s: [objectImageBase64Draft],
        setImageLinkAt,
        setImageBase64At,
        handleSlotImageChange: (file: File | null, index: number): void => {
          void handleSlotImageChange(file, index);
        },
        handleSlotDisconnectImage,
        setShowFileManager,
        setShowFileManagerForSlot: (): void => {
          openFileManagerForObject();
        },
        slotLabels: [''],
        swapImageSlots: (): void => {
          // Single-slot layout: no reordering.
        },
        setImagesReordering: (): void => {
          // Reordering disabled in this view.
        },
        uploadError,
      }),
      [
        handleSlotDisconnectImage,
        handleSlotImageChange,
        managedObjectSlot,
        objectImageBase64Draft,
        objectImageLinkDraft,
        openFileManagerForObject,
        setImageBase64At,
        setImageLinkAt,
        setShowFileManager,
        uploadError,
      ]
    );

    return (
      <ProductImageManagerControllerProvider value={controller}>
        <ProductImageManager
          key={`obj:${objectSlot?.id ?? temporaryObjectUpload?.id ?? 'none'}`}
          minimalUi
          showDragHandle={false}
        />
      </ProductImageManagerControllerProvider>
    );
  }
);

ImageStudioSingleSlotManager.displayName = 'ImageStudioSingleSlotManager';
