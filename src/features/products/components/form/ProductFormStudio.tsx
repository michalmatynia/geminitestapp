'use client';

import { useQueryClient } from '@tanstack/react-query';
import { Check, Loader2, Monitor, RotateCcw, RotateCw, Trash2 } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';

import { clampSplitZoom } from '@/features/ai/image-studio/components/center-preview/preview-utils';
import { SplitVariantPreview } from '@/features/ai/image-studio/components/center-preview/SplitVariantPreview';
import { SplitViewControls } from '@/features/ai/image-studio/components/center-preview/SplitViewControls';
import { studioKeys, useStudioProjects } from '@/features/ai/image-studio/hooks/useImageStudioQueries';
import type { ImageStudioSlotRecord } from '@/features/ai/image-studio/types';
import { getImageStudioSlotImageSrc } from '@/features/ai/image-studio/utils/image-src';
import {
  DEFAULT_PRODUCT_IMAGES_EXTERNAL_BASE_URL,
  PRODUCT_IMAGES_EXTERNAL_BASE_URL_SETTING_KEY,
} from '@/features/products/constants';
import { useProductFormContext } from '@/features/products/context/ProductFormContext';
import { invalidateProductsAndCounts } from '@/features/products/hooks/productCache';
import type { ProductWithImages } from '@/features/products/types';
import type {
  ProductStudioExecutionRoute,
  ProductStudioSequenceGenerationMode,
  ProductStudioSequenceReadiness,
} from '@/features/products/types/product-studio';
import { resolveProductImageUrl } from '@/features/products/utils/image-routing';
import { api } from '@/shared/lib/api-client';
import { useSettingsStore } from '@/shared/providers/SettingsStoreProvider';
import { Button, FormField, FormSection, SelectSimple, useToast, StatusBadge, Alert } from '@/shared/ui';
import { cn } from '@/shared/utils';

type ProductStudioVariantsResponse = {
  sequencing: {
    persistedEnabled: boolean;
    enabled: boolean;
    runViaSequence: boolean;
    sequenceStepCount: number;
    snapshotSavedAt: string | null;
    snapshotMatchesCurrent: boolean;
    needsSaveDefaults: boolean;
    needsSaveDefaultsReason: string | null;
  };
  sequencingDiagnostics: {
    projectId: string | null;
    projectSettingsKey: string | null;
    selectedSettingsKey: string | null;
    selectedScope: 'project' | 'global' | 'default';
    hasProjectSettings: boolean;
    hasGlobalSettings: boolean;
    projectSequencingEnabled: boolean;
    globalSequencingEnabled: boolean;
    selectedSequencingEnabled: boolean;
    selectedSnapshotHash: string | null;
    selectedSnapshotSavedAt: string | null;
    selectedSnapshotStepCount: number;
    selectedSnapshotModelId: string | null;
  };
  sequenceReadiness: ProductStudioSequenceReadiness;
  sequenceGenerationMode: ProductStudioSequenceGenerationMode;
  projectId: string | null;
  sourceSlotId: string | null;
  sourceSlot: ImageStudioSlotRecord | null;
  variants: ImageStudioSlotRecord[];
};

type ProductStudioSendResponse = {
  runId: string;
  runStatus: 'queued' | 'running' | 'completed' | 'failed' | 'cancelled';
  expectedOutputs: number;
  dispatchMode: 'queued' | 'inline';
  runKind: 'generation' | 'sequence';
  sequenceRunId: string | null;
  requestedSequenceMode: ProductStudioSequenceGenerationMode;
  resolvedSequenceMode: ProductStudioSequenceGenerationMode;
  executionRoute: ProductStudioExecutionRoute;
  sequenceReadiness?: ProductStudioSequenceReadiness;
  sequencingDiagnostics?: ProductStudioVariantsResponse['sequencingDiagnostics'];
  warnings?: string[];
};

type ProductStudioPreflightResponse = {
  sequenceGenerationMode: ProductStudioSequenceGenerationMode;
  requestedSequenceMode: ProductStudioSequenceGenerationMode;
  resolvedSequenceMode: ProductStudioSequenceGenerationMode;
  executionRoute: ProductStudioExecutionRoute;
  sequencing: ProductStudioVariantsResponse['sequencing'];
  sequencingDiagnostics: ProductStudioVariantsResponse['sequencingDiagnostics'];
  sequenceReadiness: ProductStudioSequenceReadiness;
  warnings: string[];
};

type ProductStudioAcceptResponse = {
  product: ProductWithImages;
};

type ProductStudioRotateResponse = {
  product: ProductWithImages;
};

type ProductStudioDeleteVariantResponse = {
  ok: boolean;
  modeUsed: 'slot_cascade' | 'asset_only' | 'noop';
  deletedSlotIds: string[];
  warnings?: string[];
};

type ProductStudioAuditEntry = {
  id: string;
  createdAt: string;
  status: 'completed' | 'failed';
  imageSlotIndex: number;
  executionRoute: ProductStudioExecutionRoute;
  requestedSequenceMode: ProductStudioSequenceGenerationMode;
  resolvedSequenceMode: ProductStudioSequenceGenerationMode;
  runKind: 'generation' | 'sequence';
  runId: string | null;
  sequenceRunId: string | null;
  dispatchMode: 'queued' | 'inline' | null;
  fallbackReason: string | null;
  warnings: string[];
  settingsScope: 'project' | 'global' | 'default';
  settingsKey: string | null;
  projectSettingsKey: string | null;
  settingsScopeValid: boolean;
  sequenceSnapshotHash: string | null;
  stepOrderUsed: string[];
  resolvedCropRect: {
    x: number;
    y: number;
    width: number;
    height: number;
  } | null;
  sourceImageSize: {
    width: number;
    height: number;
  } | null;
  timings: {
    importMs: number | null;
    sourceSlotUpsertMs: number | null;
    routeDecisionMs: number | null;
    dispatchMs: number | null;
    totalMs: number;
  };
  errorMessage: string | null;
};

