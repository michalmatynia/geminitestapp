'use client';

import { useQueryClient } from '@tanstack/react-query';
import { Check, Loader2, Monitor } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';

import { clampSplitZoom } from '@/features/ai/image-studio/components/center-preview/preview-utils';
import { SplitVariantPreview } from '@/features/ai/image-studio/components/center-preview/SplitVariantPreview';
import { SplitViewControls } from '@/features/ai/image-studio/components/center-preview/SplitViewControls';
import { useStudioProjects } from '@/features/ai/image-studio/hooks/useImageStudioQueries';
import type { ImageStudioSlotRecord } from '@/features/ai/image-studio/types';
import { getImageStudioSlotImageSrc } from '@/features/ai/image-studio/utils/image-src';
import {
  DEFAULT_PRODUCT_IMAGES_EXTERNAL_BASE_URL,
  PRODUCT_IMAGES_EXTERNAL_BASE_URL_SETTING_KEY,
} from '@/features/products/constants';
import { useProductFormContext } from '@/features/products/context/ProductFormContext';
import { invalidateProductsAndCounts } from '@/features/products/hooks/productCache';
import type { ProductWithImages } from '@/features/products/types';
import type { ProductStudioSequencingConfig } from '@/features/products/types/product-studio';
import { resolveProductImageUrl } from '@/features/products/utils/image-routing';
import { api } from '@/shared/lib/api-client';
import { useSettingsStore } from '@/shared/providers/SettingsStoreProvider';
import { Button, FormField, FormSection, SelectSimple, useToast } from '@/shared/ui';
import { cn } from '@/shared/utils';

type ProductStudioVariantsResponse = {
  projectId: string | null;
  sequencing?: ProductStudioSequencingConfig;
  sourceSlotId: string | null;
  sourceSlot: ImageStudioSlotRecord | null;
  variants: ImageStudioSlotRecord[];
};

type ProductStudioSendResponse = {
  runId: string;
  runStatus: 'queued' | 'running' | 'completed' | 'failed';
  expectedOutputs: number;
};

type ProductStudioAcceptResponse = {
  product: ProductWithImages;
};

