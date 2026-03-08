'use client';

import { useEffect, useMemo, useRef, useState } from 'react';

import {
  DEFAULT_PRODUCT_IMAGES_EXTERNAL_BASE_URL,
  PRODUCT_IMAGES_EXTERNAL_BASE_URL_SETTING_KEY,
} from '@/shared/lib/products/constants';
import type { ImageStudioSlotRecord } from '@/shared/contracts/image-studio';
import { api } from '@/shared/lib/api-client';
import { createListQueryV2 } from '@/shared/lib/query-factories-v2';

import {
  EMPTY_ENVIRONMENT_REFERENCE_DRAFT,
  estimateBase64Bytes,
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
} from './slot-inline-edit-utils';
import { buildPromptDiffLines } from './prompt-extract-utils';
import { studioKeys } from '../../hooks/useImageStudioQueries';
import { flattenParams } from '@/shared/utils/prompt-params';
import type { ParamUiControl } from '@/features/ai/image-studio/utils/param-ui';
import type { ParamSpec, PromptValidationIssue } from '@/shared/contracts/prompt-engine';

import type {
  EditCardTab,
  StudioInlineEditStateContextValue,
} from './StudioInlineEditContext.types';
import type {
  EnvironmentReferenceDraftViewModel as EnvironmentReferenceDraft,
  LinkedGeneratedRunsResponse,
} from './slot-inline-edit-tab-types';

type PreviewSize = { width: number; height: number } | null;

