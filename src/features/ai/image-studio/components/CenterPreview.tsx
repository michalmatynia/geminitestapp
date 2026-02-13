'use client';

import { useQueryClient } from '@tanstack/react-query';
import { Camera, Eye, EyeOff, Loader2 } from 'lucide-react';
import React, { useCallback, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';

import { studioKeys } from '@/features/ai/image-studio/hooks/useImageStudioQueries';
import {
  DEFAULT_PRODUCT_IMAGES_EXTERNAL_BASE_URL,
  PRODUCT_IMAGES_EXTERNAL_BASE_URL_SETTING_KEY,
} from '@/features/products/constants';
import { VectorDrawingCanvas, VectorDrawingProvider } from '@/features/vector-drawing';
import { Viewer3D } from '@/features/viewer3d/components/Viewer3D';
import { api } from '@/shared/lib/api-client';
import { useSettingsStore } from '@/shared/providers/SettingsStoreProvider';
import { UnifiedButton, SectionPanel, useToast } from '@/shared/ui';

import { ToggleButtonGroup } from './ToggleButtonGroup';
import { useGenerationState } from '../context/GenerationContext';
import { useMaskingActions, useMaskingState } from '../context/MaskingContext';
import { useProjectsState } from '../context/ProjectsContext';
import { useSlotsActions, useSlotsState } from '../context/SlotsContext';
import { useUiActions, useUiState } from '../context/UiContext';
import { getImageStudioSlotImageSrc } from '../utils/image-src';

const PREVIEW_MODE_OPTIONS = [
  { value: 'image', label: 'Image' },
  { value: '3d', label: '3D' },
] as const;

export function CenterPreview(): React.JSX.Element {
  const { isFocusMode, maskPreviewEnabled } = useUiState();
  const { toggleFocusMode } = useUiActions();
  const { projectId } = useProjectsState();
  const { workingSlot, previewMode, captureRef } = useSlotsState();
  const { setPreviewMode } = useSlotsActions();
  const settingsStore = useSettingsStore();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { landingSlots, isRunInFlight, activeRunError } = useGenerationState();

  const {
    tool,
    maskShapes,
    activeMaskId,
    selectedPointIndex,
    brushRadius,
    maskInvert,
    maskFeather,
  } = useMaskingState();

  const {
    setTool,
    setMaskShapes,
    setActiveMaskId,
    setSelectedPointIndex,
  } = useMaskingActions();

  const [screenshotBusy, setScreenshotBusy] = useState(false);

  const productImagesExternalBaseUrl =
    settingsStore.get(PRODUCT_IMAGES_EXTERNAL_BASE_URL_SETTING_KEY) ??
    DEFAULT_PRODUCT_IMAGES_EXTERNAL_BASE_URL;

  const workingSlotImageSrc = useMemo(() => {
    return getImageStudioSlotImageSrc(workingSlot, productImagesExternalBaseUrl);
  }, [workingSlot, productImagesExternalBaseUrl]);

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

  const liveMaskShapes = useMemo(() => {
    if (!maskPreviewEnabled) return [];
    return exportMaskShapes;
  }, [maskPreviewEnabled, exportMaskShapes]);

  const vectorContextValue = useMemo(() => ({
    shapes: maskShapes,
    tool,
    activeShapeId: activeMaskId,
    selectedPointIndex,
    brushRadius,
    imageSrc: workingSlotImageSrc,
    allowWithoutImage: true,
    showEmptyState: false,
    emptyStateLabel: '',
    setShapes: setMaskShapes,
    setTool,
    setActiveShapeId: setActiveMaskId,
    setSelectedPointIndex,
    onClear: (): void => {
      setMaskShapes([]);
      setActiveMaskId(null);
    },
    disableClear: maskShapes.length === 0,
  }), [
    maskShapes,
    tool,
    activeMaskId,
    selectedPointIndex,
    brushRadius,
    workingSlotImageSrc,
    setMaskShapes,
    setTool,
    setActiveMaskId,
    setSelectedPointIndex,
    maskShapes.length,
  ]);

  const handleSaveScreenshot = useCallback(async (): Promise<void> => {
    if (!workingSlot?.id) {
      toast('Select a slot before saving screenshot.', { variant: 'info' });
      return;
    }
    if (!captureRef.current) {
      toast('Screenshot capture is not available in current preview mode.', { variant: 'info' });
      return;
    }

    const dataUrl = captureRef.current();
    if (!dataUrl) {
      toast('Could not capture screenshot from preview.', { variant: 'error' });
      return;
    }

    setScreenshotBusy(true);
    try {
      const baseName = (workingSlot.name || workingSlot.id || 'slot').replace(/[^a-zA-Z0-9_-]/g, '_');
      await api.post(`/api/image-studio/slots/${encodeURIComponent(workingSlot.id)}/screenshot`, {
        dataUrl,
        filename: `${baseName}-${Date.now()}.png`,
      });
      void queryClient.invalidateQueries({ queryKey: studioKeys.slots(projectId) });
      toast('Screenshot saved and attached to slot.', { variant: 'success' });
    } catch (error) {
      toast(error instanceof Error ? error.message : 'Failed to save screenshot.', { variant: 'error' });
    } finally {
      setScreenshotBusy(false);
    }
  }, [captureRef, projectId, queryClient, toast, workingSlot]);

  const focusToggleButton = typeof document !== 'undefined'
    ? createPortal(
      <UnifiedButton
        type='button'
        variant='outline'
        size='sm'
        onClick={toggleFocusMode}
        title={isFocusMode ? 'Show side panels' : 'Show canvas only'}
        aria-label={isFocusMode ? 'Show side panels' : 'Show canvas only'}
        className='fixed left-1/2 top-0 z-40 h-8 w-10 -translate-x-1/2 rounded-b-lg rounded-t-none border-t-0 bg-background/90 px-0 shadow-md backdrop-blur-sm animate-in fade-in slide-in-from-top-2'
      >
        {isFocusMode ? <EyeOff className='size-4' /> : <Eye className='size-4' />}
      </UnifiedButton>,
      document.body
    )
    : null;

  return (
    <SectionPanel className='order-2 relative flex h-full min-h-0 flex-1 flex-col overflow-hidden p-0' variant='subtle'>
      <div className='grid grid-cols-[1fr_auto_1fr] items-center gap-2 px-4 py-2'>
        <div className='flex items-center gap-2'>
          {workingSlot?.asset3dId ? (
            <ToggleButtonGroup
              value={previewMode}
              onChange={setPreviewMode}
              options={PREVIEW_MODE_OPTIONS}
              className='text-[11px] text-gray-300'
            />
          ) : null}
          {previewMode === '3d' && workingSlot ? (
            <UnifiedButton
              variant='outline'
              size='sm'
              onClick={() => { void handleSaveScreenshot(); }}
              disabled={screenshotBusy}
              title='Capture current 3D frame and attach it to this slot'
            >
              {screenshotBusy ? <Loader2 className='mr-2 size-4 animate-spin' /> : <Camera className='mr-2 size-4' />}
              Save Shot
            </UnifiedButton>
          ) : null}
        </div>
        <div />
        <div />
      </div>
      {focusToggleButton}
      <div className='flex min-h-0 flex-1 flex-col gap-3 px-4 pb-3 pt-0'>
        <div className='grid min-h-0 flex-1 grid-rows-[minmax(0,1fr)_clamp(220px,32vh,300px)] gap-3'>
          <div className='relative min-h-0'>
            <VectorDrawingProvider value={vectorContextValue}>
              {previewMode === '3d' && workingSlot?.asset3dId ? (
                <Viewer3D
                  modelUrl={`/api/assets3d/${workingSlot.asset3dId}/file`}
                  allowUserControls
                  captureRef={captureRef}
                  className='h-full w-full'
                />
              ) : (
                <VectorDrawingCanvas
                  key={workingSlot?.id ?? 'canvas-empty'}
                  maskPreviewEnabled={maskPreviewEnabled}
                  maskPreviewShapes={liveMaskShapes}
                  maskPreviewInvert={maskInvert}
                  maskPreviewOpacity={0.5}
                  maskPreviewFeather={maskFeather}
                />
              )}
            </VectorDrawingProvider>
          </div>
          <SectionPanel variant='subtle' className='min-h-0 overflow-hidden border-border/60 bg-card/40 p-2'>
            <div className='mb-1 flex items-center justify-between text-[11px] text-gray-400'>
              <span>Generation Landing Slots</span>
              <span>{landingSlots.length}</span>
            </div>
            <div className='h-full overflow-auto pr-1'>
              {landingSlots.length > 0 ? (
                <div className='grid grid-cols-2 gap-2 sm:grid-cols-4'>
                  {landingSlots.map((slot) => (
                    <div
                      key={slot.id}
                      className={`relative overflow-hidden rounded border p-1 ${
                        slot.status === 'completed'
                          ? 'border-emerald-400/40 bg-emerald-500/5'
                          : slot.status === 'failed'
                            ? 'border-red-400/40 bg-red-500/5'
                            : 'border-border/60 bg-card/30'
                      }`}
                    >
                      <div className='mb-1 text-[10px] text-gray-400'>Slot {slot.index}</div>
                      {slot.output ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={slot.output.filepath}
                          alt={slot.output.filename || `Generated ${slot.index}`}
                          className='aspect-square w-full rounded object-cover'
                        />
                      ) : (
                        <div className='flex aspect-square w-full items-center justify-center rounded border border-dashed border-border/70 text-[10px] text-gray-500'>
                          {slot.status === 'pending' ? (
                            <span className='inline-flex items-center gap-1'>
                              {isRunInFlight ? <Loader2 className='size-3 animate-spin' /> : null}
                              Waiting
                            </span>
                          ) : (
                            <span>Failed</span>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className='px-2 py-3 text-xs text-gray-500'>
                  Start generation to prepare output slots under the canvas.
                </div>
              )}
              {activeRunError ? (
                <div className='mt-2 text-[11px] text-red-300'>{activeRunError}</div>
              ) : null}
            </div>
          </SectionPanel>
        </div>
      </div>
    </SectionPanel>
  );
}
