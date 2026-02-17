'use client';

import { useQueryClient } from '@tanstack/react-query';
import React, { useMemo, useRef, useState } from 'react';

import {
  DEFAULT_PRODUCT_IMAGES_EXTERNAL_BASE_URL,
  PRODUCT_IMAGES_EXTERNAL_BASE_URL_SETTING_KEY,
} from '@/features/products/constants';
import { api } from '@/shared/lib/api-client';
import { invalidateImageStudioSlots } from '@/shared/lib/query-invalidation';
import { useSettingsStore } from '@/shared/providers/SettingsStoreProvider';
import { useToast } from '@/shared/ui';

import { useMaskingState, useMaskingActions, type MaskingState } from '../context/MaskingContext';
import { useProjectsState } from '../context/ProjectsContext';
import { useSettingsState, useSettingsActions } from '../context/SettingsContext';
import { useSlotsState, useSlotsActions } from '../context/SlotsContext';
import { useUiActions, useUiState } from '../context/UiContext';
import { GenerationToolbarCenterSection } from './generation-toolbar/GenerationToolbarCenterSection';
import { GenerationToolbarCropSection } from './generation-toolbar/GenerationToolbarCropSection';
import { GenerationToolbarDefaultsSection } from './generation-toolbar/GenerationToolbarDefaultsSection';
import {
  buildCenterRequestId,
  buildCropRequestId,
  buildUpscaleRequestId,
  centerCanvasImageObject,
  cropCanvasImage,
  dataUrlToUploadBlob,
  isCenterAbortError,
  isClientCenterCrossOriginError,
  isClientCropCrossOriginError,
  isClientUpscaleCrossOriginError,
  isCropAbortError,
  isUpscaleAbortError,
  loadImageElement,
  polygonsFromShapes,
  renderMaskDataUrlFromPolygons,
  resolveClientProcessingImageSrc,
  resolveCropRectFromShapes,
  shapeHasUsableCropGeometry,
  upscaleCanvasImage,
  withCenterRetry,
  withCropRetry,
  withUpscaleRetry,
  type CropRect,
  type MaskShapeForExport,
  type UpscaleRequestStrategyPayload,
  type UpscaleSmoothingQuality,
} from './generation-toolbar/GenerationToolbarImageUtils';
import { GenerationToolbarMaskSection } from './generation-toolbar/GenerationToolbarMaskSection';
import { GenerationToolbarUpscaleSection } from './generation-toolbar/GenerationToolbarUpscaleSection';
import { studioKeys } from '../hooks/useImageStudioQueries';
import { getImageStudioSlotImageSrc } from '../utils/image-src';
import { normalizeImageStudioModelPresets } from '../utils/studio-settings';

import type { ImageStudioSlotRecord, StudioSlotsResponse } from '../types';

type MaskAttachMode = 'client_canvas_polygon' | 'server_polygon';
type UpscaleMode = 'client_canvas' | 'server_sharp';
type UpscaleStrategy = 'scale' | 'target_resolution';
type CropMode = 'client_bbox' | 'server_bbox';
type CenterMode = 'client_alpha_bbox' | 'server_alpha_bbox';

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
const UPSCALE_MAX_OUTPUT_SIDE = 32_768;
const CROP_REQUEST_TIMEOUT_MS = 60_000;
const CENTER_REQUEST_TIMEOUT_MS = 60_000;

