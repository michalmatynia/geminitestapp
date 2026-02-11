'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import ProductImageManager, {
  type ProductImageManagerController,
} from '@/features/products/components/ProductImageManager';
import type { ProductImageSlot } from '@/features/products/types/products-ui';

import { useProjectsState } from '../context/ProjectsContext';
import { useSlotsState, useSlotsActions } from '../context/SlotsContext';

import type { ImageStudioSlotRecord } from '../types';

const ENVIRONMENT_SLOT_INDEX = 0;
const OBJECT_SLOT_INDEX = 1;

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
  const { slots, selectedFolder, selectedSlot, driveImportOpen } = useSlotsState();
  const {
    setSelectedSlotId,
    createSlots,
    updateSlotMutation,
    uploadMutation,
    setDriveImportOpen,
    setDriveImportMode,
    setDriveImportTargetId,
  } = useSlotsActions();

  const [environmentSlotId, setEnvironmentSlotId] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [environmentImageLinkDraft, setEnvironmentImageLinkDraft] = useState<string>('');
  const [environmentImageBase64Draft, setEnvironmentImageBase64Draft] = useState<string>('');
  const [objectImageLinkDraft, setObjectImageLinkDraft] = useState<string>('');
  const [objectImageBase64Draft, setObjectImageBase64Draft] = useState<string>('');

  const environmentLinkSyncTimeoutRef = useRef<number | null>(null);
  const environmentBase64SyncTimeoutRef = useRef<number | null>(null);
  const objectLinkSyncTimeoutRef = useRef<number | null>(null);
  const objectBase64SyncTimeoutRef = useRef<number | null>(null);
  const restoreObjectAfterImportRef = useRef<string | null>(null);
  const wasDriveImportOpenRef = useRef(false);

  const environmentSlot = useMemo(
    () => (environmentSlotId ? slots.find((slot: ImageStudioSlotRecord) => slot.id === environmentSlotId) ?? null : null),
    [environmentSlotId, slots]
  );
  const objectSlot = selectedSlot;

  useEffect(() => {
    return () => {
      if (environmentLinkSyncTimeoutRef.current) {
        window.clearTimeout(environmentLinkSyncTimeoutRef.current);
      }
      if (environmentBase64SyncTimeoutRef.current) {
        window.clearTimeout(environmentBase64SyncTimeoutRef.current);
      }
      if (objectLinkSyncTimeoutRef.current) {
        window.clearTimeout(objectLinkSyncTimeoutRef.current);
      }
      if (objectBase64SyncTimeoutRef.current) {
        window.clearTimeout(objectBase64SyncTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (environmentSlotId && !environmentSlot) {
      setEnvironmentSlotId(null);
    }
  }, [environmentSlot, environmentSlotId]);

  useEffect(() => {
    if (wasDriveImportOpenRef.current && !driveImportOpen && restoreObjectAfterImportRef.current) {
      const objectId = restoreObjectAfterImportRef.current;
      restoreObjectAfterImportRef.current = null;
      setSelectedSlotId(objectId);
    }
    wasDriveImportOpenRef.current = driveImportOpen;
  }, [driveImportOpen, setSelectedSlotId]);

  useEffect(() => {
    setUploadError(null);
    setEnvironmentImageLinkDraft(environmentSlot?.imageUrl ?? '');
    setEnvironmentImageBase64Draft(environmentSlot?.imageBase64 ?? '');
  }, [environmentSlot?.id, environmentSlot?.imageUrl, environmentSlot?.imageBase64]);

  useEffect(() => {
    setUploadError(null);
    setObjectImageLinkDraft(objectSlot?.imageUrl ?? '');
    setObjectImageBase64Draft(objectSlot?.imageBase64 ?? '');
  }, [objectSlot?.id, objectSlot?.imageUrl, objectSlot?.imageBase64]);

  const getSlotForIndex = useCallback(
    (index: number): ImageStudioSlotRecord | null =>
      index === ENVIRONMENT_SLOT_INDEX ? environmentSlot : objectSlot,
    [environmentSlot, objectSlot]
  );

  const getFolderForNewSlot = useCallback(
    (): string => selectedFolder.trim(),
    [selectedFolder]
  );

  const upsertFromUploadedFile = useCallback(
    async (uploaded: { id: string; filepath: string; filename?: string }, index: number): Promise<void> => {
      const targetSlot = getSlotForIndex(index);
      if (targetSlot) {
        await updateSlotMutation.mutateAsync({
          id: targetSlot.id,
          data: {
            imageFileId: uploaded.id,
            imageUrl: uploaded.filepath,
            imageBase64: null,
          },
        });
        if (index === OBJECT_SLOT_INDEX) {
          setSelectedSlotId(targetSlot.id);
        } else {
          setEnvironmentSlotId(targetSlot.id);
        }
        return;
      }

      const created = await createSlots([
        {
          name:
            index === ENVIRONMENT_SLOT_INDEX
              ? 'Environment'
              : uploaded.filename?.trim() || `Slot ${Date.now()}`,
          ...(getFolderForNewSlot() ? { folderPath: getFolderForNewSlot() } : {}),
          imageFileId: uploaded.id,
          imageUrl: uploaded.filepath,
          imageBase64: null,
        },
      ]);
      if (!created[0]) return;

      if (index === ENVIRONMENT_SLOT_INDEX) {
        setEnvironmentSlotId(created[0].id);
      } else {
        setSelectedSlotId(created[0].id);
      }
    },
    [createSlots, getFolderForNewSlot, getSlotForIndex, setSelectedSlotId, updateSlotMutation]
  );

  const handleSlotImageChange = useCallback(
    async (file: File | null, index: number): Promise<void> => {
      if (!file) return;
      if (!projectId) {
        setUploadError('Select a project first.');
        return;
      }
      setUploadError(null);
      try {
        const result = await uploadMutation.mutateAsync({
          files: [file],
          folder: getFolderForNewSlot(),
        });
        const uploaded = result.uploaded?.[0] ?? null;
        if (!uploaded) {
          throw new Error(result.failures?.[0]?.error || 'Upload failed');
        }
        await upsertFromUploadedFile(uploaded, index);
      } catch (error: unknown) {
        setUploadError(error instanceof Error ? error.message : 'Failed to upload image');
      }
    },
    [getFolderForNewSlot, projectId, uploadMutation, upsertFromUploadedFile]
  );

  const setImageLinkAt = useCallback(
    (index: number, value: string): void => {
      if (index === ENVIRONMENT_SLOT_INDEX) {
        setEnvironmentImageLinkDraft(value);
      } else {
        setObjectImageLinkDraft(value);
      }

      const targetSlot = getSlotForIndex(index);
      if (!targetSlot) return;

      const timeoutRef =
        index === ENVIRONMENT_SLOT_INDEX ? environmentLinkSyncTimeoutRef : objectLinkSyncTimeoutRef;
      if (timeoutRef.current) {
        window.clearTimeout(timeoutRef.current);
      }
      timeoutRef.current = window.setTimeout(() => {
        void updateSlotMutation
          .mutateAsync({
            id: targetSlot.id,
            data: {
              imageUrl: value.trim() || null,
            },
          })
          .catch(() => {
            // Preserve draft value even on API failures.
          });
      }, 450);
    },
    [getSlotForIndex, updateSlotMutation]
  );

  const setImageBase64At = useCallback(
    (index: number, value: string): void => {
      if (index === ENVIRONMENT_SLOT_INDEX) {
        setEnvironmentImageBase64Draft(value);
      } else {
        setObjectImageBase64Draft(value);
      }

      const targetSlot = getSlotForIndex(index);
      if (!targetSlot) return;

      const timeoutRef =
        index === ENVIRONMENT_SLOT_INDEX ? environmentBase64SyncTimeoutRef : objectBase64SyncTimeoutRef;
      if (timeoutRef.current) {
        window.clearTimeout(timeoutRef.current);
      }
      timeoutRef.current = window.setTimeout(() => {
        void updateSlotMutation
          .mutateAsync({
            id: targetSlot.id,
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
    [getSlotForIndex, updateSlotMutation]
  );

  const handleSlotDisconnectImage = useCallback(
    async (index: number): Promise<void> => {
      const targetSlot = getSlotForIndex(index);
      if (!targetSlot) return;
      setUploadError(null);
      await updateSlotMutation.mutateAsync({
        id: targetSlot.id,
        data: {
          imageFileId: null,
          imageUrl: null,
          imageBase64: null,
        },
      });
      if (index === ENVIRONMENT_SLOT_INDEX) {
        setEnvironmentImageLinkDraft('');
        setEnvironmentImageBase64Draft('');
      } else {
        setObjectImageLinkDraft('');
        setObjectImageBase64Draft('');
      }
    },
    [getSlotForIndex, updateSlotMutation]
  );

  const openFileManagerForIndex = useCallback(
    (index: number): void => {
      if (!projectId) {
        setUploadError('Select a project first.');
        return;
      }
      setUploadError(null);
      void (async () => {
        let targetSlot = getSlotForIndex(index);
        if (!targetSlot) {
          const created = await createSlots([
            {
              name: index === ENVIRONMENT_SLOT_INDEX ? 'Environment' : `Slot ${Date.now()}`,
              ...(getFolderForNewSlot() ? { folderPath: getFolderForNewSlot() } : {}),
            },
          ]);
          targetSlot = created[0] ?? null;
          if (!targetSlot) return;
          if (index === ENVIRONMENT_SLOT_INDEX) {
            setEnvironmentSlotId(targetSlot.id);
          } else {
            setSelectedSlotId(targetSlot.id);
          }
        }
        if (
          index === ENVIRONMENT_SLOT_INDEX &&
          objectSlot?.id &&
          objectSlot.id !== targetSlot.id
        ) {
          restoreObjectAfterImportRef.current = objectSlot.id;
        } else {
          restoreObjectAfterImportRef.current = null;
        }
        setDriveImportMode('replace');
        setDriveImportTargetId(targetSlot.id);
        setDriveImportOpen(true);
      })().catch(() => {
        // no-op: upload modal will surface import errors
      });
    },
    [
      createSlots,
      getFolderForNewSlot,
      getSlotForIndex,
      objectSlot?.id,
      projectId,
      setUploadError,
      setDriveImportMode,
      setDriveImportOpen,
      setDriveImportTargetId,
      setSelectedSlotId,
    ]
  );

  const setShowFileManager = useCallback(
    (show: boolean): void => {
      if (!show) return;
      openFileManagerForIndex(OBJECT_SLOT_INDEX);
    },
    [openFileManagerForIndex]
  );

  const controller = useMemo<ProductImageManagerController>(
    () => ({
      imageSlots: [toManagedSlot(environmentSlot), toManagedSlot(objectSlot)],
      imageLinks: [environmentImageLinkDraft, objectImageLinkDraft],
      imageBase64s: [environmentImageBase64Draft, objectImageBase64Draft],
      setImageLinkAt,
      setImageBase64At,
      handleSlotImageChange: (file: File | null, index: number): void => {
        void handleSlotImageChange(file, index);
      },
      handleSlotDisconnectImage,
      setShowFileManager,
      setShowFileManagerForSlot: (index: number): void => {
        openFileManagerForIndex(index);
      },
      slotLabels: ['Environment', 'Object'],
      swapImageSlots: (): void => {
        // Fixed order: [environment, object]
      },
      setImagesReordering: (): void => {
        // Reordering disabled in this view
      },
      uploadError,
    }),
    [
      environmentImageBase64Draft,
      environmentImageLinkDraft,
      environmentSlot,
      handleSlotDisconnectImage,
      handleSlotImageChange,
      objectImageBase64Draft,
      objectImageLinkDraft,
      objectSlot,
      openFileManagerForIndex,
      setImageBase64At,
      setImageLinkAt,
      setShowFileManager,
      uploadError,
    ]
  );

  return <ProductImageManager controller={controller} minimalUi />;
}
