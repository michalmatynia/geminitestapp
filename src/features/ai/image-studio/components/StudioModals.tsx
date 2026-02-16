'use client';

import { Loader2 } from 'lucide-react';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import ProductImageManager, {
  type ProductImageManagerController,
} from '@/features/products/components/ProductImageManager';
import { ProductImageManagerControllerProvider } from '@/features/products/components/ProductImageManagerControllerContext';
import {
  DEFAULT_PRODUCT_IMAGES_EXTERNAL_BASE_URL,
  PRODUCT_IMAGES_EXTERNAL_BASE_URL_SETTING_KEY,
} from '@/features/products/constants';
import type { ProductImageSlot } from '@/features/products/types/products-ui';
import { resolveProductImageUrl } from '@/features/products/utils/image-routing';
import {
  flattenParams,
  inferParamSpecs,
  type ParamSpec,
} from '@/features/prompt-engine/prompt-params';
import { api } from '@/shared/lib/api-client';
import { createListQueryV2 } from '@/shared/lib/query-factories-v2';
import { useSettingsStore } from '@/shared/providers/SettingsStoreProvider';
import type { ImageFileSelection } from '@/shared/types/domain/files';
import { Button, Input, Label, Tabs, TabsList, TabsTrigger, TabsContent, useToast } from '@/shared/ui';

import {
  buildHeuristicControls,
  buildPromptDiffLines,
  type PromptDiffLine,
  type PromptExtractApiResponse,
  type PromptExtractHistoryEntry,
  type PromptExtractValidationIssue,
  toSlotName,
  type UiExtractorSuggestion,
} from './studio-modals/prompt-extract-utils';
import { useProjectsState } from '../context/ProjectsContext';
import { usePromptActions, usePromptState } from '../context/PromptContext';
import { useSettingsState } from '../context/SettingsContext';
import { useSlotsActions, useSlotsState } from '../context/SlotsContext';
import { studioKeys } from '../hooks/useImageStudioQueries';
import { isParamUiControl, type ParamUiControl } from '../utils/param-ui';
import { DriveImportModal } from './modals/DriveImportModal';
import { ExtractPromptParamsModal } from './modals/ExtractPromptParamsModal';
import { GenerationPreviewModal } from './modals/GenerationPreviewModal';
import { SlotCreateModal } from './modals/SlotCreateModal';
import { SlotInlineEditModal } from './modals/SlotInlineEditModal';

import type { ImageStudioSlotRecord } from '../types';

type LinkedGeneratedRunRecord = {
  id: string;
  createdAt: string;
  outputs: Array<{
    id: string;
    filepath: string;
    filename: string;
    size: number;
    width: number | null;
    height: number | null;
  }>;
};

type LinkedGeneratedRunsResponse = {
  runs?: LinkedGeneratedRunRecord[];
  total?: number;
};

type LinkedGeneratedVariant = {
  key: string;
  runId: string;
  runCreatedAt: string;
  outputIndex: number;
  outputCount: number;
  imageSrc: string;
  output: {
    id: string;
    filepath: string;
    filename: string;
    size: number;
    width: number | null;
    height: number | null;
  };
};

type LinkedMaskSlot = {
  slotId: string;
  name: string;
  variant: string;
  inverted: boolean;
  relationType: string;
  generationMode: string;
  imageSrc: string | null;
  imageFileId: string | null;
  filepath: string | null;
  filename: string | null;
  width: number | null;
  height: number | null;
  size: number | null;
  updatedAt: string | Date | null;
};

type CompositeTabImage = {
  key: string;
  source: 'source' | 'input';
  name: string;
  sourceType: string;
  slotId: string | null;
  order: number | null;
  imageSrc: string | null;
  imageFileId: string | null;
  filepath: string | null;
  filename: string | null;
  width: number | null;
  height: number | null;
  size: number | null;
  updatedAt: string | Date | null;
};

type EnvironmentReferenceDraft = {
  imageFileId: string | null;
  imageUrl: string;
  filename: string;
  mimetype: string;
  size: number | null;
  width: number | null;
  height: number | null;
  updatedAt: string | Date | null;
};

const EMPTY_ENVIRONMENT_REFERENCE_DRAFT: EnvironmentReferenceDraft = {
  imageFileId: null,
  imageUrl: '',
  filename: '',
  mimetype: '',
  size: null,
  width: null,
  height: null,
  updatedAt: null,
};

const asRecord = (value: unknown): Record<string, unknown> | null => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
};

const asFiniteNumber = (value: unknown): number | null => {
  if (typeof value !== 'number' || !Number.isFinite(value)) return null;
  return value;
};

const readEnvironmentReferenceDraft = (
  slot: ImageStudioSlotRecord | null
): EnvironmentReferenceDraft => {
  const metadata = asRecord(slot?.metadata);
  const environmentReference = asRecord(metadata?.['environmentReference']);
  if (!environmentReference) return { ...EMPTY_ENVIRONMENT_REFERENCE_DRAFT };

  const imageUrl =
    typeof environmentReference['imageUrl'] === 'string'
      ? environmentReference['imageUrl'].trim()
      : '';

  return {
    imageFileId:
      typeof environmentReference['imageFileId'] === 'string'
        ? environmentReference['imageFileId'].trim() || null
        : null,
    imageUrl,
    filename:
      typeof environmentReference['filename'] === 'string'
        ? environmentReference['filename'].trim()
        : '',
    mimetype:
      typeof environmentReference['mimetype'] === 'string'
        ? environmentReference['mimetype'].trim()
        : '',
    size: asFiniteNumber(environmentReference['size']),
    width: asFiniteNumber(environmentReference['width']),
    height: asFiniteNumber(environmentReference['height']),
    updatedAt:
      typeof environmentReference['updatedAt'] === 'string'
        ? environmentReference['updatedAt']
        : null,
  };
};

const formatLinkedVariantTimestamp = (value: string): string => {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleString();
};

const INLINE_PREVIEW_ZOOM_MIN = 0.35;
const INLINE_PREVIEW_ZOOM_MAX = 8;
const INLINE_PREVIEW_ZOOM_STEP = 0.15;
const INLINE_CARD_IMAGE_SLOT_INDEX = 0;

const clampInlinePreviewZoom = (value: number): number =>
  Math.min(INLINE_PREVIEW_ZOOM_MAX, Math.max(INLINE_PREVIEW_ZOOM_MIN, Number(value.toFixed(3))));

const formatBytes = (value: number | null): string => {
  if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0) return 'n/a';
  const units = ['B', 'KB', 'MB', 'GB'];
  let size = value;
  let unitIndex = 0;
  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex += 1;
  }
  const precision = unitIndex === 0 ? 0 : size >= 10 ? 1 : 2;
  return `${size.toFixed(precision)} ${units[unitIndex]}`;
};

const formatDateTime = (value: string | Date | null | undefined): string => {
  if (!value) return 'n/a';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return 'n/a';
  return parsed.toLocaleString();
};

const estimateBase64Bytes = (value: string): number | null => {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const payload = trimmed.includes(',') ? trimmed.slice(trimmed.indexOf(',') + 1) : trimmed;
  const compact = payload.replace(/\s+/g, '');
  if (!compact) return null;
  const padding = compact.endsWith('==') ? 2 : compact.endsWith('=') ? 1 : 0;
  const estimated = Math.floor((compact.length * 3) / 4) - padding;
  return estimated > 0 ? estimated : null;
};

const extractDataUrlMimeType = (value: string): string | null => {
  const trimmed = value.trim();
  const match = trimmed.match(/^data:([^;,]+)[;,]/i);
  if (!match?.[1]) return null;
  return match[1];
};

type InlineImagePreviewCanvasProps = {
  imageSrc: string | null;
  imageAlt: string;
  onImageDimensionsChange: (dimensions: { width: number; height: number } | null) => void;
};

