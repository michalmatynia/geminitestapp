'use client';

import { useQueryClient } from '@tanstack/react-query';
import { Loader2, Play } from 'lucide-react';
import React, { useMemo, useRef, useState } from 'react';

import {
  DEFAULT_PRODUCT_IMAGES_EXTERNAL_BASE_URL,
  PRODUCT_IMAGES_EXTERNAL_BASE_URL_SETTING_KEY,
} from '@/features/products/constants';
import { ApiError, api } from '@/shared/lib/api-client';
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

import type { ImageStudioSlotRecord, StudioSlotsResponse } from '../types';

type MaskAttachMode = 'client_canvas_polygon' | 'server_polygon';
type UpscaleMode = 'client_canvas' | 'server_sharp';
type UpscaleStrategy = 'scale' | 'target_resolution';
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

type UpscaleActionResponse = {
  slot?: ImageStudioSlotRecord;
  mode?: 'client_data_url' | 'server_sharp';
  effectiveMode?: 'client_data_url' | 'server_sharp';
  strategy?: UpscaleStrategy;
  scale?: number | null;
  targetWidth?: number | null;
  targetHeight?: number | null;
  requestId?: string | null;
  deduplicated?: boolean;
};

type UpscaleRequestStrategyPayload =
  | {
    strategy: 'scale';
    scale: number;
  }
  | {
    strategy: 'target_resolution';
    targetWidth: number;
    targetHeight: number;
  };

type CropActionResponse = {
  slot?: ImageStudioSlotRecord;
  mode?: CropMode;
  effectiveMode?: CropMode;
  cropRect?: CropRect | null;
  requestId?: string | null;
  deduplicated?: boolean;
};

type CenterActionResponse = {
  slot?: ImageStudioSlotRecord;
  mode?: CenterMode;
  effectiveMode?: CenterMode;
  sourceObjectBounds?: { left: number; top: number; width: number; height: number } | null;
  targetObjectBounds?: { left: number; top: number; width: number; height: number } | null;
  requestId?: string | null;
  deduplicated?: boolean;
};

type CropStatus =
  | 'idle'
  | 'resolving'
  | 'preparing'
  | 'uploading'
  | 'processing'
  | 'persisting';

type CenterStatus =
  | 'idle'
  | 'resolving'
  | 'preparing'
  | 'uploading'
  | 'processing'
  | 'persisting';

type UpscaleStatus =
  | 'idle'
  | 'resolving'
  | 'preparing'
  | 'uploading'
  | 'processing'
  | 'persisting';

const UPSCALE_REQUEST_TIMEOUT_MS = 60_000;
const UPSCALE_RETRY_DELAY_MS = 350;
const UPSCALE_MAX_OUTPUT_SIDE = 32_768;
const CROP_REQUEST_TIMEOUT_MS = 60_000;
const CROP_RETRY_DELAY_MS = 350;
const CENTER_REQUEST_TIMEOUT_MS = 60_000;
const CENTER_RETRY_DELAY_MS = 350;
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

const normalizeLocalImageSource = (value: string | null | undefined): string | null => {
  const normalized = value?.trim() ?? '';
  if (!normalized) return null;
  if (normalized.startsWith('data:') || normalized.startsWith('blob:')) {
    return normalized;
  }
  if (/^https?:\/\//i.test(normalized)) {
    return normalized;
  }
  const normalizedPath = normalized.replace(/\\/g, '/').replace(/^\/+/, '');
  return normalizedPath ? `/${normalizedPath}` : null;
};

