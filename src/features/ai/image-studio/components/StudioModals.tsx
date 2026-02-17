'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { type ProductImageManagerController } from '@/features/products/components/ProductImageManager';
import {
  DEFAULT_PRODUCT_IMAGES_EXTERNAL_BASE_URL,
  PRODUCT_IMAGES_EXTERNAL_BASE_URL_SETTING_KEY,
} from '@/features/products/constants';
import type { ProductImageSlot } from '@/features/products/types/products-ui';
import {
  flattenParams,
  type ParamSpec,
} from '@/features/prompt-engine/prompt-params';
import { api } from '@/shared/lib/api-client';
import { createListQueryV2 } from '@/shared/lib/query-factories-v2';
import { useSettingsStore } from '@/shared/providers/SettingsStoreProvider';
import { Button, Tabs, TabsList, TabsTrigger, useToast } from '@/shared/ui';

import {
  buildPromptDiffLines,
  type PromptDiffLine,
  type PromptExtractHistoryEntry,
  type PromptExtractValidationIssue,
  toSlotName,
} from './studio-modals/prompt-extract-utils';
import { SlotInlineEditCardTab } from './studio-modals/SlotInlineEditCardTab';
import { SlotInlineEditCompositesTab } from './studio-modals/SlotInlineEditCompositesTab';
import { SlotInlineEditEnvironmentTab } from './studio-modals/SlotInlineEditEnvironmentTab';
import { SlotInlineEditGenerationsTab } from './studio-modals/SlotInlineEditGenerationsTab';
import { SlotInlineEditMasksTab } from './studio-modals/SlotInlineEditMasksTab';
import { copyCardIdToClipboard, createPromptExtractionHandlers } from './studio-modals/studio-modals-prompt-handlers';
import {
  applyEnvironmentReferenceAssetToDraft,
  createUploadHandlers,
} from './studio-modals/studio-modals-upload-handlers';
import { useProjectsState } from '../context/ProjectsContext';
import { usePromptActions, usePromptState } from '../context/PromptContext';
import { useSettingsState } from '../context/SettingsContext';
import { useSlotsActions, useSlotsState } from '../context/SlotsContext';
import { studioKeys } from '../hooks/useImageStudioQueries';
import { type ParamUiControl } from '../utils/param-ui';
import { DriveImportModal } from './modals/DriveImportModal';
import { ExtractPromptParamsModal } from './modals/ExtractPromptParamsModal';
import { GenerationPreviewModal } from './modals/GenerationPreviewModal';
import { SlotCreateModal } from './modals/SlotCreateModal';
import { SlotInlineEditModal } from './modals/SlotInlineEditModal';
import {
  EMPTY_ENVIRONMENT_REFERENCE_DRAFT,
  INLINE_CARD_IMAGE_SLOT_INDEX,
  asRecord,
  formatBytes,
  formatDateTime,
  formatLinkedVariantTimestamp,
  isCardImageRemovalLocked,
  mapActiveCompositeInputImages,
  mapLinkedGeneratedVariants,
  mapLinkedMaskSlots,
  mapSavedCompositeInputImages,
  mapSourceCompositeImage,
  readEnvironmentReferenceDraft,
  resolveCompositeTabInputSourceLabel,
  resolveDimensionLabel,
  resolveEnvironmentPreviewSource,
  resolveInlinePreviewMimeType,
  resolveInlinePreviewSource,
  resolveSelectedGenerationPreview,
  resolveSlotIdCandidates,
  slotHasRenderableImage,
  estimateBase64Bytes,
} from './studio-modals/slot-inline-edit-utils';

import type { ImageStudioSlotRecord } from '../types';
import type {
  CompositeTabImageViewModel as CompositeTabImage,
  EnvironmentReferenceDraftViewModel as EnvironmentReferenceDraft,
  LinkedGeneratedRunsResponse,
  LinkedGeneratedVariantViewModel as LinkedGeneratedVariant,
} from './studio-modals/slot-inline-edit-tab-types';

