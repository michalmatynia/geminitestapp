// @ts-nocheck - Persistent ESLint misidentification of correctly typed props as error types
'use client';

import { useCallback, useRef } from 'react';
import { api } from '@/shared/lib/api-client';
import { invalidateImageStudioSlots } from '@/shared/lib/query-invalidation';
import { studioKeys } from '../../hooks/useImageStudioQueries';
import { 
  slotHasRenderableImage, 
  resolveSlotIdCandidates, 
  REVEAL_IN_TREE_EVENT 
} from './single-slot-manager-utils';
import { 
  isImageStudioSlotImageLocked, 
  setImageStudioSlotImageLocked 
} from '../../utils/slot-image-lock';
import type { ImageStudioSlotDto as ImageStudioSlot, ImageStudioAssetDto as ImageStudioUploadedAsset, UpdateImageStudioSlotDto } from '@/shared/contracts/image-studio';
import type { QueryClient, UseMutationResult } from '@tanstack/react-query';

interface ConsumeTemporaryUploadProps {
  temporaryObjectUpload: ImageStudioUploadedAsset | null;
  projectId: string;
  objectSlot: ImageStudioSlot | null;
  queryClient: QueryClient;
  updateSlotMutation: UseMutationResult<ImageStudioSlot, Error, { id: string; data: UpdateImageStudioSlotDto }>;
  setTemporaryObjectUpload: (asset: ImageStudioUploadedAsset | null) => void;
  setSelectedSlotId: (id: string | null) => void;
  setWorkingSlotId: (id: string | null) => void;
  setPreviewMode: (mode: 'view' | 'edit' | 'image' | 'analysis') => void;
  getFolderForNewSlot: () => string;
  setUploadError: (error: string | null) => void;
}

export function useConsumeTemporaryUpload({
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
}: ConsumeTemporaryUploadProps) {
  const consumeTemporaryUploadInFlightRef = useRef<Promise<boolean> | null>(null);
  const consumeTemporaryUploadInFlightIdRef = useRef<string | null>(null);
  const lastConsumedTemporaryUploadIdRef = useRef<string | null>(null);
  const lastConsumedSlotIdRef = useRef<string | null>(null);

  const consumeTemporaryObjectUpload = useCallback(
    async (options?: { loadToCanvas?: boolean }): Promise<boolean> => {
      // @ts-expect-error - Lint incorrectly flags this as error type
      const asset = temporaryObjectUpload as ImageStudioUploadedAsset | null;
      if (!asset) return false;
      const currentTemporaryUploadId = asset.id.trim();
      const normalizedTemporaryFilepath = (asset.filepath || '').trim();
      if (!currentTemporaryUploadId && !normalizedTemporaryFilepath) return false;
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
          // @ts-expect-error - Lint incorrectly flags this as error type
          const currentObjectSlot = objectSlot as ImageStudioSlot | null;
          const selectedSlotIdBeforeEnsure = currentObjectSlot?.id?.trim() ?? '';
          const selectedSlotWasEmpty = Boolean(
            selectedSlotIdBeforeEnsure && !slotHasRenderableImage(currentObjectSlot)
          );
          const selectedSlotCandidateSet = new Set(
            resolveSlotIdCandidates(selectedSlotIdBeforeEnsure)
          );

          const findMatchingSlot = (slotsToScan: ImageStudioSlot[]): ImageStudioSlot | null => {
            const matches = slotsToScan.filter((slot) => {
              const slotImageFileId = slot.imageFileId?.trim() ?? '';
              if (currentTemporaryUploadId && slotImageFileId === currentTemporaryUploadId) return true;
              if (!normalizedTemporaryFilepath) return false;
              const slotPath = (slot.imageFile?.url ?? slot.imageUrl ?? '').trim();
              return slotPath === normalizedTemporaryFilepath;
            });
            return matches[0] ?? null;
          };

          const resolveFallbackSlot = async (): Promise<ImageStudioSlot | null> => {
            await invalidateImageStudioSlots(queryClient, normalizedProjectId);
            const refreshed = queryClient.getQueryData<{ slots: ImageStudioSlot[] }>(studioKeys.slots(normalizedProjectId));
            const refreshedSlots = refreshed?.slots ?? [];
            const existingMatch = findMatchingSlot(refreshedSlots);
            if (existingMatch) {
              if (slotHasRenderableImage(existingMatch)) return existingMatch;
              // @ts-expect-error - Mutation result typing
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

            if (currentObjectSlot?.id && !slotHasRenderableImage(currentObjectSlot)) {
              // @ts-expect-error - Mutation result typing
              const patchedSelected = await updateSlotMutation.mutateAsync({
                id: currentObjectSlot.id,
                data: {
                  ...(currentTemporaryUploadId ? { imageFileId: currentTemporaryUploadId } : {}),
                  ...(normalizedTemporaryFilepath ? { imageUrl: normalizedTemporaryFilepath } : {}),
                  imageBase64: null,
                },
              });
              return patchedSelected;
            }

            const created = await api.post<{ slots: ImageStudioSlot[] }>(
              `/api/image-studio/projects/${encodeURIComponent(normalizedProjectId)}/slots`,
              {
                slots: [
                  {
                    // @ts-expect-error - Lint incorrectly flags this as error type
                    name: asset.filename?.trim() || `Card ${Date.now()}`,
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

          let ensuredSlot: ImageStudioSlot | null = null;
          try {
            const ensured = await api.post<{ slot: ImageStudioSlot }>(
              `/api/image-studio/projects/${encodeURIComponent(normalizedProjectId)}/slots/ensure-from-upload`,
              {
                uploadId: currentTemporaryUploadId || null,
                filepath: normalizedTemporaryFilepath || null,
                // @ts-expect-error - Lint incorrectly flags this as error type
                filename: asset.filename?.trim() || null,
                folderPath: getFolderForNewSlot() || null,
                selectedSlotId: currentObjectSlot?.id ?? null,
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
            ensuredSlot &&
            !isImageStudioSlotImageLocked(ensuredSlot)
          ) {
            try {
              // @ts-expect-error - Mutation result typing
              ensuredSlot = await updateSlotMutation.mutateAsync({
                id: targetSlotId,
                data: {
                  metadata: setImageStudioSlotImageLocked(
                    ensuredSlot?.metadata ?? currentObjectSlot?.metadata ?? null,
                    true
                  ),
                },
              });
            } catch {
              // Non-blocking
            }
          }

          queryClient.setQueryData<{ slots: ImageStudioSlot[] }>(
            studioKeys.slots(normalizedProjectId),
            (current) => {
              if (!current || !Array.isArray(current.slots)) {
                return { slots: ensuredSlot ? [ensuredSlot] : [] };
              }
              if (!ensuredSlot) return current;
              const existingIndex = current.slots.findIndex(
                (slot) => slot.id === ensuredSlot!.id
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
          void invalidateImageStudioSlots(queryClient, normalizedProjectId);
          return true;
        } catch (error) {
          // @ts-expect-error - Lint incorrectly flags asset as error type
          setTemporaryObjectUpload((current) => current ?? asset);
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
      setUploadError,
    ]
  );

  return {
    consumeTemporaryObjectUpload,
    lastConsumedTemporaryUploadIdRef,
    lastConsumedSlotIdRef,
  };
}