const resolveClientProcessingImageSrc = (
  slot: ImageStudioSlotRecord | null | undefined,
  fallbackSrc: string | null
): string | null => {
  const inlineBase64 = normalizeLocalImageSource(slot?.imageBase64 ?? null);
  if (inlineBase64) return inlineBase64;

  const localFilepath = normalizeLocalImageSource(slot?.imageFile?.filepath ?? null);
  if (localFilepath) return localFilepath;

  const localUrl = normalizeLocalImageSource(slot?.imageUrl ?? null);
  if (localUrl) return localUrl;

  return fallbackSrc;
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
  const { setMaskPreviewEnabled, setCenterGuidesEnabled, getPreviewCanvasViewportCrop } = useUiActions();
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
  const [upscaleStrategy, setUpscaleStrategy] = useState<UpscaleStrategy>('scale');
  const [cropMode, setCropMode] = useState<CropMode>('client_bbox');
  const [centerMode, setCenterMode] = useState<CenterMode>('client_alpha_bbox');
  const [upscaleScale, setUpscaleScale] = useState('2');
  const [upscaleTargetWidth, setUpscaleTargetWidth] = useState('');
  const [upscaleTargetHeight, setUpscaleTargetHeight] = useState('');
  const [upscaleSmoothingQuality, setUpscaleSmoothingQuality] = useState<UpscaleSmoothingQuality>('high');
  const [upscaleBusy, setUpscaleBusy] = useState(false);
  const [upscaleStatus, setUpscaleStatus] = useState<UpscaleStatus>('idle');
  const [cropBusy, setCropBusy] = useState(false);
  const [cropStatus, setCropStatus] = useState<CropStatus>('idle');
  const [centerBusy, setCenterBusy] = useState(false);
  const [centerStatus, setCenterStatus] = useState<CenterStatus>('idle');
  const upscaleRequestInFlightRef = useRef(false);
  const upscaleAbortControllerRef = useRef<AbortController | null>(null);
  const cropRequestInFlightRef = useRef(false);
  const cropAbortControllerRef = useRef<AbortController | null>(null);
  const centerRequestInFlightRef = useRef(false);
  const centerAbortControllerRef = useRef<AbortController | null>(null);

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
  const clientProcessingImageSrc = useMemo(
    () => resolveClientProcessingImageSrc(workingSlot, workingSlotImageSrc),
    [workingSlot, workingSlotImageSrc]
  );

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

  const dataUrlToUploadBlob = async (dataUrl: string): Promise<Blob> => {
    const normalized = dataUrl.trim();
    if (!normalized.startsWith('data:')) {
      throw new Error('Invalid image data URL.');
    }

    const commaIndex = normalized.indexOf(',');
    if (commaIndex <= 5 || commaIndex === normalized.length - 1) {
      throw new Error('Invalid image data URL.');
    }

    const meta = normalized.slice(5, commaIndex);
    const payload = normalized.slice(commaIndex + 1);
    const mime = (meta.split(';')[0] ?? '').trim() || 'application/octet-stream';
    const isBase64 = /;base64/i.test(meta);

    try {
      if (isBase64) {
        const binary = atob(payload);
        const bytes = new Uint8Array(binary.length);
        for (let index = 0; index < binary.length; index += 1) {
          bytes[index] = binary.charCodeAt(index);
        }
        return new Blob([bytes], { type: mime });
      }

      return new Blob([decodeURIComponent(payload)], { type: mime });
    } catch {
      // Fallback for edge browsers that may still handle this route better via fetch.
      const blobResponse = await fetch(normalized);
      return blobResponse.blob();
    }
  };

  const upscaleCanvasImage = async (
    src: string,
    request: UpscaleRequestStrategyPayload,
    smoothingQuality: UpscaleSmoothingQuality
  ): Promise<{
    dataUrl: string;
    outputWidth: number;
    outputHeight: number;
    sourceWidth: number;
    sourceHeight: number;
    scale: number;
  }> => {
    const image = await loadImageElement(src, { crossOrigin: 'anonymous' });
    const sourceWidth = image.naturalWidth || image.width;
    const sourceHeight = image.naturalHeight || image.height;
    if (!(sourceWidth > 0 && sourceHeight > 0)) {
      throw new Error('Source image dimensions are invalid.');
    }

    const outputWidth = request.strategy === 'scale'
      ? Math.max(1, Math.round(sourceWidth * request.scale))
      : request.targetWidth;
    const outputHeight = request.strategy === 'scale'
      ? Math.max(1, Math.round(sourceHeight * request.scale))
      : request.targetHeight;
    if (
      request.strategy === 'target_resolution' &&
      (
        outputWidth < sourceWidth ||
        outputHeight < sourceHeight ||
        (outputWidth === sourceWidth && outputHeight === sourceHeight)
      )
    ) {
      throw new Error('Target resolution must upscale at least one side and not reduce source dimensions.');
    }

    const canvas = document.createElement('canvas');
    canvas.width = outputWidth;
    canvas.height = outputHeight;

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
      return {
        dataUrl: canvas.toDataURL('image/png'),
        outputWidth,
        outputHeight,
        sourceWidth,
        sourceHeight,
        scale: Number(
          Math.max(outputWidth / sourceWidth, outputHeight / sourceHeight).toFixed(4)
        ),
      };
    } catch {
      throw new Error('Client upscale failed due to cross-origin restrictions. Use "Upscale Server: Sharp".');
    }
  };

  const isClientUpscaleCrossOriginError = (error: unknown): boolean =>
    error instanceof Error && /cross-origin restrictions/i.test(error.message);

  const isUpscaleAbortError = (error: unknown): boolean =>
    error instanceof DOMException && error.name === 'AbortError';

  const isRetryableUpscaleError = (error: unknown): boolean => {
    if (isUpscaleAbortError(error)) return false;
    if (error instanceof ApiError) {
      return error.status === 408 || error.status === 425 || error.status === 429 || error.status >= 500;
    }
    return (
      error instanceof Error &&
      /timeout|network|failed to fetch|temporarily unavailable|retry/i.test(error.message.toLowerCase())
    );
  };

  const buildUpscaleRequestId = (): string =>
    `upscale_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;

  const withUpscaleRetry = async <T,>(
    run: () => Promise<T>,
    signal: AbortSignal,
    retries = 1
  ): Promise<T> => {
    let attempt = 0;
    while (true) {
      try {
        return await run();
      } catch (error) {
        if (attempt >= retries || !isRetryableUpscaleError(error) || signal.aborted) {
          throw error;
        }
        attempt += 1;
        await sleep(UPSCALE_RETRY_DELAY_MS * attempt);
      }
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

  const isClientCropCrossOriginError = (error: unknown): boolean =>
    error instanceof Error && /cross-origin restrictions/i.test(error.message);

  const isCropAbortError = (error: unknown): boolean =>
    error instanceof DOMException && error.name === 'AbortError';

  const isRetryableCropError = (error: unknown): boolean => {
    if (isCropAbortError(error)) return false;
    if (error instanceof ApiError) {
      return error.status === 408 || error.status === 425 || error.status === 429 || error.status >= 500;
    }
    return (
      error instanceof Error &&
      /timeout|network|failed to fetch|temporarily unavailable|retry/i.test(error.message.toLowerCase())
    );
  };

  const buildCropRequestId = (): string =>
    `crop_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;

  const withCropRetry = async <T,>(
    run: () => Promise<T>,
    signal: AbortSignal,
    retries = 1
  ): Promise<T> => {
    let attempt = 0;
    while (true) {
      try {
        return await run();
      } catch (error) {
        if (attempt >= retries || !isRetryableCropError(error) || signal.aborted) {
          throw error;
        }
        attempt += 1;
        await sleep(CROP_RETRY_DELAY_MS * attempt);
      }
    }
  };

  const isClientCenterCrossOriginError = (error: unknown): boolean =>
    error instanceof Error && /cross-origin restrictions/i.test(error.message);

  const isCenterAbortError = (error: unknown): boolean =>
    error instanceof DOMException && error.name === 'AbortError';

  const isRetryableCenterError = (error: unknown): boolean => {
    if (isCenterAbortError(error)) return false;
    if (error instanceof ApiError) {
      return error.status === 408 || error.status === 425 || error.status === 429 || error.status >= 500;
    }
    return (
      error instanceof Error &&
      /timeout|network|failed to fetch|temporarily unavailable|retry/i.test(error.message.toLowerCase())
    );
  };

  const buildCenterRequestId = (): string =>
    `center_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;

  const withCenterRetry = async <T,>(
    run: () => Promise<T>,
    signal: AbortSignal,
    retries = 1
  ): Promise<T> => {
    let attempt = 0;
    while (true) {
      try {
        return await run();
      } catch (error) {
        if (attempt >= retries || !isRetryableCenterError(error) || signal.aborted) {
          throw error;
        }
        attempt += 1;
        await sleep(CENTER_RETRY_DELAY_MS * attempt);
      }
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
      const sourceForDimensions = clientProcessingImageSrc || workingSlotImageSrc || '';
      const image = await loadImageElement(sourceForDimensions);
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

  const resolveCenteredSquareCropRect = async (): Promise<CropRect> => {
    let sourceWidth = workingSlot?.imageFile?.width ?? 0;
    let sourceHeight = workingSlot?.imageFile?.height ?? 0;
    if (!(sourceWidth > 0 && sourceHeight > 0)) {
      const sourceForDimensions = clientProcessingImageSrc || workingSlotImageSrc || '';
      const image = await loadImageElement(sourceForDimensions);
      sourceWidth = image.naturalWidth || image.width;
      sourceHeight = image.naturalHeight || image.height;
    }
    if (!(sourceWidth > 0 && sourceHeight > 0)) {
      throw new Error('Source image dimensions are invalid.');
    }

    const side = Math.max(1, Math.min(sourceWidth, sourceHeight));
    const x = Math.max(0, Math.floor((sourceWidth - side) / 2));
    const y = Math.max(0, Math.floor((sourceHeight - side) / 2));

    return {
      x,
      y,
      width: side,
      height: side,
    };
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
    setTool('select');
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

  const fetchProjectSlots = async (projectIdOverride?: string): Promise<ImageStudioSlotRecord[]> => {
    const resolvedProjectId = projectIdOverride?.trim() ?? projectId?.trim() ?? '';
    if (!resolvedProjectId) return [];
    const response = await api.get<StudioSlotsResponse>(
      `/api/image-studio/projects/${encodeURIComponent(resolvedProjectId)}/slots`
    );
    return Array.isArray(response.slots) ? response.slots : [];
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

  const resolveUpscaleSourceDimensions = async (): Promise<{ width: number; height: number }> => {
    let sourceWidth = workingSlot?.imageFile?.width ?? 0;
    let sourceHeight = workingSlot?.imageFile?.height ?? 0;
    if (!(sourceWidth > 0 && sourceHeight > 0)) {
      const sourceForDimensions = clientProcessingImageSrc || workingSlotImageSrc || '';
      const image = await loadImageElement(sourceForDimensions);
      sourceWidth = image.naturalWidth || image.width;
      sourceHeight = image.naturalHeight || image.height;
    }
    if (!(sourceWidth > 0 && sourceHeight > 0)) {
      throw new Error('Source image dimensions are invalid.');
    }
    return {
      width: sourceWidth,
      height: sourceHeight,
    };
  };

  const appendUpscaleStrategyToFormData = (
    formData: FormData,
    request: UpscaleRequestStrategyPayload
  ): void => {
    formData.append('strategy', request.strategy);
    if (request.strategy === 'scale') {
      formData.append('scale', String(request.scale));
      return;
    }
    formData.append('targetWidth', String(request.targetWidth));
    formData.append('targetHeight', String(request.targetHeight));
  };

  const buildUpscaleRequestBody = (
    mode: 'client_data_url' | 'server_sharp',
    request: UpscaleRequestStrategyPayload,
    requestId: string
  ): Record<string, unknown> => ({
    mode,
    strategy: request.strategy,
    ...(request.strategy === 'scale'
      ? { scale: request.scale }
      : { targetWidth: request.targetWidth, targetHeight: request.targetHeight }),
    requestId,
  });

  const handleUpscale = async (): Promise<void> => {
    if (!workingSlot?.id) {
      toast('No active source slot selected.', { variant: 'info' });
      return;
    }
    if (!workingSlotImageSrc) {
      toast('Select a slot image before upscaling.', { variant: 'info' });
      return;
    }
    if (upscaleRequestInFlightRef.current) {
      return;
    }

    let upscaleRequestPayload: UpscaleRequestStrategyPayload;
    if (upscaleStrategy === 'scale') {
      const scale = Number(upscaleScale);
      if (!Number.isFinite(scale) || scale <= 1 || scale > 8) {
        toast('Upscale multiplier must be greater than 1 and at most 8.', { variant: 'info' });
        return;
      }
      upscaleRequestPayload = {
        strategy: 'scale',
        scale,
      };
    } else {
      const parsedTargetWidth = Math.floor(Number(upscaleTargetWidth));
      const parsedTargetHeight = Math.floor(Number(upscaleTargetHeight));
      if (!(parsedTargetWidth > 0 && parsedTargetHeight > 0)) {
        toast('Enter both target width and target height as positive integers.', { variant: 'info' });
        return;
      }
      if (parsedTargetWidth > UPSCALE_MAX_OUTPUT_SIDE || parsedTargetHeight > UPSCALE_MAX_OUTPUT_SIDE) {
        toast(`Target resolution side cannot exceed ${UPSCALE_MAX_OUTPUT_SIDE}px.`, { variant: 'info' });
        return;
      }
      const sourceDimensions = await resolveUpscaleSourceDimensions();
      if (
        parsedTargetWidth < sourceDimensions.width ||
        parsedTargetHeight < sourceDimensions.height ||
        (
          parsedTargetWidth === sourceDimensions.width &&
          parsedTargetHeight === sourceDimensions.height
        )
      ) {
        toast(
          'Target resolution must upscale at least one side and not reduce source dimensions.',
          { variant: 'info' }
        );
        return;
      }
      upscaleRequestPayload = {
        strategy: 'target_resolution',
        targetWidth: parsedTargetWidth,
        targetHeight: parsedTargetHeight,
      };
    }

    upscaleRequestInFlightRef.current = true;
    setUpscaleBusy(true);
    setUpscaleStatus('resolving');
    const upscaleRequestId = buildUpscaleRequestId();
    const abortController = new AbortController();
    upscaleAbortControllerRef.current = abortController;
    try {
      const mode = upscaleMode === 'client_canvas' ? 'client_data_url' : 'server_sharp';
      let response: UpscaleActionResponse;
      let resolvedMode: 'client_data_url' | 'server_sharp' = mode;
      if (mode === 'client_data_url') {
        const sourceForClientUpscale = clientProcessingImageSrc || workingSlotImageSrc;
        if (!sourceForClientUpscale) {
          throw new Error('No client image source is available for upscale.');
        }
        try {
          setUpscaleStatus('preparing');
          const clientUpscale = await upscaleCanvasImage(
            sourceForClientUpscale,
            upscaleRequestPayload,
            upscaleSmoothingQuality
          );
          let uploadBlob: Blob;
          try {
            uploadBlob = await dataUrlToUploadBlob(clientUpscale.dataUrl);
          } catch {
            throw new Error('Failed to prepare client upscaled image for upload.');
          }

          setUpscaleStatus('uploading');
          response = await withUpscaleRetry(
            () => {
              const formData = new FormData();
              formData.append('mode', mode);
              appendUpscaleStrategyToFormData(formData, upscaleRequestPayload);
              formData.append('smoothingQuality', upscaleSmoothingQuality);
              formData.append('requestId', upscaleRequestId);
              formData.append('image', uploadBlob, `upscale-client-${Date.now()}.png`);
              return api.post<UpscaleActionResponse>(
                `/api/image-studio/slots/${encodeURIComponent(workingSlot.id)}/upscale`,
                formData,
                {
                  signal: abortController.signal,
                  timeout: UPSCALE_REQUEST_TIMEOUT_MS,
                  headers: {
                    'x-idempotency-key': upscaleRequestId,
                  },
                }
              );
            },
            abortController.signal
          );
        } catch (error) {
          if (!isClientUpscaleCrossOriginError(error)) {
            throw error;
          }
          setUpscaleStatus('processing');
          response = await withUpscaleRetry(
            () =>
              api.post<UpscaleActionResponse>(
                `/api/image-studio/slots/${encodeURIComponent(workingSlot.id)}/upscale`,
                buildUpscaleRequestBody('server_sharp', upscaleRequestPayload, upscaleRequestId),
                {
                  signal: abortController.signal,
                  timeout: UPSCALE_REQUEST_TIMEOUT_MS,
                  headers: {
                    'x-idempotency-key': upscaleRequestId,
                  },
                }
              ),
            abortController.signal
          );
          resolvedMode = 'server_sharp';
          toast('Client upscale was blocked by cross-origin restrictions; used server upscale instead.', {
            variant: 'info',
          });
        }
      } else {
        setUpscaleStatus('processing');
        response = await withUpscaleRetry(
          () =>
            api.post<UpscaleActionResponse>(
              `/api/image-studio/slots/${encodeURIComponent(workingSlot.id)}/upscale`,
              buildUpscaleRequestBody(mode, upscaleRequestPayload, upscaleRequestId),
              {
                signal: abortController.signal,
                timeout: UPSCALE_REQUEST_TIMEOUT_MS,
                headers: {
                  'x-idempotency-key': upscaleRequestId,
                },
              }
            ),
          abortController.signal
        );
      }

      const normalizedProjectId = projectId?.trim() ?? '';
      if (normalizedProjectId) {
        setUpscaleStatus('persisting');
        await invalidateImageStudioSlots(queryClient, normalizedProjectId);
        const slotsSnapshot = await fetchProjectSlots(normalizedProjectId);
        const createdSlotId = response.slot?.id ?? '';
        const mergedSlots =
          createdSlotId
            ? [response.slot!, ...slotsSnapshot.filter((slot) => slot.id !== createdSlotId)]
            : slotsSnapshot;
        queryClient.setQueryData<StudioSlotsResponse>(
          studioKeys.slots(normalizedProjectId),
          { slots: mergedSlots }
        );
      }

      if (response.slot?.id) {
        setSelectedSlotId(response.slot.id);
        setWorkingSlotId(response.slot.id);
      }

      const effectiveMode = response.effectiveMode ?? resolvedMode;
      const modeLabel = effectiveMode === 'client_data_url' ? 'Client' : 'Server';
      const effectiveStrategy = response.strategy ?? upscaleRequestPayload.strategy;
      const fallbackTargetWidth =
        upscaleRequestPayload.strategy === 'target_resolution' ? upscaleRequestPayload.targetWidth : null;
      const fallbackTargetHeight =
        upscaleRequestPayload.strategy === 'target_resolution' ? upscaleRequestPayload.targetHeight : null;
      const upscaleLabel =
        effectiveStrategy === 'target_resolution'
          ? `${response.targetWidth ?? fallbackTargetWidth}x${response.targetHeight ?? fallbackTargetHeight}`
          : `${Number(
            (response.scale ?? (upscaleRequestPayload.strategy === 'scale' ? upscaleRequestPayload.scale : 2))
              .toFixed(2)
          )}x`;
      const createdLabel = response.slot?.name?.trim() || `Upscale ${upscaleLabel}`;
      toast(`Created ${createdLabel} (${modeLabel} upscale).`, { variant: 'success' });
    } catch (error) {
      if (isUpscaleAbortError(error)) {
        toast('Upscale canceled.', { variant: 'info' });
        return;
      }
      toast(error instanceof Error ? error.message : 'Failed to upscale image.', { variant: 'error' });
    } finally {
      upscaleRequestInFlightRef.current = false;
      upscaleAbortControllerRef.current = null;
      setUpscaleBusy(false);
      setUpscaleStatus('idle');
    }
  };

  const handleCancelUpscale = (): void => {
    const controller = upscaleAbortControllerRef.current;
    if (!controller) return;
    controller.abort();
  };

  const handleCrop = async (cropRectOverride?: CropRect): Promise<void> => {
    if (!workingSlot?.id) {
      toast('No active source slot selected.', { variant: 'info' });
      return;
    }
    if (!workingSlotImageSrc) {
      toast('Select a slot image before cropping.', { variant: 'info' });
      return;
    }
    if (!cropRectOverride && !hasCropBoundary) {
      toast('Set a valid crop boundary first.', { variant: 'info' });
      return;
    }
    if (cropRequestInFlightRef.current) {
      return;
    }

    cropRequestInFlightRef.current = true;
    setCropBusy(true);
    setCropStatus('resolving');
    const cropRequestId = buildCropRequestId();
    const abortController = new AbortController();
    cropAbortControllerRef.current = abortController;
    try {
      const cropRect = cropRectOverride ?? await resolveCropRect();
      let response: CropActionResponse;
      let resolvedMode: CropMode = cropMode;
      if (cropMode === 'client_bbox') {
        const sourceForClientCrop = clientProcessingImageSrc || workingSlotImageSrc;
        if (!sourceForClientCrop) {
          throw new Error('No client image source is available for crop.');
        }
        try {
          setCropStatus('preparing');
          const croppedDataUrl = await cropCanvasImage(sourceForClientCrop, cropRect);
          let uploadBlob: Blob;
          try {
            uploadBlob = await dataUrlToUploadBlob(croppedDataUrl);
          } catch {
            throw new Error('Failed to prepare client crop image for upload.');
          }

          setCropStatus('uploading');
          response = await withCropRetry(
            () => {
              const formData = new FormData();
              formData.append('mode', cropMode);
              formData.append('cropRect', JSON.stringify(cropRect));
              formData.append('requestId', cropRequestId);
              formData.append('image', uploadBlob, `crop-client-${Date.now()}.png`);
              return api.post<CropActionResponse>(
                `/api/image-studio/slots/${encodeURIComponent(workingSlot.id)}/crop`,
                formData,
                {
                  signal: abortController.signal,
                  timeout: CROP_REQUEST_TIMEOUT_MS,
                  headers: {
                    'x-idempotency-key': cropRequestId,
                  },
                }
              );
            },
            abortController.signal
          );
        } catch (error) {
          if (!isClientCropCrossOriginError(error)) {
            throw error;
          }
          setCropStatus('processing');
          response = await withCropRetry(
            () =>
              api.post<CropActionResponse>(
                `/api/image-studio/slots/${encodeURIComponent(workingSlot.id)}/crop`,
                {
                  mode: 'server_bbox',
                  cropRect,
                  requestId: cropRequestId,
                },
                {
                  signal: abortController.signal,
                  timeout: CROP_REQUEST_TIMEOUT_MS,
                  headers: {
                    'x-idempotency-key': cropRequestId,
                  },
                }
              ),
            abortController.signal
          );
          resolvedMode = 'server_bbox';
          toast('Client crop was blocked by cross-origin restrictions; used server crop instead.', {
            variant: 'info',
          });
        }
      } else {
        setCropStatus('processing');
        response = await withCropRetry(
          () =>
            api.post<CropActionResponse>(
              `/api/image-studio/slots/${encodeURIComponent(workingSlot.id)}/crop`,
              {
                mode: cropMode,
                cropRect,
                requestId: cropRequestId,
              },
              {
                signal: abortController.signal,
                timeout: CROP_REQUEST_TIMEOUT_MS,
                headers: {
                  'x-idempotency-key': cropRequestId,
                },
              }
            ),
          abortController.signal
        );
      }

      const normalizedProjectId = projectId?.trim() ?? '';
      if (normalizedProjectId) {
        setCropStatus('persisting');
        await invalidateImageStudioSlots(queryClient, normalizedProjectId);
        const slotsSnapshot = await fetchProjectSlots(normalizedProjectId);
        const createdSlotId = response.slot?.id ?? '';
        const mergedSlots =
          createdSlotId
            ? [response.slot!, ...slotsSnapshot.filter((slot) => slot.id !== createdSlotId)]
            : slotsSnapshot;
        queryClient.setQueryData<StudioSlotsResponse>(
          studioKeys.slots(normalizedProjectId),
          { slots: mergedSlots }
        );
      }

      if (response.slot?.id) {
        setSelectedSlotId(response.slot.id);
        setWorkingSlotId(response.slot.id);
      }

      const createdLabel = response.slot?.name?.trim() || 'Cropped variant';
      const effectiveMode = response.effectiveMode ?? resolvedMode;
      const modeLabel = effectiveMode === 'client_bbox' ? 'Client' : 'Server';
      toast(`Created ${createdLabel} (${modeLabel} crop).`, { variant: 'success' });
    } catch (error) {
      if (isCropAbortError(error)) {
        toast('Crop canceled.', { variant: 'info' });
        return;
      }
      toast(error instanceof Error ? error.message : 'Failed to crop image.', { variant: 'error' });
    } finally {
      cropRequestInFlightRef.current = false;
      cropAbortControllerRef.current = null;
      setCropBusy(false);
      setCropStatus('idle');
    }
  };

  const handleCancelCrop = (): void => {
    const controller = cropAbortControllerRef.current;
    if (!controller) return;
    controller.abort();
  };

  const handleSquareCrop = async (): Promise<void> => {
    if (!workingSlot?.id) {
      toast('No active source slot selected.', { variant: 'info' });
      return;
    }
    if (!workingSlotImageSrc) {
      toast('Select a slot image before cropping.', { variant: 'info' });
      return;
    }
    try {
      const squareCropRect = await resolveCenteredSquareCropRect();
      await handleCrop(squareCropRect);
    } catch (error) {
      toast(error instanceof Error ? error.message : 'Failed to prepare square crop.', { variant: 'error' });
    }
  };

  const handlePreviewViewCrop = async (): Promise<void> => {
    const activeSlotId = workingSlot?.id?.trim() ?? '';
    if (!activeSlotId) {
      toast('No active source slot selected.', { variant: 'info' });
      return;
    }
    if (!workingSlotImageSrc) {
      toast('Select a slot image before cropping.', { variant: 'info' });
      return;
    }

    const previewCrop = getPreviewCanvasViewportCrop();
    if (!previewCrop) {
      toast('Preview Canvas crop view is unavailable. Load a slot image in Preview Canvas first.', {
        variant: 'info',
      });
      return;
    }
    if (previewCrop.slotId !== activeSlotId) {
      toast('Preview Canvas is showing a different slot. Switch back to the working slot and try again.', {
        variant: 'info',
      });
      return;
    }

    try {
      await handleCrop(previewCrop.cropRect);
    } catch (error) {
      toast(error instanceof Error ? error.message : 'Failed to prepare crop from preview view.', { variant: 'error' });
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
    if (centerMode === 'client_alpha_bbox' && !clientProcessingImageSrc) {
      toast('No client image source is available for centering.', { variant: 'info' });
      return;
    }
    if (centerRequestInFlightRef.current) {
      return;
    }

    centerRequestInFlightRef.current = true;
    setCenterBusy(true);
    setCenterStatus('resolving');
    const centerRequestId = buildCenterRequestId();
    const abortController = new AbortController();
    centerAbortControllerRef.current = abortController;
    try {
      let response: CenterActionResponse;
      let resolvedMode: CenterMode = centerMode;
      if (centerMode === 'client_alpha_bbox') {
        const sourceForClientCenter = clientProcessingImageSrc || workingSlotImageSrc;
        if (!sourceForClientCenter) {
          throw new Error('No client image source is available for centering.');
        }
        try {
          setCenterStatus('preparing');
          const centeredDataUrl = await centerCanvasImageObject(sourceForClientCenter);
          let uploadBlob: Blob;
          try {
            uploadBlob = await dataUrlToUploadBlob(centeredDataUrl);
          } catch {
            throw new Error('Failed to prepare client centered image for upload.');
          }

          setCenterStatus('uploading');
          response = await withCenterRetry(
            () => {
              const formData = new FormData();
              formData.append('mode', centerMode);
              formData.append('requestId', centerRequestId);
              formData.append('image', uploadBlob, `center-client-${Date.now()}.png`);
              return api.post<CenterActionResponse>(
                `/api/image-studio/slots/${encodeURIComponent(workingSlot.id)}/center`,
                formData,
                {
                  signal: abortController.signal,
                  timeout: CENTER_REQUEST_TIMEOUT_MS,
                  headers: {
                    'x-idempotency-key': centerRequestId,
                  },
                }
              );
            },
            abortController.signal
          );
        } catch (error) {
          if (!isClientCenterCrossOriginError(error)) {
            throw error;
          }
          setCenterStatus('processing');
          response = await withCenterRetry(
            () =>
              api.post<CenterActionResponse>(
                `/api/image-studio/slots/${encodeURIComponent(workingSlot.id)}/center`,
                {
                  mode: 'server_alpha_bbox',
                  requestId: centerRequestId,
                },
                {
                  signal: abortController.signal,
                  timeout: CENTER_REQUEST_TIMEOUT_MS,
                  headers: {
                    'x-idempotency-key': centerRequestId,
                  },
                }
              ),
            abortController.signal
          );
          resolvedMode = 'server_alpha_bbox';
          toast('Client centering was blocked by cross-origin restrictions; used server centering instead.', {
            variant: 'info',
          });
        }
      } else {
        setCenterStatus('processing');
        response = await withCenterRetry(
          () =>
            api.post<CenterActionResponse>(
              `/api/image-studio/slots/${encodeURIComponent(workingSlot.id)}/center`,
              {
                mode: centerMode,
                requestId: centerRequestId,
              },
              {
                signal: abortController.signal,
                timeout: CENTER_REQUEST_TIMEOUT_MS,
                headers: {
                  'x-idempotency-key': centerRequestId,
                },
              }
            ),
          abortController.signal
        );
      }

      const normalizedProjectId = projectId?.trim() ?? '';
      if (normalizedProjectId) {
        setCenterStatus('persisting');
        await invalidateImageStudioSlots(queryClient, normalizedProjectId);
        const slotsSnapshot = await fetchProjectSlots(normalizedProjectId);
        const createdSlotId = response.slot?.id ?? '';
        const mergedSlots =
          createdSlotId
            ? [response.slot!, ...slotsSnapshot.filter((slot) => slot.id !== createdSlotId)]
            : slotsSnapshot;
        queryClient.setQueryData<StudioSlotsResponse>(
          studioKeys.slots(normalizedProjectId),
          { slots: mergedSlots }
        );
      }

      if (response.slot?.id) {
        setSelectedSlotId(response.slot.id);
        setWorkingSlotId(response.slot.id);
      }

      const createdLabel = response.slot?.name?.trim() || 'Centered variant';
      const effectiveMode = response.effectiveMode ?? resolvedMode;
      const modeLabel = effectiveMode === 'client_alpha_bbox' ? 'Client' : 'Server';
      const sourceBounds = response.sourceObjectBounds ?? null;
      const targetBounds = response.targetObjectBounds ?? null;
      const centerShiftedObject = Boolean(
        sourceBounds &&
        targetBounds &&
        (
          sourceBounds.left !== targetBounds.left ||
          sourceBounds.top !== targetBounds.top ||
          sourceBounds.width !== targetBounds.width ||
          sourceBounds.height !== targetBounds.height
        )
      );
      if (centerShiftedObject) {
        toast(`Created ${createdLabel} (${modeLabel} center).`, { variant: 'success' });
      } else {
        toast(`${createdLabel} created, but the object was already centered in-frame.`, { variant: 'info' });
      }
    } catch (error) {
      if (isCenterAbortError(error)) {
        toast('Centering canceled.', { variant: 'info' });
        return;
      }
      toast(error instanceof Error ? error.message : 'Failed to center image object.', { variant: 'error' });
    } finally {
      centerRequestInFlightRef.current = false;
      centerAbortControllerRef.current = null;
      setCenterBusy(false);
      setCenterStatus('idle');
    }
  };

  const handleCancelCenter = (): void => {
    const controller = centerAbortControllerRef.current;
    if (!controller) return;
    controller.abort();
  };

  const maskGenerationBusy = maskGenLoading;
  const maskGenerationLabel = maskGenerationBusy
    ? 'Generating Mask...'
    : 'Generate Mask';
  const upscaleBusyLabel = useMemo(() => {
    if (!upscaleBusy) return 'Upscale';
    switch (upscaleStatus) {
      case 'resolving':
        return 'Upscale: Resolving';
      case 'preparing':
        return 'Upscale: Preparing';
      case 'uploading':
        return 'Upscale: Uploading';
      case 'processing':
        return 'Upscale: Processing';
      case 'persisting':
        return 'Upscale: Persisting';
      default:
        return 'Upscale';
    }
  }, [upscaleBusy, upscaleStatus]);
  const cropBusyLabel = useMemo(() => {
    if (!cropBusy) return 'Crop';
    switch (cropStatus) {
      case 'resolving':
        return 'Crop: Resolving';
      case 'preparing':
        return 'Crop: Preparing';
      case 'uploading':
        return 'Crop: Uploading';
      case 'processing':
        return 'Crop: Processing';
      case 'persisting':
        return 'Crop: Persisting';
      default:
        return 'Crop';
    }
  }, [cropBusy, cropStatus]);
  const centerBusyLabel = useMemo(() => {
    if (!centerBusy) return 'Center Object';
    switch (centerStatus) {
      case 'resolving':
        return 'Center: Resolving';
      case 'preparing':
        return 'Center: Preparing';
      case 'uploading':
        return 'Center: Uploading';
      case 'processing':
        return 'Center: Processing';
      case 'persisting':
        return 'Center: Persisting';
      default:
        return 'Center Object';
    }
  }, [centerBusy, centerStatus]);

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
  const upscaleStrategyOptions = useMemo(
    () => ([
      { value: 'scale', label: 'By Multiplier' },
      { value: 'target_resolution', label: 'By Resolution' },
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

  const hasSourceImage = Boolean(workingSlot && workingSlotImageSrc);

  return (
    <div className='space-y-3'>
      <div className='rounded border border-border/60 bg-card/40 p-3'>
        <div className='mb-2 text-[10px] uppercase tracking-wide text-gray-500'>
          Generation Defaults
        </div>
        <div className='grid gap-2 sm:grid-cols-[minmax(0,1fr)_70px]'>
          <SelectSimple size='sm'
            className='w-full min-w-0'
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
            className='w-full'
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
        </div>
      </div>

      <div className='rounded border border-border/60 bg-card/40 p-3'>
        <div className='mb-2 flex items-center justify-between gap-2'>
          <div className='text-[10px] uppercase tracking-wide text-gray-500'>Mask</div>
          <span className='text-[11px] text-gray-400 whitespace-nowrap'>
            {exportMaskCount > 0
              ? `${exportMaskCount} mask shape${exportMaskCount > 1 ? 's' : ''}`
              : 'No mask'}
          </span>
        </div>

        <div className='grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center'>
          <SelectSimple size='sm'
            className='w-full'
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
          <Button size='xs'
            type='button'
            variant='outline'
            onClick={() => {
              handleAiMaskGeneration(maskGenMode);
            }}
            disabled={!workingSlot || maskGenerationBusy}
            className='sm:min-w-[160px]'
          >
            {maskGenerationBusy ? (
              <Loader2 className='mr-2 size-4 animate-spin' />
            ) : (
              <Play className='mr-2 size-4' />
            )}
            {maskGenerationLabel}
          </Button>
        </div>

        <div className='mt-2 grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center'>
          <SelectSimple size='sm'
            className='w-full'
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
              void attachMaskVariantsFromSelection();
            }}
            disabled={!workingSlot || exportMaskCount === 0}
            title='Create and attach white/black masks and their inverted variants'
            className='sm:min-w-[140px]'
          >
            Attach Masks
          </Button>
        </div>

        <div className='mt-2 flex flex-wrap items-center gap-2'>
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
        </div>
      </div>

      <div className='rounded border border-border/60 bg-card/40 p-3'>
        <div className='mb-2 flex items-center justify-between gap-2'>
          <div className='text-[10px] uppercase tracking-wide text-gray-500'>Crop</div>
          <span className='text-[11px] text-gray-500'>
            {hasCropBoundary ? 'Boundary ready' : 'Set a boundary first'}
          </span>
        </div>
        <div className='grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center'>
          <SelectSimple size='sm'
            className='w-full'
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
            disabled={!hasSourceImage}
            title='Create a dedicated crop rectangle that always works with Crop'
          >
            Crop Box Tool
          </Button>
        </div>
        <div className='mt-2 flex flex-wrap items-center gap-2'>
          <Button size='xs'
            type='button'
            variant='outline'
            onClick={() => {
              void handleCrop();
            }}
            disabled={!hasSourceImage || cropBusy || !hasCropBoundary}
            title='Create cropped linked variant from selected boundary'
          >
            {cropBusy ? <Loader2 className='mr-2 size-4 animate-spin' /> : null}
            {cropBusyLabel}
          </Button>
          <Button size='xs'
            type='button'
            variant='outline'
            onClick={() => {
              void handleSquareCrop();
            }}
            disabled={!hasSourceImage || cropBusy}
            title='Quick centered square crop (1:1) from the active slot'
          >
            Square Crop
          </Button>
          <Button size='xs'
            type='button'
            variant='outline'
            onClick={() => {
              void handlePreviewViewCrop();
            }}
            disabled={!hasSourceImage || cropBusy}
            title='Crop using the currently visible area in Preview Canvas'
          >
            View Crop
          </Button>
          {cropBusy ? (
            <Button
              size='xs'
              type='button'
              variant='outline'
              onClick={handleCancelCrop}
              title='Cancel crop request'
            >
              Cancel Crop
            </Button>
          ) : null}
        </div>
      </div>

      <div className='rounded border border-border/60 bg-card/40 p-3'>
        <div className='mb-2 text-[10px] uppercase tracking-wide text-gray-500'>Upscale</div>
        <div className='grid gap-2 sm:grid-cols-2'>
          <SelectSimple size='sm'
            className='w-full'
            value={upscaleMode}
            onValueChange={(value: string) => {
              setUpscaleMode(value as UpscaleMode);
            }}
            options={upscaleModeOptions}
            triggerClassName='h-8 text-xs'
            ariaLabel='Upscale mode'
          />
          <SelectSimple size='sm'
            className='w-full'
            value={upscaleStrategy}
            onValueChange={(value: string) => {
              setUpscaleStrategy(value as UpscaleStrategy);
            }}
            options={upscaleStrategyOptions}
            triggerClassName='h-8 text-xs'
            ariaLabel='Upscale strategy'
          />
        </div>
        <div className='mt-2'>
          {upscaleStrategy === 'scale' ? (
            <SelectSimple size='sm'
              className='w-full sm:w-[130px]'
              value={upscaleScale}
              onValueChange={(value: string) => {
                setUpscaleScale(value);
              }}
              options={upscaleScaleOptions}
              triggerClassName='h-8 text-xs'
              ariaLabel='Upscale multiplier'
            />
          ) : (
            <div className='flex h-8 w-full items-center gap-1 rounded border border-border/60 bg-card/40 px-2 sm:w-[180px]'>
              <input
                type='number'
                min={1}
                max={UPSCALE_MAX_OUTPUT_SIDE}
                step={1}
                inputMode='numeric'
                value={upscaleTargetWidth}
                onChange={(event: React.ChangeEvent<HTMLInputElement>) => {
                  setUpscaleTargetWidth(event.target.value.replace(/[^0-9]/g, ''));
                }}
                placeholder='W'
                className='h-6 w-[68px] border-0 bg-transparent text-xs text-gray-100 outline-none placeholder:text-gray-500'
                aria-label='Target upscale width'
              />
              <span className='text-[11px] text-gray-500'>x</span>
              <input
                type='number'
                min={1}
                max={UPSCALE_MAX_OUTPUT_SIDE}
                step={1}
                inputMode='numeric'
                value={upscaleTargetHeight}
                onChange={(event: React.ChangeEvent<HTMLInputElement>) => {
                  setUpscaleTargetHeight(event.target.value.replace(/[^0-9]/g, ''));
                }}
                placeholder='H'
                className='h-6 w-[68px] border-0 bg-transparent text-xs text-gray-100 outline-none placeholder:text-gray-500'
                aria-label='Target upscale height'
              />
            </div>
          )}
        </div>
        {upscaleMode === 'client_canvas' ? (
          <div className='mt-2'>
            <SelectSimple size='sm'
              className='w-full sm:w-[180px]'
              value={upscaleSmoothingQuality}
              onValueChange={(value: string) => {
                setUpscaleSmoothingQuality(value as UpscaleSmoothingQuality);
              }}
              options={upscaleSmoothingOptions}
              triggerClassName='h-8 text-xs'
              ariaLabel='Upscale smoothing quality'
            />
          </div>
        ) : null}
        <div className='mt-2 flex flex-wrap items-center gap-2'>
          <Button size='xs'
            type='button'
            variant='outline'
            onClick={() => {
              void handleUpscale();
            }}
            disabled={!hasSourceImage || upscaleBusy}
            title='Create an upscaled linked variant from the active slot'
          >
            {upscaleBusy ? <Loader2 className='mr-2 size-4 animate-spin' /> : null}
            {upscaleBusyLabel}
          </Button>
          {upscaleBusy ? (
            <Button
              size='xs'
              type='button'
              variant='outline'
              onClick={handleCancelUpscale}
              title='Cancel upscale request'
            >
              Cancel Upscale
            </Button>
          ) : null}
        </div>
      </div>

      <div className='rounded border border-border/60 bg-card/40 p-3'>
        <div className='mb-2 text-[10px] uppercase tracking-wide text-gray-500'>Center</div>
        <div className='grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center'>
          <SelectSimple size='sm'
            className='w-full'
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
              setCenterGuidesEnabled(!centerGuidesEnabled);
            }}
            disabled={!workingSlotImageSrc}
            title='Toggle center guides overlay'
          >
            {centerGuidesEnabled ? 'Hide Guides' : 'Show Guides'}
          </Button>
        </div>
        <div className='mt-2 flex flex-wrap items-center gap-2'>
          <Button size='xs'
            type='button'
            variant='outline'
            onClick={() => {
              void handleCenterObject();
            }}
            disabled={!hasSourceImage || centerBusy}
            title='Create a centered linked variant from the active slot'
          >
            {centerBusy ? <Loader2 className='mr-2 size-4 animate-spin' /> : null}
            {centerBusyLabel}
          </Button>
          {centerBusy ? (
            <Button
              size='xs'
              type='button'
              variant='outline'
              onClick={handleCancelCenter}
              title='Cancel centering request'
            >
              Cancel Center
            </Button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
