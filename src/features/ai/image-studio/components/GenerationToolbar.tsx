'use client';

import { useQueryClient } from '@tanstack/react-query';
import { Loader2, Play } from 'lucide-react';
import React, { useMemo } from 'react';

import { studioKeys } from '@/features/ai/image-studio/hooks/useImageStudioQueries';
import {
  DEFAULT_PRODUCT_IMAGES_EXTERNAL_BASE_URL,
  PRODUCT_IMAGES_EXTERNAL_BASE_URL_SETTING_KEY,
} from '@/features/products/constants';
import { api } from '@/shared/lib/api-client';
import { useSettingsStore } from '@/shared/providers/SettingsStoreProvider';
import {
  Button,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Switch,
  UnifiedSelect,
  vectorShapeToPathWithBounds,
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
    maskFeather,
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

  const buildMaskSvg = (
    shapes: typeof exportMaskShapes,
    width: number,
    height: number,
    foreground: 'white' | 'black',
    inverted: boolean
  ): string => {
    const pathData = shapes
      .map((shape) => vectorShapeToPathWithBounds(shape, width, height))
      .filter((value): value is string => Boolean(value))
      .join(' ');

    const preferWhite = foreground === 'white';
    const isInverted = inverted;
    const background = (preferWhite && !isInverted) || (!preferWhite && isInverted) ? '#000000' : '#ffffff';
    const fill = background === '#000000' ? '#ffffff' : '#000000';
    const featherStdDev = maskFeather > 0 ? Number(((maskFeather / 100) * 8).toFixed(2)) : 0;
    const filterBlock = featherStdDev > 0
      ? `<defs><filter id="mask-feather" x="-10%" y="-10%" width="120%" height="120%"><feGaussianBlur stdDeviation="${featherStdDev}" /></filter></defs>`
      : '';
    const filterAttr = featherStdDev > 0 ? ' filter="url(#mask-feather)"' : '';

    return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" preserveAspectRatio="none">
${filterBlock}
<rect x="0" y="0" width="${width}" height="${height}" fill="${background}" />
<path d="${pathData}" fill="${fill}" fill-rule="nonzero"${filterAttr} />
</svg>`;
  };

  const renderMaskDataUrl = async (svgContent: string, width: number, height: number): Promise<string> => {
    const svgBlob = new Blob([svgContent], { type: 'image/svg+xml;charset=utf-8' });
    const svgUrl = URL.createObjectURL(svgBlob);

    try {
      const image = await loadImageElement(svgUrl);
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const context2d = canvas.getContext('2d');
      if (!context2d) {
        throw new Error('Canvas context is unavailable.');
      }
      context2d.clearRect(0, 0, width, height);
      context2d.drawImage(image, 0, 0, width, height);
      return canvas.toDataURL('image/png');
    } finally {
      URL.revokeObjectURL(svgUrl);
    }
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

      const payloadMasks = await Promise.all(
        variants.map(async ({ variant, inverted }) => {
          const svgContent = buildMaskSvg(shapes, width, height, variant, inverted);
          const dataUrl = await renderMaskDataUrl(svgContent, width, height);
          return { variant, inverted, dataUrl };
        })
      );

      const response = await api.post<{
        masks?: Array<{
          slot?: { id: string; name: string | null };
          relationType?: string;
        }>;
      }>(`/api/image-studio/slots/${encodeURIComponent(workingSlot.id)}/masks`, {
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

  return (
    <div className='flex flex-wrap items-center gap-2'>
      <UnifiedSelect
        className='w-auto'
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
        triggerClassName='h-8 w-[280px] sm:w-[320px] text-xs'
        ariaLabel='Generation model'
      />
      <Select
        value={String(studioSettings.targetAi.openai.image.n ?? 1)}
        onValueChange={(v: string) => {
          setStudioSettings((prev) => ({
            ...prev,
            targetAi: {
              ...prev.targetAi,
              openai: {
                ...prev.targetAi.openai,
                image: { ...prev.targetAi.openai.image, n: Number(v) },
              },
            },
          }));
        }}
      >
        <SelectTrigger className='h-8 w-[60px] text-xs'>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value='1'>1</SelectItem>
          <SelectItem value='2'>2</SelectItem>
          <SelectItem value='4'>4</SelectItem>
        </SelectContent>
      </Select>
      <Button
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
      </Button>
      <Button
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
      </Button>
      <Button
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
      <Select
        value={maskGenMode}
        onValueChange={(v: string) => {
          const mode = v as 'ai-polygon' | 'ai-bbox' | 'threshold' | 'edges';
          setMaskGenMode(mode);
          handleAiMaskGeneration(mode);
        }}
      >
        <SelectTrigger className='h-8 w-[130px] text-xs' disabled={maskGenLoading || !workingSlot}>
          <SelectValue placeholder={maskGenLoading ? 'Detecting...' : 'Smart Mask'} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value='ai-polygon'>AI Polygon</SelectItem>
          <SelectItem value='ai-bbox'>AI Bounding Box</SelectItem>
          <SelectItem value='threshold'>Threshold</SelectItem>
          <SelectItem value='edges'>Edge Detection</SelectItem>
        </SelectContent>
      </Select>
      {maskGenLoading && <Loader2 className='size-4 animate-spin text-muted-foreground' />}
      <span className='text-[11px] text-gray-400 whitespace-nowrap'>
        {exportMaskCount > 0
          ? `${exportMaskCount} mask shape${exportMaskCount > 1 ? 's' : ''}`
          : 'No mask'}
      </span>
    </div>
  );
}
