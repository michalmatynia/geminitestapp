'use client';

import { useQuery } from '@tanstack/react-query';
import { Loader2 } from 'lucide-react';
import React, { useEffect, useMemo, useRef, useState } from 'react';

import FileManager from '@/features/files/components/FileManager';
import {
  DEFAULT_PRODUCT_IMAGES_EXTERNAL_BASE_URL,
  PRODUCT_IMAGES_EXTERNAL_BASE_URL_SETTING_KEY,
} from '@/features/products/constants';
import { resolveProductImageUrl } from '@/features/products/utils/image-routing';
import {
  flattenParams,
  inferParamSpecs,
  type ParamSpec,
} from '@/features/prompt-engine/prompt-params';
import { api } from '@/shared/lib/api-client';
import { useSettingsStore } from '@/shared/providers/SettingsStoreProvider';
import type { ImageFileSelection } from '@/shared/types/domain/files';
import { Button, Input, Label, AppModal, Textarea, useToast } from '@/shared/ui';

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
import { PromptExtractionHistoryPanel } from './studio-modals/PromptExtractionHistoryPanel';
import { useProjectsState } from '../context/ProjectsContext';
import { usePromptActions, usePromptState } from '../context/PromptContext';
import { useSettingsState } from '../context/SettingsContext';
import { useSlotsActions, useSlotsState } from '../context/SlotsContext';
import { studioKeys } from '../hooks/useImageStudioQueries';
import { isParamUiControl, type ParamUiControl } from '../utils/param-ui';

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

const formatLinkedVariantTimestamp = (value: string): string => {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleString();
};

const INLINE_PREVIEW_ZOOM_MIN = 0.35;
const INLINE_PREVIEW_ZOOM_MAX = 8;
const INLINE_PREVIEW_ZOOM_STEP = 0.15;
const INLINE_PREVIEW_WHEEL_SENSITIVITY = 0.0012;
const INLINE_PREVIEW_MAX_WHEEL_DELTA = 0.45;

const clampInlinePreviewZoom = (value: number): number =>
  Math.min(INLINE_PREVIEW_ZOOM_MAX, Math.max(INLINE_PREVIEW_ZOOM_MIN, Number(value.toFixed(3))));

const normalizeWheelDelta = (deltaY: number, deltaMode: number): number => {
  if (deltaMode === 1) return deltaY * 16;
  if (deltaMode === 2) return deltaY * 100;
  return deltaY;
};

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

