'use client';

import { useQueryClient } from '@tanstack/react-query';
import { forwardRef, useCallback, useEffect, useImperativeHandle, useMemo, useRef, useState } from 'react';

import ProductImageManager, {
  type ProductImageManagerController,
} from '@/features/products/components/ProductImageManager';
import { ProductImageManagerControllerProvider } from '@/features/products/components/ProductImageManagerControllerContext';
import type { ProductImageSlot } from '@/features/products/types/products-ui';
import { api } from '@/shared/lib/api-client';
import { invalidateImageStudioSlots } from '@/shared/lib/query-invalidation';

import { useProjectsState } from '../context/ProjectsContext';
import { useSlotsActions, useSlotsState } from '../context/SlotsContext';
import { studioKeys } from '../hooks/useImageStudioQueries';
import { isLikelyImageStudioErrorText } from '../utils/image-src';

import type { ImageStudioSlotRecord, StudioSlotsResponse } from '../types';

const OBJECT_SLOT_INDEX = 0;
const TEMP_OBJECT_SLOT_ID = '__image_studio_temp_object__';
const REVEAL_IN_TREE_EVENT = 'image-studio:reveal-in-tree';

type UploadedAsset = {
  id: string;
  filepath: string;
  filename?: string;
  width?: number | null;
  height?: number | null;
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

const resolveSlotIdCandidates = (rawId: string): string[] => {
  const normalized = rawId.trim();
  if (!normalized) return [];

  const unprefixed = normalized.startsWith('slot:')
    ? normalized.slice('slot:'.length).trim()
    : normalized.startsWith('card:')
      ? normalized.slice('card:'.length).trim()
      : normalized;

  const candidates = new Set<string>([normalized]);
  if (unprefixed) {
    candidates.add(unprefixed);
    candidates.add(`slot:${unprefixed}`);
    candidates.add(`card:${unprefixed}`);
  }
  return Array.from(candidates);
};

export interface ImageStudioSingleSlotManagerHandle {
  consumeTemporaryObjectUpload: (options?: { loadToCanvas?: boolean }) => Promise<boolean>;
}

export const ImageStudioSingleSlotManager = forwardRef<ImageStudioSingleSlotManagerHandle>(
  function ImageStudioSingleSlotManager(_props, ref): React.JSX.Element {
    const queryClient = useQueryClient();
    const { projectId } = useProjectsState();
    const { slots, selectedFolder, selectedSlot, temporaryObjectUpload } = useSlotsState();
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
    const consumeTemporaryUploadInFlightRef = useRef<Promise<boolean> | null>(null);
    const consumeTemporaryUploadInFlightIdRef = useRef<string | null>(null);
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
        const temporaryUploadSnapshot = temporaryObjectUpload;
        const currentTemporaryUploadId = temporaryObjectUpload.id.trim();
        if (!currentTemporaryUploadId) return false;
        const slotHasRenderableImage = (slot: ImageStudioSlotRecord | null | undefined): boolean => {
          if (!slot) return false;
          const imageFilePath = slot.imageFile?.filepath?.trim() ?? '';
          const imageUrl = slot.imageUrl?.trim() ?? '';
          const imageBase64 = slot.imageBase64?.trim() ?? '';
          return Boolean(imageFilePath || imageUrl || imageBase64);
        };

        if (
          consumeTemporaryUploadInFlightRef.current &&
          consumeTemporaryUploadInFlightIdRef.current === currentTemporaryUploadId
        ) {
          return consumeTemporaryUploadInFlightRef.current;
        }

        const normalizedTemporaryFilepath = temporaryUploadSnapshot.filepath.trim();
        const existingMatchingSlot = [...slots]
          .filter((slot: ImageStudioSlotRecord): boolean => {
            const slotImageFileId = slot.imageFileId?.trim() ?? '';
            if (slotImageFileId && slotImageFileId === currentTemporaryUploadId) return true;

            if (!normalizedTemporaryFilepath) return false;
            const slotImagePath = (slot.imageFile?.filepath ?? slot.imageUrl ?? '').trim();
            return slotImagePath === normalizedTemporaryFilepath;
          })
          .sort((left: ImageStudioSlotRecord, right: ImageStudioSlotRecord) => {
            const leftTs = Date.parse(left.updatedAt || left.createdAt || '');
            const rightTs = Date.parse(right.updatedAt || right.createdAt || '');
            if (Number.isFinite(leftTs) && Number.isFinite(rightTs) && leftTs !== rightTs) {
              return rightTs - leftTs;
            }
            return (right.createdAt ?? '').localeCompare(left.createdAt ?? '');
          })[0] ?? null;
        if (existingMatchingSlot?.id) {
          let existingTargetSlot = existingMatchingSlot;
          if (!slotHasRenderableImage(existingMatchingSlot)) {
            existingTargetSlot = await updateSlotMutation.mutateAsync({
              id: existingMatchingSlot.id,
              data: {
                imageFileId: temporaryUploadSnapshot.id,
                imageUrl: temporaryUploadSnapshot.filepath,
                imageBase64: null,
              },
            });
          }
          const targetSlotId = existingTargetSlot.id;
          setTemporaryObjectUpload(null);
          setSelectedSlotId(targetSlotId);
          if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent(REVEAL_IN_TREE_EVENT, { detail: { slotId: targetSlotId } }));
          }
          if (options?.loadToCanvas) {
            setPreviewMode('image');
            setWorkingSlotId(targetSlotId);
          }
          return true;
        }

        // Prevent duplicate consumes from racing on the same staged upload.
        setTemporaryObjectUpload((current) => {
          const stagedId = current?.id?.trim() ?? '';
          if (stagedId && stagedId !== currentTemporaryUploadId) {
            return current;
          }
          return null;
        });

        const loadToCanvas = Boolean(options?.loadToCanvas);
        const ensureSlotHasTemporaryUploadImage = async (
          slot: ImageStudioSlotRecord | null | undefined
        ): Promise<ImageStudioSlotRecord | null> => {
          if (!slot?.id) return null;
          if (slotHasRenderableImage(slot)) return slot;

          const nextImageFileId = temporaryUploadSnapshot.id?.trim() ?? '';
          const nextImageUrl = temporaryUploadSnapshot.filepath?.trim() ?? '';
          if (!nextImageFileId && !nextImageUrl) return slot;

          const repaired = await updateSlotMutation.mutateAsync({
            id: slot.id,
            data: {
              ...(nextImageFileId ? { imageFileId: nextImageFileId } : {}),
              ...(nextImageUrl ? { imageUrl: nextImageUrl } : {}),
              imageBase64: null,
            },
          });
          return repaired;
        };

        const consumePromise = (async (): Promise<boolean> => {
          setUploadError(null);
          const applyTemporaryToExistingSlot = async (): Promise<boolean> => {
            if (!objectSlot?.id) return false;
            const patchedSlot = await updateSlotMutation.mutateAsync({
              id: objectSlot.id,
              data: {
                imageFileId: temporaryUploadSnapshot.id,
                imageUrl: temporaryUploadSnapshot.filepath,
                imageBase64: null,
              },
            });
            const resolvedSlot = await ensureSlotHasTemporaryUploadImage(patchedSlot);
            const targetSlotId = resolvedSlot?.id ?? objectSlot.id;
            setTemporaryObjectUpload(null);
            setSelectedSlotId(targetSlotId);
            if (typeof window !== 'undefined') {
              window.dispatchEvent(new CustomEvent(REVEAL_IN_TREE_EVENT, { detail: { slotId: targetSlotId } }));
            }
            if (loadToCanvas) {
              setPreviewMode('image');
              setWorkingSlotId(targetSlotId);
            }
            return true;
          };

          try {
            const objectSlotHasImage = Boolean(
              objectSlot?.imageFileId ||
              objectSlot?.imageUrl?.trim() ||
              objectSlot?.imageBase64?.trim()
            );
            if (objectSlot?.id && !objectSlotHasImage) {
              const appliedToSelectedEmptySlot = await applyTemporaryToExistingSlot();
              if (appliedToSelectedEmptySlot) return true;
            }

            const created = await createSlots([
              {
                name: temporaryUploadSnapshot.filename?.trim() || `Card ${Date.now()}`,
                ...(getFolderForNewSlot() ? { folderPath: getFolderForNewSlot() } : {}),
                imageFileId: temporaryUploadSnapshot.id,
                imageUrl: temporaryUploadSnapshot.filepath,
                imageBase64: null,
              },
            ]);
            const createdSlot = created[0] ?? null;
            const nextSlot = await ensureSlotHasTemporaryUploadImage(createdSlot);
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
            try {
              const fallbackApplied = await applyTemporaryToExistingSlot();
              if (fallbackApplied) return true;
            } catch {
              // Surface the original creation error below.
            }
            setTemporaryObjectUpload((current) => current ?? temporaryUploadSnapshot);
            setUploadError(error instanceof Error ? error.message : 'Failed to create card from temporary upload');
            return false;
          }
        })();

        consumeTemporaryUploadInFlightRef.current = consumePromise;
        consumeTemporaryUploadInFlightIdRef.current = currentTemporaryUploadId;

        try {
          return await consumePromise;
        } finally {
          if (consumeTemporaryUploadInFlightRef.current === consumePromise) {
            consumeTemporaryUploadInFlightRef.current = null;
            consumeTemporaryUploadInFlightIdRef.current = null;
          }
        }
      },
      [
        createSlots,
        getFolderForNewSlot,
        objectSlot,
        setPreviewMode,
        setSelectedSlotId,
        setTemporaryObjectUpload,
        setWorkingSlotId,
        slots,
        temporaryObjectUpload,
        updateSlotMutation,
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
            width: uploaded.width,
            height: uploaded.height,
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

    const handleSlotDisconnectImage = useCallback(
      async (index: number): Promise<void> => {
        if (index !== OBJECT_SLOT_INDEX) return;
        clearObjectDraftSyncTimeouts();
        setUploadError(null);
        const previousTemporaryUpload = temporaryObjectUpload;
        try {
          if (previousTemporaryUpload) {
            await deleteUploadedAsset(previousTemporaryUpload).catch(() => {
              // Best effort cleanup.
            });
            setTemporaryObjectUpload(null);
          }

          if (objectSlot) {
            const clearPayload = {
              imageFileId: null,
              imageUrl: null,
              imageBase64: null,
            } as const;
            const slotIdCandidates = resolveSlotIdCandidates(objectSlot.id);
            let patchedSlot: ImageStudioSlotRecord | null = null;

            // Keep the UI deterministic while network retries finish.
            if (projectId.trim() && slotIdCandidates.length > 0) {
              const candidateSet = new Set(slotIdCandidates);
              queryClient.setQueryData<StudioSlotsResponse>(
                studioKeys.slots(projectId),
                (current) => {
                  if (!current) return current;
                  return {
                    ...current,
                    slots: current.slots.map((slot: ImageStudioSlotRecord) => {
                      if (!candidateSet.has(slot.id)) return slot;
                      return {
                        ...slot,
                        imageFileId: null,
                        imageUrl: null,
                        imageBase64: null,
                        imageFile: null,
                      };
                    }),
                  };
                }
              );
            }

            const patchBySlotId = async (slotId: string): Promise<ImageStudioSlotRecord | null> => {
              if (!slotId) return null;
              try {
                const response = await api.patch<{ slot?: ImageStudioSlotRecord }>(
                  `/api/image-studio/slots/${encodeURIComponent(slotId)}`,
                  clearPayload
                );
                return response.slot ?? null;
              } catch {
                return null;
              }
            };

            for (const candidate of slotIdCandidates) {
              const nextPatchedSlot = await patchBySlotId(candidate);
              if (nextPatchedSlot) {
                patchedSlot = nextPatchedSlot;
                break;
              }
            }

            if (!patchedSlot && objectSlot.id) {
              patchedSlot = await patchBySlotId(objectSlot.id);
            }

            if (!patchedSlot) {
              throw new Error('Failed to clear slot image');
            }

            const followupCandidateIds = new Set<string>([
              ...slotIdCandidates,
              ...resolveSlotIdCandidates(patchedSlot.id),
              objectSlot.id,
            ]);
            await Promise.all(
              Array.from(followupCandidateIds)
                .filter((candidate: string) => candidate && candidate !== patchedSlot?.id)
                .map((candidate: string) =>
                  patchBySlotId(candidate).catch(() => null)
                )
            );

            if (projectId.trim()) {
              const candidateSet = new Set(followupCandidateIds);
              queryClient.setQueryData<StudioSlotsResponse>(
                studioKeys.slots(projectId),
                (current) => {
                  if (!current) return current;
                  return {
                    ...current,
                    slots: current.slots.map((slot: ImageStudioSlotRecord) => {
                      if (!candidateSet.has(slot.id)) return slot;
                      return {
                        ...slot,
                        imageFileId: null,
                        imageUrl: null,
                        imageBase64: null,
                        imageFile: null,
                      };
                    }),
                  };
                }
              );
            }
          } else if (previousTemporaryUpload) {
            // Keep selection reset for pure temporary-object flows.
            setSelectedSlotId(null);
          } else {
            return;
          }

          setObjectImageLinkDraft('');
          setObjectImageBase64Draft('');
          // ProductImageManager may still call setImageLinkAt/setImageBase64At during clear flow.
          suppressNextDraftPersistenceOpsRef.current = 2;
          if (projectId.trim()) {
            await invalidateImageStudioSlots(queryClient, projectId);
          }
        } catch (error: unknown) {
          setUploadError(error instanceof Error ? error.message : 'Failed to remove image');
          throw error;
        }
      },
      [
        clearObjectDraftSyncTimeouts,
        deleteUploadedAsset,
        objectSlot,
        projectId,
        queryClient,
        setSelectedSlotId,
        setTemporaryObjectUpload,
        temporaryObjectUpload,
      ]
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
