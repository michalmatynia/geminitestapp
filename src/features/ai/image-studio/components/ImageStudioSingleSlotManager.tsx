/* eslint-disable */
// @ts-nocheck
'use client';

import { useQueryClient } from '@tanstack/react-query';
import { forwardRef, useCallback, useEffect, useImperativeHandle, useMemo, useRef, useState } from 'react';

import ProductImageManager from '@/features/products/components/ProductImageManager';
import { ProductImageManagerControllerProvider } from '@/features/products/components/ProductImageManagerControllerContext';
import { api } from '@/shared/lib/api-client';

import { useProjectsState } from '../context/ProjectsContext';
import { useSlotsActions, useSlotsState } from '../context/SlotsContext';
import { isLikelyImageStudioErrorText } from '../utils/image-src';

import { 
  OBJECT_SLOT_INDEX, 
  toManagedSlot, 
  toManagedUploadedAsset, 
  slotHasRenderableImage 
} from './single-slot-manager/single-slot-manager-utils';
import { useConsumeTemporaryUpload } from './single-slot-manager/useConsumeTemporaryUpload';
import { useSlotImageUpload } from './single-slot-manager/useSlotImageUpload';
import { useSlotImageDisconnect } from './single-slot-manager/useSlotImageDisconnect';

export interface ImageStudioSingleSlotManagerHandle {
  consumeTemporaryObjectUpload: (options?: { loadToCanvas?: boolean }) => Promise<boolean>;
}

export const ImageStudioSingleSlotManager = forwardRef<ImageStudioSingleSlotManagerHandle>(
  function ImageStudioSingleSlotManager(_props, ref): React.JSX.Element {
    const queryClient = useQueryClient();
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
    const suppressNextDraftPersistenceOpsRef = useRef<number>(0);

    const clearObjectDraftSyncTimeouts = useCallback((): void => {
      if (objectLinkSyncTimeoutRef.current) {
        window.clearTimeout(objectLinkSyncTimeoutRef.current);
        objectLinkSyncTimeoutRef.current = null;
      }
      if (objectBase64SyncTimeoutRef.current) {
        window.clearTimeout(objectBase64SyncTimeoutRef.current);
        objectBase64SyncTimeoutRef.current = null;
      }
    }, []);

    const objectSlot = selectedSlot;
    const managedObjectSlot = useMemo(
      () => toManagedUploadedAsset(temporaryObjectUpload) ?? toManagedSlot(objectSlot),
      [objectSlot, temporaryObjectUpload]
    );

    useEffect(() => {
      return () => {
        clearObjectDraftSyncTimeouts();
      };
    }, [clearObjectDraftSyncTimeouts]);

    useEffect(() => {
      setTemporaryObjectUpload(null);
    }, [projectId, setTemporaryObjectUpload]);

    useEffect(() => {
      clearObjectDraftSyncTimeouts();
      const slotImageUrl = objectSlot?.imageUrl ?? '';
      setUploadError(null);
      setObjectImageLinkDraft(
        slotImageUrl && isLikelyImageStudioErrorText(slotImageUrl)
          ? ''
          : slotImageUrl
      );
      setObjectImageBase64Draft(objectSlot?.imageBase64 ?? '');
    }, [
      clearObjectDraftSyncTimeouts,
      objectSlot?.id,
      objectSlot?.imageUrl,
      objectSlot?.imageBase64,
    ]);

    const getFolderForNewSlot = useCallback(
      (): string => selectedFolder.trim(),
      [selectedFolder]
    );

    const deleteUploadedAsset = useCallback(
      async (uploaded: any): Promise<void> => {
        if (!projectId) return;
        await api.post(`/api/image-studio/projects/\${encodeURIComponent(projectId)}/assets/delete`, {
          id: uploaded.id,
          filepath: uploaded.filepath,
        });
      },
      [projectId]
    );

    const consume = useConsumeTemporaryUpload({
      temporaryObjectUpload,
      projectId,
      objectSlot,
      queryClient,
      updateSlotMutation,
      setTemporaryObjectUpload,
      setSelectedSlotId,
      setWorkingSlotId,
      setPreviewMode,
      getFolderForNewSlot,
      setUploadError,
    });

    const { consumeTemporaryObjectUpload, lastConsumedTemporaryUploadIdRef, lastConsumedSlotIdRef } = consume;

    useImperativeHandle(ref, () => ({
      consumeTemporaryObjectUpload,
    }), [consumeTemporaryObjectUpload]);

    const upload = useSlotImageUpload({
      projectId,
      temporaryObjectUpload,
      uploadMutation,
      getFolderForNewSlot,
      objectSlot,
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
      createSlots,
    });

    const { handleSlotImageChange } = upload;

    const disconnect = useSlotImageDisconnect({
      lastConsumedTemporaryUploadIdRef,
      lastConsumedSlotIdRef,
      clearObjectDraftSyncTimeouts,
      setUploadError,
      temporaryObjectUpload,
      objectSlot,
      deleteUploadedAsset,
      setTemporaryObjectUpload,
      projectId,
      queryClient,
      setSelectedSlotId,
      setObjectImageLinkDraft,
      setObjectImageBase64Draft,
      suppressNextDraftPersistenceOpsRef,
    });

    const { handleSlotDisconnectImage } = disconnect;

    const setImageLinkAt = useCallback(
      (index: number, value: string): void => {
        if (index !== OBJECT_SLOT_INDEX) return;
        setObjectImageLinkDraft(value);
        if (suppressNextDraftPersistenceOpsRef.current > 0) {
          suppressNextDraftPersistenceOpsRef.current -= 1;
          return;
        }
        if (temporaryObjectUpload || !objectSlot) return;

        clearObjectDraftSyncTimeouts();
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
      [clearObjectDraftSyncTimeouts, objectSlot, temporaryObjectUpload, updateSlotMutation]
    );

    const setImageBase64At = useCallback(
      (index: number, value: string): void => {
        if (index !== OBJECT_SLOT_INDEX) return;
        setObjectImageBase64Draft(value);
        if (suppressNextDraftPersistenceOpsRef.current > 0) {
          suppressNextDraftPersistenceOpsRef.current -= 1;
          return;
        }
        if (temporaryObjectUpload || !objectSlot) return;

        clearObjectDraftSyncTimeouts();
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
      [clearObjectDraftSyncTimeouts, objectSlot, temporaryObjectUpload, updateSlotMutation]
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

    const controller = useMemo(
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
        isSlotImageLocked: (slotIndex: number): boolean =>
          slotIndex === OBJECT_SLOT_INDEX &&
          !temporaryObjectUpload &&
          slotHasRenderableImage(objectSlot),
        slotImageLockedReason: 'Card image is locked and can only be removed by deleting the card.',
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
        objectSlot,
        openFileManagerForObject,
        setImageBase64At,
        setImageLinkAt,
        setShowFileManager,
        temporaryObjectUpload,
        uploadError,
      ]
    );

    return (
      <ProductImageManagerControllerProvider value={controller}>
        <ProductImageManager
          key={`obj:\${objectSlot?.id ?? temporaryObjectUpload?.id ?? 'none'}`}
          minimalUi
          showDragHandle={false}
          minimalSingleSlotAlign='left'
        />
      </ProductImageManagerControllerProvider>
    );
  }
);

ImageStudioSingleSlotManager.displayName = 'ImageStudioSingleSlotManager';
