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
import {
  isImageStudioSlotImageLocked,
  setImageStudioSlotImageLocked,
} from '../utils/slot-image-lock';

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

type EnsureSlotFromUploadResponse = {
  slot?: ImageStudioSlotRecord;
  created?: boolean;
  action?: 'reused_existing' | 'reused_selected_slot' | 'created' | 'reused_deterministic';
};

function toManagedSlot(slot: ImageStudioSlotRecord | null): ProductImageSlot {
  if (!slot?.imageFileId) return null;
  const previewPath = slot.imageFile?.url || slot.imageUrl || null;
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

function slotHasRenderableImage(slot: ImageStudioSlotRecord | null | undefined): boolean {
  if (!slot) return false;
  const imageFileId = slot.imageFileId?.trim() ?? '';
  const imageFilePath = slot.imageFile?.url?.trim() ?? '';
  const rawImageUrl = slot.imageUrl?.trim() ?? '';
  const imageUrl =
    rawImageUrl && !isLikelyImageStudioErrorText(rawImageUrl)
      ? rawImageUrl
      : '';
  const imageBase64 = slot.imageBase64?.trim() ?? '';
  return Boolean(imageFileId || imageFilePath || imageUrl || imageBase64);
}

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
    const consumeTemporaryUploadInFlightRef = useRef<Promise<boolean> | null>(null);
    const consumeTemporaryUploadInFlightIdRef = useRef<string | null>(null);
    const lastConsumedTemporaryUploadIdRef = useRef<string | null>(null);
    const lastConsumedSlotIdRef = useRef<string | null>(null);
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
      lastConsumedTemporaryUploadIdRef.current = null;
      lastConsumedSlotIdRef.current = null;
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
        const currentTemporaryUploadId = temporaryUploadSnapshot.id.trim();
        const normalizedTemporaryFilepath = temporaryUploadSnapshot.filepath.trim();
        if (!currentTemporaryUploadId && !normalizedTemporaryFilepath) return false;
        // Kept for compatibility with imperative API; consume always loads to canvas.
        void options;

        if (
          currentTemporaryUploadId &&
          lastConsumedTemporaryUploadIdRef.current === currentTemporaryUploadId &&
          lastConsumedSlotIdRef.current
        ) {
          const lastConsumedSlotId = lastConsumedSlotIdRef.current;
          setTemporaryObjectUpload(null);
          setSelectedSlotId(lastConsumedSlotId);
          setWorkingSlotId(lastConsumedSlotId);
          setPreviewMode('image');
          if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent(REVEAL_IN_TREE_EVENT, { detail: { slotId: lastConsumedSlotId } }));
          }
          return true;
        }

        if (
          consumeTemporaryUploadInFlightRef.current &&
          consumeTemporaryUploadInFlightIdRef.current === (currentTemporaryUploadId || normalizedTemporaryFilepath)
        ) {
          return consumeTemporaryUploadInFlightRef.current;
        }

        const consumePromise = (async (): Promise<boolean> => {
          setUploadError(null);
          try {
            const normalizedProjectId = projectId.trim();
            if (!normalizedProjectId) {
              throw new Error('Select a project first.');
            }
            const selectedSlotIdBeforeEnsure = objectSlot?.id?.trim() ?? '';
            const selectedSlotWasEmpty = Boolean(
              selectedSlotIdBeforeEnsure && !slotHasRenderableImage(objectSlot)
            );
            const selectedSlotCandidateSet = new Set<string>(
              resolveSlotIdCandidates(selectedSlotIdBeforeEnsure)
            );

            const findMatchingSlot = (slotsToScan: ImageStudioSlotRecord[]): ImageStudioSlotRecord | null => {
              const matches = slotsToScan.filter((slot: ImageStudioSlotRecord): boolean => {
                const slotImageFileId = slot.imageFileId?.trim() ?? '';
                if (currentTemporaryUploadId && slotImageFileId === currentTemporaryUploadId) return true;
                if (!normalizedTemporaryFilepath) return false;
                const slotPath = (slot.imageFile?.url ?? slot.imageUrl ?? '').trim();
                return slotPath === normalizedTemporaryFilepath;
              });
              return matches[0] ?? null;
            };

            const resolveFallbackSlot = async (): Promise<ImageStudioSlotRecord | null> => {
              await invalidateImageStudioSlots(queryClient, normalizedProjectId);
              const refreshed = queryClient.getQueryData<StudioSlotsResponse>(studioKeys.slots(normalizedProjectId));
              const refreshedSlots = refreshed?.slots ?? [];
              const existingMatch = findMatchingSlot(refreshedSlots);
              if (existingMatch) {
                if (slotHasRenderableImage(existingMatch)) return existingMatch;
                const patchedExisting = await updateSlotMutation.mutateAsync({
                  id: existingMatch.id,
                  data: {
                    ...(currentTemporaryUploadId ? { imageFileId: currentTemporaryUploadId } : {}),
                    ...(normalizedTemporaryFilepath ? { imageUrl: normalizedTemporaryFilepath } : {}),
                    imageBase64: null,
                  },
                });
                return patchedExisting;
              }

              if (objectSlot?.id && !slotHasRenderableImage(objectSlot)) {
                const patchedSelected = await updateSlotMutation.mutateAsync({
                  id: objectSlot.id,
                  data: {
                    ...(currentTemporaryUploadId ? { imageFileId: currentTemporaryUploadId } : {}),
                    ...(normalizedTemporaryFilepath ? { imageUrl: normalizedTemporaryFilepath } : {}),
                    imageBase64: null,
                  },
                });
                return patchedSelected;
              }

              const created = await api.post<StudioSlotsResponse>(
                `/api/image-studio/projects/${encodeURIComponent(normalizedProjectId)}/slots`,
                {
                  slots: [
                    {
                      name: temporaryUploadSnapshot.filename?.trim() || `Card ${Date.now()}`,
                      ...(getFolderForNewSlot() ? { folderPath: getFolderForNewSlot() } : {}),
                      ...(currentTemporaryUploadId ? { imageFileId: currentTemporaryUploadId } : {}),
                      ...(normalizedTemporaryFilepath ? { imageUrl: normalizedTemporaryFilepath } : {}),
                      imageBase64: null,
                    },
                  ],
                }
              );
              return created.slots[0] ?? null;
            };

            let ensuredSlot: ImageStudioSlotRecord | null = null;
            try {
              const ensured = await api.post<EnsureSlotFromUploadResponse>(
                `/api/image-studio/projects/${encodeURIComponent(normalizedProjectId)}/slots/ensure-from-upload`,
                {
                  uploadId: currentTemporaryUploadId || null,
                  filepath: normalizedTemporaryFilepath || null,
                  filename: temporaryUploadSnapshot.filename?.trim() || null,
                  folderPath: getFolderForNewSlot() || null,
                  selectedSlotId: objectSlot?.id ?? null,
                }
              );
              ensuredSlot = ensured.slot ?? null;
            } catch {
              ensuredSlot = await resolveFallbackSlot();
            }
            if (!ensuredSlot?.id) {
              ensuredSlot = await resolveFallbackSlot();
            }
            const targetSlotId = ensuredSlot?.id?.trim() ?? '';
            if (!targetSlotId) {
              throw new Error('Failed to create or resolve card from temporary upload');
            }

            if (
              selectedSlotWasEmpty &&
              selectedSlotCandidateSet.has(targetSlotId) &&
              !isImageStudioSlotImageLocked(ensuredSlot)
            ) {
              try {
                ensuredSlot = await updateSlotMutation.mutateAsync({
                  id: targetSlotId,
                  data: {
                    metadata: setImageStudioSlotImageLocked(
                      ensuredSlot?.metadata ?? objectSlot?.metadata ?? null,
                      true
                    ),
                  },
                });
              } catch {
                // Non-blocking: keep the ensured slot even if lock metadata update fails.
              }
            }

            queryClient.setQueryData<StudioSlotsResponse>(
              studioKeys.slots(normalizedProjectId),
              (current) => {
                if (!current || !Array.isArray(current.slots)) {
                  return { slots: ensuredSlot ? [ensuredSlot] : [] };
                }
                if (!ensuredSlot) return current;
                const existingIndex = current.slots.findIndex(
                  (slot: ImageStudioSlotRecord): boolean => slot.id === ensuredSlot.id
                );
                if (existingIndex < 0) {
                  return {
                    ...current,
                    slots: [...current.slots, ensuredSlot],
                  };
                }
                const nextSlots = [...current.slots];
                nextSlots[existingIndex] = ensuredSlot;
                return {
                  ...current,
                  slots: nextSlots,
                };
              }
            );

            setTemporaryObjectUpload(null);
            setSelectedSlotId(targetSlotId);
            setWorkingSlotId(targetSlotId);
            setPreviewMode('image');
            if (typeof window !== 'undefined') {
              window.dispatchEvent(new CustomEvent(REVEAL_IN_TREE_EVENT, { detail: { slotId: targetSlotId } }));
            }

            if (currentTemporaryUploadId) {
              lastConsumedTemporaryUploadIdRef.current = currentTemporaryUploadId;
              lastConsumedSlotIdRef.current = targetSlotId;
            }
            // Keep server data authoritative after optimistic cache upsert.
            void invalidateImageStudioSlots(queryClient, normalizedProjectId);
            return true;
          } catch (error: unknown) {
            setTemporaryObjectUpload((current) => current ?? temporaryUploadSnapshot);
            setUploadError(error instanceof Error ? error.message : 'Failed to create card from temporary upload');
            return false;
          }
        })();

        consumeTemporaryUploadInFlightRef.current = consumePromise;
        consumeTemporaryUploadInFlightIdRef.current = currentTemporaryUploadId || normalizedTemporaryFilepath;

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
        getFolderForNewSlot,
        objectSlot,
        projectId,
        queryClient,
        setPreviewMode,
        setSelectedSlotId,
        setTemporaryObjectUpload,
        setWorkingSlotId,
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
          const uploaded = result.uploaded?.[0] ?? null;
          if (!uploaded) {
            throw new Error(result.failures?.[0]?.error || 'Upload failed');
          }

          lastConsumedTemporaryUploadIdRef.current = null;
          lastConsumedSlotIdRef.current = null;
          const selectedSlotId = objectSlot?.id?.trim() ?? '';
          if (selectedSlotId) {
            const updatePayload = {
              imageFileId: uploaded.id,
              imageUrl: uploaded.filepath,
              imageBase64: null,
            } as const;
            const slotIdCandidates = resolveSlotIdCandidates(selectedSlotId);
            let updatedSlot: ImageStudioSlotRecord | null = null;
            let updateError: unknown = null;
            for (const candidate of slotIdCandidates) {
              try {
                updatedSlot = await updateSlotMutation.mutateAsync({
                  id: candidate,
                  data: updatePayload,
                });
                if (updatedSlot) break;
              } catch (error: unknown) {
                updateError = error;
              }
            }
            if (!updatedSlot) {
              throw (updateError instanceof Error
                ? updateError
                : new Error('Failed to attach image to selected card.'));
            }

            setTemporaryObjectUpload(null);
            setSelectedSlotId(updatedSlot.id);
            setObjectImageLinkDraft(uploaded.filepath);
            setObjectImageBase64Draft('');
            if (previousTemp && previousTemp.id !== uploaded.id) {
              await deleteUploadedAsset(previousTemp).catch(() => {
                // Best effort cleanup of replaced temporary upload.
              });
            }
            if (typeof window !== 'undefined') {
              window.dispatchEvent(new CustomEvent(REVEAL_IN_TREE_EVENT, { detail: { slotId: updatedSlot.id } }));
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
              // Best effort cleanup of replaced temporary upload.
            });
          }
          if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent(REVEAL_IN_TREE_EVENT, { detail: { slotId: createdSlot.id } }));
          }
          void invalidateImageStudioSlots(queryClient, normalizedProjectId);
        } catch (error: unknown) {
          setUploadError(error instanceof Error ? error.message : 'Failed to upload image');
        }
      },
      [
        createSlots,
        deleteUploadedAsset,
        getFolderForNewSlot,
        objectSlot,
        projectId,
        queryClient,
        setSelectedSlotId,
        setTemporaryObjectUpload,
        temporaryObjectUpload,
        updateSlotMutation,
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
        lastConsumedTemporaryUploadIdRef.current = null;
        lastConsumedSlotIdRef.current = null;
        clearObjectDraftSyncTimeouts();
        setUploadError(null);
        const previousTemporaryUpload = temporaryObjectUpload;
        const selectedSlotImageLocked = Boolean(
          objectSlot &&
          !previousTemporaryUpload &&
          slotHasRenderableImage(objectSlot)
        );
        try {
          let clearedCardImage = false;
          if (!previousTemporaryUpload && selectedSlotImageLocked) {
            throw new Error('Card image is locked and can only be removed by deleting the card.');
          }

          if (previousTemporaryUpload) {
            await deleteUploadedAsset(previousTemporaryUpload).catch(() => {
              // Best effort cleanup.
            });
            setTemporaryObjectUpload(null);
          }

          if (objectSlot && !previousTemporaryUpload) {
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
            clearedCardImage = true;
          } else if (!objectSlot && previousTemporaryUpload) {
            // Keep selection reset for pure temporary-object flows.
            setSelectedSlotId(null);
          } else if (!objectSlot) {
            return;
          }

          if (clearedCardImage || !objectSlot) {
            setObjectImageLinkDraft('');
            setObjectImageBase64Draft('');
            // ProductImageManager may still call setImageLinkAt/setImageBase64At during clear flow.
            suppressNextDraftPersistenceOpsRef.current = 2;
          } else {
            setObjectImageLinkDraft(objectSlot.imageUrl ?? objectSlot.imageFile?.url ?? '');
            setObjectImageBase64Draft(objectSlot.imageBase64 ?? '');
          }
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
          key={`obj:${objectSlot?.id ?? temporaryObjectUpload?.id ?? 'none'}`}
          minimalUi
          showDragHandle={false}
          minimalSingleSlotAlign='left'
        />
      </ProductImageManagerControllerProvider>
    );
  }
);

ImageStudioSingleSlotManager.displayName = 'ImageStudioSingleSlotManager';
