'use client';

import { useQueryClient } from '@tanstack/react-query';
import { Loader2, Play } from 'lucide-react';
import React, { useMemo, useState } from 'react';

import {
  DEFAULT_PRODUCT_IMAGES_EXTERNAL_BASE_URL,
  PRODUCT_IMAGES_EXTERNAL_BASE_URL_SETTING_KEY,
} from '@/features/products/constants';
import { api } from '@/shared/lib/api-client';
import { invalidateImageStudioSlots } from '@/shared/lib/query-invalidation';
import { useSettingsStore } from '@/shared/providers/SettingsStoreProvider';
import {
  Button,
  Switch,
  SelectSimple,
  useToast,
} from '@/shared/ui';

import { useMaskingState, useMaskingActions, type MaskingState } from '../context/MaskingContext';
import { useProjectsState } from '../context/ProjectsContext';
import { useSettingsState, useSettingsActions } from '../context/SettingsContext';
import { useSlotsState, useSlotsActions } from '../context/SlotsContext';
import { useUiActions, useUiState } from '../context/UiContext';
import { studioKeys } from '../hooks/useImageStudioQueries';
import { getImageStudioSlotImageSrc } from '../utils/image-src';
import { normalizeImageStudioModelPresets } from '../utils/studio-settings';

import type { RunStudioEnqueueResult } from '../hooks/useImageStudioMutations';
import type { ImageStudioSlotRecord, StudioSlotsResponse } from '../types';

type MaskAttachMode = 'client_canvas_polygon' | 'server_polygon';
type UpscaleMode = 'client_canvas' | 'server_sharp';
type CropMode = 'client_bbox' | 'server_bbox';
type CenterMode = 'client_alpha_bbox' | 'server_alpha_bbox';
type UpscaleSmoothingQuality = 'low' | 'medium' | 'high';
type MaskShapeForExport = {
  id: string;
  type: string;
  points: Array<{ x: number; y: number }>;
  closed: boolean;
  visible: boolean;
};
type CropRect = {
  x: number;
  y: number;
  width: number;
  height: number;
};

type PolledRunRecord = {
  id: string;
  status: 'queued' | 'running' | 'completed' | 'failed';
  errorMessage: string | null;
};

const CENTER_RUN_POLL_INTERVAL_MS = 1200;
const CENTER_RUN_POLL_MAX_ATTEMPTS = 600;
const sleep = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

const clamp01 = (value: number): number => Math.max(0, Math.min(1, value));
const toNormalizedUnit = (value: number, sourceSize: number): number | null => {
  if (!Number.isFinite(value)) return null;
  if (value >= 0 && value <= 1) return clamp01(value);
  if (!(sourceSize > 0)) return null;
  return clamp01(value / sourceSize);
};
const toUnitPoint = (
  point: { x: number; y: number },
  sourceWidth: number,
  sourceHeight: number
): { x: number; y: number } | null => {
  const x = toNormalizedUnit(point.x, sourceWidth);
  const y = toNormalizedUnit(point.y, sourceHeight);
  if (x === null || y === null) return null;
  return { x, y };
};

const normalizeShapeToPolygons = (
  shape: {
    type: string;
    points: Array<{ x: number; y: number }>;
    closed: boolean;
  },
  sourceWidth: number,
  sourceHeight: number
): Array<Array<{ x: number; y: number }>> => {
  if (shape.type === 'polygon' || shape.type === 'lasso' || shape.type === 'brush') {
    if (!shape.closed || shape.points.length < 3) return [];
    const polygon = shape.points
      .map((point) => {
        return toUnitPoint(point, sourceWidth, sourceHeight);
      })
      .filter((point): point is { x: number; y: number } => point !== null);
    if (polygon.length < 3) return [];
    return [polygon];
  }

  if (shape.type === 'rect') {
    if (shape.points.length < 2) return [];
    const xs = shape.points
      .map((point) => toNormalizedUnit(point.x, sourceWidth))
      .filter((value): value is number => value !== null);
    const ys = shape.points
      .map((point) => toNormalizedUnit(point.y, sourceHeight))
      .filter((value): value is number => value !== null);
    if (xs.length < 2 || ys.length < 2) return [];
    const minX = clamp01(Math.min(...xs));
    const maxX = clamp01(Math.max(...xs));
    const minY = clamp01(Math.min(...ys));
    const maxY = clamp01(Math.max(...ys));
    if (maxX <= minX || maxY <= minY) return [];
    return [[
      { x: minX, y: minY },
      { x: maxX, y: minY },
      { x: maxX, y: maxY },
      { x: minX, y: maxY },
    ]];
  }

  if (shape.type === 'ellipse') {
    if (shape.points.length < 2) return [];
    const xs = shape.points
      .map((point) => toNormalizedUnit(point.x, sourceWidth))
      .filter((value): value is number => value !== null);
    const ys = shape.points
      .map((point) => toNormalizedUnit(point.y, sourceHeight))
      .filter((value): value is number => value !== null);
    if (xs.length < 2 || ys.length < 2) return [];
    const minX = clamp01(Math.min(...xs));
    const maxX = clamp01(Math.max(...xs));
    const minY = clamp01(Math.min(...ys));
    const maxY = clamp01(Math.max(...ys));
    if (maxX <= minX || maxY <= minY) return [];

    const cx = (minX + maxX) / 2;
    const cy = (minY + maxY) / 2;
    const rx = (maxX - minX) / 2;
    const ry = (maxY - minY) / 2;
    const steps = 24;
    const polygon = Array.from({ length: steps }, (_, index) => {
      const theta = (index / steps) * Math.PI * 2;
      return {
        x: clamp01(cx + rx * Math.cos(theta)),
        y: clamp01(cy + ry * Math.sin(theta)),
      };
    });
    return [polygon];
  }

  return [];
};