function InlineImagePreviewCanvas({
  imageSrc,
  imageAlt,
  onImageDimensionsChange,
}: InlineImagePreviewCanvasProps): React.JSX.Element {
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const dragRef = useRef<{
    pointerId: number;
    startClientX: number;
    startClientY: number;
    startOffsetX: number;
    startOffsetY: number;
  } | null>(null);

  useEffect(() => {
    setZoom(1);
    setOffset({ x: 0, y: 0 });
    setIsDragging(false);
    dragRef.current = null;
    onImageDimensionsChange(null);
  }, [imageSrc, onImageDimensionsChange]);

  const applyZoomDelta = (delta: number): void => {
    setZoom((currentZoom) => clampInlinePreviewZoom(currentZoom + delta));
  };

  const resetViewport = (): void => {
    setZoom(1);
    setOffset({ x: 0, y: 0 });
    dragRef.current = null;
    setIsDragging(false);
  };

  const handlePointerDown = (event: React.PointerEvent<HTMLDivElement>): void => {
    if (!imageSrc || event.button !== 0) return;
    const target = event.target as HTMLElement | null;
    if (target?.closest('[data-inline-preview-controls="true"]')) return;
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    dragRef.current = {
      pointerId: event.pointerId,
      startClientX: event.clientX,
      startClientY: event.clientY,
      startOffsetX: offset.x,
      startOffsetY: offset.y,
    };
    setIsDragging(true);
  };

  const handlePointerMove = (event: React.PointerEvent<HTMLDivElement>): void => {
    const activeDrag = dragRef.current;
    if (activeDrag?.pointerId !== event.pointerId) return;
    const dx = event.clientX - activeDrag.startClientX;
    const dy = event.clientY - activeDrag.startClientY;
    setOffset({
      x: activeDrag.startOffsetX + dx,
      y: activeDrag.startOffsetY + dy,
    });
  };

  const handlePointerRelease = (event: React.PointerEvent<HTMLDivElement>): void => {
    const activeDrag = dragRef.current;
    if (activeDrag?.pointerId !== event.pointerId) return;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    dragRef.current = null;
    setIsDragging(false);
  };

  return (
    <div
      className='relative h-72 overflow-hidden rounded-lg border border-border/60 bg-black/35 touch-none'
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerRelease}
      onPointerCancel={handlePointerRelease}
      style={{ cursor: imageSrc ? (isDragging ? 'grabbing' : 'grab') : 'default' }}
    >
      <div
        data-inline-preview-controls='true'
        className='absolute right-2 top-2 z-10 flex items-center gap-1 rounded border border-border/60 bg-black/65 px-1 py-1 backdrop-blur'
        onPointerDown={(event): void => {
          event.stopPropagation();
        }}
      >
        <Button
          size='xs'
          type='button'
          variant='outline'
          className='h-6 w-6 px-0'
          onClick={() => applyZoomDelta(-INLINE_PREVIEW_ZOOM_STEP)}
          disabled={!imageSrc}
          title='Zoom out'
          aria-label='Zoom out image preview'
        >
          -
        </Button>
        <div className='min-w-10 text-center text-[10px] text-gray-200'>
          {Math.round(zoom * 100)}%
        </div>
        <Button
          size='xs'
          type='button'
          variant='outline'
          className='h-6 w-6 px-0'
          onClick={() => applyZoomDelta(INLINE_PREVIEW_ZOOM_STEP)}
          disabled={!imageSrc}
          title='Zoom in'
          aria-label='Zoom in image preview'
        >
          +
        </Button>
        <Button
          size='xs'
          type='button'
          variant='outline'
          className='h-6 px-2 text-[10px]'
          onClick={resetViewport}
          disabled={!imageSrc}
          title='Reset viewport'
          aria-label='Reset image viewport'
        >
          Reset
        </Button>
      </div>

      {imageSrc ? (
        <>
          <div className='absolute inset-0 flex items-center justify-center overflow-hidden'>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={imageSrc}
              alt={imageAlt}
              draggable={false}
              onLoad={(event): void => {
                onImageDimensionsChange({
                  width: event.currentTarget.naturalWidth,
                  height: event.currentTarget.naturalHeight,
                });
              }}
              onError={() => onImageDimensionsChange(null)}
              className='pointer-events-none max-h-full max-w-full select-none object-contain'
              style={{
                transform: `translate3d(${offset.x}px, ${offset.y}px, 0) scale(${zoom})`,
                transformOrigin: 'center center',
                transition: isDragging ? 'none' : 'transform 80ms ease-out',
              }}
            />
          </div>
          <div className='pointer-events-none absolute bottom-2 left-2 rounded border border-border/60 bg-black/60 px-2 py-1 text-[10px] text-gray-200'>
            Drag to pan, use controls to zoom, scroll to move modal
          </div>
        </>
      ) : (
        <div className='flex h-full items-center justify-center text-xs text-gray-500'>
          No source image available for this card.
        </div>
      )}
    </div>
  );
}

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

  const linkedGeneratedVariants = useMemo((): LinkedGeneratedVariant[] => {
    const runs = Array.isArray(linkedRunsQuery.data?.runs) ? linkedRunsQuery.data.runs : [];
    return runs.flatMap((run) => {
      const outputs = Array.isArray(run.outputs) ? run.outputs : [];
      return outputs
        .map((output, outputIndex): LinkedGeneratedVariant | null => {
          const outputPath = output.filepath?.trim() ?? '';
          if (!output.id || !outputPath) return null;
          return {
            key: `${run.id}:${output.id}`,
            runId: run.id,
            runCreatedAt: run.createdAt,
            outputIndex: outputIndex + 1,
            outputCount: outputs.length,
            imageSrc: resolveProductImageUrl(outputPath, productImagesExternalBaseUrl) ?? outputPath,
            output: {
              id: output.id,
              filepath: outputPath,
              filename: output.filename ?? '',
              size: typeof output.size === 'number' && Number.isFinite(output.size) ? output.size : 0,
              width: typeof output.width === 'number' && Number.isFinite(output.width) ? output.width : null,
              height: typeof output.height === 'number' && Number.isFinite(output.height) ? output.height : null,
            },
          };
        })
        .filter((variant): variant is LinkedGeneratedVariant => Boolean(variant));
    });
  }, [linkedRunsQuery.data?.runs, productImagesExternalBaseUrl]);

  const selectedGenerationPreview = useMemo((): LinkedGeneratedVariant | null => {
    if (linkedGeneratedVariants.length === 0) return null;
    if (!generationPreviewKey) return linkedGeneratedVariants[0] ?? null;
    return (
      linkedGeneratedVariants.find((variant) => variant.key === generationPreviewKey) ??
      linkedGeneratedVariants[0] ??
      null
    );
  }, [generationPreviewKey, linkedGeneratedVariants]);

  const selectedGenerationPreviewDimensions = useMemo((): string => {
    const width = selectedGenerationPreview?.output.width ?? generationPreviewNaturalSize?.width ?? null;
    const height = selectedGenerationPreview?.output.height ?? generationPreviewNaturalSize?.height ?? null;
    if (typeof width === 'number' && Number.isFinite(width) && typeof height === 'number' && Number.isFinite(height)) {
      return `${width} x ${height}`;
    }
    return 'n/a';
  }, [
    generationPreviewNaturalSize?.height,
    generationPreviewNaturalSize?.width,
    selectedGenerationPreview?.output.height,
    selectedGenerationPreview?.output.width,
  ]);

  const selectedGenerationModalDimensions = useMemo((): string => {
    const width = selectedGenerationPreview?.output.width ?? generationModalPreviewNaturalSize?.width ?? null;
    const height = selectedGenerationPreview?.output.height ?? generationModalPreviewNaturalSize?.height ?? null;
    if (typeof width === 'number' && Number.isFinite(width) && typeof height === 'number' && Number.isFinite(height)) {
      return `${width} x ${height}`;
    }
    return 'n/a';
  }, [
    generationModalPreviewNaturalSize?.height,
    generationModalPreviewNaturalSize?.width,
    selectedGenerationPreview?.output.height,
    selectedGenerationPreview?.output.width,
  ]);

  const linkedMaskSlots = useMemo((): LinkedMaskSlot[] => {
    if (!selectedSlot?.id) return [];

    const selectedId = selectedSlot.id;
    return slots
      .filter((slot) => {
        const metadata = asRecord(slot.metadata);
        if (!metadata) return false;
        const role = typeof metadata['role'] === 'string' ? metadata['role'].trim().toLowerCase() : '';
        const relationType =
          typeof metadata['relationType'] === 'string' ? metadata['relationType'].trim().toLowerCase() : '';
        const sourceSlotId =
          typeof metadata['sourceSlotId'] === 'string' ? metadata['sourceSlotId'].trim() : '';
        const sourceSlotIds = Array.isArray(metadata['sourceSlotIds'])
          ? (metadata['sourceSlotIds'] as unknown[])
            .filter((value): value is string => typeof value === 'string' && value.trim().length > 0)
            .map((value: string) => value.trim())
          : [];
        const linkedToSelected = sourceSlotId === selectedId || sourceSlotIds.includes(selectedId);
        return linkedToSelected && (role === 'mask' || relationType.startsWith('mask:'));
      })
      .map((slot): LinkedMaskSlot => {
        const metadata = asRecord(slot.metadata);
        const relationType = typeof metadata?.['relationType'] === 'string' ? metadata['relationType'] : '';
        const variant = typeof metadata?.['variant'] === 'string' ? metadata['variant'] : 'unknown';
        const generationMode = typeof metadata?.['generationMode'] === 'string' ? metadata['generationMode'] : 'n/a';
        const inverted = Boolean(metadata?.['inverted']);
        const rawFilepath = slot.imageFile?.filepath?.trim() || slot.imageUrl?.trim() || null;
        const imageSrc = rawFilepath
          ? (resolveProductImageUrl(rawFilepath, productImagesExternalBaseUrl) ?? rawFilepath)
          : null;
        return {
          slotId: slot.id,
          name: slot.name?.trim() || slot.id,
          variant,
          inverted,
          relationType,
          generationMode,
          imageSrc,
          imageFileId: slot.imageFile?.id ?? slot.imageFileId ?? null,
          filepath: rawFilepath,
          filename: slot.imageFile?.filename ?? null,
          width: slot.imageFile?.width ?? null,
          height: slot.imageFile?.height ?? null,
          size: slot.imageFile?.size ?? null,
          updatedAt: slot.imageFile?.updatedAt ?? null,
        };
      })
      .sort((a, b) => {
        const aTs = a.updatedAt ? new Date(a.updatedAt).getTime() : Number.NaN;
        const bTs = b.updatedAt ? new Date(b.updatedAt).getTime() : Number.NaN;
        if (Number.isFinite(aTs) && Number.isFinite(bTs) && aTs !== bTs) {
          return bTs - aTs;
        }
        return a.name.localeCompare(b.name);
      });
  }, [productImagesExternalBaseUrl, selectedSlot?.id, slots]);

  const inlinePreviewSource = useMemo(() => {
    const normalizedDraftBase64 = slotBase64Draft.trim();
    if (normalizedDraftBase64) {
      return {
        src: normalizedDraftBase64,
        sourceType: 'Draft Base64',
        rawSource: '(inline base64)',
        resolvedSource: '(inline base64)',
      };
    }

    const normalizedDraftUrl = slotImageUrlDraft.trim();
    if (normalizedDraftUrl) {
      const resolved = resolveProductImageUrl(normalizedDraftUrl, productImagesExternalBaseUrl) ?? normalizedDraftUrl;
      return {
        src: resolved,
        sourceType: 'Draft URL',
        rawSource: normalizedDraftUrl,
        resolvedSource: resolved,
      };
    }

    const filePath = selectedSlot?.imageFile?.filepath?.trim() ?? '';
    if (filePath) {
      const resolved = resolveProductImageUrl(filePath, productImagesExternalBaseUrl) ?? filePath;
      return {
        src: resolved,
        sourceType: 'Attached File',
        rawSource: filePath,
        resolvedSource: resolved,
      };
    }

    const storedUrl = selectedSlot?.imageUrl?.trim() ?? '';
    if (storedUrl) {
      const resolved = resolveProductImageUrl(storedUrl, productImagesExternalBaseUrl) ?? storedUrl;
      return {
        src: resolved,
        sourceType: 'Stored URL',
        rawSource: storedUrl,
        resolvedSource: resolved,
      };
    }

    return {
      src: null,
      sourceType: 'None',
      rawSource: 'n/a',
      resolvedSource: 'n/a',
    };
  }, [selectedSlot, slotBase64Draft, slotImageUrlDraft, productImagesExternalBaseUrl]);

  const inlinePreviewBase64Bytes = useMemo(
    () => estimateBase64Bytes(slotBase64Draft),
    [slotBase64Draft]
  );

  const inlinePreviewMimeType = useMemo(() => {
    const fromFile = selectedSlot?.imageFile?.mimetype?.trim() ?? '';
    if (fromFile) return fromFile;
    const fromBase64 = extractDataUrlMimeType(slotBase64Draft);
    if (fromBase64) return fromBase64;
    return 'n/a';
  }, [selectedSlot?.imageFile?.mimetype, slotBase64Draft]);

  const inlinePreviewDimensions = useMemo(() => {
    const width = selectedSlot?.imageFile?.width ?? inlinePreviewNaturalSize?.width ?? null;
    const height = selectedSlot?.imageFile?.height ?? inlinePreviewNaturalSize?.height ?? null;
    if (typeof width === 'number' && Number.isFinite(width) && typeof height === 'number' && Number.isFinite(height)) {
      return `${width} x ${height}`;
    }
    return 'n/a';
  }, [
    selectedSlot?.imageFile?.width,
    selectedSlot?.imageFile?.height,
    inlinePreviewNaturalSize?.width,
    inlinePreviewNaturalSize?.height,
  ]);

  const environmentPreviewSource = useMemo(() => {
    const normalizedUrl = environmentReferenceDraft.imageUrl.trim();
    if (!normalizedUrl) {
      return {
        src: null,
        sourceType: 'None',
        rawSource: 'n/a',
        resolvedSource: 'n/a',
      };
    }
    const resolved = resolveProductImageUrl(normalizedUrl, productImagesExternalBaseUrl) ?? normalizedUrl;
    return {
      src: resolved,
      sourceType: environmentReferenceDraft.imageFileId ? 'Uploaded File' : 'Stored URL',
      rawSource: normalizedUrl,
      resolvedSource: resolved,
    };
  }, [environmentReferenceDraft.imageFileId, environmentReferenceDraft.imageUrl, productImagesExternalBaseUrl]);

  const environmentPreviewDimensions = useMemo(() => {
    const width = environmentReferenceDraft.width ?? environmentPreviewNaturalSize?.width ?? null;
    const height = environmentReferenceDraft.height ?? environmentPreviewNaturalSize?.height ?? null;
    if (typeof width === 'number' && Number.isFinite(width) && typeof height === 'number' && Number.isFinite(height)) {
      return `${width} x ${height}`;
    }
    return 'n/a';
  }, [
    environmentReferenceDraft.width,
    environmentReferenceDraft.height,
    environmentPreviewNaturalSize?.width,
    environmentPreviewNaturalSize?.height,
  ]);

  const sourceCompositeImage = useMemo((): CompositeTabImage => {
    const width = selectedSlot?.imageFile?.width ?? inlinePreviewNaturalSize?.width ?? null;
    const height = selectedSlot?.imageFile?.height ?? inlinePreviewNaturalSize?.height ?? null;
    const rawSource = inlinePreviewSource.rawSource;
    return {
      key: `source:${selectedSlot?.id ?? 'draft'}`,
      source: 'source',
      name: slotNameDraft.trim() || selectedSlot?.name?.trim() || selectedSlot?.id || 'Source Card',
      sourceType: inlinePreviewSource.sourceType,
      slotId: selectedSlot?.id ?? null,
      order: null,
      imageSrc: inlinePreviewSource.src,
      imageFileId: selectedSlot?.imageFile?.id ?? selectedSlot?.imageFileId ?? null,
      filepath: rawSource === '(inline base64)' || rawSource === 'n/a' ? null : rawSource,
      filename: selectedSlot?.imageFile?.filename ?? null,
      width: typeof width === 'number' && Number.isFinite(width) ? width : null,
      height: typeof height === 'number' && Number.isFinite(height) ? height : null,
      size: selectedSlot?.imageFile?.size ?? inlinePreviewBase64Bytes ?? null,
      updatedAt: selectedSlot?.imageFile?.updatedAt ?? null,
    };
  }, [
    inlinePreviewBase64Bytes,
    inlinePreviewNaturalSize?.height,
    inlinePreviewNaturalSize?.width,
    inlinePreviewSource.rawSource,
    inlinePreviewSource.sourceType,
    inlinePreviewSource.src,
    selectedSlot?.id,
    selectedSlot?.imageFile?.filename,
    selectedSlot?.imageFile?.height,
    selectedSlot?.imageFile?.id,
    selectedSlot?.imageFile?.size,
    selectedSlot?.imageFile?.updatedAt,
    selectedSlot?.imageFile?.width,
    selectedSlot?.imageFileId,
    selectedSlot?.name,
    slotNameDraft,
  ]);

  const savedCompositeInputImages = useMemo((): CompositeTabImage[] => {
    if (!selectedSlot) return [];
    const metadata = asRecord(selectedSlot.metadata);
    const compositeConfig = asRecord(metadata?.['compositeConfig']);
    const rawLayers = Array.isArray(compositeConfig?.['layers']) ? (compositeConfig?.['layers'] as unknown[]) : [];
    return rawLayers
      .map((layer, layerIndex): CompositeTabImage | null => {
        const layerRecord = asRecord(layer);
        if (!layerRecord) return null;
        const slotId = typeof layerRecord['slotId'] === 'string' ? layerRecord['slotId'].trim() : '';
        const layerSlot = slotId ? slots.find((slot) => slot.id === slotId) ?? null : null;
        const rawFilepath = layerSlot?.imageFile?.filepath?.trim() || layerSlot?.imageUrl?.trim() || null;
        const imageSrc = rawFilepath
          ? (resolveProductImageUrl(rawFilepath, productImagesExternalBaseUrl) ?? rawFilepath)
          : null;
        const order = asFiniteNumber(layerRecord['order']) ?? layerIndex;
        return {
          key: `saved:${slotId || `layer-${layerIndex}`}:${order}`,
          source: 'input',
          name: layerSlot?.name?.trim() || `Layer ${layerIndex + 1}`,
          sourceType: 'Saved Composite Layer',
          slotId: slotId || null,
          order,
          imageSrc,
          imageFileId: layerSlot?.imageFile?.id ?? layerSlot?.imageFileId ?? null,
          filepath: rawFilepath,
          filename: layerSlot?.imageFile?.filename ?? null,
          width: layerSlot?.imageFile?.width ?? null,
          height: layerSlot?.imageFile?.height ?? null,
          size: layerSlot?.imageFile?.size ?? null,
          updatedAt: layerSlot?.imageFile?.updatedAt ?? null,
        };
      })
      .filter((entry): entry is CompositeTabImage => Boolean(entry))
      .sort((a, b) => {
        const aOrder = a.order ?? Number.MAX_SAFE_INTEGER;
        const bOrder = b.order ?? Number.MAX_SAFE_INTEGER;
        if (aOrder !== bOrder) return aOrder - bOrder;
        return a.name.localeCompare(b.name);
      });
  }, [productImagesExternalBaseUrl, selectedSlot, slots]);

  const activeCompositeInputImages = useMemo((): CompositeTabImage[] => {
    return compositeAssets.map((slot, index): CompositeTabImage => {
      const rawFilepath = slot.imageFile?.filepath?.trim() || slot.imageUrl?.trim() || null;
      const imageSrc = rawFilepath
        ? (resolveProductImageUrl(rawFilepath, productImagesExternalBaseUrl) ?? rawFilepath)
        : null;
      return {
        key: `active:${slot.id}:${index}`,
        source: 'input',
        name: slot.name?.trim() || slot.id,
        sourceType: 'Active Composite Input',
        slotId: slot.id,
        order: index,
        imageSrc,
        imageFileId: slot.imageFile?.id ?? slot.imageFileId ?? null,
        filepath: rawFilepath,
        filename: slot.imageFile?.filename ?? null,
        width: slot.imageFile?.width ?? null,
        height: slot.imageFile?.height ?? null,
        size: slot.imageFile?.size ?? null,
        updatedAt: slot.imageFile?.updatedAt ?? null,
      };
    });
  }, [compositeAssets, productImagesExternalBaseUrl]);

  const compositeTabInputImages = useMemo((): CompositeTabImage[] => {
    if (savedCompositeInputImages.length > 0) return savedCompositeInputImages;
    return activeCompositeInputImages;
  }, [activeCompositeInputImages, savedCompositeInputImages]);

  const compositeTabInputSourceLabel = useMemo((): string => {
    if (savedCompositeInputImages.length > 0) {
      return 'Showing saved composite layers from this card.';
    }
    if (activeCompositeInputImages.length > 0) {
      return 'Showing active composite inputs selected in Studio.';
    }
    return 'No composite input images found for this card.';
  }, [activeCompositeInputImages.length, savedCompositeInputImages.length]);

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
      if (!selectedSlot?.id) return;
      scheduleInlineSlotLinkPersistence(selectedSlot.id, value);
    },
    [scheduleInlineSlotLinkPersistence, selectedSlot?.id, setSlotImageUrlDraft]
  );

  const setInlineCardImageBase64At = useCallback(
    (index: number, value: string): void => {
      if (index !== INLINE_CARD_IMAGE_SLOT_INDEX) return;
      setSlotBase64Draft(value);
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
      setInlineSlotUploadError(null);
      clearInlineSlotSyncTimeouts();
      setSlotUpdateBusy(true);
      try {
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
      } catch (error: unknown) {
        setInlineSlotUploadError(error instanceof Error ? error.message : 'Failed to remove image');
      } finally {
        setSlotUpdateBusy(false);
      }
    },
    [
      clearInlineSlotSyncTimeouts,
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

  const handleDriveSelection = async (files: ImageFileSelection[]) => {
    setDriveImportOpen(false);
    if (files.length === 0) return;

    try {
      const previousTemporary = temporaryObjectUpload;
      const result = await importFromDriveMutation.mutateAsync({
        files,
        folder: selectedFolder,
      });
      const imported = result.uploaded ?? [];
      if (imported.length === 0) {
        throw new Error(result.failures?.[0]?.error || 'No files imported.');
      }

      if (driveImportMode === 'temporary-object') {
        const primary = imported[0]!;
        setTemporaryObjectUpload({
          id: primary.id,
          filepath: primary.filepath,
          filename: primary.filename,
        });
        if (previousTemporary && previousTemporary.id !== primary.id) {
          await deleteStagedAsset(previousTemporary).catch(() => {
            // Best-effort cleanup for replaced temporary assets.
          });
        }
        toast('Imported to temporary object slot. Load to canvas to create a card.', { variant: 'success' });
      } else if (driveImportMode === 'environment') {
        const targetId = driveImportTargetId ?? selectedSlot?.id ?? null;
        if (!targetId) {
          throw new Error('No target card selected for environment reference.');
        }
        const primary = imported[0]!;
        setSelectedSlotId(targetId);
        applyEnvironmentReferenceAsset(primary);
        toast('Environment reference selected. Save Card to apply.', { variant: 'success' });
      } else if (driveImportMode === 'replace') {
        const targetId = driveImportTargetId ?? selectedSlot?.id ?? null;
        if (!targetId) {
          throw new Error('No target card selected for replacement.');
        }
        const primary = imported[0]!;
        await updateSlotMutation.mutateAsync({
          id: targetId,
          data: {
            imageFileId: primary.id,
            imageUrl: primary.filepath,
            imageBase64: null,
          },
        });
        setSelectedSlotId(targetId);
        toast('Card image updated.', { variant: 'success' });
      } else {
        const primary = imported[0]!;
        const created = await createSlots([
          {
            name: toSlotName(primary.filename || '', 0),
            ...(selectedFolder ? { folderPath: selectedFolder } : {}),
            imageFileId: primary.id,
            imageUrl: primary.filepath,
            imageBase64: null,
          },
        ]);
        if (created[0]) {
          setSelectedSlotId(created[0].id);
        }
        toast('Created card from import.', {
          variant: 'success',
        });
      }
    } catch (error: unknown) {
      toast(error instanceof Error ? error.message : 'Import failed', { variant: 'error' });
    } finally {
      setDriveImportMode('create');
      setDriveImportTargetId(null);
    }
  };

  const handleCreateEmptySlot = async () => {
    setSlotCreateOpen(false);
    try {
      const created = await createSlots([
        {
          name: `Card ${slots.length + 1}`,
          ...(selectedFolder ? { folderPath: selectedFolder } : {}),
        },
      ]);
      if (created[0]) setSelectedSlotId(created[0].id);
    } catch (error: unknown) {
      toast(error instanceof Error ? error.message : 'Failed to create card', { variant: 'error' });
    }
  };

  const triggerLocalUpload = (
    mode: 'create' | 'replace' | 'temporary-object' | 'environment',
    targetId: string | null
  ): void => {
    setLocalUploadMode(mode);
    setLocalUploadTargetId(targetId);
    window.setTimeout(() => localUploadInputRef.current?.click(), 0);
  };

  const handleLocalUpload = async (filesList: FileList | null): Promise<void> => {
    if (!filesList || filesList.length === 0) return;
    const files = Array.from(filesList);
    try {
      const previousTemporary = temporaryObjectUpload;
      const result = await uploadMutation.mutateAsync({
        files,
        folder: selectedFolder,
      });
      const uploaded = result.uploaded ?? [];
      if (uploaded.length === 0) {
        throw new Error(result.failures?.[0]?.error || 'No files uploaded.');
      }

      if (localUploadMode === 'temporary-object') {
        const primary = uploaded[0]!;
        setTemporaryObjectUpload({
          id: primary.id,
          filepath: primary.filepath,
          filename: primary.filename,
        });
        if (previousTemporary && previousTemporary.id !== primary.id) {
          await deleteStagedAsset(previousTemporary).catch(() => {
            // Best-effort cleanup for replaced temporary assets.
          });
        }
        toast('Uploaded to temporary object slot. Load to canvas to create a card.', { variant: 'success' });
      } else if (localUploadMode === 'environment') {
        const targetId = localUploadTargetId ?? selectedSlot?.id ?? null;
        if (!targetId) {
          throw new Error('No target card selected for environment reference.');
        }
        const primary = uploaded[0]!;
        setSelectedSlotId(targetId);
        applyEnvironmentReferenceAsset(primary);
        toast('Environment reference uploaded. Save Card to apply.', { variant: 'success' });
      } else if (localUploadMode === 'replace') {
        const targetId = localUploadTargetId ?? selectedSlot?.id ?? null;
        if (!targetId) {
          throw new Error('No target card selected for replacement.');
        }
        const primary = uploaded[0]!;
        await updateSlotMutation.mutateAsync({
          id: targetId,
          data: {
            imageFileId: primary.id,
            imageUrl: primary.filepath,
            imageBase64: null,
          },
        });
        setSelectedSlotId(targetId);
        toast('Card image uploaded and attached.', { variant: 'success' });
      } else {
        const primary = uploaded[0]!;
        const created = await createSlots([
          {
            name: toSlotName(primary.filename || '', 0),
            ...(selectedFolder ? { folderPath: selectedFolder } : {}),
            imageFileId: primary.id,
            imageUrl: primary.filepath,
            imageBase64: null,
          },
        ]);
        if (created[0]) {
          setSelectedSlotId(created[0].id);
        }
        toast('Uploaded and created card.', {
          variant: 'success',
        });
      }
    } catch (error: unknown) {
      toast(error instanceof Error ? error.message : 'Upload failed', { variant: 'error' });
    } finally {
      if (localUploadInputRef.current) {
        localUploadInputRef.current.value = '';
      }
      setLocalUploadTargetId(null);
      setLocalUploadMode('create');
    }
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

  const appendExtractHistoryEntry = (
    entry: Omit<PromptExtractHistoryEntry, 'id' | 'createdAt'>
  ): void => {
    const nextId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    setExtractHistory((prev: PromptExtractHistoryEntry[]) => {
      const next: PromptExtractHistoryEntry[] = [
        {
          id: nextId,
          createdAt: Date.now(),
          ...entry,
        },
        ...prev,
      ];
      return next.slice(0, 25);
    });
    setSelectedExtractHistoryId(nextId);
  };

  const handleProgrammaticExtraction = async () => {
    const promptBefore = extractDraftPrompt;
    setExtractBusy('programmatic');
    setExtractError(null);
    try {
      const result = await api.post<PromptExtractApiResponse>('/api/image-studio/prompt-extract', {
        prompt: promptBefore,
        mode: 'programmatic',
        applyAutofix: studioSettings.promptExtraction.applyAutofix,
      });
      if (!result.params || typeof result.params !== 'object') {
        throw new Error('Invalid extraction response.');
      }
      const promptAfter = result.formattedPrompt ?? promptBefore;
      if (
        studioSettings.promptExtraction.autoApplyFormattedPrompt &&
        promptAfter !== promptBefore
      ) {
        setExtractDraftPrompt(promptAfter);
      }

      const specs = inferParamSpecs(result.params, JSON.stringify(result.params, null, 2));
      const heuristic = buildHeuristicControls(result.params, specs);
      setPreviewParams(result.params);
      setPreviewSpecs(specs);
      setPreviewControls(heuristic);
      setExtractPreviewUiOverrides(heuristic);
      const before = Array.isArray(result.validation?.before) ? result.validation?.before : [];
      const after = Array.isArray(result.validation?.after) ? result.validation?.after : [];
      setPreviewValidation({ before, after });
      appendExtractHistoryEntry({
        runKind: 'programmatic',
        source: result.source ?? null,
        modeRequested: result.modeRequested ?? 'programmatic',
        fallbackUsed: Boolean(result.fallbackUsed),
        autofixApplied:
          Boolean(result.diagnostics?.autofixApplied) ||
          result.source === 'programmatic_autofix',
        promptBefore,
        promptAfter,
        validationBeforeCount: before.length,
        validationAfterCount: after.length,
      });
      const validationSuffix = studioSettings.promptExtraction.showValidationSummary
        ? ` Validation: ${before.length} -> ${after.length}.`
        : '';
      toast(`Programmatic extraction completed.${validationSuffix}`, { variant: 'success' });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Programmatic extraction failed';
      setExtractError(message);
      toast(message, { variant: 'error' });
    } finally {
      setExtractBusy('none');
    }
  };

  const handleSmartExtraction = async () => {
    const promptBefore = extractDraftPrompt;
    setExtractBusy('smart');
    setExtractError(null);
    try {
      const result = await api.post<PromptExtractApiResponse>('/api/image-studio/prompt-extract', {
        prompt: promptBefore,
        mode: studioSettings.promptExtraction.mode,
        applyAutofix: studioSettings.promptExtraction.applyAutofix,
      });
      if (!result.params || typeof result.params !== 'object') {
        throw new Error('Invalid extraction response.');
      }
      const promptAfter = result.formattedPrompt ?? promptBefore;

      if (
        studioSettings.promptExtraction.autoApplyFormattedPrompt &&
        promptAfter !== promptBefore
      ) {
        setExtractDraftPrompt(promptAfter);
      }

      const specs = inferParamSpecs(result.params, JSON.stringify(result.params, null, 2));
      const heuristic = buildHeuristicControls(result.params, specs);
      setPreviewParams(result.params);
      setPreviewSpecs(specs);
      setPreviewControls(heuristic);
      setExtractPreviewUiOverrides(heuristic);
      const before = Array.isArray(result.validation?.before) ? result.validation?.before : [];
      const after = Array.isArray(result.validation?.after) ? result.validation?.after : [];
      setPreviewValidation({ before, after });
      appendExtractHistoryEntry({
        runKind: 'smart',
        source: result.source ?? null,
        modeRequested: result.modeRequested ?? studioSettings.promptExtraction.mode,
        fallbackUsed: Boolean(result.fallbackUsed),
        autofixApplied:
          Boolean(result.diagnostics?.autofixApplied) ||
          result.source === 'programmatic_autofix',
        promptBefore,
        promptAfter,
        validationBeforeCount: before.length,
        validationAfterCount: after.length,
      });

      const sourceLabel =
        result.source === 'gpt'
          ? 'AI'
          : result.source === 'programmatic_autofix'
            ? 'Programmatic + Autofix'
            : 'Programmatic';
      const fallbackSuffix = result.fallbackUsed ? ' (fallback used)' : '';
      const beforeCount = before.length;
      const afterCount = after.length;
      const validationSuffix = studioSettings.promptExtraction.showValidationSummary
        ? ` Validation: ${beforeCount} -> ${afterCount}.`
        : '';
      toast(
        `Smart extraction completed via ${sourceLabel}${fallbackSuffix}.${validationSuffix}`,
        { variant: 'success' }
      );
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Smart extraction failed';
      setExtractError(message);
      toast(message, { variant: 'error' });
    } finally {
      setExtractBusy('none');
    }
  };

  const handleAiExtraction = async () => {
    const promptBefore = extractDraftPrompt;
    setExtractBusy('ai');
    setExtractError(null);
    try {
      const result = await api.post<PromptExtractApiResponse>('/api/image-studio/prompt-extract', {
        prompt: promptBefore,
        mode: 'gpt',
        applyAutofix: studioSettings.promptExtraction.applyAutofix,
      });
      if (!result.params || typeof result.params !== 'object') {
        throw new Error('Invalid extraction response.');
      }
      const promptAfter = result.formattedPrompt ?? promptBefore;
      if (
        studioSettings.promptExtraction.autoApplyFormattedPrompt &&
        promptAfter !== promptBefore
      ) {
        setExtractDraftPrompt(promptAfter);
      }
      const specs = inferParamSpecs(result.params, JSON.stringify(result.params, null, 2));
      const heuristic = buildHeuristicControls(result.params, specs);
      setPreviewParams(result.params);
      setPreviewSpecs(specs);
      setPreviewControls(heuristic);
      setExtractPreviewUiOverrides(heuristic);
      const before = Array.isArray(result.validation?.before) ? result.validation?.before : [];
      const after = Array.isArray(result.validation?.after) ? result.validation?.after : [];
      setPreviewValidation({ before, after });
      appendExtractHistoryEntry({
        runKind: 'ai',
        source: result.source ?? null,
        modeRequested: result.modeRequested ?? 'gpt',
        fallbackUsed: Boolean(result.fallbackUsed),
        autofixApplied:
          Boolean(result.diagnostics?.autofixApplied) ||
          result.source === 'programmatic_autofix',
        promptBefore,
        promptAfter,
        validationBeforeCount: before.length,
        validationAfterCount: after.length,
      });
      const sourceLabel = result.source === 'gpt' ? 'AI' : 'Programmatic fallback';
      const fallbackSuffix = result.fallbackUsed ? ' (fallback used)' : '';
      const validationSuffix = studioSettings.promptExtraction.showValidationSummary
        ? ` Validation: ${before.length} -> ${after.length}.`
        : '';
      toast(`${sourceLabel} extraction completed${fallbackSuffix}.${validationSuffix}`, { variant: 'success' });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'AI extraction failed';
      setExtractError(message);
      toast(message, { variant: 'error' });
    } finally {
      setExtractBusy('none');
    }
  };

  const handleSuggestUiControls = async () => {
    if (!previewParams) {
      toast('Extract params first.', { variant: 'info' });
      return;
    }
    setExtractBusy('ui');
    setExtractError(null);
    try {
      const mode = studioSettings.uiExtractor.mode;
      const heuristic = buildHeuristicControls(previewParams, previewSpecs);
      let aiSuggestions: UiExtractorSuggestion[] = [];

      if (mode === 'ai' || mode === 'both') {
        const flattened = flattenParams(previewParams).filter((leaf) => Boolean(leaf.path));
        const response = await api.post<{ suggestions?: Array<{ path?: string; control?: string }> }>(
          '/api/image-studio/ui-extractor',
          {
            prompt: extractDraftPrompt,
            params: flattened.map((leaf) => ({
              path: leaf.path,
              value: leaf.value,
              spec: previewSpecs?.[leaf.path] ?? null,
            })),
            mode,
          }
        );
        aiSuggestions = (response.suggestions ?? [])
          .filter((item): item is { path: string; control: string } => Boolean(item?.path && item?.control))
          .map((item) => ({ path: item.path, control: item.control as ParamUiControl }))
          .filter((item) => isParamUiControl(item.control));
      }

      const nextControls: Record<string, ParamUiControl> = {};
      if (mode === 'heuristic' || mode === 'both') {
        Object.assign(nextControls, heuristic);
      }
      aiSuggestions.forEach((item) => {
        nextControls[item.path] = item.control;
      });
      setPreviewControls(nextControls);
      setExtractPreviewUiOverrides(nextControls);
      toast('UI selector suggestions updated.', { variant: 'success' });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to suggest UI controls';
      setExtractError(message);
      toast(message, { variant: 'error' });
    } finally {
      setExtractBusy('none');
    }
  };

  const handleApplyExtraction = () => {
    if (!previewParams) {
      toast('Extract params first.', { variant: 'info' });
      return;
    }
    setPromptText(extractDraftPrompt);
    setParamsState(previewParams);
    setParamSpecs(previewSpecs);
    setParamUiOverrides(previewControls);
    setExtractPreviewUiOverrides(previewControls);
    setExtractReviewOpen(false);
    toast('Prompt params applied.', { variant: 'success' });
  };

  const handleCopyCardId = useCallback(
    async (cardId: string): Promise<void> => {
      const normalizedCardId = cardId.trim();
      if (!normalizedCardId) return;
      if (typeof navigator === 'undefined' || !navigator.clipboard?.writeText) {
        toast('Clipboard is unavailable in this browser.', { variant: 'error' });
        return;
      }
      try {
        await navigator.clipboard.writeText(normalizedCardId);
        toast('Card ID copied to clipboard.', { variant: 'success' });
      } catch {
        toast('Failed to copy Card ID.', { variant: 'error' });
      }
    },
    [toast]
  );

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
          <TabsContent value='card' className='mt-0 space-y-4'>
            <div className='space-y-3 rounded-lg border border-border/60 bg-card/35 p-3'>
              <div className='flex flex-wrap items-center justify-between gap-2'>
                <div className='space-y-0.5'>
                  <div className='text-[10px] uppercase tracking-wide text-gray-500'>Image Slot Preview</div>
                  <div className='text-xs text-gray-200'>
                  Source: {inlinePreviewSource.sourceType}
                  </div>
                </div>
              </div>

              <InlineImagePreviewCanvas
                imageSrc={inlinePreviewSource.src}
                imageAlt={slotNameDraft.trim() || selectedSlot?.name || 'Card preview'}
                onImageDimensionsChange={setInlinePreviewNaturalSize}
              />

              <div className='grid gap-2 rounded-md border border-border/60 bg-card/30 p-3 text-[11px] text-gray-300 sm:grid-cols-2'>
                <div>
                  <span className='text-gray-500'>Source type:</span> {inlinePreviewSource.sourceType}
                </div>
                <div>
                  <span className='text-gray-500'>Dimensions:</span> {inlinePreviewDimensions}
                </div>
                <div>
                  <span className='text-gray-500'>Image file id:</span>{' '}
                  <span className='font-mono text-[10px]'>
                    {selectedSlot?.imageFile?.id || selectedSlot?.imageFileId || 'n/a'}
                  </span>
                </div>
                <div>
                  <span className='text-gray-500'>Mime type:</span> {inlinePreviewMimeType}
                </div>
                <div>
                  <span className='text-gray-500'>Filename:</span> {selectedSlot?.imageFile?.filename || 'n/a'}
                </div>
                <div>
                  <span className='text-gray-500'>File size:</span> {formatBytes(selectedSlot?.imageFile?.size ?? inlinePreviewBase64Bytes ?? null)}
                </div>
                {slotBase64Draft.trim() ? (
                  <div className='sm:col-span-2'>
                    <span className='text-gray-500'>Base64 payload:</span>{' '}
                    {`${slotBase64Draft.trim().length.toLocaleString()} chars (~${formatBytes(inlinePreviewBase64Bytes)})`}
                  </div>
                ) : null}
                <div className='sm:col-span-2'>
                  <span className='text-gray-500'>Raw source:</span>{' '}
                  <span className='break-all font-mono text-[10px] text-gray-300'>
                    {inlinePreviewSource.rawSource}
                  </span>
                </div>
                <div className='sm:col-span-2'>
                  <span className='text-gray-500'>Resolved preview source:</span>{' '}
                  <span className='break-all font-mono text-[10px] text-gray-300'>
                    {inlinePreviewSource.resolvedSource}
                  </span>
                </div>
                <div className='sm:col-span-2'>
                  <span className='text-gray-500'>Tags:</span>{' '}
                  {selectedSlot?.imageFile?.tags?.length
                    ? selectedSlot.imageFile.tags.join(', ')
                    : 'n/a'}
                </div>
                <div>
                  <span className='text-gray-500'>Created:</span> {formatDateTime(selectedSlot?.imageFile?.createdAt)}
                </div>
                <div>
                  <span className='text-gray-500'>Updated:</span> {formatDateTime(selectedSlot?.imageFile?.updatedAt)}
                </div>
              </div>
            </div>

            <div className='grid gap-3 sm:grid-cols-2'>
              <div className='space-y-1'>
                <Label className='text-xs text-gray-400'>Card Name</Label>
                <Input size='sm'
                  value={slotNameDraft}
                  onChange={(event: React.ChangeEvent<HTMLInputElement>) => setSlotNameDraft(event.target.value)}
                  className='h-9'
                />
              </div>
              <div className='space-y-1'>
                <Label className='text-xs text-gray-400'>Folder Path</Label>
                <Input size='sm'
                  value={slotFolderDraft}
                  onChange={(event: React.ChangeEvent<HTMLInputElement>) => setSlotFolderDraft(event.target.value)}
                  placeholder='e.g. variants/red'
                  className='h-9'
                />
              </div>
            </div>

            <div className='space-y-2 rounded-lg border border-border/60 bg-card/35 p-3'>
              <div className='text-[10px] uppercase tracking-wide text-gray-500'>
                Image Slot
              </div>
              <ProductImageManagerControllerProvider value={inlineCardImageManagerController}>
                <ProductImageManager showDragHandle={false} />
              </ProductImageManagerControllerProvider>
            </div>

            <div className='space-y-2'>
              <div className='flex items-center justify-between gap-2'>
                <Label className='text-xs text-gray-400'>Linked Generated Variants</Label>
                <Button size='xs'
                  type='button'
                  variant='outline'
                  onClick={() => {
                    void linkedRunsQuery.refetch();
                  }}
                  disabled={linkedRunsQuery.isFetching}
                >
                  {linkedRunsQuery.isFetching ? <Loader2 className='mr-2 size-4 animate-spin' /> : null}
                Refresh
                </Button>
              </div>
              <div className='max-h-56 space-y-2 overflow-y-auto rounded-lg border border-border/60 bg-card/40 p-2'>
                {linkedRunsQuery.isLoading ? (
                  <div className='flex items-center gap-2 px-1 py-2 text-xs text-gray-400'>
                    <Loader2 className='size-4 animate-spin' />
                  Loading linked variants...
                  </div>
                ) : linkedRunsQuery.isError ? (
                  <div className='rounded border border-red-500/35 bg-red-500/10 px-2 py-2 text-xs text-red-200'>
                    {linkedRunsQuery.error instanceof Error
                      ? linkedRunsQuery.error.message
                      : 'Failed to load linked variants.'}
                  </div>
                ) : linkedGeneratedVariants.length === 0 ? (
                  <div className='px-1 py-2 text-xs text-gray-500'>
                  No generated variants linked to this card yet.
                  </div>
                ) : (
                  linkedGeneratedVariants.map((variant) => {
                    const isApplying = linkedVariantApplyBusyKey === variant.key && slotUpdateBusy;
                    return (
                      <div
                        key={variant.key}
                        className='flex items-center gap-3 rounded border border-border/60 bg-card/50 p-2'
                      >
                        <div className='size-14 overflow-hidden rounded-md border border-border/60 bg-black/30'>
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={variant.imageSrc}
                            alt={variant.output.filename || `Linked variant ${variant.outputIndex}`}
                            className='h-full w-full object-cover'
                            loading='lazy'
                          />
                        </div>
                        <div className='min-w-0 flex-1 text-[11px] text-gray-300'>
                          <div className='truncate text-xs text-gray-100'>
                            {variant.output.filename || `Variant ${variant.outputIndex}`}
                          </div>
                          <div className='truncate text-[10px] text-gray-400'>
                          Run {variant.runId.slice(0, 8)} • Variant {variant.outputIndex}/{variant.outputCount}
                          </div>
                          <div className='truncate text-[10px] text-gray-500'>
                            {formatLinkedVariantTimestamp(variant.runCreatedAt)}
                          </div>
                        </div>
                        <Button size='xs'
                          type='button'
                          variant='outline'
                          onClick={() => {
                            void handleApplyLinkedVariantToCard(variant);
                          }}
                          disabled={slotUpdateBusy}
                        >
                          {isApplying ? <Loader2 className='mr-2 size-4 animate-spin' /> : null}
                        Use On Card
                        </Button>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            <div className='flex flex-wrap items-center gap-2'>
              <Button size='xs'
                type='button'
                variant='outline'
                onClick={() => {
                  if (selectedSlot) {
                    setSlotInlineEditOpen(false);
                    setDriveImportMode('replace');
                    setDriveImportTargetId(selectedSlot.id);
                    setDriveImportOpen(true);
                  }
                }}
              >
              Replace From Drive
              </Button>
              <Button size='xs'
                type='button'
                variant='outline'
                onClick={() => {
                  if (selectedSlot) {
                    setSlotInlineEditOpen(false);
                    triggerLocalUpload('replace', selectedSlot.id);
                  }
                }}
                disabled={uploadMutation.isPending}
              >
                {uploadMutation.isPending ? <Loader2 className='mr-2 size-4 animate-spin' /> : null}
              Replace From Local Upload
              </Button>
              <Button size='xs'
                type='button'
                variant='outline'
                onClick={() => {
                  void handleClearSlotImage();
                }}
                disabled={slotUpdateBusy}
              >
              Clear Image
              </Button>
            </div>
          </TabsContent>
          <TabsContent value='generations' className='mt-0 space-y-4'>
            <div className='space-y-3 rounded-lg border border-border/60 bg-card/35 p-3'>
              <div className='flex flex-wrap items-center justify-between gap-2'>
                <div className='space-y-0.5'>
                  <div className='text-[10px] uppercase tracking-wide text-gray-500'>Generation Preview</div>
                  <div className='text-xs text-gray-200'>
                    {selectedGenerationPreview
                      ? `Run ${selectedGenerationPreview.runId.slice(0, 8)} • Variant ${selectedGenerationPreview.outputIndex}/${selectedGenerationPreview.outputCount}`
                      : 'No generated variants available for this card.'}
                  </div>
                </div>
                <Button
                  size='xs'
                  type='button'
                  variant='outline'
                  onClick={() => {
                    void linkedRunsQuery.refetch();
                  }}
                  disabled={linkedRunsQuery.isFetching}
                >
                  {linkedRunsQuery.isFetching ? <Loader2 className='mr-2 size-4 animate-spin' /> : null}
                  Refresh
                </Button>
              </div>

              <InlineImagePreviewCanvas
                imageSrc={selectedGenerationPreview?.imageSrc ?? null}
                imageAlt={
                  selectedGenerationPreview?.output.filename ||
                  `${slotNameDraft.trim() || selectedSlot?.name || 'Card'} generation preview`
                }
                onImageDimensionsChange={setGenerationPreviewNaturalSize}
              />

              {selectedGenerationPreview ? (
                <div className='grid gap-2 rounded-md border border-border/60 bg-card/30 p-3 text-[11px] text-gray-300 sm:grid-cols-2'>
                  <div>
                    <span className='text-gray-500'>Run:</span>{' '}
                    <span className='font-mono text-[10px]'>{selectedGenerationPreview.runId}</span>
                  </div>
                  <div>
                    <span className='text-gray-500'>Variant:</span>{' '}
                    {selectedGenerationPreview.outputIndex}/{selectedGenerationPreview.outputCount}
                  </div>
                  <div>
                    <span className='text-gray-500'>Output file id:</span>{' '}
                    <span className='font-mono text-[10px]'>{selectedGenerationPreview.output.id}</span>
                  </div>
                  <div>
                    <span className='text-gray-500'>Dimensions:</span> {selectedGenerationPreviewDimensions}
                  </div>
                  <div>
                    <span className='text-gray-500'>Filename:</span>{' '}
                    {selectedGenerationPreview.output.filename || 'n/a'}
                  </div>
                  <div>
                    <span className='text-gray-500'>Size:</span>{' '}
                    {formatBytes(selectedGenerationPreview.output.size)}
                  </div>
                  <div className='sm:col-span-2'>
                    <span className='text-gray-500'>Path:</span>{' '}
                    <span className='break-all font-mono text-[10px] text-gray-300'>
                      {selectedGenerationPreview.output.filepath}
                    </span>
                  </div>
                  <div className='sm:col-span-2'>
                    <span className='text-gray-500'>Generated:</span>{' '}
                    {formatLinkedVariantTimestamp(selectedGenerationPreview.runCreatedAt)}
                  </div>
                </div>
              ) : (
                <div className='rounded-md border border-border/60 bg-card/30 px-3 py-2 text-xs text-gray-400'>
                  Generate or attach variants to this card to populate generation slots.
                </div>
              )}
            </div>

            <div className='space-y-2 rounded-lg border border-border/60 bg-card/35 p-3'>
              <div className='flex items-center justify-between gap-2'>
                <div className='text-[10px] uppercase tracking-wide text-gray-500'>
                  Generated Image Slots
                </div>
                <div className='text-[11px] text-gray-400'>
                  {linkedGeneratedVariants.length} image{linkedGeneratedVariants.length === 1 ? '' : 's'}
                </div>
              </div>
              <div className='grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5'>
                {linkedRunsQuery.isLoading ? (
                  <div className='col-span-full flex items-center gap-2 rounded border border-border/60 bg-card/40 px-3 py-2 text-xs text-gray-400'>
                    <Loader2 className='size-4 animate-spin' />
                    Loading generation slots...
                  </div>
                ) : linkedRunsQuery.isError ? (
                  <div className='col-span-full rounded border border-red-500/35 bg-red-500/10 px-3 py-2 text-xs text-red-200'>
                    {linkedRunsQuery.error instanceof Error
                      ? linkedRunsQuery.error.message
                      : 'Failed to load generated images.'}
                  </div>
                ) : linkedGeneratedVariants.length === 0 ? (
                  <div className='col-span-full rounded border border-border/50 bg-card/40 px-3 py-2 text-xs text-gray-400'>
                    No generated image slots are linked to this card yet.
                  </div>
                ) : (
                  linkedGeneratedVariants.map((variant) => {
                    const isSelected = selectedGenerationPreview?.key === variant.key;
                    return (
                      <button
                        key={variant.key}
                        type='button'
                        onClick={() => {
                          handleOpenGenerationPreviewModal(variant);
                        }}
                        className={`group overflow-hidden rounded-md border text-left transition-colors ${
                          isSelected
                            ? 'border-emerald-400/70 bg-emerald-500/10'
                            : 'border-border/60 bg-card/40 hover:border-border'
                        }`}
                        title='Open generation preview'
                      >
                        <div className='relative aspect-square overflow-hidden bg-black/35'>
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={variant.imageSrc}
                            alt={variant.output.filename || `Generation ${variant.outputIndex}`}
                            className='h-full w-full object-cover'
                            loading='lazy'
                          />
                          <div className='absolute left-1 top-1 rounded border border-border/60 bg-black/65 px-1 py-0.5 text-[10px] text-gray-200'>
                            {variant.outputIndex}/{variant.outputCount}
                          </div>
                        </div>
                        <div className='truncate border-t border-border/50 px-2 py-1 text-[10px] text-gray-200'>
                          {variant.output.filename || `Variant ${variant.outputIndex}`}
                        </div>
                      </button>
                    );
                  })
                )}
              </div>
            </div>
          </TabsContent>
          <TabsContent value='environment' className='mt-0 space-y-4'>
            <div className='space-y-3 rounded-lg border border-border/60 bg-card/35 p-3'>
              <div className='flex flex-wrap items-center justify-between gap-2'>
                <div className='space-y-0.5'>
                  <div className='text-[10px] uppercase tracking-wide text-gray-500'>Environment Reference</div>
                  <div className='text-xs text-gray-200'>
                    Source: {environmentPreviewSource.sourceType}
                  </div>
                </div>
              </div>

              <InlineImagePreviewCanvas
                imageSrc={environmentPreviewSource.src}
                imageAlt={`${slotNameDraft.trim() || selectedSlot?.name || 'Card'} environment reference`}
                onImageDimensionsChange={setEnvironmentPreviewNaturalSize}
              />

              <div className='grid gap-2 rounded-md border border-border/60 bg-card/30 p-3 text-[11px] text-gray-300 sm:grid-cols-2'>
                <div>
                  <span className='text-gray-500'>Source type:</span> {environmentPreviewSource.sourceType}
                </div>
                <div>
                  <span className='text-gray-500'>Dimensions:</span> {environmentPreviewDimensions}
                </div>
                <div>
                  <span className='text-gray-500'>Image file id:</span>{' '}
                  <span className='font-mono text-[10px]'>
                    {environmentReferenceDraft.imageFileId || 'n/a'}
                  </span>
                </div>
                <div>
                  <span className='text-gray-500'>Mime type:</span> {environmentReferenceDraft.mimetype || 'n/a'}
                </div>
                <div>
                  <span className='text-gray-500'>Filename:</span> {environmentReferenceDraft.filename || 'n/a'}
                </div>
                <div>
                  <span className='text-gray-500'>File size:</span> {formatBytes(environmentReferenceDraft.size)}
                </div>
                <div className='sm:col-span-2'>
                  <span className='text-gray-500'>Raw source:</span>{' '}
                  <span className='break-all font-mono text-[10px] text-gray-300'>
                    {environmentPreviewSource.rawSource}
                  </span>
                </div>
                <div className='sm:col-span-2'>
                  <span className='text-gray-500'>Resolved preview source:</span>{' '}
                  <span className='break-all font-mono text-[10px] text-gray-300'>
                    {environmentPreviewSource.resolvedSource}
                  </span>
                </div>
                <div>
                  <span className='text-gray-500'>Updated:</span> {formatDateTime(environmentReferenceDraft.updatedAt)}
                </div>
                <div />
              </div>
            </div>

            <div className='rounded-lg border border-border/60 bg-card/30 p-3 text-xs text-gray-300'>
              Upload a reference image for the card environment. Save Card to persist changes.
            </div>

            <div className='flex flex-wrap items-center gap-2'>
              <Button size='xs'
                type='button'
                variant='outline'
                onClick={() => {
                  if (selectedSlot) {
                    setDriveImportMode('environment');
                    setDriveImportTargetId(selectedSlot.id);
                    setDriveImportOpen(true);
                  }
                }}
              >
                Upload Environment From Drive
              </Button>
              <Button size='xs'
                type='button'
                variant='outline'
                onClick={() => {
                  if (selectedSlot) {
                    triggerLocalUpload('environment', selectedSlot.id);
                  }
                }}
                disabled={uploadMutation.isPending}
              >
                {uploadMutation.isPending ? <Loader2 className='mr-2 size-4 animate-spin' /> : null}
                Upload Environment From Local
              </Button>
              <Button size='xs'
                type='button'
                variant='outline'
                onClick={() => {
                  setEnvironmentReferenceDraft({ ...EMPTY_ENVIRONMENT_REFERENCE_DRAFT });
                  setEnvironmentPreviewNaturalSize(null);
                }}
                disabled={!environmentReferenceDraft.imageFileId && !environmentReferenceDraft.imageUrl.trim()}
              >
                Clear Environment Image
              </Button>
            </div>
          </TabsContent>
          <TabsContent value='masks' className='mt-0 space-y-4'>
            <div className='space-y-2 rounded-lg border border-border/60 bg-card/35 p-3'>
              <div className='text-[10px] uppercase tracking-wide text-gray-500'>Linked Masks</div>
              <div className='text-xs text-gray-300'>
                Masks attached to this card via mask metadata links.
              </div>
            </div>
            <div className='max-h-[34rem] space-y-2 overflow-y-auto rounded-lg border border-border/60 bg-card/35 p-2'>
              {linkedMaskSlots.length === 0 ? (
                <div className='rounded border border-border/50 bg-card/40 px-3 py-3 text-xs text-gray-400'>
                  No linked masks found for this card.
                </div>
              ) : (
                linkedMaskSlots.map((mask) => (
                  <div
                    key={mask.slotId}
                    className='grid gap-3 rounded border border-border/60 bg-card/50 p-3 md:grid-cols-[90px_1fr]'
                  >
                    <div className='h-[90px] w-[90px] overflow-hidden rounded border border-border/60 bg-black/40'>
                      {mask.imageSrc ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={mask.imageSrc}
                          alt={mask.name}
                          className='h-full w-full object-cover'
                          loading='lazy'
                        />
                      ) : (
                        <div className='flex h-full items-center justify-center text-[10px] text-gray-500'>
                          No image
                        </div>
                      )}
                    </div>
                    <div className='min-w-0 space-y-1 text-[11px] text-gray-300'>
                      <div className='truncate text-xs text-gray-100'>{mask.name}</div>
                      <div className='text-[10px] text-gray-400'>
                        Variant: <span className='text-gray-200'>{mask.variant}</span>
                        {' '}• Inverted: <span className='text-gray-200'>{mask.inverted ? 'Yes' : 'No'}</span>
                        {' '}• Mode: <span className='text-gray-200'>{mask.generationMode}</span>
                      </div>
                      <div className='text-[10px] text-gray-400'>
                        Relation: <span className='font-mono text-gray-300'>{mask.relationType || 'mask'}</span>
                      </div>
                      <div className='text-[10px] text-gray-400'>
                        Mask Slot: <span className='font-mono text-gray-300'>{mask.slotId}</span>
                      </div>
                      <div className='text-[10px] text-gray-400'>
                        File ID: <span className='font-mono text-gray-300'>{mask.imageFileId || 'n/a'}</span>
                      </div>
                      <div className='text-[10px] text-gray-400'>
                        File: <span className='text-gray-300'>{mask.filename || 'n/a'}</span>
                        {' '}• Size: <span className='text-gray-300'>{formatBytes(mask.size)}</span>
                        {' '}• Dimensions:{' '}
                        <span className='text-gray-300'>
                          {mask.width && mask.height ? `${mask.width} x ${mask.height}` : 'n/a'}
                        </span>
                      </div>
                      <div className='truncate text-[10px] text-gray-500'>
                        Path: <span className='font-mono text-gray-400'>{mask.filepath || 'n/a'}</span>
                      </div>
                      <div className='text-[10px] text-gray-500'>
                        Updated: {formatDateTime(mask.updatedAt)}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </TabsContent>
          <TabsContent value='composites' className='mt-0 space-y-4'>
            <div className='space-y-2 rounded-lg border border-border/60 bg-card/35 p-3'>
              <div className='text-[10px] uppercase tracking-wide text-gray-500'>Composite Inputs</div>
              <div className='text-xs text-gray-300'>
                {compositeTabInputSourceLabel}
              </div>
            </div>

            <div className='space-y-2 rounded-lg border border-border/60 bg-card/35 p-3'>
              <div className='text-[10px] uppercase tracking-wide text-gray-500'>Source Image</div>
              <div className='grid gap-3 rounded border border-border/60 bg-card/50 p-3 md:grid-cols-[90px_1fr]'>
                <div className='h-[90px] w-[90px] overflow-hidden rounded border border-border/60 bg-black/40'>
                  {sourceCompositeImage.imageSrc ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={sourceCompositeImage.imageSrc}
                      alt={sourceCompositeImage.name}
                      className='h-full w-full object-cover'
                      loading='lazy'
                    />
                  ) : (
                    <div className='flex h-full items-center justify-center text-[10px] text-gray-500'>
                      No image
                    </div>
                  )}
                </div>
                <div className='min-w-0 space-y-1 text-[11px] text-gray-300'>
                  <div className='truncate text-xs text-gray-100'>{sourceCompositeImage.name}</div>
                  <div className='text-[10px] text-gray-400'>
                    Source: <span className='text-gray-200'>{sourceCompositeImage.sourceType}</span>
                  </div>
                  <div className='text-[10px] text-gray-400'>
                    Card Slot: <span className='font-mono text-gray-300'>{sourceCompositeImage.slotId || 'n/a'}</span>
                  </div>
                  <div className='text-[10px] text-gray-400'>
                    File ID: <span className='font-mono text-gray-300'>{sourceCompositeImage.imageFileId || 'n/a'}</span>
                  </div>
                  <div className='text-[10px] text-gray-400'>
                    File: <span className='text-gray-300'>{sourceCompositeImage.filename || 'n/a'}</span>
                    {' '}• Size: <span className='text-gray-300'>{formatBytes(sourceCompositeImage.size)}</span>
                    {' '}• Dimensions:{' '}
                    <span className='text-gray-300'>
                      {sourceCompositeImage.width && sourceCompositeImage.height
                        ? `${sourceCompositeImage.width} x ${sourceCompositeImage.height}`
                        : 'n/a'}
                    </span>
                  </div>
                  <div className='truncate text-[10px] text-gray-500'>
                    Path: <span className='font-mono text-gray-400'>{sourceCompositeImage.filepath || 'n/a'}</span>
                  </div>
                  <div className='text-[10px] text-gray-500'>
                    Updated: {formatDateTime(sourceCompositeImage.updatedAt)}
                  </div>
                </div>
              </div>
            </div>

            <div className='space-y-2 rounded-lg border border-border/60 bg-card/35 p-3'>
              <div className='text-[10px] uppercase tracking-wide text-gray-500'>Composite Images</div>
              <div className='max-h-[28rem] space-y-2 overflow-y-auto rounded border border-border/60 bg-card/35 p-2'>
                {compositeTabInputImages.length === 0 ? (
                  <div className='rounded border border-border/50 bg-card/40 px-3 py-3 text-xs text-gray-400'>
                    No composite images to show.
                  </div>
                ) : (
                  compositeTabInputImages.map((entry) => (
                    <div
                      key={entry.key}
                      className='grid gap-3 rounded border border-border/60 bg-card/50 p-3 md:grid-cols-[90px_1fr]'
                    >
                      <div className='h-[90px] w-[90px] overflow-hidden rounded border border-border/60 bg-black/40'>
                        {entry.imageSrc ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={entry.imageSrc}
                            alt={entry.name}
                            className='h-full w-full object-cover'
                            loading='lazy'
                          />
                        ) : (
                          <div className='flex h-full items-center justify-center text-[10px] text-gray-500'>
                            No image
                          </div>
                        )}
                      </div>
                      <div className='min-w-0 space-y-1 text-[11px] text-gray-300'>
                        <div className='truncate text-xs text-gray-100'>{entry.name}</div>
                        <div className='text-[10px] text-gray-400'>
                          Type: <span className='text-gray-200'>{entry.sourceType}</span>
                          {entry.order !== null ? (
                            <>
                              {' '}• Layer order: <span className='text-gray-200'>{entry.order + 1}</span>
                            </>
                          ) : null}
                        </div>
                        <div className='text-[10px] text-gray-400'>
                          Slot: <span className='font-mono text-gray-300'>{entry.slotId || 'n/a'}</span>
                        </div>
                        <div className='text-[10px] text-gray-400'>
                          File ID: <span className='font-mono text-gray-300'>{entry.imageFileId || 'n/a'}</span>
                        </div>
                        <div className='text-[10px] text-gray-400'>
                          File: <span className='text-gray-300'>{entry.filename || 'n/a'}</span>
                          {' '}• Size: <span className='text-gray-300'>{formatBytes(entry.size)}</span>
                          {' '}• Dimensions:{' '}
                          <span className='text-gray-300'>
                            {entry.width && entry.height ? `${entry.width} x ${entry.height}` : 'n/a'}
                          </span>
                        </div>
                        <div className='truncate text-[10px] text-gray-500'>
                          Path: <span className='font-mono text-gray-400'>{entry.filepath || 'n/a'}</span>
                        </div>
                        <div className='text-[10px] text-gray-500'>
                          Updated: {formatDateTime(entry.updatedAt)}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </SlotInlineEditModal>

      <GenerationPreviewModal
        isOpen={generationPreviewModalOpen}
        onClose={() => setGenerationPreviewModalOpen(false)}
        selectedGenerationPreview={selectedGenerationPreview}
        generationModalPreviewNaturalSize={generationModalPreviewNaturalSize}
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
        handleSmartExtraction={handleSmartExtraction}
        handleProgrammaticExtraction={handleProgrammaticExtraction}
        handleAiExtraction={handleAiExtraction}
        handleSuggestUiControls={handleSuggestUiControls}
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
