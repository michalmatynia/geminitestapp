'use client';

import { useQueryClient } from '@tanstack/react-query';
import { Camera, Loader2 } from 'lucide-react';
import React, { useCallback, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';

import { studioKeys } from '@/features/ai/image-studio/hooks/useImageStudioQueries';
import {
  DEFAULT_PRODUCT_IMAGES_EXTERNAL_BASE_URL,
  PRODUCT_IMAGES_EXTERNAL_BASE_URL_SETTING_KEY,
} from '@/features/products/constants';
import { VectorDrawingCanvas, VectorDrawingToolbar, VectorDrawingProvider } from '@/features/vector-drawing';
import { Viewer3D } from '@/features/viewer3d/components/Viewer3D';
import { api } from '@/shared/lib/api-client';
import { useSettingsStore } from '@/shared/providers/SettingsStoreProvider';
import { Button, SectionPanel, useToast } from '@/shared/ui';

import { GenerationToolbar } from './GenerationToolbar';
import { ShapeListPanel } from './ShapeListPanel';
import { ToggleButtonGroup } from './ToggleButtonGroup';
import { useMaskingActions, useMaskingState } from '../context/MaskingContext';
import { useProjectsState } from '../context/ProjectsContext';
import { useSlotsActions, useSlotsState } from '../context/SlotsContext';
import { getImageStudioSlotImageSrc } from '../utils/image-src';

interface CenterPreviewProps {
  isFocusMode: boolean;
  onToggleFocusMode: () => void;
  maskPreviewEnabled: boolean;
  onMaskPreviewChange: (enabled: boolean) => void;
}

const PREVIEW_MODE_OPTIONS = [
  { value: 'image', label: 'Image' },
  { value: '3d', label: '3D' },
] as const;

export function CenterPreview({
  isFocusMode,
  onToggleFocusMode,
  maskPreviewEnabled,
  onMaskPreviewChange,
}: CenterPreviewProps): React.JSX.Element {
  const { projectId } = useProjectsState();
  const { workingSlot, previewMode, captureRef } = useSlotsState();
  const { setPreviewMode } = useSlotsActions();
  const settingsStore = useSettingsStore();
  const { toast } = useToast();
  const queryClient = useQueryClient();

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

  return (
    <SectionPanel className='order-2 relative flex min-h-0 flex-1 flex-col overflow-hidden p-0' variant='subtle'>
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
            <Button
              variant='outline'
              size='sm'
              onClick={() => { void handleSaveScreenshot(); }}
              disabled={screenshotBusy}
              title='Capture current 3D frame and attach it to this slot'
            >
              {screenshotBusy ? <Loader2 className='mr-2 size-4 animate-spin' /> : <Camera className='mr-2 size-4' />}
              Save Shot
            </Button>
          ) : null}
        </div>
        <div className='flex justify-center'>
          {!isFocusMode ? (
            <Button
              variant='outline'
              size='sm'
              onClick={onToggleFocusMode}
              title='Show canvas only'
            >
              Show
            </Button>
          ) : null}
        </div>
        <div />
      </div>
      {isFocusMode && typeof document !== 'undefined'
        ? (() => {
          const headerTarget = document.getElementById('ai-paths-header-actions');
          if (!headerTarget) return null;
          return createPortal(
            <Button
              type='button'
              variant='outline'
              size='sm'
              onClick={onToggleFocusMode}
              title='Show side panels'
            >
              Edit
            </Button>,
            headerTarget
          );
        })()
        : null}
      <div className='flex min-h-0 flex-1 flex-col gap-3 px-4 pb-4 pt-0'>
        <div className='grid min-h-0 flex-1 grid-rows-[minmax(0,1fr)_120px] gap-3'>
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
              <VectorDrawingToolbar
                className='absolute bottom-4 left-1/2 z-20 -translate-x-1/2'
                onClear={() => { setMaskShapes([]); setActiveMaskId(null); }}
                disableClear={maskShapes.length === 0}
              />
            </VectorDrawingProvider>
          </div>
          <div className='grid min-h-[120px] grid-cols-[minmax(0,30%)_minmax(0,1fr)] gap-3'>
            <SectionPanel variant='subtle' className='min-h-[120px] overflow-hidden border-border/60 bg-card/40 p-2'>
              <div className='mb-1 flex items-center justify-between text-[11px] text-gray-400'>
                <span>Shape Layers</span>
                <span>{maskShapes.length}</span>
              </div>
              <div className='h-[84px] overflow-auto pr-1'>
                {maskShapes.length > 0 ? (
                  <ShapeListPanel />
                ) : (
                  <div className='px-2 py-2 text-xs text-gray-500'>No shapes drawn yet.</div>
                )}
              </div>
            </SectionPanel>
            <SectionPanel variant='subtle' className='min-h-[120px] overflow-hidden border-border/60 bg-card/40 p-2'>
              <div className='mb-1 flex items-center justify-between text-[11px] text-gray-400'>
                <span>Mask Generation</span>
              </div>
              <div className='h-[84px] overflow-auto pr-1'>
                <GenerationToolbar
                  maskPreviewEnabled={maskPreviewEnabled}
                  onMaskPreviewChange={onMaskPreviewChange}
                />
              </div>
            </SectionPanel>
          </div>
        </div>
      </div>
    </SectionPanel>
  );
}