const polygonsFromShapes = (
  shapes: MaskShapeForExport[],
  sourceWidth: number,
  sourceHeight: number
): Array<Array<{ x: number; y: number }>> =>
  shapes.flatMap((shape) => normalizeShapeToPolygons(shape, sourceWidth, sourceHeight));

const shapeHasUsableCropGeometry = (shape: MaskShapeForExport): boolean => {
  if (!shape.visible) return false;
  if (shape.type === 'rect' || shape.type === 'ellipse') {
    if (shape.points.length < 2) return false;
    return shape.points
      .slice(0, 2)
      .every((point) => Number.isFinite(point.x) && Number.isFinite(point.y));
  }
  if (shape.type === 'polygon' || shape.type === 'lasso' || shape.type === 'brush') {
    if (!shape.closed || shape.points.length < 3) return false;
    return shape.points.every((point) => Number.isFinite(point.x) && Number.isFinite(point.y));
  }
  return false;
};

const resolveMaskColors = (
  variant: 'white' | 'black',
  inverted: boolean
): { background: '#000000' | '#ffffff'; fill: '#000000' | '#ffffff' } => {
  const preferWhite = variant === 'white';
  const background =
    (preferWhite && !inverted) || (!preferWhite && inverted)
      ? '#000000'
      : '#ffffff';
  const fill = background === '#000000' ? '#ffffff' : '#000000';
  return { background, fill };
};