type RunStatusResponse = {
  run?: {
    id: string;
    status: 'queued' | 'running' | 'completed' | 'failed';
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
      ...(studioProjectsQuery.data ?? []).map((projectId: string) => ({
        value: projectId,
        label: projectId,
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
  const [activeRunId, setActiveRunId] = useState<string | null>(null);
  const [runStatus, setRunStatus] = useState<
    'queued' | 'running' | 'completed' | 'failed' | null
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

  const refreshVariants = useCallback(async (): Promise<void> => {
    if (!product?.id || !studioProjectId || selectedImageIndex === null) {
      setVariantsData(null);
      setSelectedVariantSlotId(null);
      return;
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
    } catch (error) {
      setVariantsData(null);
      setSelectedVariantSlotId(null);
      setStudioActionError(
        error instanceof Error ? error.message : 'Failed to load Studio variants.'
      );
    } finally {
      setVariantsLoading(false);
    }
  }, [product?.id, selectedImageIndex, studioProjectId]);

  useEffect(() => {
    void refreshVariants();
  }, [refreshVariants]);

  useEffect(() => {
    if (!activeRunId || !product?.id || selectedImageIndex === null || !studioProjectId) {
      return;
    }

    let cancelled = false;
    const timer = setInterval(() => {
      void api
        .get<RunStatusResponse>(
          `/api/image-studio/runs/${encodeURIComponent(activeRunId)}`,
          {
            cache: 'no-store',
            logError: false,
          }
        )
        .then((response) => {
          if (cancelled) return;
          const status = response.run?.status ?? null;
          if (!status) return;
          setRunStatus(status);
          if (status === 'completed' || status === 'failed') {
            setActiveRunId(null);
            void refreshVariants();
          }
        })
        .catch(() => {
          if (cancelled) return;
          setActiveRunId(null);
          setRunStatus('failed');
        });
    }, 2000);

    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [activeRunId, product?.id, refreshVariants, selectedImageIndex, studioProjectId]);

  const selectedSourcePreview = useMemo(() => {
    if (selectedImageIndex === null) return null;
    return (
      imageSlotPreviews.find((preview) => preview.index === selectedImageIndex) ?? null
    );
  }, [imageSlotPreviews, selectedImageIndex]);

  const variants = variantsData?.variants ?? [];
  const sequencing = variantsData?.sequencing;
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

  useEffect(() => {
    if (canCompareWithSource) return;
    setSingleVariantView('variant');
    setSplitVariantView(false);
  }, [canCompareWithSource]);

  const handleSendToStudio = async (): Promise<void> => {
    if (!product?.id || !studioProjectId || selectedImageIndex === null) return;

    setSending(true);
    setStudioActionError(null);

    try {
      const result = await api.post<ProductStudioSendResponse>(
        `/api/products/${encodeURIComponent(product.id)}/studio/send`,
        {
          imageSlotIndex: selectedImageIndex,
          projectId: studioProjectId,
        }
      );

      setActiveRunId(result.runId);
      setRunStatus(result.runStatus);
      toast('Image sent to Studio.', { variant: 'success' });
      await refreshVariants();
    } catch (error) {
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
            onClick={(): void => {
              void handleSendToStudio();
            }}
            disabled={
              sending ||
              accepting ||
              selectedImageIndex === null ||
              !selectedSourcePreview
            }
            title='Send selected product image to Studio'
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
            className='border border-emerald-500/40 bg-emerald-500/20 text-emerald-100 hover:bg-emerald-500/30'
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
            <span className='rounded border border-border/60 bg-background/40 px-2 py-1 text-xs text-gray-300'>
              Run status: {runStatus}
            </span>
          ) : null}
          <span className='rounded border border-border/60 bg-background/40 px-2 py-1 text-xs text-gray-300'>
            Pipeline:{' '}
            {sequencing?.enabled
              ? `crop-centered before generation, upscale ${
                sequencing.upscaleOnAccept
                  ? `${sequencing.upscaleScale}x on accept`
                  : 'disabled on accept'
              }`
              : 'configured in Image Studio Project Settings'}
          </span>
        </div>

        {studioActionError ? (
          <p className='mt-2 text-xs text-red-300'>{studioActionError}</p>
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
                    {isSelected ? <span className='text-emerald-300'>Selected</span> : null}
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
        ) : variants.length === 0 ? (
          <p className='text-sm text-gray-400'>
            No generations yet for the selected product image.
          </p>
        ) : (
          <div className='grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-5'>
            {variants.map((slot, index) => {
              const src = getImageStudioSlotImageSrc(slot, productImagesExternalBaseUrl);
              const isSelected = slot.id === selectedVariant?.id;
              const timestamp = getSlotTimestamp(slot);

              return (
                <button
                  key={slot.id}
                  type='button'
                  onClick={(): void => {
                    setSelectedVariantSlotId(slot.id);
                  }}
                  className={cn(
                    'group rounded border p-1 text-left transition',
                    isSelected
                      ? 'border-blue-400/80 bg-blue-500/10'
                      : 'border-border/60 hover:border-blue-400/40'
                  )}
                >
                  {src ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={src}
                      alt={slot.name ?? `Variant ${index + 1}`}
                      className='h-24 w-full rounded object-contain bg-black/20'
                    />
                  ) : (
                    <div className='flex h-24 w-full items-center justify-center rounded bg-black/20 text-xs text-gray-500'>
                      No preview
                    </div>
                  )}
                  <div className='mt-1 space-y-0.5 text-[11px] text-gray-300'>
                    <div className='flex items-center justify-between'>
                      <span className='truncate'>{slot.name ?? `Variant ${index + 1}`}</span>
                      {isSelected ? (
                        <span className='text-blue-300'>Selected</span>
                      ) : null}
                    </div>
                    <div className='text-[10px] text-gray-500'>
                      {formatTimestamp(timestamp)}
                    </div>
                  </div>
                </button>
              );
            })}
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
                  size='sm'
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
                  size='sm'
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
                  size='sm'
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
    </div>
  );
}