type ProductStudioAuditResponse = {
  entries: ProductStudioAuditEntry[];
};

type RunStatusResponse = {
  run?: {
    id: string;
    status: 'queued' | 'running' | 'completed' | 'failed';
  };
};

type SequenceRunStatusResponse = {
  run?: {
    id: string;
    status: 'queued' | 'running' | 'completed' | 'failed' | 'cancelled';
  };
};

type ProductImageSlotPreview = {
  index: number;
  label: string;
  src: string;
};

const SPLIT_ZOOM_RESET = 1;
const SPLIT_ZOOM_STEP = 0.1;

const getSlotTimestamp = (slot: ImageStudioSlotRecord): string | null => {
  const metadata = slot.metadata;
  if (!metadata || typeof metadata !== 'object' || Array.isArray(metadata)) {
    return null;
  }

  const generationParams = (metadata)['generationParams'];
  if (!generationParams || typeof generationParams !== 'object' || Array.isArray(generationParams)) {
    return null;
  }

  const timestamp = (generationParams as Record<string, unknown>)['timestamp'];
  return typeof timestamp === 'string' ? timestamp.trim() || null : null;
};

const formatTimestamp = (value: string | null): string => {
  if (!value) return 'n/a';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleString();
};

export default function ProductFormStudio(): React.JSX.Element {
  const {
    product,
    imageSlots,
    studioProjectId,
    setStudioProjectId,
    studioConfigLoading,
    studioConfigSaving,
    refreshImagesFromProduct,
  } = useProductFormContext();
  const studioProjectsQuery = useStudioProjects();
  const studioProjectOptions = useMemo(
    () => [
      { value: '', label: 'Not Connected' },
      ...(studioProjectsQuery.data ?? []).map((project) => ({
        value: project.id,
        label: project.id,
      })),
    ],
    [studioProjectsQuery.data]
  );

  const { toast } = useToast();
  const queryClient = useQueryClient();
  const settingsStore = useSettingsStore();
  const productImagesExternalBaseUrl =
    settingsStore.get(PRODUCT_IMAGES_EXTERNAL_BASE_URL_SETTING_KEY) ??
    DEFAULT_PRODUCT_IMAGES_EXTERNAL_BASE_URL;

  const [selectedImageIndex, setSelectedImageIndex] = useState<number | null>(null);
  const [variantsData, setVariantsData] = useState<ProductStudioVariantsResponse | null>(null);
  const [variantsLoading, setVariantsLoading] = useState(false);
  const [studioActionError, setStudioActionError] = useState<string | null>(null);
  const [selectedVariantSlotId, setSelectedVariantSlotId] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [accepting, setAccepting] = useState(false);
  const [rotatingDirection, setRotatingDirection] = useState<'left' | 'right' | null>(null);
  const [deletingVariantId, setDeletingVariantId] = useState<string | null>(null);
  const [auditEntries, setAuditEntries] = useState<ProductStudioAuditEntry[]>([]);
  const [auditLoading, setAuditLoading] = useState(false);
  const [auditError, setAuditError] = useState<string | null>(null);
  const [activeRunId, setActiveRunId] = useState<string | null>(null);
  const [activeRunKind, setActiveRunKind] = useState<'generation' | 'sequence' | null>(null);
  const [activeRunBaselineVariantIds, setActiveRunBaselineVariantIds] = useState<string[]>([]);
  const [pendingExpectedOutputs, setPendingExpectedOutputs] = useState<number>(0);
  const [runStatus, setRunStatus] = useState<
    'queued' | 'running' | 'completed' | 'failed' | 'cancelled' | null
  >(null);
  const [singleVariantView, setSingleVariantView] = useState<'variant' | 'source'>('variant');
  const [splitVariantView, setSplitVariantView] = useState(false);
  const [leftSplitZoom, setLeftSplitZoom] = useState(SPLIT_ZOOM_RESET);
  const [rightSplitZoom, setRightSplitZoom] = useState(SPLIT_ZOOM_RESET);

  const imageSlotPreviews = useMemo((): ProductImageSlotPreview[] => {
    return imageSlots
      .map((slot, index): ProductImageSlotPreview | null => {
        if (!slot) return null;
        const src =
          slot.type === 'file'
            ? slot.previewUrl
            : resolveProductImageUrl(slot.data.filepath, productImagesExternalBaseUrl) ??
              slot.previewUrl;
        if (!src) return null;
        return {
          index,
          label: `Slot ${index + 1}`,
          src,
        };
      })
      .filter((entry): entry is ProductImageSlotPreview => Boolean(entry));
  }, [imageSlots, productImagesExternalBaseUrl]);

  useEffect(() => {
    if (imageSlotPreviews.length === 0) {
      setSelectedImageIndex(null);
      return;
    }

    if (
      selectedImageIndex !== null &&
      imageSlotPreviews.some((preview) => preview.index === selectedImageIndex)
    ) {
      return;
    }

    setSelectedImageIndex(imageSlotPreviews[0]?.index ?? null);
  }, [imageSlotPreviews, selectedImageIndex]);

  useEffect(() => {
    setSingleVariantView('variant');
    setSplitVariantView(false);
    setLeftSplitZoom(SPLIT_ZOOM_RESET);
    setRightSplitZoom(SPLIT_ZOOM_RESET);
  }, [selectedImageIndex, selectedVariantSlotId]);

  const refreshVariants = useCallback(async (): Promise<ProductStudioVariantsResponse | null> => {
    if (!product?.id || !studioProjectId || selectedImageIndex === null) {
      setVariantsData(null);
      setSelectedVariantSlotId(null);
      return null;
    }

    setVariantsLoading(true);
    setStudioActionError(null);

    try {
      const response = await api.get<ProductStudioVariantsResponse>(
        `/api/products/${encodeURIComponent(product.id)}/studio/variants`,
        {
          params: {
            imageSlotIndex: selectedImageIndex,
            projectId: studioProjectId,
          },
          cache: 'no-store',
        }
      );

      setVariantsData(response);
      setSelectedVariantSlotId((current) => {
        if (current && response.variants.some((slot) => slot.id === current)) {
          return current;
        }
        return response.variants[0]?.id ?? null;
      });
      return response;
    } catch (error) {
      setVariantsData(null);
      setSelectedVariantSlotId(null);
      setStudioActionError(
        error instanceof Error ? error.message : 'Failed to load Studio variants.'
      );
      return null;
    } finally {
      setVariantsLoading(false);
    }
  }, [product?.id, selectedImageIndex, studioProjectId]);

  useEffect(() => {
    void refreshVariants();
  }, [refreshVariants]);

  const refreshAudit = useCallback(async (): Promise<void> => {
    if (!product?.id || !studioProjectId || selectedImageIndex === null) {
      setAuditEntries([]);
      setAuditError(null);
      return;
    }

    setAuditLoading(true);
    setAuditError(null);
    try {
      const response = await api.get<ProductStudioAuditResponse>(
        `/api/products/${encodeURIComponent(product.id)}/studio/audit`,
        {
          params: {
            imageSlotIndex: selectedImageIndex,
            limit: 40,
          },
          cache: 'no-store',
          logError: false,
        },
      );
      setAuditEntries(Array.isArray(response.entries) ? response.entries : []);
    } catch (error) {
      setAuditEntries([]);
      setAuditError(error instanceof Error ? error.message : 'Failed to load run audit history.');
    } finally {
      setAuditLoading(false);
    }
  }, [product?.id, selectedImageIndex, studioProjectId]);

  useEffect(() => {
    void refreshAudit();
  }, [refreshAudit]);

  useEffect(() => {
    if (!activeRunId || !activeRunKind || !product?.id || selectedImageIndex === null || !studioProjectId) {
      return;
    }

    let cancelled = false;
    const timer = setInterval(() => {
      const request = activeRunKind === 'sequence'
        ? api.get<SequenceRunStatusResponse>(
          `/api/image-studio/sequences/${encodeURIComponent(activeRunId)}`,
          {
            cache: 'no-store',
            logError: false,
          }
        )
        : api.get<RunStatusResponse>(
          `/api/image-studio/runs/${encodeURIComponent(activeRunId)}`,
          {
            cache: 'no-store',
            logError: false,
          }
        );

      void request
        .then((response) => {
          if (cancelled) return;
          const status = response.run?.status ?? null;
          if (!status) return;
          setRunStatus(status);
          const terminal =
            status === 'completed' ||
            status === 'failed' ||
            status === 'cancelled';
          if (terminal) {
            const baselineIdsSet = new Set(activeRunBaselineVariantIds);
            clearInterval(timer);
            setActiveRunId(null);
            setActiveRunKind(null);
            void (async (): Promise<void> => {
              if (status === 'completed') {
                const expectedCount = Math.max(
                  0,
                  Math.floor(pendingExpectedOutputs ?? 0),
                );
                if (expectedCount > 0) {
                  const maxAttempts = 12;
                  for (let attempt = 0; attempt < maxAttempts && !cancelled; attempt += 1) {
                    const latest = await refreshVariants();
                    const latestVariants = Array.isArray(latest?.variants)
                      ? latest.variants
                      : [];
                    const producedSinceRunCount =
                      baselineIdsSet.size > 0
                        ? latestVariants.filter((slot) => !baselineIdsSet.has(slot.id)).length
                        : latestVariants.length;
                    if (producedSinceRunCount >= expectedCount) {
                      break;
                    }
                    await new Promise<void>((resolve) => {
                      window.setTimeout(resolve, 900);
                    });
                  }
                } else {
                  await refreshVariants();
                }
              } else {
                await refreshVariants();
              }
            })();
            setActiveRunBaselineVariantIds([]);
            setPendingExpectedOutputs(0);
            void refreshAudit();
          }
        })
        .catch(() => {
          if (cancelled) return;
          setActiveRunId(null);
          setActiveRunKind(null);
          setActiveRunBaselineVariantIds([]);
          setRunStatus('failed');
        });
    }, 2000);

    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [
    activeRunId,
    activeRunKind,
    activeRunBaselineVariantIds,
    pendingExpectedOutputs,
    product?.id,
    refreshAudit,
    refreshVariants,
    selectedImageIndex,
    studioProjectId,
  ]);

  const selectedSourcePreview = useMemo(() => {
    if (selectedImageIndex === null) return null;
    return (
      imageSlotPreviews.find((preview) => preview.index === selectedImageIndex) ?? null
    );
  }, [imageSlotPreviews, selectedImageIndex]);

  const variants = variantsData?.variants ?? [];
  const activeRunBaselineVariantIdSet = useMemo(
    () => new Set(activeRunBaselineVariantIds),
    [activeRunBaselineVariantIds],
  );
  const variantsProducedForActiveRun = useMemo((): number => {
    if (activeRunBaselineVariantIdSet.size === 0) return variants.length;
    return variants.filter((slot) => !activeRunBaselineVariantIdSet.has(slot.id)).length;
  }, [activeRunBaselineVariantIdSet, variants]);
  const pendingVariantPlaceholderCount =
    activeRunId && (runStatus === 'queued' || runStatus === 'running')
      ? Math.max(0, pendingExpectedOutputs - variantsProducedForActiveRun)
      : 0;
  const selectedVariant =
    variants.find((slot) => slot.id === selectedVariantSlotId) ?? variants[0] ?? null;

  const sourceImageSrc =
    getImageStudioSlotImageSrc(
      variantsData?.sourceSlot,
      productImagesExternalBaseUrl
    ) ?? selectedSourcePreview?.src ?? null;
  const variantImageSrc = getImageStudioSlotImageSrc(
    selectedVariant,
    productImagesExternalBaseUrl
  );

  const canCompareWithSource = Boolean(sourceImageSrc && variantImageSrc);
  const selectedSequenceMode = variantsData?.sequenceGenerationMode ?? 'auto';
  const sequencingDiagnostics = variantsData?.sequencingDiagnostics ?? null;
  const sequenceReadiness = variantsData?.sequenceReadiness ?? null;
  const sequenceReadinessMessage = useMemo((): string | null => {
    if (!sequenceReadiness) return null;
    if (!sequenceReadiness.requiresProjectSequence) return null;
    if (sequenceReadiness.ready) return null;
    return sequenceReadiness.message ?? 'Project sequencing is not ready.';
  }, [
    sequenceReadiness,
  ]);
  const blockSendForSequenceReadiness = Boolean(sequenceReadinessMessage);

  useEffect(() => {
    if (canCompareWithSource) return;
    setSingleVariantView('variant');
    setSplitVariantView(false);
  }, [canCompareWithSource]);

  const handleSendToStudio = async (): Promise<void> => {
    if (!product?.id || !studioProjectId || selectedImageIndex === null) return;

    setSending(true);
    setStudioActionError(null);
    const baselineVariantIds = (variantsData?.variants ?? [])
      .map((slot) => slot.id)
      .filter((value): value is string => typeof value === 'string' && value.trim().length > 0);

    try {
      const preflight = await api.get<ProductStudioPreflightResponse>(
        `/api/products/${encodeURIComponent(product.id)}/studio/preflight`,
        {
          params: {
            imageSlotIndex: selectedImageIndex,
            projectId: studioProjectId,
            sequenceGenerationMode: selectedSequenceMode,
          },
          cache: 'no-store',
        },
      );
      if (!preflight.sequenceReadiness.ready) {
        const message =
          preflight.sequenceReadiness.message ??
          'Project sequencing is not ready.';
        setStudioActionError(message);
        toast(message, { variant: 'error' });
        setVariantsData((prev) =>
          prev
            ? {
              ...prev,
              sequencing: preflight.sequencing,
              sequencingDiagnostics: preflight.sequencingDiagnostics,
              sequenceReadiness: preflight.sequenceReadiness,
              sequenceGenerationMode: preflight.sequenceGenerationMode,
            }
            : prev,
        );
        return;
      }

      const result = await api.post<ProductStudioSendResponse>(
        `/api/products/${encodeURIComponent(product.id)}/studio/send`,
        {
          imageSlotIndex: selectedImageIndex,
          projectId: studioProjectId,
        }
      );

      setActiveRunId(result.runId);
      setActiveRunKind(result.runKind);
      setActiveRunBaselineVariantIds(baselineVariantIds);
      setRunStatus(result.runStatus);
      setPendingExpectedOutputs(Math.max(0, Math.floor(result.expectedOutputs ?? 0)));
      toast(
        result.runKind === 'sequence'
          ? 'Running Image Studio project sequence exactly as configured.'
          : result.executionRoute === 'ai_model_full_sequence'
            ? 'Image sent for model-native full sequence generation.'
            : 'Image sent to Studio.',
        { variant: 'success' }
      );
      if (Array.isArray(result.warnings) && result.warnings.length > 0) {
        result.warnings.forEach((message) => {
          const warning = message.trim();
          if (!warning) return;
          toast(warning, { variant: 'warning' });
        });
      }
      await queryClient.invalidateQueries({
        queryKey: studioKeys.slots(studioProjectId),
      });
      await refreshVariants();
      await refreshAudit();
    } catch (error) {
      setActiveRunBaselineVariantIds([]);
      const message =
        error instanceof Error
          ? error.message
          : 'Failed to send image to Studio.';
      setStudioActionError(message);
      toast(message, { variant: 'error' });
    } finally {
      setSending(false);
    }
  };

  const handleAcceptVariant = async (): Promise<void> => {
    if (!product?.id || !studioProjectId || selectedImageIndex === null) return;
    if (!selectedVariant?.id) {
      toast('Select a generated variant first.', { variant: 'info' });
      return;
    }

    setAccepting(true);
    setStudioActionError(null);

    try {
      const response = await api.post<ProductStudioAcceptResponse>(
        `/api/products/${encodeURIComponent(product.id)}/studio/accept`,
        {
          imageSlotIndex: selectedImageIndex,
          generationSlotId: selectedVariant.id,
          projectId: studioProjectId,
        }
      );

      refreshImagesFromProduct(response.product);
      await invalidateProductsAndCounts(queryClient);
      toast('Variant accepted and saved to product images.', {
        variant: 'success',
      });
      await refreshVariants();
      await refreshAudit();
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : 'Failed to accept generated variant.';
      setStudioActionError(message);
      toast(message, { variant: 'error' });
    } finally {
      setAccepting(false);
    }
  };

  const handleDeleteVariant = async (slot: ImageStudioSlotRecord): Promise<void> => {
    if (!studioProjectId) return;
    if (!slot.id) return;

    setDeletingVariantId(slot.id);
    setStudioActionError(null);

    try {
      const response = await api.post<ProductStudioDeleteVariantResponse>(
        `/api/image-studio/projects/${encodeURIComponent(studioProjectId)}/variants/delete`,
        {
          slotId: slot.id,
          sourceSlotId: variantsData?.sourceSlotId ?? undefined,
          assetId: slot.imageFileId ?? slot.imageFile?.id ?? undefined,
          filepath: slot.imageFile?.filepath ?? slot.imageUrl ?? undefined,
        },
      );
      if (response.modeUsed === 'noop') {
        toast(response.warnings?.[0] || 'Variant was already removed.', { variant: 'info' });
      } else {
        toast('Variant deleted.', { variant: 'success' });
      }
      await refreshVariants();
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : 'Failed to delete generated variant.';
      setStudioActionError(message);
      toast(message, { variant: 'error' });
    } finally {
      setDeletingVariantId(null);
    }
  };

  const handleRotateImageSlot = async (direction: 'left' | 'right'): Promise<void> => {
    if (!product?.id || selectedImageIndex === null) return;

    setRotatingDirection(direction);
    setStudioActionError(null);

    try {
      const response = await api.post<ProductStudioRotateResponse>(
        `/api/products/${encodeURIComponent(product.id)}/studio/rotate`,
        {
          imageSlotIndex: selectedImageIndex,
          direction,
        }
      );
      refreshImagesFromProduct(response.product);
      await invalidateProductsAndCounts(queryClient);
      await refreshVariants();
      toast(
        direction === 'left'
          ? 'Image rotated 90° left.'
          : 'Image rotated 90° right.',
        { variant: 'success' },
      );
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : 'Failed to rotate the selected image slot.';
      setStudioActionError(message);
      toast(message, { variant: 'error' });
    } finally {
      setRotatingDirection(null);
    }
  };

  if (!studioProjectId) {
    return (
      <FormSection
        title='Studio'
        description='Connect this product to an Image Studio project to enable permanent listing generations.'
      >
        <FormField
          id='studioProjectIdFromStudioTab'
          label='Studio Project'
          description='Once selected, you can send product images to Studio and accept generated variants into image slots.'
        >
          <SelectSimple size='sm'
            value={studioProjectId ?? ''}
            onValueChange={(value: string): void => {
              setStudioProjectId(value || null);
            }}
            options={studioProjectOptions}
            placeholder={
              studioProjectsQuery.isLoading
                ? 'Loading Studio projects...'
                : 'Select Studio project'
            }
            disabled={
              studioConfigLoading ||
              studioConfigSaving ||
              studioProjectsQuery.isLoading
            }
            triggerClassName={
              studioConfigLoading || studioConfigSaving ? 'opacity-70' : ''
            }
          />
        </FormField>
      </FormSection>
    );
  }

  if (!product?.id) {
    return (
      <FormSection
        title='Studio'
        description='Save the product first to start permanent Studio generations and autosave accepts.'
      />
    );
  }

  return (
    <div className='space-y-4'>
      <FormSection
        title='Studio'
        description='Pick a product image, send it to Studio, preview generated variants, then accept one to autosave it into this image slot.'
      >
        <div className='flex flex-wrap items-center gap-2'>
          <Button size='xs'
            type='button'
            variant='outline'
            onClick={(): void => {
              void handleRotateImageSlot('left');
            }}
            disabled={sending || accepting || rotatingDirection !== null || selectedImageIndex === null || !selectedSourcePreview}
            title='Rotate selected image slot 90° left'
          >
            {rotatingDirection === 'left' ? (
              <Loader2 className='mr-2 size-4 animate-spin' />
            ) : (
              <RotateCcw className='mr-2 size-4' />
            )}
            Rotate Left
          </Button>

          <Button size='xs'
            type='button'
            variant='outline'
            onClick={(): void => {
              void handleRotateImageSlot('right');
            }}
            disabled={sending || accepting || rotatingDirection !== null || selectedImageIndex === null || !selectedSourcePreview}
            title='Rotate selected image slot 90° right'
          >
            {rotatingDirection === 'right' ? (
              <Loader2 className='mr-2 size-4 animate-spin' />
            ) : (
              <RotateCw className='mr-2 size-4' />
            )}
            Rotate Right
          </Button>

          <Button size='xs'
            type='button'
            onClick={(): void => {
              void handleSendToStudio();
            }}
            disabled={
              sending ||
              accepting ||
              blockSendForSequenceReadiness ||
              selectedImageIndex === null ||
              !selectedSourcePreview
            }
            title={
              blockSendForSequenceReadiness
                ? sequenceReadinessMessage ?? 'Project sequencing is not ready.'
                : 'Send selected product image to Studio'
            }
          >
            {sending ? (
              <Loader2 className='mr-2 size-4 animate-spin' />
            ) : (
              <Monitor className='mr-2 size-4' />
            )}
            {sending ? 'Sending...' : 'Send To Studio'}
          </Button>

          <Button size='xs'
            type='button'
            onClick={(): void => {
              void handleAcceptVariant();
            }}
            disabled={!selectedVariant || accepting || sending}
            variant='outline'
            className='border-emerald-500/40 text-emerald-200 hover:bg-emerald-500/10'
          >
            {accepting ? (
              <Loader2 className='mr-2 size-4 animate-spin' />
            ) : (
              <Check className='mr-2 size-4' />
            )}
            {accepting ? 'Accepting...' : 'Accept Variant'}
          </Button>

          <Button size='xs'
            type='button'
            variant='outline'
            onClick={(): void => {
              void refreshVariants();
            }}
            disabled={variantsLoading || sending || accepting}
          >
            {variantsLoading ? (
              <Loader2 className='mr-2 size-4 animate-spin' />
            ) : null}
            Refresh Variants
          </Button>

          {runStatus ? (
            <StatusBadge status={'Run status: ' + runStatus} variant='processing' size='sm' className='font-medium' />
          ) : null}
          <StatusBadge
            status='Active'
            variant='success'
            size='sm'
            className='font-medium'
          />
        </div>

        {studioActionError ? (
          <Alert variant='error' className='mt-2 py-2 text-xs'>
            {studioActionError}
          </Alert>
        ) : null}
        {sequenceReadinessMessage ? (
          <div className='mt-2 space-y-2'>
            <Alert variant='warning' className='py-2 text-xs'>
              {sequenceReadinessMessage}
            </Alert>
            <div className='flex flex-wrap items-center gap-2'>
              <Button
                size='xs'
                type='button'
                variant='outline'
                onClick={(): void => {
                  if (!studioProjectId) return;
                  const target = `/admin/image-studio?projectId=${encodeURIComponent(studioProjectId)}`;
                  window.location.href = target;
                }}
              >
                Open Image Studio Sequencing
              </Button>
            </div>
          </div>
        ) : null}
        {sequencingDiagnostics ? (
          <div className='mt-2 rounded border border-border/60 bg-card/30 p-2 text-[11px] text-gray-300'>
            <div className='font-medium text-gray-200'>Sequencing Status</div>
            {sequenceReadiness ? (
              <div className='mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-gray-400'>
                <span>readiness: {sequenceReadiness.state}</span>
                <span>ready: {sequenceReadiness.ready ? 'yes' : 'no'}</span>
              </div>
            ) : null}
            <div className='mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-gray-400'>
              <span>scope: {sequencingDiagnostics.selectedScope}</span>
              <span>
                selected key: {sequencingDiagnostics.selectedSettingsKey ?? 'n/a'}
              </span>
              <span>
                project key: {sequencingDiagnostics.projectSettingsKey ?? 'n/a'}
              </span>
            </div>
            <div className='mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-gray-400'>
              <span>
                has project settings: {sequencingDiagnostics.hasProjectSettings ? 'yes' : 'no'}
              </span>
              <span>
                has global settings: {sequencingDiagnostics.hasGlobalSettings ? 'yes' : 'no'}
              </span>
              <span>
                selected enabled: {sequencingDiagnostics.selectedSequencingEnabled ? 'yes' : 'no'}
              </span>
              <span>
                project enabled: {sequencingDiagnostics.projectSequencingEnabled ? 'yes' : 'no'}
              </span>
              <span>
                global enabled: {sequencingDiagnostics.globalSequencingEnabled ? 'yes' : 'no'}
              </span>
            </div>
            <div className='mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-gray-500'>
              <span>snapshot: {sequencingDiagnostics.selectedSnapshotHash ?? 'n/a'}</span>
              <span>saved at: {formatTimestamp(sequencingDiagnostics.selectedSnapshotSavedAt)}</span>
              <span>steps: {sequencingDiagnostics.selectedSnapshotStepCount}</span>
              <span>model: {sequencingDiagnostics.selectedSnapshotModelId ?? 'n/a'}</span>
            </div>
          </div>
        ) : null}
      </FormSection>

      <FormSection title='Product Images' description='Select which product image slot should be generated.'>
        {imageSlotPreviews.length === 0 ? (
          <p className='text-sm text-gray-400'>
            No uploaded product images found. Add an image in the Images tab first.
          </p>
        ) : (
          <div className='grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-5'>
            {imageSlotPreviews.map((preview) => {
              const isSelected = preview.index === selectedImageIndex;
              return (
                <button
                  key={preview.index}
                  type='button'
                  onClick={(): void => {
                    setSelectedImageIndex(preview.index);
                  }}
                  className={cn(
                    'group relative overflow-hidden rounded border p-1 text-left transition',
                    isSelected
                      ? 'border-emerald-400/80 bg-emerald-500/10'
                      : 'border-border/60 hover:border-emerald-400/40'
                  )}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={preview.src}
                    alt={preview.label}
                    className='h-24 w-full rounded object-contain bg-black/20'
                  />
                  <div className='mt-1 flex items-center justify-between text-[11px] text-gray-300'>
                    <span>{preview.label}</span>
                    {isSelected ? <StatusBadge status='Selected' variant='active' size='sm' className='font-bold' /> : null}
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </FormSection>

      <FormSection title='Generated Variants' description='Click a generated card to preview it.'>
        {variantsLoading ? (
          <div className='flex items-center gap-2 text-sm text-gray-400'>
            <Loader2 className='size-4 animate-spin' />
            Loading variants...
          </div>
        ) : variants.length === 0 && pendingVariantPlaceholderCount === 0 ? (
          <p className='text-sm text-gray-400'>
            No generations yet for the selected product image.
          </p>
        ) : (
          <div className='grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-5'>
            {variants.map((slot) => {
              const src = getImageStudioSlotImageSrc(slot, productImagesExternalBaseUrl);
              const isSelected = slot.id === selectedVariant?.id;
              const timestamp = getSlotTimestamp(slot);
              const isDeleting = deletingVariantId === slot.id;

              return (
                <div key={slot.id} className='space-y-1'>
                  <button
                    type='button'
                    onClick={(): void => {
                      setSelectedVariantSlotId(slot.id);
                    }}
                    className={cn(
                      'group w-full rounded border p-1 text-left transition',
                      isSelected
                        ? 'border-blue-400/80 bg-blue-500/10'
                        : 'border-border/60 hover:border-blue-400/40'
                    )}
                  >
                    {src ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={src}
                        alt={slot.name ?? 'Variant'}
                        className='h-24 w-full rounded object-contain bg-black/20'
                      />
                    ) : (
                      <div className='flex h-24 w-full items-center justify-center rounded bg-black/20 text-xs text-gray-500'>
                        No preview
                      </div>
                    )}
                    <div className='mt-1 space-y-0.5 text-[11px] text-gray-300'>
                      <div className='flex items-center justify-between'>
                        <span className='truncate'>{slot.name ?? 'Variant'}</span>
                        {isSelected ? (
                          <StatusBadge status='Selected' variant='info' size='sm' className='font-bold' />
                        ) : null}
                      </div>
                      <div className='text-[10px] text-gray-500'>
                        {formatTimestamp(timestamp)}
                      </div>
                    </div>
                  </button>
                  <Button size='xs'
                    type='button'
                    variant='outline'
                    className='h-6 w-full border-red-500/40 text-[10px] text-red-200 hover:bg-red-500/10'
                    onClick={(): void => {
                      void handleDeleteVariant(slot);
                    }}
                    disabled={deletingVariantId !== null || sending || accepting}
                    title='Delete generated variant'
                  >
                    {isDeleting ? (
                      <Loader2 className='mr-1 size-3 animate-spin' />
                    ) : (
                      <Trash2 className='mr-1 size-3' />
                    )}
                    Delete
                  </Button>
                </div>
              );
            })}
            {Array.from({ length: pendingVariantPlaceholderCount }).map((_, index) => (
              <div
                key={`pending-variant-${index}`}
                className='space-y-1 rounded border border-border/60 p-1'
              >
                <div className='flex h-24 w-full items-center justify-center rounded bg-black/20 text-xs text-gray-500'>
                  <span className='inline-flex items-center gap-1'>
                    <Loader2 className='size-3 animate-spin' />
                    Syncing...
                  </span>
                </div>
                <div className='px-0.5 text-[10px] text-gray-500'>
                  Waiting for sequence output
                </div>
              </div>
            ))}
          </div>
        )}
      </FormSection>

      <FormSection title='Studio Preview' description='Use split mode to compare source and generated output.'>
        {selectedVariant && variantImageSrc ? (
          <div className='relative h-[420px] overflow-hidden rounded border border-border/60 bg-card/30'>
            {canCompareWithSource && splitVariantView ? (
              <SplitVariantPreview
                sourceSlotImageSrc={sourceImageSrc as string}
                workingSlotImageSrc={variantImageSrc}
                leftSplitZoom={leftSplitZoom}
                rightSplitZoom={rightSplitZoom}
                onAdjustSplitZoom={(pane: 'left' | 'right', delta: number): void => {
                  if (pane === 'left') {
                    setLeftSplitZoom((prev) => clampSplitZoom(prev + delta));
                    return;
                  }
                  setRightSplitZoom((prev) => clampSplitZoom(prev + delta));
                }}
                onResetSplitZoom={(pane: 'left' | 'right'): void => {
                  if (pane === 'left') {
                    setLeftSplitZoom(SPLIT_ZOOM_RESET);
                    return;
                  }
                  setRightSplitZoom(SPLIT_ZOOM_RESET);
                }}
              />
            ) : (
              <div className='relative h-full w-full overflow-hidden'>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={
                    canCompareWithSource && singleVariantView === 'source'
                      ? (sourceImageSrc as string)
                      : variantImageSrc
                  }
                  alt='Studio variant preview'
                  className='h-full w-full object-contain'
                />
              </div>
            )}

            {canCompareWithSource ? (
              <SplitViewControls
                singleVariantView={singleVariantView}
                splitVariantView={splitVariantView}
                canCompare={canCompareWithSource}
                onGoToSourceSlot={(): void => {
                  setSplitVariantView(false);
                  setSingleVariantView('source');
                }}
                onToggleSourceVariantView={(): void => {
                  setSingleVariantView((prev) =>
                    prev === 'variant' ? 'source' : 'variant'
                  );
                }}
                onToggleSplitVariantView={(): void => {
                  setSplitVariantView((prev) => {
                    const next = !prev;
                    if (!next) {
                      setLeftSplitZoom(SPLIT_ZOOM_RESET);
                      setRightSplitZoom(SPLIT_ZOOM_RESET);
                    }
                    return next;
                  });
                }}
              />
            ) : null}

            {!splitVariantView && canCompareWithSource ? (
              <div className='absolute right-2 top-2 z-20 flex items-center gap-1 rounded bg-black/65 px-2 py-1 text-[10px] text-gray-100'>
                <Button size='xs'
                  type='button'
                  variant='outline'
                  className='h-5 w-5 px-0 text-[10px]'
                  onClick={(): void => {
                    setLeftSplitZoom((prev) => clampSplitZoom(prev - SPLIT_ZOOM_STEP));
                    setRightSplitZoom((prev) => clampSplitZoom(prev - SPLIT_ZOOM_STEP));
                  }}
                >
                  -
                </Button>
                <Button size='xs'
                  type='button'
                  variant='outline'
                  className='h-5 w-5 px-0 text-[10px]'
                  onClick={(): void => {
                    setLeftSplitZoom((prev) => clampSplitZoom(prev + SPLIT_ZOOM_STEP));
                    setRightSplitZoom((prev) => clampSplitZoom(prev + SPLIT_ZOOM_STEP));
                  }}
                >
                  +
                </Button>
                <Button size='xs'
                  type='button'
                  variant='outline'
                  className='h-5 px-1 text-[10px]'
                  onClick={(): void => {
                    setLeftSplitZoom(SPLIT_ZOOM_RESET);
                    setRightSplitZoom(SPLIT_ZOOM_RESET);
                  }}
                >
                  100%
                </Button>
              </div>
            ) : null}
          </div>
        ) : (
          <p className='text-sm text-gray-400'>
            Select a generated variant to open the preview canvas.
          </p>
        )}
      </FormSection>

      <FormSection
        title='Run History & Audit'
        description='Route decisions, mode resolution, fallback reasons, and processing timings for Product Studio post-production runs.'
      >
        <div className='flex flex-wrap items-center gap-2'>
          <Button size='xs'
            type='button'
            variant='outline'
            onClick={(): void => {
              void refreshAudit();
            }}
            disabled={auditLoading}
          >
            {auditLoading ? <Loader2 className='mr-2 size-4 animate-spin' /> : null}
            Refresh Audit
          </Button>
        </div>

        {auditError ? (
          <Alert variant='error' className='mt-2 py-2 text-xs'>
            {auditError}
          </Alert>
        ) : null}

        {auditLoading ? (
          <div className='mt-2 flex items-center gap-2 text-sm text-gray-400'>
            <Loader2 className='size-4 animate-spin' />
            Loading run audit...
          </div>
        ) : auditEntries.length === 0 ? (
          <p className='mt-2 text-sm text-gray-400'>No run audit entries yet for this image slot.</p>
        ) : (
          <div className='mt-2 space-y-2'>
            {auditEntries.map((entry) => {
              const createdAtLabel = formatTimestamp(entry.createdAt);
              const statusClass =
                entry.status === 'completed' ? 'text-emerald-300' : 'text-red-300';
              return (
                <div key={entry.id} className='rounded border border-border/60 bg-card/20 p-2 text-xs text-gray-300'>
                  <div className='flex flex-wrap items-center gap-x-3 gap-y-1'>
                    <span className='text-gray-400'>{createdAtLabel}</span>
                    <span className={statusClass}>{entry.status.toUpperCase()}</span>
                    <span>route: {entry.executionRoute}</span>
                    <span>mode: {entry.requestedSequenceMode} → {entry.resolvedSequenceMode}</span>
                    <span>run: {entry.runKind}</span>
                  </div>
                  <div className='mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-gray-400'>
                    <span>total: {entry.timings.totalMs}ms</span>
                    <span>import: {entry.timings.importMs ?? 'n/a'}ms</span>
                    <span>slot upsert: {entry.timings.sourceSlotUpsertMs ?? 'n/a'}ms</span>
                    <span>route: {entry.timings.routeDecisionMs ?? 'n/a'}ms</span>
                    <span>dispatch: {entry.timings.dispatchMs ?? 'n/a'}ms</span>
                    {entry.dispatchMode ? <span>queue: {entry.dispatchMode}</span> : null}
                  </div>
                  <div className='mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-gray-400'>
                    <span>snapshot: {entry.sequenceSnapshotHash ?? 'n/a'}</span>
                    <span>
                      settings: {entry.settingsScope} ({entry.settingsScopeValid ? 'valid' : 'invalid'})
                    </span>
                    {entry.settingsKey ? <span>key: {entry.settingsKey}</span> : null}
                    {entry.projectSettingsKey ? <span>project key: {entry.projectSettingsKey}</span> : null}
                    {entry.stepOrderUsed.length > 0 ? (
                      <span>steps: {entry.stepOrderUsed.join(' → ')}</span>
                    ) : null}
                    {entry.sourceImageSize ? (
                      <span>
                        source: {entry.sourceImageSize.width}x{entry.sourceImageSize.height}
                      </span>
                    ) : null}
                  </div>
                  {entry.resolvedCropRect ? (
                    <div className='mt-1 text-[11px] text-gray-400'>
                      crop rect: x {entry.resolvedCropRect.x.toFixed(4)}, y{' '}
                      {entry.resolvedCropRect.y.toFixed(4)}, w{' '}
                      {entry.resolvedCropRect.width.toFixed(4)}, h{' '}
                      {entry.resolvedCropRect.height.toFixed(4)}
                    </div>
                  ) : null}
                  {entry.fallbackReason ? (
                    <div className='mt-1 text-[11px] text-amber-300'>fallback: {entry.fallbackReason}</div>
                  ) : null}
                  {entry.errorMessage ? (
                    <div className='mt-1 text-[11px] text-red-300'>error: {entry.errorMessage}</div>
                  ) : null}
                </div>
              );
            })}
          </div>
        )}
      </FormSection>
    </div>
  );
}