export function GenerationToolbar(): React.JSX.Element {
  const { maskPreviewEnabled, centerGuidesEnabled } = useUiState();
  const { setMaskPreviewEnabled, setCenterGuidesEnabled } = useUiActions();
  const { projectId } = useProjectsState();
  const { workingSlot } = useSlotsState();
  const { setSelectedSlotId, setWorkingSlotId } = useSlotsActions();
  const settingsStore = useSettingsStore();
  const {
    maskShapes,
    activeMaskId,
    maskInvert,
    maskGenLoading,
    maskGenMode,
  }: Pick<MaskingState, 'maskShapes' | 'activeMaskId' | 'maskInvert' | 'maskGenLoading' | 'maskGenMode'> = useMaskingState();
  const {
    setTool,
    setMaskShapes,
    setActiveMaskId,
    setMaskInvert,
    setMaskGenMode,
    handleAiMaskGeneration,
  } = useMaskingActions();
  const { studioSettings } = useSettingsState();
  const { setStudioSettings } = useSettingsActions();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [maskAttachMode, setMaskAttachMode] = useState<MaskAttachMode>('client_canvas_polygon');
  const [upscaleMode, setUpscaleMode] = useState<UpscaleMode>('client_canvas');
  const [cropMode, setCropMode] = useState<CropMode>('client_bbox');
  const [centerMode, setCenterMode] = useState<CenterMode>('client_alpha_bbox');
  const [upscaleScale, setUpscaleScale] = useState('2');
  const [upscaleSmoothingQuality, setUpscaleSmoothingQuality] = useState<UpscaleSmoothingQuality>('high');
  const [upscaleBusy, setUpscaleBusy] = useState(false);
  const [cropBusy, setCropBusy] = useState(false);
  const [centerBusy, setCenterBusy] = useState(false);

  const eligibleMaskShapes = useMemo<MaskShapeForExport[]>(
    () =>
      (maskShapes as MaskShapeForExport[]).filter(
        (shape) =>
          shape.visible &&
          ((shape.type === 'rect' || shape.type === 'ellipse')
            ? shape.points.length >= 2
            : shape.closed && shape.points.length >= 3)
      ),
    [maskShapes]
  );

  const selectedEligibleMaskShapes = useMemo<MaskShapeForExport[]>(
    () =>
      eligibleMaskShapes.filter(
        (shape) => activeMaskId && shape.id === activeMaskId
      ),
    [eligibleMaskShapes, activeMaskId]
  );

  const exportMaskShapes = useMemo(
    () => (selectedEligibleMaskShapes.length > 0 ? selectedEligibleMaskShapes : eligibleMaskShapes),
    [selectedEligibleMaskShapes, eligibleMaskShapes]
  );

  const exportMaskCount = exportMaskShapes.length;
  const hasCropBoundary = useMemo(
    () => exportMaskShapes.some(shapeHasUsableCropGeometry),
    [exportMaskShapes]
  );
  const productImagesExternalBaseUrl =
    settingsStore.get(PRODUCT_IMAGES_EXTERNAL_BASE_URL_SETTING_KEY) ??
    DEFAULT_PRODUCT_IMAGES_EXTERNAL_BASE_URL;

  const workingSlotImageSrc = useMemo(() => {
    return getImageStudioSlotImageSrc(workingSlot, productImagesExternalBaseUrl);
  }, [workingSlot, productImagesExternalBaseUrl]);

  const loadImageElement = (
    src: string,
    options?: { crossOrigin?: 'anonymous' | 'use-credentials' }
  ): Promise<HTMLImageElement> =>
    new Promise((resolve, reject) => {
      const img = new Image();
      if (options?.crossOrigin) {
        img.crossOrigin = options.crossOrigin;
      }
      img.onload = (): void => resolve(img);
      img.onerror = (): void => reject(new Error('Failed to load working image for mask export.'));
      img.src = src;
    });

  const upscaleCanvasImage = async (
    src: string,
    scale: number,
    smoothingQuality: UpscaleSmoothingQuality
  ): Promise<string> => {
    const image = await loadImageElement(src, { crossOrigin: 'anonymous' });
    const sourceWidth = image.naturalWidth || image.width;
    const sourceHeight = image.naturalHeight || image.height;
    if (!(sourceWidth > 0 && sourceHeight > 0)) {
      throw new Error('Source image dimensions are invalid.');
    }

    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(sourceWidth * scale));
    canvas.height = Math.max(1, Math.round(sourceHeight * scale));

    const context2d = canvas.getContext('2d');
    if (!context2d) {
      throw new Error('Canvas context is unavailable.');
    }

    context2d.imageSmoothingEnabled = true;
    // `imageSmoothingQuality` is not fully baseline, so this assignment is best-effort.
    try {
      (context2d as CanvasRenderingContext2D & { imageSmoothingQuality?: UpscaleSmoothingQuality }).imageSmoothingQuality = smoothingQuality;
    } catch {
      // ignore browser incompatibility and continue with default smoothing
    }
    context2d.drawImage(image, 0, 0, canvas.width, canvas.height);

    try {
      return canvas.toDataURL('image/png');
    } catch {
      throw new Error('Client upscale failed due to cross-origin restrictions. Use "Upscale Server: Sharp".');
    }
  };

  const cropCanvasImage = async (
    src: string,
    cropRect: CropRect
  ): Promise<string> => {
    const image = await loadImageElement(src, { crossOrigin: 'anonymous' });
    const sourceWidth = image.naturalWidth || image.width;
    const sourceHeight = image.naturalHeight || image.height;
    if (!(sourceWidth > 0 && sourceHeight > 0)) {
      throw new Error('Source image dimensions are invalid.');
    }

    const left = Math.max(0, Math.min(Math.floor(cropRect.x), sourceWidth - 1));
    const top = Math.max(0, Math.min(Math.floor(cropRect.y), sourceHeight - 1));
    const width = Math.max(1, Math.min(Math.floor(cropRect.width), sourceWidth - left));
    const height = Math.max(1, Math.min(Math.floor(cropRect.height), sourceHeight - top));

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const context2d = canvas.getContext('2d');
    if (!context2d) {
      throw new Error('Canvas context is unavailable.');
    }

    context2d.drawImage(
      image,
      left,
      top,
      width,
      height,
      0,
      0,
      width,
      height
    );

    try {
      return canvas.toDataURL('image/png');
    } catch {
      throw new Error('Client crop failed due to cross-origin restrictions. Use "Crop Server: Sharp".');
    }
  };

  const resolveAlphaObjectBounds = (
    data: Uint8ClampedArray,
    width: number,
    height: number
  ): { left: number; top: number; width: number; height: number } | null => {
    let minX = width;
    let maxX = -1;
    let minY = height;
    let maxY = -1;

    for (let y = 0; y < height; y += 1) {
      for (let x = 0; x < width; x += 1) {
        const alpha = data[((y * width) + x) * 4 + 3];
        if (typeof alpha !== 'number' || alpha <= 8) continue;
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }

    if (maxX < minX || maxY < minY) {
      return null;
    }

    return {
      left: minX,
      top: minY,
      width: Math.max(1, maxX - minX + 1),
      height: Math.max(1, maxY - minY + 1),
    };
  };

  const centerCanvasImageObject = async (
    src: string
  ): Promise<string> => {
    const image = await loadImageElement(src, { crossOrigin: 'anonymous' });
    const sourceWidth = image.naturalWidth || image.width;
    const sourceHeight = image.naturalHeight || image.height;
    if (!(sourceWidth > 0 && sourceHeight > 0)) {
      throw new Error('Source image dimensions are invalid.');
    }

    const sourceCanvas = document.createElement('canvas');
    sourceCanvas.width = sourceWidth;
    sourceCanvas.height = sourceHeight;
    const sourceContext = sourceCanvas.getContext('2d', { willReadFrequently: true });
    if (!sourceContext) {
      throw new Error('Canvas context is unavailable.');
    }
    sourceContext.drawImage(image, 0, 0, sourceWidth, sourceHeight);

    let imageData: ImageData;
    try {
      imageData = sourceContext.getImageData(0, 0, sourceWidth, sourceHeight);
    } catch {
      throw new Error('Client centering failed due to cross-origin restrictions. Use "Center Server: Sharp".');
    }
    const bounds = resolveAlphaObjectBounds(imageData.data, sourceWidth, sourceHeight);
    if (!bounds) {
      throw new Error('No visible object pixels were detected to center.');
    }

    const outputCanvas = document.createElement('canvas');
    outputCanvas.width = sourceWidth;
    outputCanvas.height = sourceHeight;
    const outputContext = outputCanvas.getContext('2d');
    if (!outputContext) {
      throw new Error('Canvas context is unavailable.');
    }

    const targetLeft = Math.round((sourceWidth - bounds.width) / 2);
    const targetTop = Math.round((sourceHeight - bounds.height) / 2);
    outputContext.clearRect(0, 0, sourceWidth, sourceHeight);
    outputContext.drawImage(
      sourceCanvas,
      bounds.left,
      bounds.top,
      bounds.width,
      bounds.height,
      targetLeft,
      targetTop,
      bounds.width,
      bounds.height
    );

    try {
      return outputCanvas.toDataURL('image/png');
    } catch {
      throw new Error('Client centering failed while exporting image. Use "Center Server: Sharp".');
    }
  };

  const resolveCropRectFromShapes = (
    shapes: MaskShapeForExport[],
    sourceWidth: number,
    sourceHeight: number
  ): CropRect | null => {
    if (!(sourceWidth > 0 && sourceHeight > 0)) return null;
    const orderedShapes =
      activeMaskId
        ? [
          ...shapes.filter((shape) => shape.id === activeMaskId),
          ...shapes.filter((shape) => shape.id !== activeMaskId),
        ]
        : shapes;

    for (const shape of orderedShapes) {
      const polygons = normalizeShapeToPolygons(shape, sourceWidth, sourceHeight);
      if (polygons.length === 0) continue;
      const points = polygons.flatMap((polygon) => polygon);
      if (points.length === 0) continue;
      const xs = points.map((point) => clamp01(point.x));
      const ys = points.map((point) => clamp01(point.y));
      if (xs.length === 0 || ys.length === 0) continue;
      const minX = Math.min(...xs);
      const maxX = Math.max(...xs);
      const minY = Math.min(...ys);
      const maxY = Math.max(...ys);

      const left = Math.max(0, Math.min(Math.floor(minX * sourceWidth), sourceWidth - 1));
      const top = Math.max(0, Math.min(Math.floor(minY * sourceHeight), sourceHeight - 1));
      const width = Math.max(1, Math.min(Math.ceil((maxX - minX) * sourceWidth), sourceWidth - left));
      const height = Math.max(1, Math.min(Math.ceil((maxY - minY) * sourceHeight), sourceHeight - top));
      return {
        x: left,
        y: top,
        width,
        height,
      };
    }

    return null;
  };

  const resolveCropRect = async (): Promise<CropRect> => {
    let sourceWidth = workingSlot?.imageFile?.width ?? 0;
    let sourceHeight = workingSlot?.imageFile?.height ?? 0;
    if (!(sourceWidth > 0 && sourceHeight > 0)) {
      const image = await loadImageElement(workingSlotImageSrc || '');
      sourceWidth = image.naturalWidth || image.width;
      sourceHeight = image.naturalHeight || image.height;
    }
    if (!(sourceWidth > 0 && sourceHeight > 0)) {
      throw new Error('Source image dimensions are invalid.');
    }

    const cropRect = resolveCropRectFromShapes(exportMaskShapes, sourceWidth, sourceHeight);
    if (cropRect) {
      return cropRect;
    }

    throw new Error('Set a valid crop boundary first (polygon/lasso/brush, rectangle, or ellipse).');
  };

  const handleCreateCropBox = (): void => {
    const shapeId = `crop_${Date.now().toString(36)}`;
    setMaskShapes((previous) => [
      ...previous,
      {
        id: shapeId,
        name: `Crop Box ${previous.filter((shape) => shape.name.startsWith('Crop Box')).length + 1}`,
        type: 'rect',
        points: [{ x: 0.1, y: 0.1 }, { x: 0.9, y: 0.9 }],
        closed: true,
        visible: true,
      },
    ]);
    setActiveMaskId(shapeId);
    setTool('rect');
    toast('Crop box created. Adjust the rectangle, then click Crop.', { variant: 'success' });
  };

  const renderMaskDataUrlFromPolygons = (
    polygons: Array<Array<{ x: number; y: number }>>,
    width: number,
    height: number,
    variant: 'white' | 'black',
    inverted: boolean
  ): string => {
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const context2d = canvas.getContext('2d');
    if (!context2d) {
      throw new Error('Canvas context is unavailable.');
    }
    const { background, fill } = resolveMaskColors(variant, inverted);
    context2d.clearRect(0, 0, width, height);
    context2d.fillStyle = background;
    context2d.fillRect(0, 0, width, height);
    context2d.fillStyle = fill;
    polygons.forEach((polygon) => {
      if (polygon.length < 3) return;
      context2d.beginPath();
      context2d.moveTo(polygon[0]!.x * width, polygon[0]!.y * height);
      for (let index = 1; index < polygon.length; index += 1) {
        const point = polygon[index]!;
        context2d.lineTo(point.x * width, point.y * height);
      }
      context2d.closePath();
      context2d.fill();
    });
    return canvas.toDataURL('image/png');
  };

  const readGenerationRunId = (slot: ImageStudioSlotRecord): string | null => {
    const metadata = slot.metadata;
    if (!metadata || typeof metadata !== 'object' || Array.isArray(metadata)) return null;
    const value = metadata['generationRunId'];
    if (typeof value !== 'string') return null;
    const normalized = value.trim();
    return normalized.length > 0 ? normalized : null;
  };

  const readGenerationOutputIndex = (slot: ImageStudioSlotRecord): number => {
    const metadata = slot.metadata;
    if (!metadata || typeof metadata !== 'object' || Array.isArray(metadata)) {
      return Number.MAX_SAFE_INTEGER;
    }
    const value = metadata['generationOutputIndex'];
    const parsed = typeof value === 'number' ? value : Number(value);
    if (!Number.isFinite(parsed) || parsed <= 0) return Number.MAX_SAFE_INTEGER;
    return Math.floor(parsed);
  };

  const pickPrimaryRunOutputSlot = (
    candidateSlots: ImageStudioSlotRecord[],
    runId: string
  ): ImageStudioSlotRecord | null => {
    const matches = candidateSlots
      .filter((slot) => readGenerationRunId(slot) === runId)
      .sort((left, right) => readGenerationOutputIndex(left) - readGenerationOutputIndex(right));
    return matches[0] ?? null;
  };

  const fetchProjectSlots = async (): Promise<ImageStudioSlotRecord[]> => {
    if (!projectId) return [];
    const response = await api.get<StudioSlotsResponse>(
      `/api/image-studio/projects/${encodeURIComponent(projectId)}/slots`
    );
    return Array.isArray(response.slots) ? response.slots : [];
  };

  const waitForRunCompletion = async (runId: string): Promise<PolledRunRecord> => {
    for (let attempt = 0; attempt < CENTER_RUN_POLL_MAX_ATTEMPTS; attempt += 1) {
      const response = await api.get<{ run: PolledRunRecord }>(
        `/api/image-studio/runs/${encodeURIComponent(runId)}`
      );
      const run = response.run;
      if (run.status === 'completed' || run.status === 'failed') {
        return run;
      }
      await sleep(CENTER_RUN_POLL_INTERVAL_MS);
    }

    throw new Error('Timed out while waiting for center run completion.');
  };

  const attachMaskVariantsFromSelection = async (): Promise<void> => {
    if (!workingSlotImageSrc) {
      toast('Select a slot image before attaching masks.', { variant: 'info' });
      return;
    }

    const shapes = exportMaskShapes;
    if (shapes.length === 0) {
      toast('Draw at least one visible shape first.', {
        variant: 'info',
      });
      return;
    }

    try {
      let width = workingSlot?.imageFile?.width ?? 0;
      let height = workingSlot?.imageFile?.height ?? 0;
      if (!(width > 0 && height > 0)) {
        const image = await loadImageElement(workingSlotImageSrc);
        width = image.naturalWidth || image.width;
        height = image.naturalHeight || image.height;
      }
      if (!(width > 0 && height > 0)) {
        width = 1024;
        height = 1024;
      }

      const polygons = polygonsFromShapes(shapes, width, height);
      if (polygons.length === 0) {
        toast('No closed polygon-compatible shapes are available for mask export.', { variant: 'info' });
        return;
      }

      if (!workingSlot?.id) {
        toast('No active source slot selected.', { variant: 'info' });
        return;
      }

      const variants: Array<{ variant: 'white' | 'black'; inverted: boolean }> = [
        { variant: 'white', inverted: false },
        { variant: 'black', inverted: false },
        { variant: 'white', inverted: true },
        { variant: 'black', inverted: true },
      ];

      const payloadMasks = variants.map(({ variant, inverted }) =>
        maskAttachMode === 'client_canvas_polygon'
          ? {
            variant,
            inverted,
            dataUrl: renderMaskDataUrlFromPolygons(polygons, width, height, variant, inverted),
          }
          : {
            variant,
            inverted,
            polygons,
          }
      );

      const response = await api.post<{
        masks?: Array<{
          slot?: { id: string; name: string | null };
          relationType?: string;
        }>;
      }>(`/api/image-studio/slots/${encodeURIComponent(workingSlot.id)}/masks`, {
        mode: maskAttachMode === 'client_canvas_polygon' ? 'client_data_url' : 'server_polygon',
        masks: payloadMasks,
      });

      void invalidateImageStudioSlots(queryClient, projectId);

      const createdCount = Array.isArray(response.masks) ? response.masks.length : 0;
      if (createdCount === 0) {
        toast('Mask slot creation returned no records.', { variant: 'error' });
        return;
      }

      toast(`Attached ${createdCount} linked mask slot${createdCount === 1 ? '' : 's'}.`, { variant: 'success' });
    } catch (error) {
      toast(
        error instanceof Error
          ? error.message
          : 'Failed to attach mask variants.',
        { variant: 'error' }
      );
    }
  };

  const handleUpscale = async (): Promise<void> => {
    if (!workingSlot?.id) {
      toast('No active source slot selected.', { variant: 'info' });
      return;
    }
    if (!workingSlotImageSrc) {
      toast('Select a slot image before upscaling.', { variant: 'info' });
      return;
    }

    const scale = Number(upscaleScale);
    if (!Number.isFinite(scale) || scale <= 1 || scale > 8) {
      toast('Upscale scale must be greater than 1 and at most 8.', { variant: 'info' });
      return;
    }

    setUpscaleBusy(true);
    try {
      const mode = upscaleMode === 'client_canvas' ? 'client_data_url' : 'server_sharp';
      let response: { slot?: { id: string; name: string | null } };
      if (mode === 'client_data_url') {
        const upscaledDataUrl = await upscaleCanvasImage(
          workingSlotImageSrc,
          scale,
          upscaleSmoothingQuality
        );
        let uploadBlob: Blob;
        try {
          const blobResponse = await fetch(upscaledDataUrl);
          uploadBlob = await blobResponse.blob();
        } catch {
          throw new Error('Failed to prepare client upscaled image for upload.');
        }

        const formData = new FormData();
        formData.append('mode', mode);
        formData.append('scale', String(scale));
        formData.append('smoothingQuality', upscaleSmoothingQuality);
        formData.append('image', uploadBlob, `upscale-client-${Date.now()}.png`);

        response = await api.post<{ slot?: { id: string; name: string | null } }>(
          `/api/image-studio/slots/${encodeURIComponent(workingSlot.id)}/upscale`,
          formData
        );
      } else {
        response = await api.post<{ slot?: { id: string; name: string | null } }>(
          `/api/image-studio/slots/${encodeURIComponent(workingSlot.id)}/upscale`,
          {
            mode,
            scale,
          }
        );
      }

      const normalizedProjectId = projectId?.trim() ?? '';
      if (normalizedProjectId) {
        await invalidateImageStudioSlots(queryClient, normalizedProjectId);
        const slotsSnapshot = await fetchProjectSlots();
        queryClient.setQueryData<StudioSlotsResponse>(
          studioKeys.slots(normalizedProjectId),
          { slots: slotsSnapshot }
        );
      }

      if (response.slot?.id) {
        setSelectedSlotId(response.slot.id);
        setWorkingSlotId(response.slot.id);
      }

      const scaleLabel = `${Number(scale.toFixed(2))}x`;
      const createdLabel = response.slot?.name?.trim() || `Upscale ${scaleLabel}`;
      toast(`Created ${createdLabel}.`, { variant: 'success' });
    } catch (error) {
      toast(error instanceof Error ? error.message : 'Failed to upscale image.', { variant: 'error' });
    } finally {
      setUpscaleBusy(false);
    }
  };

  const handleCrop = async (): Promise<void> => {
    if (!workingSlot?.id) {
      toast('No active source slot selected.', { variant: 'info' });
      return;
    }
    if (!workingSlotImageSrc) {
      toast('Select a slot image before cropping.', { variant: 'info' });
      return;
    }
    if (!hasCropBoundary) {
      toast('Set a valid crop boundary first.', { variant: 'info' });
      return;
    }

    setCropBusy(true);
    try {
      const cropRect = await resolveCropRect();
      const payload: Record<string, unknown> = {
        mode: cropMode,
        cropRect,
      };

      if (cropMode === 'client_bbox') {
        payload['dataUrl'] = await cropCanvasImage(workingSlotImageSrc, cropRect);
      }

      const response = await api.post<{ slot?: { id: string; name: string | null } }>(
        `/api/image-studio/slots/${encodeURIComponent(workingSlot.id)}/crop`,
        payload
      );
      void invalidateImageStudioSlots(queryClient, projectId);

      const createdLabel = response.slot?.name?.trim() || 'Cropped variant';
      const modeLabel = cropMode === 'client_bbox' ? 'Client' : 'Server';
      toast(`Created ${createdLabel} (${modeLabel} crop).`, { variant: 'success' });
    } catch (error) {
      toast(error instanceof Error ? error.message : 'Failed to crop image.', { variant: 'error' });
    } finally {
      setCropBusy(false);
    }
  };

  const handleCenterObject = async (): Promise<void> => {
    if (!workingSlot?.id) {
      toast('No active source slot selected.', { variant: 'info' });
      return;
    }
    if (!workingSlotImageSrc) {
      toast('Select a slot image before centering.', { variant: 'info' });
      return;
    }

    const modeLabel = centerMode === 'client_alpha_bbox' ? 'Client' : 'Server';
    const normalizedProjectId = projectId?.trim() ?? '';
    const sourceFilepath = workingSlot.imageFile?.filepath?.trim() ?? '';
    const canUseRuntimeCenter =
      centerMode === 'server_alpha_bbox' &&
      Boolean(normalizedProjectId) &&
      sourceFilepath.startsWith(`/uploads/studio/${normalizedProjectId}/`);

    setCenterBusy(true);
    try {
      if (!canUseRuntimeCenter || !normalizedProjectId) {
        const legacyPayload: Record<string, unknown> = {
          mode: centerMode,
        };
        if (centerMode === 'client_alpha_bbox') {
          legacyPayload['dataUrl'] = await centerCanvasImageObject(workingSlotImageSrc);
        }

        const legacyResponse = await api.post<{ slot?: { id: string; name: string | null } }>(
          `/api/image-studio/slots/${encodeURIComponent(workingSlot.id)}/center`,
          legacyPayload
        );
        if (normalizedProjectId) {
          await invalidateImageStudioSlots(queryClient, normalizedProjectId);
        }

        if (legacyResponse.slot?.id) {
          setSelectedSlotId(legacyResponse.slot.id);
          setWorkingSlotId(legacyResponse.slot.id);
        }

        const createdLabel = legacyResponse.slot?.name?.trim() || 'Centered variant';
        toast(`Created ${createdLabel} (${modeLabel} center).`, { variant: 'success' });
        return;
      }

      const runPayload: Record<string, unknown> = {
        operation: 'center_object',
        projectId: normalizedProjectId,
        asset: {
          id: workingSlot.id,
          filepath: sourceFilepath,
        },
        prompt: `Center object (${modeLabel.toLowerCase()})`,
        center: {
          mode: centerMode,
        },
        studioSettings,
      };
      if (centerMode === 'client_alpha_bbox') {
        runPayload['center'] = {
          mode: centerMode,
          dataUrl: await centerCanvasImageObject(workingSlotImageSrc),
        };
      }

      const enqueueResult = await api.post<RunStudioEnqueueResult>(
        '/api/image-studio/run',
        runPayload
      );
      toast(
        `Center run queued (${enqueueResult.dispatchMode === 'inline' ? 'inline runtime' : 'redis runtime'}).`,
        { variant: 'info' }
      );

      const run = await waitForRunCompletion(enqueueResult.runId);
      if (run.status !== 'completed') {
        throw new Error(run.errorMessage || 'Failed to center image object.');
      }

      await invalidateImageStudioSlots(queryClient, normalizedProjectId);
      const slotsSnapshot = await fetchProjectSlots();
      const centeredSlot = pickPrimaryRunOutputSlot(slotsSnapshot, enqueueResult.runId);
      if (centeredSlot?.id) {
        setSelectedSlotId(centeredSlot.id);
        setWorkingSlotId(centeredSlot.id);
      }

      const createdLabel = centeredSlot?.name?.trim() || 'Centered variant';
      toast(`Created ${createdLabel} (${modeLabel} center).`, { variant: 'success' });
    } catch (error) {
      toast(error instanceof Error ? error.message : 'Failed to center image object.', { variant: 'error' });
    } finally {
      setCenterBusy(false);
    }
  };

  const maskGenerationBusy = maskGenLoading;
  const maskGenerationLabel = maskGenerationBusy
    ? 'Generating Mask...'
    : 'Generate Mask';

  const quickSwitchModels = useMemo(
    () =>
      normalizeImageStudioModelPresets(
        studioSettings.targetAi.openai.modelPresets,
        studioSettings.targetAi.openai.model,
      ),
    [studioSettings.targetAi.openai.modelPresets, studioSettings.targetAi.openai.model]
  );
  const modelOptions = useMemo(
    () => quickSwitchModels.map((modelId) => ({ value: modelId, label: modelId })),
    [quickSwitchModels]
  );
  const imageCountOptions = useMemo(
    () => ['1', '2', '4'].map((value: string) => ({ value, label: value })),
    []
  );
  const maskModeOptions = useMemo(
    () => ([
      { value: 'ai-polygon', label: 'AI Polygon' },
      { value: 'ai-bbox', label: 'AI Bounding Box' },
      { value: 'threshold', label: 'Threshold' },
      { value: 'edges', label: 'Edge Detection' },
    ]),
    []
  );
  const maskAttachModeOptions = useMemo(
    () => ([
      { value: 'client_canvas_polygon', label: 'Option A: Canvas Polygon' },
      { value: 'server_polygon', label: 'Option C: Server Polygon' },
    ]),
    []
  );
  const upscaleModeOptions = useMemo(
    () => ([
      { value: 'client_canvas', label: 'Upscale A: Canvas' },
      { value: 'server_sharp', label: 'Upscale Server: Sharp' },
    ]),
    []
  );
  const cropModeOptions = useMemo(
    () => ([
      { value: 'client_bbox', label: 'Crop Client: Canvas' },
      { value: 'server_bbox', label: 'Crop Server: Sharp' },
    ]),
    []
  );
  const centerModeOptions = useMemo(
    () => ([
      { value: 'client_alpha_bbox', label: 'Center Client: Canvas' },
      { value: 'server_alpha_bbox', label: 'Center Server: Sharp' },
    ]),
    []
  );
  const upscaleScaleOptions = useMemo(
    () => ['1.5', '2', '3', '4'].map((value: string) => ({ value, label: `${value}x` })),
    []
  );
  const upscaleSmoothingOptions = useMemo(
    () => ([
      { value: 'high', label: 'Smoothing High' },
      { value: 'medium', label: 'Smoothing Medium' },
      { value: 'low', label: 'Smoothing Low' },
    ]),
    []
  );

  return (
    <div className='flex flex-wrap items-center gap-2'>
      <SelectSimple size='sm'
        className='w-full min-w-0 sm:w-[min(100%,20rem)]'
        value={studioSettings.targetAi.openai.model}
        onValueChange={(value: string) => {
          setStudioSettings((prev) => ({
            ...prev,
            targetAi: {
              ...prev.targetAi,
              openai: {
                ...prev.targetAi.openai,
                api: 'images',
                model: value,
              },
            },
          }));
        }}
        options={modelOptions}
        placeholder='Model'
        triggerClassName='h-8 w-full text-xs'
        ariaLabel='Generation model'
      />
      <SelectSimple size='sm'
        className='w-[60px]'
        value={String(studioSettings.targetAi.openai.image.n ?? 1)}
        onValueChange={(value: string) => {
          setStudioSettings((prev) => ({
            ...prev,
            targetAi: {
              ...prev.targetAi,
              openai: {
                ...prev.targetAi.openai,
                image: { ...prev.targetAi.openai.image, n: Number(value) },
              },
            },
          }));
        }}
        options={imageCountOptions}
        triggerClassName='h-8 text-xs'
        ariaLabel='Generation image count'
      />
      <Button size='xs'
        type='button'
        variant='outline'
        onClick={() => {
          handleAiMaskGeneration(maskGenMode);
        }}
        disabled={!workingSlot || maskGenerationBusy}
        className='flex-1'
      >
        {maskGenerationBusy ? (
          <Loader2 className='mr-2 size-4 animate-spin' />
        ) : (
          <Play className='mr-2 size-4' />
        )}
        {maskGenerationLabel}
      </Button>
      <SelectSimple size='sm'
        className='w-[190px]'
        value={upscaleMode}
        onValueChange={(value: string) => {
          setUpscaleMode(value as UpscaleMode);
        }}
        options={upscaleModeOptions}
        triggerClassName='h-8 text-xs'
        ariaLabel='Upscale mode'
      />
      <SelectSimple size='sm'
        className='w-[85px]'
        value={upscaleScale}
        onValueChange={(value: string) => {
          setUpscaleScale(value);
        }}
        options={upscaleScaleOptions}
        triggerClassName='h-8 text-xs'
        ariaLabel='Upscale scale'
      />
      {upscaleMode === 'client_canvas' ? (
        <SelectSimple size='sm'
          className='w-[150px]'
          value={upscaleSmoothingQuality}
          onValueChange={(value: string) => {
            setUpscaleSmoothingQuality(value as UpscaleSmoothingQuality);
          }}
          options={upscaleSmoothingOptions}
          triggerClassName='h-8 text-xs'
          ariaLabel='Upscale smoothing quality'
        />
      ) : null}
      <Button size='xs'
        type='button'
        variant='outline'
        onClick={() => {
          void handleUpscale();
        }}
        disabled={!workingSlot || !workingSlotImageSrc || upscaleBusy}
        title='Create an upscaled linked variant from the active slot'
      >
        {upscaleBusy ? <Loader2 className='mr-2 size-4 animate-spin' /> : null}
        Upscale
      </Button>
      <SelectSimple size='sm'
        className='w-[185px]'
        value={cropMode}
        onValueChange={(value: string) => {
          setCropMode(value as CropMode);
        }}
        options={cropModeOptions}
        triggerClassName='h-8 text-xs'
        ariaLabel='Crop mode'
      />
      <Button size='xs'
        type='button'
        variant='outline'
        onClick={handleCreateCropBox}
        disabled={!workingSlot || !workingSlotImageSrc}
        title='Create a dedicated crop rectangle that always works with Crop'
      >
        Crop Box Tool
      </Button>
      <Button size='xs'
        type='button'
        variant='outline'
        onClick={() => {
          void handleCrop();
        }}
        disabled={!workingSlot || !workingSlotImageSrc || cropBusy || !hasCropBoundary}
        title='Create cropped linked variant from selected boundary'
      >
        {cropBusy ? <Loader2 className='mr-2 size-4 animate-spin' /> : null}
        Crop
      </Button>
      <Button size='xs'
        type='button'
        variant='outline'
        onClick={() => {
          setCenterGuidesEnabled(!centerGuidesEnabled);
        }}
        disabled={!workingSlotImageSrc}
        title='Toggle center guides overlay'
      >
        {centerGuidesEnabled ? 'Hide Guides' : 'Show Guides'}
      </Button>
      <SelectSimple size='sm'
        className='w-[190px]'
        value={centerMode}
        onValueChange={(value: string) => {
          setCenterMode(value as CenterMode);
        }}
        options={centerModeOptions}
        triggerClassName='h-8 text-xs'
        ariaLabel='Center object mode'
      />
      <Button size='xs'
        type='button'
        variant='outline'
        onClick={() => {
          void handleCenterObject();
        }}
        disabled={!workingSlot || !workingSlotImageSrc || centerBusy}
        title='Create a centered linked variant from the active slot'
      >
        {centerBusy ? <Loader2 className='mr-2 size-4 animate-spin' /> : null}
        Center Object
      </Button>
      <Button size='xs'
        type='button'
        variant='outline'
        onClick={() => {
          void attachMaskVariantsFromSelection();
        }}
        disabled={!workingSlot || exportMaskCount === 0}
        title='Create and attach white/black masks and their inverted variants'
      >
        Attach Masks
      </Button>
      <SelectSimple size='sm'
        className='w-[185px]'
        value={maskAttachMode}
        onValueChange={(value: string) => {
          setMaskAttachMode(value as MaskAttachMode);
        }}
        options={maskAttachModeOptions}
        triggerClassName='h-8 text-xs'
        ariaLabel='Mask attach mode'
      />
      <Button size='xs'
        type='button'
        variant='outline'
        onClick={() => {
          setMaskPreviewEnabled(true);
        }}
        disabled={!workingSlot || exportMaskCount === 0 || maskPreviewEnabled}
        title='Enable mask preview'
      >
        Enable Preview
      </Button>
      <label className='flex items-center gap-2 rounded border border-border/60 bg-card/40 px-2 py-1 text-[11px] text-gray-300'>
        <span>Mask Preview</span>
        <Switch
          checked={maskPreviewEnabled}
          onCheckedChange={(checked: boolean) => setMaskPreviewEnabled(Boolean(checked))}
          disabled={!workingSlot || exportMaskCount === 0}
          aria-label='Toggle mask preview'
        />
      </label>
      <label className='flex items-center gap-2 rounded border border-border/60 bg-card/40 px-2 py-1 text-[11px] text-gray-300'>
        <span>Invert</span>
        <Switch
          checked={maskInvert}
          onCheckedChange={(checked: boolean) => setMaskInvert(Boolean(checked))}
          disabled={!maskPreviewEnabled || exportMaskCount === 0}
          aria-label='Toggle mask inversion'
        />
      </label>
      <SelectSimple size='sm'
        className='w-[130px]'
        value={maskGenMode}
        onValueChange={(value: string) => {
          const mode = value as 'ai-polygon' | 'ai-bbox' | 'threshold' | 'edges';
          setMaskGenMode(mode);
        }}
        options={maskModeOptions}
        placeholder={maskGenLoading ? 'Detecting...' : 'Smart Mask'}
        triggerClassName='h-8 text-xs'
        disabled={maskGenLoading || !workingSlot}
        ariaLabel='Smart mask mode'
      />
      {maskGenLoading && <Loader2 className='size-4 animate-spin text-muted-foreground' />}
      <span className='text-[11px] text-gray-400 whitespace-nowrap'>
        {exportMaskCount > 0
          ? `${exportMaskCount} mask shape${exportMaskCount > 1 ? 's' : ''}`
          : 'No mask'}
      </span>
    </div>
  );
}