export function StudioModals(): React.JSX.Element {
  const { toast } = useToast();
  const { projectId } = useProjectsState();
  const settingsStore = useSettingsStore();
  const {
    slots,
    compositeAssets,
    selectedFolder,
    selectedSlot,
    slotCreateOpen,
    driveImportOpen,
    driveImportMode,
    driveImportTargetId,
    temporaryObjectUpload,
    slotInlineEditOpen,
    slotImageUrlDraft,
    slotBase64Draft,
    slotUpdateBusy,
  } = useSlotsState();
  const {
    setSelectedSlotId,
    createSlots,
    updateSlotMutation,
    setSlotCreateOpen,
    setDriveImportOpen,
    setDriveImportMode,
    setDriveImportTargetId,
    setTemporaryObjectUpload,
    importFromDriveMutation,
    uploadMutation,
    setSlotInlineEditOpen,
    setSlotImageUrlDraft,
    setSlotBase64Draft,
    setSlotUpdateBusy,
  } = useSlotsActions();
  const { extractReviewOpen, extractDraftPrompt } = usePromptState();
  const {
    setExtractReviewOpen,
    setExtractDraftPrompt,
    setPromptText,
    setParamsState,
    setParamSpecs,
    setParamUiOverrides,
    setExtractPreviewUiOverrides,
  } = usePromptActions();
  const { studioSettings } = useSettingsState();

  const [slotNameDraft, setSlotNameDraft] = useState('');
  const [slotFolderDraft, setSlotFolderDraft] = useState('');

  const [extractBusy, setExtractBusy] = useState<'none' | 'programmatic' | 'smart' | 'ai' | 'ui'>('none');
  const [extractError, setExtractError] = useState<string | null>(null);
  const [previewParams, setPreviewParams] = useState<Record<string, unknown> | null>(null);
  const [previewSpecs, setPreviewSpecs] = useState<Record<string, ParamSpec> | null>(null);
  const [previewControls, setPreviewControls] = useState<Record<string, ParamUiControl>>({});
  const [previewValidation, setPreviewValidation] = useState<{
    before: PromptExtractValidationIssue[];
    after: PromptExtractValidationIssue[];
  } | null>(null);
  const [extractHistory, setExtractHistory] = useState<PromptExtractHistoryEntry[]>([]);
  const [selectedExtractHistoryId, setSelectedExtractHistoryId] = useState<string | null>(null);
  const [editCardTab, setEditCardTab] = useState<
    'card' | 'generations' | 'environment' | 'masks' | 'composites'
  >('card');
  const [environmentReferenceDraft, setEnvironmentReferenceDraft] = useState<EnvironmentReferenceDraft>(
    EMPTY_ENVIRONMENT_REFERENCE_DRAFT
  );
  const [environmentPreviewNaturalSize, setEnvironmentPreviewNaturalSize] = useState<{
    width: number;
    height: number;
  } | null>(null);
  const localUploadInputRef = useRef<HTMLInputElement | null>(null);
  const [localUploadMode, setLocalUploadMode] = useState<
    'create' | 'replace' | 'temporary-object' | 'environment'
  >('create');
  const [localUploadTargetId, setLocalUploadTargetId] = useState<string | null>(null);
  const [linkedVariantApplyBusyKey, setLinkedVariantApplyBusyKey] = useState<string | null>(null);
  const [inlinePreviewNaturalSize, setInlinePreviewNaturalSize] = useState<{ width: number; height: number } | null>(null);
  const [generationPreviewKey, setGenerationPreviewKey] = useState<string | null>(null);
  const [generationPreviewNaturalSize, setGenerationPreviewNaturalSize] = useState<{
    width: number;
    height: number;
  } | null>(null);
  const [generationPreviewModalOpen, setGenerationPreviewModalOpen] = useState(false);
  const [generationModalPreviewNaturalSize, setGenerationModalPreviewNaturalSize] = useState<{
    width: number;
    height: number;
  } | null>(null);
  const [inlineSlotUploadError, setInlineSlotUploadError] = useState<string | null>(null);
  const inlineSlotLinkSyncTimeoutRef = useRef<number | null>(null);
  const inlineSlotBase64SyncTimeoutRef = useRef<number | null>(null);
  const suppressNextInlineDraftPersistenceOpsRef = useRef<number>(0);

  const productImagesExternalBaseUrl =
    settingsStore.get(PRODUCT_IMAGES_EXTERNAL_BASE_URL_SETTING_KEY) ??
    DEFAULT_PRODUCT_IMAGES_EXTERNAL_BASE_URL;

  const linkedRunsQuery = createListQueryV2<LinkedGeneratedRunsResponse, LinkedGeneratedRunsResponse>({
    queryKey: studioKeys.runs({
      projectId: projectId ?? null,
      sourceSlotId: selectedSlot?.id ?? null,
      status: 'completed',
      scope: 'slot-inline-edit',
    }),
    queryFn: async () => {
      if (!projectId || !selectedSlot?.id) return { runs: [], total: 0 };
      return await api.get<LinkedGeneratedRunsResponse>('/api/image-studio/runs', {
        params: {
          projectId,
          sourceSlotId: selectedSlot.id,
          status: 'completed',
          limit: 100,
          offset: 0,
        },
      });
    },
    enabled: Boolean(projectId && slotInlineEditOpen && selectedSlot?.id),
    staleTime: 5_000,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    meta: {
      source: 'image-studio.modals.linked-runs',
      operation: 'list',
      resource: 'image-studio.runs',
      domain: 'image_studio',
      tags: ['image-studio', 'runs', 'linked-variants'],
    },
  });

  const linkedGeneratedVariants = useMemo(
    () => mapLinkedGeneratedVariants(linkedRunsQuery.data?.runs, productImagesExternalBaseUrl),
    [linkedRunsQuery.data?.runs, productImagesExternalBaseUrl]
  );

  const selectedGenerationPreview = useMemo(
    () => resolveSelectedGenerationPreview(linkedGeneratedVariants, generationPreviewKey),
    [generationPreviewKey, linkedGeneratedVariants]
  );

  const selectedGenerationPreviewDimensions = useMemo(
    () =>
      resolveDimensionLabel(
        selectedGenerationPreview?.output.width,
        selectedGenerationPreview?.output.height,
        generationPreviewNaturalSize?.width,
        generationPreviewNaturalSize?.height
      ),
    [
      generationPreviewNaturalSize?.height,
      generationPreviewNaturalSize?.width,
      selectedGenerationPreview?.output.height,
      selectedGenerationPreview?.output.width,
    ]
  );

  const selectedGenerationModalDimensions = useMemo(
    () =>
      resolveDimensionLabel(
        selectedGenerationPreview?.output.width,
        selectedGenerationPreview?.output.height,
        generationModalPreviewNaturalSize?.width,
        generationModalPreviewNaturalSize?.height
      ),
    [
      generationModalPreviewNaturalSize?.height,
      generationModalPreviewNaturalSize?.width,
      selectedGenerationPreview?.output.height,
      selectedGenerationPreview?.output.width,
    ]
  );

  const linkedMaskSlots = useMemo(
    () => mapLinkedMaskSlots(slots, selectedSlot?.id, productImagesExternalBaseUrl),
    [productImagesExternalBaseUrl, selectedSlot?.id, slots]
  );

  const inlinePreviewSource = useMemo(
    () =>
      resolveInlinePreviewSource(
        slotBase64Draft,
        slotImageUrlDraft,
        selectedSlot,
        productImagesExternalBaseUrl
      ),
    [selectedSlot, slotBase64Draft, slotImageUrlDraft, productImagesExternalBaseUrl]
  );

  const inlinePreviewBase64Bytes = useMemo(
    () => estimateBase64Bytes(slotBase64Draft),
    [slotBase64Draft]
  );

  const inlinePreviewMimeType = useMemo(
    () => resolveInlinePreviewMimeType(selectedSlot?.imageFile?.mimetype, slotBase64Draft),
    [selectedSlot?.imageFile?.mimetype, slotBase64Draft]
  );

  const inlinePreviewDimensions = useMemo(
    () =>
      resolveDimensionLabel(
        selectedSlot?.imageFile?.width,
        selectedSlot?.imageFile?.height,
        inlinePreviewNaturalSize?.width,
        inlinePreviewNaturalSize?.height
      ),
    [
      selectedSlot?.imageFile?.width,
      selectedSlot?.imageFile?.height,
      inlinePreviewNaturalSize?.width,
      inlinePreviewNaturalSize?.height,
    ]
  );

  const environmentPreviewSource = useMemo(
    () => resolveEnvironmentPreviewSource(environmentReferenceDraft, productImagesExternalBaseUrl),
    [environmentReferenceDraft, productImagesExternalBaseUrl]
  );

  const environmentPreviewDimensions = useMemo(
    () =>
      resolveDimensionLabel(
        environmentReferenceDraft.width,
        environmentReferenceDraft.height,
        environmentPreviewNaturalSize?.width,
        environmentPreviewNaturalSize?.height
      ),
    [
      environmentReferenceDraft.width,
      environmentReferenceDraft.height,
      environmentPreviewNaturalSize?.width,
      environmentPreviewNaturalSize?.height,
    ]
  );

  const sourceCompositeImage = useMemo(
    () =>
      mapSourceCompositeImage({
        selectedSlot,
        inlinePreviewNaturalSize,
        inlinePreviewSource,
        inlinePreviewBase64Bytes,
        slotNameDraft,
      }),
    [
      inlinePreviewBase64Bytes,
      inlinePreviewNaturalSize,
      inlinePreviewSource,
      selectedSlot,
      slotNameDraft,
    ]
  );

  const savedCompositeInputImages = useMemo(
    () =>
      mapSavedCompositeInputImages({
        selectedSlot,
        slots,
        productImagesExternalBaseUrl,
      }),
    [productImagesExternalBaseUrl, selectedSlot, slots]
  );

  const activeCompositeInputImages = useMemo(
    () => mapActiveCompositeInputImages(compositeAssets, productImagesExternalBaseUrl),
    [compositeAssets, productImagesExternalBaseUrl]
  );

  const compositeTabInputImages = useMemo((): CompositeTabImage[] => {
    if (savedCompositeInputImages.length > 0) return savedCompositeInputImages;
    return activeCompositeInputImages;
  }, [activeCompositeInputImages, savedCompositeInputImages]);

  const compositeTabInputSourceLabel = useMemo(
    () => resolveCompositeTabInputSourceLabel(savedCompositeInputImages.length, activeCompositeInputImages.length),
    [activeCompositeInputImages.length, savedCompositeInputImages.length]
  );

  const previewLeaves = useMemo(
    () => (previewParams ? flattenParams(previewParams).filter((leaf) => Boolean(leaf.path)) : []),
    [previewParams]
  );
  const selectedExtractHistory = useMemo(() => {
    if (extractHistory.length === 0) return null;
    if (!selectedExtractHistoryId) return extractHistory[0] ?? null;
    return (
      extractHistory.find((entry: PromptExtractHistoryEntry) => entry.id === selectedExtractHistoryId) ??
      extractHistory[0] ??
      null
    );
  }, [extractHistory, selectedExtractHistoryId]);
  const selectedExtractDiffLines = useMemo(() => {
    if (!selectedExtractHistory) return [] as PromptDiffLine[];
    return buildPromptDiffLines(
      selectedExtractHistory.promptBefore,
      selectedExtractHistory.promptAfter
    );
  }, [selectedExtractHistory]);
  const selectedExtractChanged = useMemo(
    () =>
      selectedExtractHistory
        ? selectedExtractHistory.promptBefore !== selectedExtractHistory.promptAfter
        : false,
    [selectedExtractHistory]
  );

  const clearInlineSlotSyncTimeouts = useCallback((): void => {
    if (inlineSlotLinkSyncTimeoutRef.current) {
      window.clearTimeout(inlineSlotLinkSyncTimeoutRef.current);
      inlineSlotLinkSyncTimeoutRef.current = null;
    }
    if (inlineSlotBase64SyncTimeoutRef.current) {
      window.clearTimeout(inlineSlotBase64SyncTimeoutRef.current);
      inlineSlotBase64SyncTimeoutRef.current = null;
    }
  }, []);

  useEffect(() => {
    return () => {
      clearInlineSlotSyncTimeouts();
    };
  }, [clearInlineSlotSyncTimeouts]);

  const managedInlineCardImageSlot = useMemo<ProductImageSlot>(() => {
    if (!selectedSlot?.imageFileId) return null;
    const previewPath = selectedSlot.imageFile?.filepath?.trim() || selectedSlot.imageUrl?.trim() || '';
    if (!previewPath) return null;
    return {
      type: 'existing',
      data: {
        id: selectedSlot.imageFileId,
        filepath: previewPath,
      },
      previewUrl: previewPath,
      slotId: selectedSlot.id,
    };
  }, [selectedSlot?.id, selectedSlot?.imageFile?.filepath, selectedSlot?.imageFileId, selectedSlot?.imageUrl]);

  const scheduleInlineSlotLinkPersistence = useCallback(
    (slotId: string, nextValue: string): void => {
      if (inlineSlotLinkSyncTimeoutRef.current) {
        window.clearTimeout(inlineSlotLinkSyncTimeoutRef.current);
      }
      inlineSlotLinkSyncTimeoutRef.current = window.setTimeout(() => {
        inlineSlotLinkSyncTimeoutRef.current = null;
        void updateSlotMutation
          .mutateAsync({
            id: slotId,
            data: {
              imageUrl: nextValue.trim() || null,
            },
          })
          .catch(() => {
            // Preserve local draft even when sync fails.
          });
      }, 450);
    },
    [updateSlotMutation]
  );

  const scheduleInlineSlotBase64Persistence = useCallback(
    (slotId: string, nextValue: string): void => {
      if (inlineSlotBase64SyncTimeoutRef.current) {
        window.clearTimeout(inlineSlotBase64SyncTimeoutRef.current);
      }
      inlineSlotBase64SyncTimeoutRef.current = window.setTimeout(() => {
        inlineSlotBase64SyncTimeoutRef.current = null;
        const trimmed = nextValue.trim();
        void updateSlotMutation
          .mutateAsync({
            id: slotId,
            data: {
              imageBase64: trimmed || null,
              ...(trimmed ? { imageFileId: null } : {}),
            },
          })
          .catch(() => {
            // Preserve local draft even when sync fails.
          });
      }, 450);
    },
    [updateSlotMutation]
  );

  const flushInlineSlotDraftSync = useCallback(async (): Promise<void> => {
    if (!selectedSlot?.id) return;
    const pendingUpdates: Promise<unknown>[] = [];

    if (inlineSlotLinkSyncTimeoutRef.current) {
      window.clearTimeout(inlineSlotLinkSyncTimeoutRef.current);
      inlineSlotLinkSyncTimeoutRef.current = null;
      pendingUpdates.push(
        updateSlotMutation.mutateAsync({
          id: selectedSlot.id,
          data: {
            imageUrl: slotImageUrlDraft.trim() || null,
          },
        })
      );
    }

    if (inlineSlotBase64SyncTimeoutRef.current) {
      window.clearTimeout(inlineSlotBase64SyncTimeoutRef.current);
      inlineSlotBase64SyncTimeoutRef.current = null;
      const trimmedBase64 = slotBase64Draft.trim();
      pendingUpdates.push(
        updateSlotMutation.mutateAsync({
          id: selectedSlot.id,
          data: {
            imageBase64: trimmedBase64 || null,
            ...(trimmedBase64 ? { imageFileId: null } : {}),
          },
        })
      );
    }

    if (pendingUpdates.length === 0) return;
    const settled = await Promise.allSettled(pendingUpdates);
    const rejected = settled.find(
      (result: PromiseSettledResult<unknown>): result is PromiseRejectedResult =>
        result.status === 'rejected'
    );
    if (rejected) {
      throw rejected.reason;
    }
  }, [selectedSlot?.id, slotBase64Draft, slotImageUrlDraft, updateSlotMutation]);

  const setInlineCardImageLinkAt = useCallback(
    (index: number, value: string): void => {
      if (index !== INLINE_CARD_IMAGE_SLOT_INDEX) return;
      setSlotImageUrlDraft(value);
      if (suppressNextInlineDraftPersistenceOpsRef.current > 0) {
        suppressNextInlineDraftPersistenceOpsRef.current -= 1;
        return;
      }
      if (!selectedSlot?.id) return;
      scheduleInlineSlotLinkPersistence(selectedSlot.id, value);
    },
    [scheduleInlineSlotLinkPersistence, selectedSlot?.id, setSlotImageUrlDraft]
  );

  const setInlineCardImageBase64At = useCallback(
    (index: number, value: string): void => {
      if (index !== INLINE_CARD_IMAGE_SLOT_INDEX) return;
      setSlotBase64Draft(value);
      if (suppressNextInlineDraftPersistenceOpsRef.current > 0) {
        suppressNextInlineDraftPersistenceOpsRef.current -= 1;
        return;
      }
      if (!selectedSlot?.id) return;
      scheduleInlineSlotBase64Persistence(selectedSlot.id, value);
    },
    [scheduleInlineSlotBase64Persistence, selectedSlot?.id, setSlotBase64Draft]
  );

  const handleInlineCardSlotImageChange = useCallback(
    async (file: File | null, index: number): Promise<void> => {
      if (index !== INLINE_CARD_IMAGE_SLOT_INDEX || !file) return;
      if (!projectId) {
        setInlineSlotUploadError('Select a project first.');
        return;
      }
      if (!selectedSlot?.id) {
        setInlineSlotUploadError('Select a card first.');
        return;
      }

      setInlineSlotUploadError(null);
      clearInlineSlotSyncTimeouts();
      setSlotUpdateBusy(true);
      try {
        const result = await uploadMutation.mutateAsync({
          files: [file],
          folder: selectedFolder,
        });
        const uploaded = result.uploaded?.[0] ?? null;
        if (!uploaded) {
          throw new Error(result.failures?.[0]?.error || 'Upload failed');
        }

        await updateSlotMutation.mutateAsync({
          id: selectedSlot.id,
          data: {
            imageFileId: uploaded.id,
            imageUrl: uploaded.filepath,
            imageBase64: null,
          },
        });
        setSlotImageUrlDraft(uploaded.filepath);
        setSlotBase64Draft('');
      } catch (error: unknown) {
        setInlineSlotUploadError(error instanceof Error ? error.message : 'Failed to upload image');
      } finally {
        setSlotUpdateBusy(false);
      }
    },
    [
      clearInlineSlotSyncTimeouts,
      projectId,
      selectedFolder,
      selectedSlot?.id,
      setSlotBase64Draft,
      setSlotImageUrlDraft,
      setSlotUpdateBusy,
      updateSlotMutation,
      uploadMutation,
    ]
  );

  const handleInlineCardDisconnectImage = useCallback(
    async (index: number): Promise<void> => {
      if (index !== INLINE_CARD_IMAGE_SLOT_INDEX || !selectedSlot?.id) return;
      if (isCardImageRemovalLocked(selectedSlot)) {
        setInlineSlotUploadError('Card image is locked and can only be removed by deleting the card.');
        return;
      }
      setInlineSlotUploadError(null);
      clearInlineSlotSyncTimeouts();
      setSlotUpdateBusy(true);
      try {
        const clearPayload = {
          imageFileId: null,
          imageUrl: null,
          imageBase64: null,
        } as const;
        const slotIdCandidates = resolveSlotIdCandidates(selectedSlot.id);
        let cleared = false;
        let clearError: unknown = null;

        for (const candidate of slotIdCandidates) {
          try {
            await updateSlotMutation.mutateAsync({
              id: candidate,
              data: clearPayload,
            });
            cleared = true;
            break;
          } catch (error: unknown) {
            clearError = error;
          }
        }

        if (!cleared) {
          for (const candidate of slotIdCandidates) {
            if (!candidate) continue;
            try {
              const response = await api.patch<{ slot?: ImageStudioSlotRecord }>(
                `/api/image-studio/slots/${encodeURIComponent(candidate)}`,
                clearPayload
              );
              if (response.slot) {
                cleared = true;
                break;
              }
            } catch (error: unknown) {
              clearError = error;
            }
          }
        }

        if (!cleared) {
          throw (clearError instanceof Error ? clearError : new Error('Failed to remove image'));
        }

        // Legacy rows can still exist under alias ids; clear them best-effort.
        await Promise.all(
          slotIdCandidates
            .filter((candidate: string) => candidate)
            .map((candidate: string) =>
              api.patch(`/api/image-studio/slots/${encodeURIComponent(candidate)}`, clearPayload).catch(() => null)
            )
        );

        setSlotImageUrlDraft('');
        setSlotBase64Draft('');
        // ProductImageManager clear flow triggers both link/base64 setters after disconnect.
        suppressNextInlineDraftPersistenceOpsRef.current = 2;
      } catch (error: unknown) {
        setInlineSlotUploadError(error instanceof Error ? error.message : 'Failed to remove image');
      } finally {
        setSlotUpdateBusy(false);
      }
    },
    [
      clearInlineSlotSyncTimeouts,
      selectedSlot,
      selectedSlot?.id,
      setSlotBase64Draft,
      setSlotImageUrlDraft,
      setSlotUpdateBusy,
      updateSlotMutation,
    ]
  );

  const openInlineCardFileManager = useCallback((): void => {
    if (!projectId) {
      setInlineSlotUploadError('Select a project first.');
      return;
    }
    if (!selectedSlot?.id) {
      setInlineSlotUploadError('Select a card first.');
      return;
    }
    setInlineSlotUploadError(null);
    setDriveImportMode('replace');
    setDriveImportTargetId(selectedSlot.id);
    setDriveImportOpen(true);
  }, [projectId, selectedSlot?.id, setDriveImportMode, setDriveImportOpen, setDriveImportTargetId]);

  const setInlineCardShowFileManager = useCallback(
    (show: boolean): void => {
      if (!show) return;
      openInlineCardFileManager();
    },
    [openInlineCardFileManager]
  );

  const inlineCardImageManagerController = useMemo<ProductImageManagerController>(
    () => ({
      imageSlots: [managedInlineCardImageSlot],
      imageLinks: [slotImageUrlDraft],
      imageBase64s: [slotBase64Draft],
      setImageLinkAt: setInlineCardImageLinkAt,
      setImageBase64At: setInlineCardImageBase64At,
      handleSlotImageChange: (file: File | null, index: number): void => {
        void handleInlineCardSlotImageChange(file, index);
      },
      handleSlotDisconnectImage: handleInlineCardDisconnectImage,
      setShowFileManager: setInlineCardShowFileManager,
      setShowFileManagerForSlot: (): void => {
        openInlineCardFileManager();
      },
      slotLabels: [''],
      isSlotImageLocked: (slotIndex: number): boolean =>
        slotIndex === INLINE_CARD_IMAGE_SLOT_INDEX && isCardImageRemovalLocked(selectedSlot),
      slotImageLockedReason: 'Card image is locked and can only be removed by deleting the card.',
      swapImageSlots: (): void => {
        // Single-slot manager: no reordering.
      },
      setImagesReordering: (): void => {
        // Reordering is disabled in single-slot mode.
      },
      uploadError: inlineSlotUploadError,
    }),
    [
      handleInlineCardDisconnectImage,
      handleInlineCardSlotImageChange,
      inlineSlotUploadError,
      managedInlineCardImageSlot,
      openInlineCardFileManager,
      selectedSlot,
      setInlineCardImageBase64At,
      setInlineCardImageLinkAt,
      setInlineCardShowFileManager,
      slotBase64Draft,
      slotImageUrlDraft,
    ]
  );

  const handleOpenGenerationPreviewModal = useCallback(
    (variant: LinkedGeneratedVariant): void => {
      setGenerationPreviewKey(variant.key);
      setGenerationPreviewNaturalSize(null);
      setGenerationModalPreviewNaturalSize(null);
      setGenerationPreviewModalOpen(true);
    },
    []
  );

  useEffect(() => {
    if (linkedGeneratedVariants.length === 0) {
      setGenerationPreviewKey(null);
      setGenerationPreviewModalOpen(false);
      return;
    }
    setGenerationPreviewKey((currentKey: string | null) => {
      if (currentKey && linkedGeneratedVariants.some((variant) => variant.key === currentKey)) {
        return currentKey;
      }
      return linkedGeneratedVariants[0]?.key ?? null;
    });
  }, [linkedGeneratedVariants]);

  useEffect(() => {
    if (!slotInlineEditOpen || !selectedSlot) return;
    clearInlineSlotSyncTimeouts();
    setInlineSlotUploadError(null);
    setGenerationPreviewKey(null);
    setGenerationPreviewNaturalSize(null);
    setGenerationModalPreviewNaturalSize(null);
    setGenerationPreviewModalOpen(false);
    setEditCardTab('card');
    setSlotNameDraft(selectedSlot.name ?? '');
    setSlotFolderDraft(selectedSlot.folderPath ?? selectedFolder ?? '');
    setSlotImageUrlDraft(selectedSlot.imageUrl ?? selectedSlot.imageFile?.filepath ?? '');
    setSlotBase64Draft(selectedSlot.imageBase64 ?? '');
    setEnvironmentReferenceDraft(readEnvironmentReferenceDraft(selectedSlot));
  }, [
    slotInlineEditOpen,
    selectedSlot,
    selectedFolder,
    clearInlineSlotSyncTimeouts,
    setSlotImageUrlDraft,
    setSlotBase64Draft,
  ]);

  useEffect(() => {
    if (!slotInlineEditOpen) {
      clearInlineSlotSyncTimeouts();
      setInlinePreviewNaturalSize(null);
      setGenerationPreviewNaturalSize(null);
      setGenerationModalPreviewNaturalSize(null);
      setGenerationPreviewModalOpen(false);
      setEnvironmentPreviewNaturalSize(null);
      setEditCardTab('card');
    }
  }, [clearInlineSlotSyncTimeouts, slotInlineEditOpen]);

  useEffect(() => {
    if (!extractReviewOpen) return;
    setExtractError(null);
    setPreviewParams(null);
    setPreviewSpecs(null);
    setPreviewControls({});
    setPreviewValidation(null);
    setExtractPreviewUiOverrides({});
  }, [extractReviewOpen, setExtractPreviewUiOverrides]);

  const deleteStagedAsset = async (asset: { id: string; filepath: string }): Promise<void> => {
    if (!projectId) return;
    await api.post(`/api/image-studio/projects/${encodeURIComponent(projectId)}/assets/delete`, {
      id: asset.id,
      filepath: asset.filepath,
    });
  };

  const applyEnvironmentReferenceAsset = useCallback(
    (asset: {
      id: string;
      filepath: string;
      filename?: string | null;
      mimetype?: string | null;
      size?: number | null;
      width?: number | null;
      height?: number | null;
      updatedAt?: string | Date | null;
    }): void => {
      setEnvironmentReferenceDraft({
        imageFileId: asset.id,
        imageUrl: asset.filepath,
        filename: asset.filename?.trim() ?? '',
        mimetype: asset.mimetype?.trim() ?? '',
        size: typeof asset.size === 'number' && Number.isFinite(asset.size) ? asset.size : null,
        width: typeof asset.width === 'number' && Number.isFinite(asset.width) ? asset.width : null,
        height: typeof asset.height === 'number' && Number.isFinite(asset.height) ? asset.height : null,
        updatedAt: asset.updatedAt ?? new Date().toISOString(),
      });
      setEnvironmentPreviewNaturalSize(null);
      setEditCardTab('environment');
    },
    []
  );

  const {
    handleDriveSelection,
    handleCreateEmptySlot: handleCreateEmptySlotCore,
    handleLocalUpload,
  } = createUploadHandlers({
    applyEnvironmentReferenceDraft: applyEnvironmentReferenceAsset,
    clearTemporaryUpload: async (asset): Promise<void> => {
      await deleteStagedAsset(asset).catch(() => {
        // Best-effort cleanup for replaced temporary assets.
      });
    },
    createSlots,
    driveImportMode,
    driveImportTargetId,
    importFromDriveMutation,
    localUploadInputRef,
    localUploadMode,
    localUploadTargetId,
    selectedFolder,
    selectedSlot,
    setDriveImportMode,
    setDriveImportOpen,
    setDriveImportTargetId,
    setLocalUploadMode,
    setLocalUploadTargetId,
    setSelectedSlotId,
    setTemporaryObjectUpload,
    slotHasRenderableImage,
    slotsCount: slots.length,
    temporaryObjectUpload,
    toast,
    toSlotName,
    updateSlotMutation,
    uploadMutation,
  });

  const {
    handleProgrammaticExtraction,
    handleSmartExtraction,
    handleAiExtraction,
    handleSuggestUiControls,
    handleApplyExtraction,
  } = createPromptExtractionHandlers({
    extractDraftPrompt,
    previewControls,
    previewParams,
    previewSpecs,
    setExtractBusy,
    setExtractDraftPrompt,
    setExtractError,
    setExtractHistory,
    setExtractPreviewUiOverrides,
    setExtractReviewOpen,
    setParamSpecs,
    setParamUiOverrides,
    setParamsState,
    setPreviewControls,
    setPreviewParams,
    setPreviewSpecs,
    setPreviewValidation,
    setPromptText,
    setSelectedExtractHistoryId,
    studioSettings,
    toast,
  });

  const handleCreateEmptySlot = async (): Promise<void> => {
    setSlotCreateOpen(false);
    await handleCreateEmptySlotCore();
  };

  const triggerLocalUpload = (
    mode: 'create' | 'replace' | 'temporary-object' | 'environment',
    targetId: string | null
  ): void => {
    setLocalUploadMode(mode);
    setLocalUploadTargetId(targetId);
    window.setTimeout(() => localUploadInputRef.current?.click(), 0);
  };

  const handleSaveInlineSlot = async () => {
    if (!selectedSlot) return;
    setSlotUpdateBusy(true);
    try {
      await flushInlineSlotDraftSync();
      const baseMetadata = asRecord(selectedSlot.metadata)
        ? { ...(selectedSlot.metadata as Record<string, unknown>) }
        : {};
      const hasEnvironmentReference = Boolean(
        environmentReferenceDraft.imageFileId ||
        environmentReferenceDraft.imageUrl.trim()
      );
      if (hasEnvironmentReference) {
        baseMetadata['environmentReference'] = {
          imageFileId: environmentReferenceDraft.imageFileId,
          imageUrl: environmentReferenceDraft.imageUrl.trim(),
          filename: environmentReferenceDraft.filename.trim() || null,
          mimetype: environmentReferenceDraft.mimetype.trim() || null,
          size: environmentReferenceDraft.size,
          width: environmentReferenceDraft.width,
          height: environmentReferenceDraft.height,
          updatedAt: environmentReferenceDraft.updatedAt ?? new Date().toISOString(),
        };
      } else {
        delete baseMetadata['environmentReference'];
      }

      await updateSlotMutation.mutateAsync({
        id: selectedSlot.id,
        data: {
          name: slotNameDraft.trim() || selectedSlot.name || `Card ${slots.length + 1}`,
          folderPath: slotFolderDraft.trim(),
          metadata: Object.keys(baseMetadata).length > 0 ? baseMetadata : null,
        },
      });
      setSlotInlineEditOpen(false);
      toast('Card updated.', { variant: 'success' });
    } catch (error: unknown) {
      toast(error instanceof Error ? error.message : 'Failed to update card', { variant: 'error' });
    } finally {
      setSlotUpdateBusy(false);
    }
  };

  const handleClearSlotImage = async () => {
    if (!selectedSlot) return;
    if (isCardImageRemovalLocked(selectedSlot)) {
      toast('Card image is locked and can only be removed by deleting the card.', { variant: 'warning' });
      return;
    }
    setSlotUpdateBusy(true);
    try {
      clearInlineSlotSyncTimeouts();
      await updateSlotMutation.mutateAsync({
        id: selectedSlot.id,
        data: {
          imageFileId: null,
          imageUrl: null,
          imageBase64: null,
        },
      });
      setSlotImageUrlDraft('');
      setSlotBase64Draft('');
      toast('Card image cleared.', { variant: 'success' });
    } catch (error: unknown) {
      toast(error instanceof Error ? error.message : 'Failed to clear card image', { variant: 'error' });
    } finally {
      setSlotUpdateBusy(false);
    }
  };

  const handleApplyLinkedVariantToCard = async (variant: LinkedGeneratedVariant): Promise<void> => {
    if (!selectedSlot) return;
    setLinkedVariantApplyBusyKey(variant.key);
    setSlotUpdateBusy(true);
    try {
      clearInlineSlotSyncTimeouts();
      await updateSlotMutation.mutateAsync({
        id: selectedSlot.id,
        data: {
          imageFileId: variant.output.id,
          imageUrl: variant.output.filepath,
          imageBase64: null,
        },
      });
      setSlotImageUrlDraft(variant.output.filepath);
      setSlotBase64Draft('');
      toast('Linked variant applied to card.', { variant: 'success' });
    } catch (error: unknown) {
      toast(error instanceof Error ? error.message : 'Failed to apply linked variant.', { variant: 'error' });
    } finally {
      setLinkedVariantApplyBusyKey((current) => (current === variant.key ? null : current));
      setSlotUpdateBusy(false);
    }
  };

  const driveImportTitle =
    driveImportMode === 'replace'
      ? 'Attach Image To Selected Card'
      : driveImportMode === 'temporary-object'
        ? 'Select Object Image'
        : driveImportMode === 'environment'
          ? 'Select Environment Reference Image'
          : 'Import Images';
  const editCardModalHeader = (
    <div className='flex items-center gap-3'>
      <div className='flex items-center gap-4'>
        <Button
          onClick={() => {
            void handleSaveInlineSlot();
          }}
          disabled={slotUpdateBusy || !selectedSlot}
          className='min-w-[100px] border border-white/20 hover:border-white/40'
        >
          {slotUpdateBusy ? 'Saving...' : 'Save Card'}
        </Button>
        <div className='flex items-center gap-2'>
          <h2 className='text-2xl font-bold text-white'>Edit Card</h2>
        </div>
      </div>
    </div>
  );

  return (
    <>
      <input
        ref={localUploadInputRef}
        type='file'
        accept='image/*'
        multiple={false}
        className='hidden'
        onChange={(event: React.ChangeEvent<HTMLInputElement>) => {
          void handleLocalUpload(event.target.files);
        }}
      />
      <DriveImportModal
        isOpen={driveImportOpen}
        onClose={() => {
          setDriveImportOpen(false);
          setDriveImportMode('create');
          setDriveImportTargetId(null);
        }}
        onSuccess={() => {}}
        title={driveImportTitle}
        isUploading={uploadMutation.isPending}
        onLocalUploadTrigger={() => {
          setLocalUploadMode(driveImportMode);
          setLocalUploadTargetId(
            driveImportMode === 'replace' || driveImportMode === 'environment'
              ? (driveImportTargetId ?? selectedSlot?.id ?? null)
              : null
          );
          window.setTimeout(() => localUploadInputRef.current?.click(), 0);
        }}
        onSelectFile={(files) => {
          void handleDriveSelection(files);
        }}
      />

      <SlotCreateModal
        isOpen={slotCreateOpen}
        onClose={() => setSlotCreateOpen(false)}
        onSuccess={() => {}}
        disabled={!projectId}
        onSelectMode={(mode) => {
          if (mode === 'empty') {
            void handleCreateEmptySlot();
          } else if (mode === 'image') {
            setSlotCreateOpen(false);
            setDriveImportMode('create');
            setDriveImportTargetId(null);
            setDriveImportOpen(true);
          } else if (mode === 'local') {
            setSlotCreateOpen(false);
            triggerLocalUpload('create', null);
          }
        }}
      />

      <SlotInlineEditModal
        isOpen={slotInlineEditOpen}
        onClose={() => setSlotInlineEditOpen(false)}
        onSuccess={() => {}}
        selectedSlot={selectedSlot}
        onCopyId={(id) => { void handleCopyCardId(id); }}
        header={editCardModalHeader}
      >
        <Tabs
          value={editCardTab}
          onValueChange={(value: string) => {
            if (
              value === 'card' ||
              value === 'generations' ||
              value === 'environment' ||
              value === 'masks' ||
              value === 'composites'
            ) {
              setEditCardTab(value);
            }
          }}
          className='space-y-4'
        >
          <TabsList className='grid w-full grid-cols-5 bg-card/50'>
            <TabsTrigger value='card' className='text-xs'>Card</TabsTrigger>
            <TabsTrigger value='generations' className='text-xs'>Generations</TabsTrigger>
            <TabsTrigger value='environment' className='text-xs'>Environment</TabsTrigger>
            <TabsTrigger value='masks' className='text-xs'>Masks</TabsTrigger>
            <TabsTrigger value='composites' className='text-xs'>Composites</TabsTrigger>
          </TabsList>
          <SlotInlineEditCardTab
            clearImageDisabled={slotUpdateBusy || isCardImageRemovalLocked(selectedSlot)}
            clearImageTitle={
              isCardImageRemovalLocked(selectedSlot)
                ? 'Card image is locked and can only be removed by deleting the card.'
                : undefined
            }
            formatBytes={formatBytes}
            formatDateTime={formatDateTime}
            formatLinkedVariantTimestamp={formatLinkedVariantTimestamp}
            inlineCardImageManagerController={inlineCardImageManagerController}
            inlinePreviewBase64Bytes={inlinePreviewBase64Bytes}
            inlinePreviewDimensions={inlinePreviewDimensions}
            inlinePreviewMimeType={inlinePreviewMimeType}
            inlinePreviewSource={inlinePreviewSource}
            linkedGeneratedVariants={linkedGeneratedVariants}
            linkedRunsErrorMessage={
              linkedRunsQuery.error instanceof Error
                ? linkedRunsQuery.error.message
                : 'Failed to load linked variants.'
            }
            linkedRunsIsError={linkedRunsQuery.isError}
            linkedRunsIsFetching={linkedRunsQuery.isFetching}
            linkedRunsIsLoading={linkedRunsQuery.isLoading}
            linkedVariantApplyBusyKey={linkedVariantApplyBusyKey}
            onApplyLinkedVariantToCard={(variant) => {
              void handleApplyLinkedVariantToCard(variant);
            }}
            onClearSlotImage={() => {
              void handleClearSlotImage();
            }}
            onRefreshLinkedRuns={() => {
              void linkedRunsQuery.refetch();
            }}
            onReplaceFromDrive={() => {
              if (!selectedSlot) return;
              setSlotInlineEditOpen(false);
              setDriveImportMode('replace');
              setDriveImportTargetId(selectedSlot.id);
              setDriveImportOpen(true);
            }}
            onReplaceFromLocal={() => {
              if (!selectedSlot) return;
              setSlotInlineEditOpen(false);
              triggerLocalUpload('replace', selectedSlot.id);
            }}
            onSlotFolderChange={setSlotFolderDraft}
            onSlotNameChange={setSlotNameDraft}
            selectedSlot={selectedSlot}
            setInlinePreviewNaturalSize={setInlinePreviewNaturalSize}
            slotBase64Draft={slotBase64Draft}
            slotFolderDraft={slotFolderDraft}
            slotNameDraft={slotNameDraft}
            slotUpdateBusy={slotUpdateBusy}
            uploadPending={uploadMutation.isPending}
          />
          <SlotInlineEditGenerationsTab
            formatBytes={formatBytes}
            formatLinkedVariantTimestamp={formatLinkedVariantTimestamp}
            linkedGeneratedVariants={linkedGeneratedVariants}
            linkedRunsErrorMessage={
              linkedRunsQuery.error instanceof Error
                ? linkedRunsQuery.error.message
                : 'Failed to load generated images.'
            }
            linkedRunsIsError={linkedRunsQuery.isError}
            linkedRunsIsFetching={linkedRunsQuery.isFetching}
            linkedRunsIsLoading={linkedRunsQuery.isLoading}
            onOpenGenerationPreviewModal={handleOpenGenerationPreviewModal}
            onRefreshLinkedRuns={() => {
              void linkedRunsQuery.refetch();
            }}
            selectedGenerationPreview={selectedGenerationPreview}
            selectedGenerationPreviewDimensions={selectedGenerationPreviewDimensions}
            selectedSlotName={selectedSlot?.name}
            setGenerationPreviewNaturalSize={setGenerationPreviewNaturalSize}
            slotNameDraft={slotNameDraft}
          />
          <SlotInlineEditEnvironmentTab
            canClearEnvironmentImage={Boolean(
              environmentReferenceDraft.imageFileId || environmentReferenceDraft.imageUrl.trim()
            )}
            environmentPreviewDimensions={environmentPreviewDimensions}
            environmentPreviewSource={environmentPreviewSource}
            environmentReferenceDraft={environmentReferenceDraft}
            formatBytes={formatBytes}
            formatDateTime={formatDateTime}
            onClearEnvironmentImage={() => {
              setEnvironmentReferenceDraft({ ...EMPTY_ENVIRONMENT_REFERENCE_DRAFT });
              setEnvironmentPreviewNaturalSize(null);
            }}
            onUploadEnvironmentFromDrive={() => {
              if (!selectedSlot) return;
              setDriveImportMode('environment');
              setDriveImportTargetId(selectedSlot.id);
              setDriveImportOpen(true);
            }}
            onUploadEnvironmentFromLocal={() => {
              if (!selectedSlot) return;
              triggerLocalUpload('environment', selectedSlot.id);
            }}
            selectedSlotName={selectedSlot?.name}
            setEnvironmentPreviewNaturalSize={setEnvironmentPreviewNaturalSize}
            slotNameDraft={slotNameDraft}
            uploadPending={uploadMutation.isPending}
          />
          <SlotInlineEditMasksTab
            linkedMaskSlots={linkedMaskSlots}
            formatBytes={formatBytes}
            formatDateTime={formatDateTime}
          />
          <SlotInlineEditCompositesTab
            compositeTabInputImages={compositeTabInputImages}
            compositeTabInputSourceLabel={compositeTabInputSourceLabel}
            sourceCompositeImage={sourceCompositeImage}
            formatBytes={formatBytes}
            formatDateTime={formatDateTime}
          />
        </Tabs>
      </SlotInlineEditModal>

      <GenerationPreviewModal
        isOpen={generationPreviewModalOpen}
        onClose={() => setGenerationPreviewModalOpen(false)}
        selectedGenerationPreview={selectedGenerationPreview}
        selectedGenerationModalDimensions={selectedGenerationModalDimensions}
        slotUpdateBusy={slotUpdateBusy}
        handleApplyLinkedVariantToCard={handleApplyLinkedVariantToCard}
        setGenerationModalPreviewNaturalSize={setGenerationModalPreviewNaturalSize}
      />

      <ExtractPromptParamsModal
        isOpen={extractReviewOpen}
        onClose={() => setExtractReviewOpen(false)}
        extractDraftPrompt={extractDraftPrompt}
        setExtractDraftPrompt={setExtractDraftPrompt}
        extractBusy={extractBusy}
        handleSmartExtraction={() => { void handleSmartExtraction(); }}
        handleProgrammaticExtraction={() => { void handleProgrammaticExtraction(); }}
        handleAiExtraction={() => { void handleAiExtraction(); }}
        handleSuggestUiControls={() => { void handleSuggestUiControls(); }}
        handleApplyExtraction={handleApplyExtraction}
        previewParams={previewParams}
        extractError={extractError}
        extractHistory={extractHistory}
        selectedExtractHistory={selectedExtractHistory}
        selectedExtractDiffLines={selectedExtractDiffLines}
        selectedExtractChanged={selectedExtractChanged}
        setSelectedExtractHistoryId={setSelectedExtractHistoryId}
        setExtractHistory={setExtractHistory}
        studioSettings={studioSettings}
        previewValidation={previewValidation}
        previewLeaves={previewLeaves}
        previewControls={previewControls}
      />
    </>
  );
}