export function useStudioInlineEditRuntimeState({
  projectId,
  settingsStore,
  slots,
  compositeAssets,
  selectedFolder,
  selectedSlot,
  slotInlineEditOpen,
  slotImageUrlDraft,
  slotBase64Draft,
  extractDraftPrompt: _extractDraftPrompt,
}: {
  projectId: string | null | undefined;
  settingsStore: { get: (key: string) => string | undefined };
  slots: ImageStudioSlotRecord[];
  compositeAssets: ImageStudioSlotRecord[];
  selectedFolder: string;
  selectedSlot: ImageStudioSlotRecord | null;
  slotInlineEditOpen: boolean;
  slotImageUrlDraft: string;
  slotBase64Draft: string;
  extractDraftPrompt: string;
}) {
  const [slotNameDraft, setSlotNameDraft] = useState('');
  const [slotFolderDraft, setSlotFolderDraft] = useState('');
  const [extractBusy, setExtractBusy] = useState<'none' | 'programmatic' | 'smart' | 'ai' | 'ui'>(
    'none'
  );
  const [extractError, setExtractError] = useState<string | null>(null);
  const [previewParams, setPreviewParams] = useState<Record<string, unknown> | null>(null);
  const [previewSpecs, setPreviewSpecs] = useState<Record<string, ParamSpec> | null>(null);
  const [previewControls, setPreviewControls] = useState<Record<string, ParamUiControl>>({});
  const [previewValidation, setPreviewValidation] = useState<{
    before: PromptValidationIssue[];
    after: PromptValidationIssue[];
  } | null>(null);
  const [extractHistory, setExtractHistory] =
    useState<StudioInlineEditStateContextValue['extractHistory']>([]);
  const [selectedExtractHistoryId, setSelectedExtractHistoryId] = useState<string | null>(null);
  const [editCardTab, setEditCardTab] = useState<EditCardTab>('card');
  const [environmentReferenceDraft, setEnvironmentReferenceDraft] =
    useState<EnvironmentReferenceDraft>(EMPTY_ENVIRONMENT_REFERENCE_DRAFT);
  const [environmentPreviewNaturalSize, setEnvironmentPreviewNaturalSize] =
    useState<PreviewSize>(null);
  const [linkedVariantApplyBusyKey, setLinkedVariantApplyBusyKey] = useState<string | null>(null);
  const [inlinePreviewNaturalSize, setInlinePreviewNaturalSize] = useState<PreviewSize>(null);
  const [generationPreviewKey, setGenerationPreviewKey] = useState<string | null>(null);
  const [generationPreviewNaturalSize, setGenerationPreviewNaturalSize] =
    useState<PreviewSize>(null);
  const [generationPreviewModalOpen, setGenerationPreviewModalOpen] = useState(false);
  const [generationModalPreviewNaturalSize, setGenerationModalPreviewNaturalSize] =
    useState<PreviewSize>(null);

  const inlineSlotLinkSyncTimeoutRef = useRef<number | null>(null);
  const inlineSlotBase64SyncTimeoutRef = useRef<number | null>(null);
  const suppressNextInlineDraftPersistenceOpsRef = useRef(0);

  const productImagesExternalBaseUrl = useMemo(
    () =>
      settingsStore.get(PRODUCT_IMAGES_EXTERNAL_BASE_URL_SETTING_KEY) ??
      DEFAULT_PRODUCT_IMAGES_EXTERNAL_BASE_URL,
    [settingsStore]
  );

  const linkedRunsQuery = createListQueryV2<
    LinkedGeneratedRunsResponse,
    LinkedGeneratedRunsResponse
  >({
    queryKey: studioKeys.runs({
      projectId: projectId ?? null,
      sourceSlotId: selectedSlot?.id ?? null,
      status: 'completed',
      scope: 'slot-inline-edit',
    }),
    queryFn: async () => {
      if (!projectId || !selectedSlot?.id) {
        return { runs: [], total: 0 };
      }
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
    meta: {
      source: 'image-studio.modals.linked-runs',
      operation: 'list',
      resource: 'image-studio.runs',
      domain: 'image_studio',
      tags: ['image-studio', 'runs', 'linked-variants'],
      description: 'Loads image studio runs.',
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
    [generationPreviewNaturalSize, selectedGenerationPreview]
  );

  const selectedGenerationModalDimensions = useMemo(
    () =>
      resolveDimensionLabel(
        selectedGenerationPreview?.output.width,
        selectedGenerationPreview?.output.height,
        generationModalPreviewNaturalSize?.width,
        generationModalPreviewNaturalSize?.height
      ),
    [generationModalPreviewNaturalSize, selectedGenerationPreview]
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
    [productImagesExternalBaseUrl, selectedSlot, slotBase64Draft, slotImageUrlDraft]
  );

  const inlinePreviewBase64Bytes = useMemo(
    () => estimateBase64Bytes(slotBase64Draft),
    [slotBase64Draft]
  );
  const inlinePreviewMimeType = useMemo(
    () => resolveInlinePreviewMimeType(selectedSlot?.imageFile?.mimetype, slotBase64Draft),
    [selectedSlot, slotBase64Draft]
  );

  const inlinePreviewDimensions = useMemo(
    () =>
      resolveDimensionLabel(
        selectedSlot?.imageFile?.width,
        selectedSlot?.imageFile?.height,
        inlinePreviewNaturalSize?.width,
        inlinePreviewNaturalSize?.height
      ),
    [inlinePreviewNaturalSize, selectedSlot]
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
    [environmentPreviewNaturalSize, environmentReferenceDraft]
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
    () => mapSavedCompositeInputImages({ selectedSlot, slots, productImagesExternalBaseUrl }),
    [productImagesExternalBaseUrl, selectedSlot, slots]
  );

  const activeCompositeInputImages = useMemo(
    () => mapActiveCompositeInputImages(compositeAssets, productImagesExternalBaseUrl),
    [compositeAssets, productImagesExternalBaseUrl]
  );

  const compositeTabInputImages = useMemo(
    () =>
      savedCompositeInputImages.length > 0 ? savedCompositeInputImages : activeCompositeInputImages,
    [activeCompositeInputImages, savedCompositeInputImages]
  );
  const compositeTabInputSourceLabel = useMemo(
    () =>
      resolveCompositeTabInputSourceLabel(
        savedCompositeInputImages.length,
        activeCompositeInputImages.length
      ),
    [activeCompositeInputImages.length, savedCompositeInputImages.length]
  );

  const previewLeaves = useMemo(
    () => (previewParams ? flattenParams(previewParams).filter((leaf) => Boolean(leaf.path)) : []),
    [previewParams]
  );

  const selectedExtractHistory = useMemo(() => {
    if (extractHistory.length === 0) {
      return null;
    }
    if (!selectedExtractHistoryId) {
      return extractHistory[0] ?? null;
    }
    return (
      extractHistory.find((entry) => entry.id === selectedExtractHistoryId) ??
      extractHistory[0] ??
      null
    );
  }, [extractHistory, selectedExtractHistoryId]);

  const selectedExtractDiffLines = useMemo(() => {
    if (!selectedExtractHistory) {
      return [];
    }
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

  useEffect(() => {
    if (!slotInlineEditOpen || !selectedSlot) {
      return;
    }
    setGenerationPreviewKey(null);
    setEditCardTab('card');
    setSlotNameDraft(selectedSlot.name ?? '');
    setSlotFolderDraft(selectedSlot.folderPath ?? selectedFolder ?? '');
    setEnvironmentReferenceDraft(readEnvironmentReferenceDraft(selectedSlot));
  }, [selectedFolder, selectedSlot, slotInlineEditOpen]);

  return {
    editCardTab,
    setEditCardTab,
    slotNameDraft,
    setSlotNameDraft,
    slotFolderDraft,
    setSlotFolderDraft,
    extractBusy,
    setExtractBusy,
    extractError,
    setExtractError,
    previewParams,
    setPreviewParams,
    previewSpecs,
    setPreviewSpecs,
    previewControls,
    setPreviewControls,
    previewValidation,
    setPreviewValidation,
    extractHistory,
    setExtractHistory,
    selectedExtractHistoryId,
    setSelectedExtractHistoryId,
    environmentReferenceDraft,
    setEnvironmentReferenceDraft,
    environmentPreviewNaturalSize,
    setEnvironmentPreviewNaturalSize,
    linkedVariantApplyBusyKey,
    setLinkedVariantApplyBusyKey,
    inlinePreviewNaturalSize,
    setInlinePreviewNaturalSize,
    generationPreviewKey,
    setGenerationPreviewKey,
    generationPreviewNaturalSize,
    setGenerationPreviewNaturalSize,
    generationPreviewModalOpen,
    setGenerationPreviewModalOpen,
    generationModalPreviewNaturalSize,
    setGenerationModalPreviewNaturalSize,
    inlineSlotLinkSyncTimeoutRef,
    inlineSlotBase64SyncTimeoutRef,
    suppressNextInlineDraftPersistenceOpsRef,
    productImagesExternalBaseUrl,
    linkedRunsQuery,
    linkedGeneratedVariants,
    selectedGenerationPreview,
    selectedGenerationPreviewDimensions,
    selectedGenerationModalDimensions,
    linkedMaskSlots,
    inlinePreviewSource,
    inlinePreviewBase64Bytes,
    inlinePreviewMimeType,
    inlinePreviewDimensions,
    environmentPreviewSource,
    environmentPreviewDimensions,
    sourceCompositeImage,
    compositeTabInputImages,
    compositeTabInputSourceLabel,
    previewLeaves,
    selectedExtractHistory,
    selectedExtractDiffLines,
    selectedExtractChanged,
  };
}