export function GenerationToolbar(): React.JSX.Element {
  const { maskPreviewEnabled, centerGuidesEnabled } = useUiState();
  const {
    setMaskPreviewEnabled,
    setCenterGuidesEnabled,
    setCanvasSelectionEnabled,
    getPreviewCanvasViewportCrop,
  } = useUiActions();
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

    const cropRect = resolveCropRectFromShapes(
      exportMaskShapes,
      sourceWidth,
      sourceHeight,
      activeMaskId
    );
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
    setCanvasSelectionEnabled(true);
    toast('Crop box created. Adjust the rectangle, then click Crop.', { variant: 'success' });
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
  const generationModel = studioSettings.targetAi.openai.model;
  const generationImageCount = String(studioSettings.targetAi.openai.image.n ?? 1);

  return (
    <div className='space-y-3'>
      <GenerationToolbarDefaultsSection
        model={generationModel}
        modelOptions={modelOptions}
        onModelChange={(value: string) => {
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
        imageCount={generationImageCount}
        imageCountOptions={imageCountOptions}
        onImageCountChange={(value: string) => {
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
      />

      <GenerationToolbarMaskSection
        exportMaskCount={exportMaskCount}
        maskAttachMode={maskAttachMode}
        maskAttachModeOptions={maskAttachModeOptions}
        maskGenerationBusy={maskGenerationBusy}
        maskGenerationLabel={maskGenerationLabel}
        maskGenLoading={maskGenLoading}
        maskGenMode={maskGenMode}
        maskInvert={maskInvert}
        maskModeOptions={maskModeOptions}
        maskPreviewEnabled={maskPreviewEnabled}
        onAttachMasks={() => {
          void attachMaskVariantsFromSelection();
        }}
        onGenerateMask={() => {
          handleAiMaskGeneration(maskGenMode);
        }}
        onMaskAttachModeChange={(value: string) => {
          setMaskAttachMode(value as MaskAttachMode);
        }}
        onMaskGenModeChange={(value: string) => {
          const mode = value as 'ai-polygon' | 'ai-bbox' | 'threshold' | 'edges';
          setMaskGenMode(mode);
        }}
        onMaskInvertChange={(checked: boolean) => {
          setMaskInvert(Boolean(checked));
        }}
        onMaskPreviewEnabledChange={(checked: boolean) => {
          setMaskPreviewEnabled(Boolean(checked));
        }}
        workingSlotPresent={Boolean(workingSlot)}
      />

      <GenerationToolbarCropSection
        cropBusy={cropBusy}
        cropBusyLabel={cropBusyLabel}
        cropMode={cropMode}
        cropModeOptions={cropModeOptions}
        hasCropBoundary={hasCropBoundary}
        hasSourceImage={hasSourceImage}
        onCancelCrop={handleCancelCrop}
        onCreateCropBox={handleCreateCropBox}
        onCrop={() => {
          void handleCrop();
        }}
        onCropModeChange={(value: string) => {
          setCropMode(value as CropMode);
        }}
        onSquareCrop={() => {
          void handleSquareCrop();
        }}
        onViewCrop={() => {
          void handlePreviewViewCrop();
        }}
      />

      <GenerationToolbarUpscaleSection
        hasSourceImage={hasSourceImage}
        onCancelUpscale={handleCancelUpscale}
        onUpscale={() => {
          void handleUpscale();
        }}
        onUpscaleModeChange={(value: string) => {
          setUpscaleMode(value as UpscaleMode);
        }}
        onUpscaleScaleChange={(value: string) => {
          setUpscaleScale(value);
        }}
        onUpscaleSmoothingQualityChange={(value: string) => {
          setUpscaleSmoothingQuality(value as UpscaleSmoothingQuality);
        }}
        onUpscaleStrategyChange={(value: string) => {
          setUpscaleStrategy(value as UpscaleStrategy);
        }}
        onUpscaleTargetHeightChange={(value: string) => {
          setUpscaleTargetHeight(value.replace(/[^0-9]/g, ''));
        }}
        onUpscaleTargetWidthChange={(value: string) => {
          setUpscaleTargetWidth(value.replace(/[^0-9]/g, ''));
        }}
        upscaleBusy={upscaleBusy}
        upscaleBusyLabel={upscaleBusyLabel}
        upscaleMaxOutputSide={UPSCALE_MAX_OUTPUT_SIDE}
        upscaleMode={upscaleMode}
        upscaleModeOptions={upscaleModeOptions}
        upscaleScale={upscaleScale}
        upscaleScaleOptions={upscaleScaleOptions}
        upscaleSmoothingOptions={upscaleSmoothingOptions}
        upscaleSmoothingQuality={upscaleSmoothingQuality}
        upscaleStrategy={upscaleStrategy}
        upscaleStrategyOptions={upscaleStrategyOptions}
        upscaleTargetHeight={upscaleTargetHeight}
        upscaleTargetWidth={upscaleTargetWidth}
      />

      <GenerationToolbarCenterSection
        centerBusy={centerBusy}
        centerBusyLabel={centerBusyLabel}
        centerGuidesEnabled={centerGuidesEnabled}
        centerMode={centerMode}
        centerModeOptions={centerModeOptions}
        hasSourceImage={hasSourceImage}
        onCancelCenter={handleCancelCenter}
        onCenterModeChange={(value: string) => {
          setCenterMode(value as CenterMode);
        }}
        onCenterObject={() => {
          void handleCenterObject();
        }}
        onToggleCenterGuides={() => {
          setCenterGuidesEnabled(!centerGuidesEnabled);
        }}
      />
    </div>
  );
}
