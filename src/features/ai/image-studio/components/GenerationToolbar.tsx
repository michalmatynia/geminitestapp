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

import { useGenerationState, useGenerationActions } from '../context/GenerationContext';
import { useMaskingState, useMaskingActions, type MaskingState } from '../context/MaskingContext';
import { useProjectsState } from '../context/ProjectsContext';
import { usePromptState } from '../context/PromptContext';
import { useSettingsState, useSettingsActions } from '../context/SettingsContext';
import { useSlotsState } from '../context/SlotsContext';
import { useUiActions, useUiState } from '../context/UiContext';
import { getImageStudioSlotImageSrc } from '../utils/image-src';
import { normalizeImageStudioModelPresets } from '../utils/studio-settings';

type MaskAttachMode = 'client_canvas_polygon' | 'server_polygon';
type UpscaleMode = 'client_canvas' | 'server_sharp';
type UpscaleSmoothingQuality = 'low' | 'medium' | 'high';
type MaskShapeForExport = {
  id: string;
  type: string;
  points: Array<{ x: number; y: number }>;
  closed: boolean;
  visible: boolean;
};

const clamp01 = (value: number): number => Math.max(0, Math.min(1, value));

const normalizeShapeToPolygons = (
  shape: {
    type: string;
    points: Array<{ x: number; y: number }>;
    closed: boolean;
  }
): Array<Array<{ x: number; y: number }>> => {
  if (shape.type === 'polygon' || shape.type === 'lasso' || shape.type === 'brush') {
    if (!shape.closed || shape.points.length < 3) return [];
    return [shape.points.map((point) => ({ x: clamp01(point.x), y: clamp01(point.y) }))];
  }

  if (shape.type === 'rect') {
    if (shape.points.length < 2) return [];
    const xs = shape.points.map((point) => point.x);
    const ys = shape.points.map((point) => point.y);
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
    const xs = shape.points.map((point) => point.x);
    const ys = shape.points.map((point) => point.y);
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
  const { maskPreviewEnabled } = useUiState();
  const { setMaskPreviewEnabled } = useUiActions();
  const { projectId } = useProjectsState();
  const { workingSlot } = useSlotsState();
  const settingsStore = useSettingsStore();
  const {
    maskShapes,
    activeMaskId,
    maskInvert,
    maskGenLoading,
    maskGenMode,
  }: Pick<MaskingState, 'maskShapes' | 'activeMaskId' | 'maskInvert' | 'maskGenLoading' | 'maskGenMode'> = useMaskingState();
  const { setMaskInvert, setMaskGenMode, handleAiMaskGeneration } = useMaskingActions();
  const { promptText } = usePromptState();
  const { runMutation, isRunInFlight, activeRunStatus } = useGenerationState();
  const { handleRunGeneration } = useGenerationActions();
  const { studioSettings } = useSettingsState();
  const { setStudioSettings } = useSettingsActions();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [maskAttachMode, setMaskAttachMode] = useState<MaskAttachMode>('client_canvas_polygon');
  const [upscaleMode, setUpscaleMode] = useState<UpscaleMode>('client_canvas');
  const [upscaleScale, setUpscaleScale] = useState('2');
  const [upscaleSmoothingQuality, setUpscaleSmoothingQuality] = useState<UpscaleSmoothingQuality>('high');
  const [upscaleBusy, setUpscaleBusy] = useState(false);

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

  const polygonsFromShapes = (shapes: MaskShapeForExport[]): Array<Array<{ x: number; y: number }>> =>
    shapes.flatMap((shape) => normalizeShapeToPolygons(shape));

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
    const polygons = polygonsFromShapes(shapes);
    if (polygons.length === 0) {
      toast('No closed polygon-compatible shapes are available for mask export.', { variant: 'info' });
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
      const payload: Record<string, unknown> = {
        mode,
        scale,
      };

      if (mode === 'client_data_url') {
        payload['smoothingQuality'] = upscaleSmoothingQuality;
        payload['dataUrl'] = await upscaleCanvasImage(
          workingSlotImageSrc,
          scale,
          upscaleSmoothingQuality
        );
      }

      const response = await api.post<{ slot?: { id: string; name: string | null } }>(
        `/api/image-studio/slots/${encodeURIComponent(workingSlot.id)}/upscale`,
        payload
      );
      void invalidateImageStudioSlots(queryClient, projectId);

      const scaleLabel = `${Number(scale.toFixed(2))}x`;
      const createdLabel = response.slot?.name?.trim() || `Upscale ${scaleLabel}`;
      toast(`Created ${createdLabel}.`, { variant: 'success' });
    } catch (error) {
      toast(error instanceof Error ? error.message : 'Failed to upscale image.', { variant: 'error' });
    } finally {
      setUpscaleBusy(false);
    }
  };

  const generationBusy = runMutation.isPending || isRunInFlight;
  const generationLabel = generationBusy
    ? activeRunStatus === 'queued'
      ? 'Queued...'
      : 'Generating...'
    : `Generate ${(studioSettings.targetAi.openai.image.n ?? 1) > 1 ? `(${studioSettings.targetAi.openai.image.n})` : ''}`;

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
        onClick={handleRunGeneration}
        disabled={!workingSlot || !promptText.trim() || generationBusy}
        className='flex-1'
      >
        {generationBusy ? (
          <Loader2 className='mr-2 size-4 animate-spin' />
        ) : (
          <Play className='mr-2 size-4' />
        )}
        {generationLabel}
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
        title='Generate and enable mask preview'
      >
        Generate Mask
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
          handleAiMaskGeneration(mode);
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
