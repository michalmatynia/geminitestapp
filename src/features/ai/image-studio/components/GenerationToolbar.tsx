'use client';

import { useQueryClient } from '@tanstack/react-query';
import { Loader2, Play } from 'lucide-react';
import React, { useMemo, useState } from 'react';

import { studioKeys } from '@/features/ai/image-studio/hooks/useImageStudioQueries';
import {
  DEFAULT_PRODUCT_IMAGES_EXTERNAL_BASE_URL,
  PRODUCT_IMAGES_EXTERNAL_BASE_URL_SETTING_KEY,
} from '@/features/products/constants';
import { api } from '@/shared/lib/api-client';
import { useSettingsStore } from '@/shared/providers/SettingsStoreProvider';
import {
  UnifiedButton,
  Switch,
  UnifiedSelect,
  useToast,
} from '@/shared/ui';

import { useGenerationState, useGenerationActions } from '../context/GenerationContext';
import { useMaskingState, useMaskingActions } from '../context/MaskingContext';
import { useProjectsState } from '../context/ProjectsContext';
import { usePromptState } from '../context/PromptContext';
import { useSettingsState, useSettingsActions } from '../context/SettingsContext';
import { useSlotsState } from '../context/SlotsContext';
import { useUiActions, useUiState } from '../context/UiContext';
import { getImageStudioSlotImageSrc } from '../utils/image-src';
import { normalizeImageStudioModelPresets } from '../utils/studio-settings';

type MaskAttachMode = 'client_canvas_polygon' | 'server_polygon';

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
  } = useMaskingState();
  const { setMaskInvert, setMaskGenMode, handleAiMaskGeneration } = useMaskingActions();
  const { promptText } = usePromptState();
  const { runMutation, isRunInFlight, activeRunStatus } = useGenerationState();
  const { handleRunGeneration } = useGenerationActions();
  const { studioSettings } = useSettingsState();
  const { setStudioSettings } = useSettingsActions();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [maskAttachMode, setMaskAttachMode] = useState<MaskAttachMode>('client_canvas_polygon');

  const eligibleMaskShapes = useMemo(
    () =>
      maskShapes.filter(
        (shape) =>
          shape.visible &&
          ((shape.type === 'rect' || shape.type === 'ellipse')
            ? shape.points.length >= 2
            : shape.closed && shape.points.length >= 3)
      ),
    [maskShapes]
  );

  const selectedEligibleMaskShapes = useMemo(
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

  const loadImageElement = (src: string): Promise<HTMLImageElement> =>
    new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = (): void => resolve(img);
      img.onerror = (): void => reject(new Error('Failed to load working image for mask export.'));
      img.src = src;
    });

  const polygonsFromShapes = (shapes: typeof exportMaskShapes): Array<Array<{ x: number; y: number }>> =>
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

      void queryClient.invalidateQueries({ queryKey: studioKeys.slots(projectId) });

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
      { value: 'client_canvas_polygon', label: 'Mask: Client Canvas' },
      { value: 'server_polygon', label: 'Mask: Server Polygon' },
    ]),
    []
  );

  return (
    <div className='flex flex-wrap items-center gap-2'>
      <UnifiedSelect
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
      <UnifiedSelect
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
      <UnifiedButton
        onClick={handleRunGeneration}
        disabled={!workingSlot || !promptText.trim() || generationBusy}
        size='sm'
        className='flex-1'
      >
        {generationBusy ? (
          <Loader2 className='mr-2 size-4 animate-spin' />
        ) : (
          <Play className='mr-2 size-4' />
        )}
        {generationLabel}
      </UnifiedButton>
      <UnifiedButton
        type='button'
        variant='outline'
        size='sm'
        onClick={() => {
          void attachMaskVariantsFromSelection();
        }}
        disabled={!workingSlot || exportMaskCount === 0}
        title='Create and attach white/black masks and their inverted variants'
      >
        Attach Masks
      </UnifiedButton>
      <UnifiedSelect
        className='w-[185px]'
        value={maskAttachMode}
        onValueChange={(value: string) => {
          setMaskAttachMode(value as MaskAttachMode);
        }}
        options={maskAttachModeOptions}
        triggerClassName='h-8 text-xs'
        ariaLabel='Mask attach mode'
      />
      <UnifiedButton
        type='button'
        variant='outline'
        size='sm'
        onClick={() => {
          setMaskPreviewEnabled(true);
        }}
        disabled={!workingSlot || exportMaskCount === 0 || maskPreviewEnabled}
        title='Generate and enable mask preview'
      >
        Generate Mask
      </UnifiedButton>
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
      <UnifiedSelect
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