const formatDateTime = (value: string | null | undefined): string => {
  if (!value || typeof value !== 'string') return 'n/a';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
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
  };

  const handlePointerDown = (event: React.PointerEvent<HTMLDivElement>): void => {
    if (!imageSrc || event.button !== 0) return;
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

  const handleWheel = (event: React.WheelEvent<HTMLDivElement>): void => {
    if (!imageSrc) return;
    event.preventDefault();
    const normalizedDelta = normalizeWheelDelta(event.deltaY, event.deltaMode);
    const zoomDelta = Math.max(
      -INLINE_PREVIEW_MAX_WHEEL_DELTA,
      Math.min(INLINE_PREVIEW_MAX_WHEEL_DELTA, -normalizedDelta * INLINE_PREVIEW_WHEEL_SENSITIVITY)
    );
    if (Math.abs(zoomDelta) < 0.0005) return;

    const rect = event.currentTarget.getBoundingClientRect();
    const pointerX = event.clientX - rect.left - rect.width / 2;
    const pointerY = event.clientY - rect.top - rect.height / 2;

    setZoom((currentZoom) => {
      const nextZoom = clampInlinePreviewZoom(currentZoom + zoomDelta);
      if (nextZoom === currentZoom) return currentZoom;
      setOffset((currentOffset) => {
        const worldX = (pointerX - currentOffset.x) / currentZoom;
        const worldY = (pointerY - currentOffset.y) / currentZoom;
        return {
          x: pointerX - worldX * nextZoom,
          y: pointerY - worldY * nextZoom,
        };
      });
      return nextZoom;
    });
  };

  return (
    <div
      className='relative h-72 overflow-hidden rounded-lg border border-border/60 bg-black/35 touch-none'
      onWheel={handleWheel}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerRelease}
      onPointerCancel={handlePointerRelease}
      style={{ cursor: imageSrc ? (isDragging ? 'grabbing' : 'grab') : 'default' }}
    >
      <div className='absolute right-2 top-2 z-10 flex items-center gap-1 rounded border border-border/60 bg-black/65 px-1 py-1 backdrop-blur'>
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
            Drag to pan, mouse wheel to zoom
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
  const localUploadInputRef = useRef<HTMLInputElement | null>(null);
  const [localUploadMode, setLocalUploadMode] = useState<'create' | 'replace' | 'temporary-object'>('create');
  const [localUploadTargetId, setLocalUploadTargetId] = useState<string | null>(null);
  const [linkedVariantApplyBusyKey, setLinkedVariantApplyBusyKey] = useState<string | null>(null);
  const [inlinePreviewNaturalSize, setInlinePreviewNaturalSize] = useState<{ width: number; height: number } | null>(null);

  const productImagesExternalBaseUrl =
    settingsStore.get(PRODUCT_IMAGES_EXTERNAL_BASE_URL_SETTING_KEY) ??
    DEFAULT_PRODUCT_IMAGES_EXTERNAL_BASE_URL;

  const linkedRunsQuery = useQuery<LinkedGeneratedRunsResponse>({
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

  useEffect(() => {
    if (!slotInlineEditOpen || !selectedSlot) return;
    setSlotNameDraft(selectedSlot.name ?? '');
    setSlotFolderDraft(selectedSlot.folderPath ?? selectedFolder ?? '');
    setSlotImageUrlDraft(selectedSlot.imageUrl ?? selectedSlot.imageFile?.filepath ?? '');
    setSlotBase64Draft(selectedSlot.imageBase64 ?? '');
  }, [
    slotInlineEditOpen,
    selectedSlot,
    selectedFolder,
    setSlotImageUrlDraft,
    setSlotBase64Draft,
  ]);

  useEffect(() => {
    if (!slotInlineEditOpen) {
      setInlinePreviewNaturalSize(null);
    }
  }, [slotInlineEditOpen]);

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

  const triggerLocalUpload = (mode: 'create' | 'replace' | 'temporary-object', targetId: string | null): void => {
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
      const hasManualImage = Boolean(slotImageUrlDraft.trim() || slotBase64Draft.trim());
      await updateSlotMutation.mutateAsync({
        id: selectedSlot.id,
        data: {
          name: slotNameDraft.trim() || selectedSlot.name || `Card ${slots.length + 1}`,
          folderPath: slotFolderDraft.trim(),
          imageUrl: slotImageUrlDraft.trim() || null,
          imageBase64: slotBase64Draft.trim() || null,
          ...(hasManualImage ? { imageFileId: null } : {}),
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

  const driveImportTitle =
    driveImportMode === 'replace'
      ? 'Attach Image To Selected Card'
      : driveImportMode === 'temporary-object'
        ? 'Select Object Image'
        : 'Import Images';

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
      <AppModal
        open={driveImportOpen}
        onClose={() => {
          setDriveImportOpen(false);
          setDriveImportMode('create');
          setDriveImportTargetId(null);
        }}
        title={driveImportTitle}
        size='xl'
      >
        <div className='mb-3 flex flex-wrap items-center gap-2'>
          <Button size='xs'
            type='button'
            variant='outline'
            onClick={() => {
              setLocalUploadMode(driveImportMode);
              setLocalUploadTargetId(
                driveImportMode === 'replace' ? (driveImportTargetId ?? selectedSlot?.id ?? null) : null
              );
              window.setTimeout(() => localUploadInputRef.current?.click(), 0);
            }}
            disabled={uploadMutation.isPending}
          >
            {uploadMutation.isPending ? <Loader2 className='mr-2 size-4 animate-spin' /> : null}
            Upload From Computer
          </Button>
          <span className='text-xs text-gray-400'>
            Or select existing files below.
          </span>
        </div>
        <FileManager
          mode='select'
          selectionMode='single'
          onSelectFile={(files) => {
            void handleDriveSelection(files);
          }}
        />
      </AppModal>

      <AppModal
        open={slotCreateOpen}
        onClose={() => setSlotCreateOpen(false)}
        title='New Card'
        size='md'
      >
        <div className='space-y-4 text-sm text-gray-200'>
          <Button size='xs'
            variant='outline'
            onClick={() => {
              void handleCreateEmptySlot();
            }}
            disabled={!projectId}
            className='w-full'
          >
            Create Empty Card
          </Button>
          <Button size='xs'
            onClick={() => {
              setSlotCreateOpen(false);
              setDriveImportMode('create');
              setDriveImportTargetId(null);
              setDriveImportOpen(true);
            }}
            disabled={!projectId}
            className='w-full'
          >
            Create Card From Image
          </Button>
          <Button size='xs'
            variant='outline'
            onClick={() => {
              setSlotCreateOpen(false);
              triggerLocalUpload('create', null);
            }}
            disabled={!projectId || uploadMutation.isPending}
            className='w-full'
          >
            {uploadMutation.isPending ? <Loader2 className='mr-2 size-4 animate-spin' /> : null}
            Create Card From Local Upload
          </Button>
        </div>
      </AppModal>

      <AppModal
        open={slotInlineEditOpen}
        onClose={() => setSlotInlineEditOpen(false)}
        title='Edit Card'
        size='lg'
      >
        {selectedSlot ? (
          <div className='space-y-4'>
            <div className='space-y-3 rounded-lg border border-border/60 bg-card/35 p-3'>
              <div className='flex flex-wrap items-center justify-between gap-2'>
                <div className='space-y-0.5'>
                  <div className='text-[10px] uppercase tracking-wide text-gray-500'>Image Slot Preview</div>
                  <div className='text-xs text-gray-200'>
                    Source: {inlinePreviewSource.sourceType}
                  </div>
                </div>
                <div className='text-[10px] text-gray-400'>
                  Card ID: <span className='font-mono text-gray-300'>{selectedSlot.id}</span>
                </div>
              </div>

              <InlineImagePreviewCanvas
                imageSrc={inlinePreviewSource.src}
                imageAlt={slotNameDraft.trim() || selectedSlot.name || 'Card preview'}
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
                    {selectedSlot.imageFile?.id || selectedSlot.imageFileId || 'n/a'}
                  </span>
                </div>
                <div>
                  <span className='text-gray-500'>Mime type:</span> {inlinePreviewMimeType}
                </div>
                <div>
                  <span className='text-gray-500'>Filename:</span> {selectedSlot.imageFile?.filename || 'n/a'}
                </div>
                <div>
                  <span className='text-gray-500'>File size:</span> {formatBytes(selectedSlot.imageFile?.size ?? inlinePreviewBase64Bytes ?? null)}
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
                  {selectedSlot.imageFile?.tags?.length
                    ? selectedSlot.imageFile.tags.join(', ')
                    : 'n/a'}
                </div>
                <div>
                  <span className='text-gray-500'>Created:</span> {formatDateTime(selectedSlot.imageFile?.createdAt)}
                </div>
                <div>
                  <span className='text-gray-500'>Updated:</span> {formatDateTime(selectedSlot.imageFile?.updatedAt)}
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

            <div className='space-y-1'>
              <Label className='text-xs text-gray-400'>Image URL</Label>
              <Input size='sm'
                value={slotImageUrlDraft}
                onChange={(event: React.ChangeEvent<HTMLInputElement>) => setSlotImageUrlDraft(event.target.value)}
                placeholder='/uploads/... or https://...'
                className='h-9'
              />
            </div>

            <div className='space-y-1'>
              <Label className='text-xs text-gray-400'>Image Base64 (optional)</Label>
              <Textarea size='sm'
                value={slotBase64Draft}
                onChange={(event: React.ChangeEvent<HTMLTextAreaElement>) => setSlotBase64Draft(event.target.value)}
                className='h-28 font-mono text-[11px]'
                placeholder='data:image/png;base64,...'
              />
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
                  setSlotInlineEditOpen(false);
                  setDriveImportMode('replace');
                  setDriveImportTargetId(selectedSlot.id);
                  setDriveImportOpen(true);
                }}
              >
                Replace From Drive
              </Button>
              <Button size='xs'
                type='button'
                variant='outline'
                onClick={() => {
                  setSlotInlineEditOpen(false);
                  triggerLocalUpload('replace', selectedSlot.id);
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
              <Button size='xs'
                type='button'
                onClick={() => {
                  void handleSaveInlineSlot();
                }}
                disabled={slotUpdateBusy}
              >
                {slotUpdateBusy ? <Loader2 className='mr-2 size-4 animate-spin' /> : null}
                Save Card
              </Button>
            </div>
          </div>
        ) : (
          <div className='text-sm text-gray-400'>Select a card first.</div>
        )}
      </AppModal>

      <AppModal
        open={extractReviewOpen}
        onClose={() => setExtractReviewOpen(false)}
        title='Extract Prompt Params'
        size='xl'
      >
        <div className='space-y-4'>
          <div className='space-y-1'>
            <Label className='text-xs text-gray-400'>Prompt Source</Label>
            <Textarea size='sm'
              value={extractDraftPrompt}
              onChange={(event: React.ChangeEvent<HTMLTextAreaElement>) => setExtractDraftPrompt(event.target.value)}
              className='h-36 font-mono text-[11px]'
              placeholder='Paste prompt text with params object...'
            />
          </div>

          <div className='flex flex-wrap items-center gap-2'>
            <Button size='xs'
              type='button'
              onClick={() => {
                void handleSmartExtraction();
              }}
              disabled={extractBusy !== 'none'}
            >
              {extractBusy === 'smart' ? <Loader2 className='mr-2 size-4 animate-spin' /> : null}
              Smart Extract
            </Button>
            <Button size='xs'
              type='button'
              variant='outline'
              onClick={() => {
                void handleProgrammaticExtraction();
              }}
              disabled={extractBusy !== 'none'}
            >
              {extractBusy === 'programmatic' ? <Loader2 className='mr-2 size-4 animate-spin' /> : null}
              Programmatic Extract
            </Button>
            <Button size='xs'
              type='button'
              variant='outline'
              onClick={() => {
                void handleAiExtraction();
              }}
              disabled={extractBusy !== 'none'}
            >
              {extractBusy === 'ai' ? <Loader2 className='mr-2 size-4 animate-spin' /> : null}
              AI Only
            </Button>
            <Button size='xs'
              type='button'
              variant='outline'
              onClick={() => {
                void handleSuggestUiControls();
              }}
              disabled={!previewParams || extractBusy !== 'none'}
            >
              {extractBusy === 'ui' ? <Loader2 className='mr-2 size-4 animate-spin' /> : null}
              Suggest Selectors
            </Button>
            <Button size='xs'
              type='button'
              onClick={handleApplyExtraction}
              disabled={!previewParams}
            >
              Apply
            </Button>
          </div>

          {extractError ? (
            <div className='rounded border border-red-500/40 bg-red-500/10 p-2 text-xs text-red-200'>
              {extractError}
            </div>
          ) : null}

          {extractHistory.length > 0 ? (
            <PromptExtractionHistoryPanel
              extractHistory={extractHistory}
              selectedExtractHistory={selectedExtractHistory}
              selectedExtractDiffLines={selectedExtractDiffLines}
              selectedExtractChanged={selectedExtractChanged}
              onSelectExtractHistory={setSelectedExtractHistoryId}
              onClearHistory={() => {
                setExtractHistory([]);
                setSelectedExtractHistoryId(null);
              }}
            />
          ) : null}

          {studioSettings.promptExtraction.showValidationSummary && previewValidation ? (
            <div className='grid gap-2 rounded border border-cyan-500/35 bg-cyan-500/5 p-3 text-xs text-cyan-100 md:grid-cols-2'>
              <div className='space-y-1'>
                <div className='font-medium text-cyan-200'>Validation Before: {previewValidation.before.length}</div>
                {previewValidation.before.length === 0 ? (
                  <div className='text-cyan-100/70'>No issues.</div>
                ) : (
                  <div className='space-y-1'>
                    {previewValidation.before.slice(0, 6).map((issue, index) => (
                      <div key={`before-${issue.ruleId ?? index}`} className='rounded border border-cyan-500/20 bg-cyan-500/5 px-2 py-1'>
                        <div className='text-cyan-100'>{issue.title ?? issue.ruleId ?? 'Issue'}</div>
                        <div className='text-cyan-100/70'>{issue.message ?? ''}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <div className='space-y-1'>
                <div className='font-medium text-cyan-200'>Validation After: {previewValidation.after.length}</div>
                {previewValidation.after.length === 0 ? (
                  <div className='text-cyan-100/70'>No issues.</div>
                ) : (
                  <div className='space-y-1'>
                    {previewValidation.after.slice(0, 6).map((issue, index) => (
                      <div key={`after-${issue.ruleId ?? index}`} className='rounded border border-cyan-500/20 bg-cyan-500/5 px-2 py-1'>
                        <div className='text-cyan-100'>{issue.title ?? issue.ruleId ?? 'Issue'}</div>
                        <div className='text-cyan-100/70'>{issue.message ?? ''}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ) : null}

          {previewLeaves.length > 0 ? (
            <div className='max-h-72 overflow-auto rounded border border-border/60 bg-card/50'>
              <div className='grid grid-cols-[1.6fr_1fr_1fr] gap-2 border-b border-border/50 px-3 py-2 text-[11px] text-gray-400'>
                <div>Path</div>
                <div>Value</div>
                <div>Selector</div>
              </div>
              <div className='divide-y divide-border/40'>
                {previewLeaves.map((leaf) => (
                  <div
                    key={leaf.path}
                    className='grid grid-cols-[1.6fr_1fr_1fr] gap-2 px-3 py-2 text-[11px]'
                  >
                    <div className='truncate font-mono text-gray-200' title={leaf.path}>
                      {leaf.path}
                    </div>
                    <div className='truncate text-gray-300' title={JSON.stringify(leaf.value)}>
                      {typeof leaf.value === 'string' ? leaf.value : JSON.stringify(leaf.value)}
                    </div>
                    <div className='truncate text-gray-400'>
                      {previewControls[leaf.path] ?? 'auto'}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className='text-xs text-gray-500'>
              Extracted params will appear here.
            </div>
          )}
        </div>
      </AppModal>
    </>
  );
}
