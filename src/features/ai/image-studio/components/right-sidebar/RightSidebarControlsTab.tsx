'use client';

import { MousePointer2, Move } from 'lucide-react';
import React, { useCallback, useMemo } from 'react';

import { getImageStudioSlotImageSrc } from '@/features/ai/image-studio/utils/image-src';
import {
  DEFAULT_PRODUCT_IMAGES_EXTERNAL_BASE_URL,
  PRODUCT_IMAGES_EXTERNAL_BASE_URL_SETTING_KEY,
} from '@/shared/lib/products/constants';
import {
  type VectorDrawingContextValue,
  VectorDrawingProvider,
  type VectorToolMode,
  VectorDrawingToolbar,
} from '@/shared/lib/vector-drawing';
import { useSettingsStore } from '@/shared/providers/SettingsStoreProvider';
import { Button } from '@/shared/ui/primitives.public';
import { MultiSelect, SelectSimple } from '@/shared/ui/forms-and-actions.public';
import { cn } from '@/shared/utils/ui-utils';


import { useMaskingActions, useMaskingState } from '../../context/MaskingContext';
import { useProjectsState } from '../../context/ProjectsContext';
import { useSlotsActions, useSlotsState } from '../../context/SlotsContext';
import { useUiActions, useUiState } from '../../context/UiContext';
import { useAiPathsObjectAnalysis } from '../../hooks/useAiPathsObjectAnalysis';
import {
  AiPathAnalysisTriggerProvider,
  AiPathAnalysisTriggerSection,
} from '../analysis/sections/AiPathAnalysisTriggerSection';
import { GenerationToolbar } from '../GenerationToolbar';
import { LabeledSlider } from '../LabeledSlider';
import { useRightSidebarContext } from '../RightSidebarContext';
import { StudioCard } from '../StudioCard';

export const RightSidebarControlsTab = React.memo(
  (): React.JSX.Element => {
    const {
      imageTransformMode,
      canvasBackgroundColor,
      canvasBackgroundLayerEnabled,
      canvasSelectionEnabled,
    } = useUiState();

    const {
      setImageTransformMode,
      setCanvasBackgroundColor,
      setCanvasBackgroundLayerEnabled,
      setCanvasSelectionEnabled,
      resetCanvasImageOffset,
    } = useUiActions();

    const {
      tool,
      maskShapes,
      activeMaskId,
      selectedPointIndex,
      brushRadius,
      maskFeather,
      maskThresholdSensitivity,
      maskEdgeSensitivity,
    } = useMaskingState();

    const {
      setTool,
      setMaskShapes,
      setActiveMaskId,
      setSelectedPointIndex,
      setBrushRadius,
      setMaskFeather,
      setMaskThresholdSensitivity,
      setMaskEdgeSensitivity,
    } = useMaskingActions();

    const { workingSlot, selectedSlot, compositeAssetIds, compositeAssetOptions } = useSlotsState();

    const settingsStore = useSettingsStore();
    const { projectId, projectsQuery } = useProjectsState();
    const productImagesExternalBaseUrl =
      settingsStore.get(PRODUCT_IMAGES_EXTERNAL_BASE_URL_SETTING_KEY) ??
      DEFAULT_PRODUCT_IMAGES_EXTERNAL_BASE_URL;
    const workingSlotImageSrc = getImageStudioSlotImageSrc(
      workingSlot,
      productImagesExternalBaseUrl
    );
    const activeProjectId = projectId?.trim() ?? '';
    const activeProject = (projectsQuery.data ?? []).find((p) => p.id === projectId) ?? null;
    const projectCanvasWidth =
      typeof activeProject?.canvasWidthPx === 'number' &&
      Number.isFinite(activeProject.canvasWidthPx)
        ? Math.floor(activeProject.canvasWidthPx)
        : null;
    const projectCanvasHeight =
      typeof activeProject?.canvasHeightPx === 'number' &&
      Number.isFinite(activeProject.canvasHeightPx)
        ? Math.floor(activeProject.canvasHeightPx)
        : null;

    const aiPathsAnalysis = useAiPathsObjectAnalysis({
      projectId: activeProjectId,
      workingSlotId: workingSlot?.id ?? null,
      workingSlotImageSrc: workingSlotImageSrc ?? null,
      workingSlotImageWidth: workingSlot?.width ?? null,
      workingSlotImageHeight: workingSlot?.height ?? null,
      canvasWidth: projectCanvasWidth,
      canvasHeight: projectCanvasHeight,
    });

    const { setCompositeAssetIds } = useSlotsActions();

    const {
      canvasSizePresetOptions,
      canvasSizePresetValue,
      setCanvasSizePresetValue,
      canvasSizeLabel,
      canApplyCanvasSizePreset,
      canRecenterCanvasImage,
      onApplyCanvasSizePreset,
      onOpenResizeCanvasModal,
      quickActionsHostEl,
      quickActionsPanelContent,
      resizeCanvasDisabled,
    } = useRightSidebarContext();

    const workingSlotPresent = Boolean(workingSlot);
    const maskShapesLength = maskShapes.length;
    const isMoveImageActive = imageTransformMode === 'move';
    const isSelectToolActive = tool === 'select' && canvasSelectionEnabled;
    const activeShapeDrawingTool = tool === 'select' ? null : tool;
    const hasCanvasImage = Boolean(workingSlot || selectedSlot);

    const handleToggleSelectTool = useCallback((): void => {
      if (isSelectToolActive) {
        setCanvasSelectionEnabled(false);
        return;
      }
      setTool('select');
      setCanvasSelectionEnabled(true);
    }, [isSelectToolActive, setCanvasSelectionEnabled, setTool]);

    const handleSelectShapeTool = useCallback(
      (nextTool: VectorToolMode): void => {
        const isTogglingActiveShapeToolOff = nextTool !== 'select' && tool === nextTool;
        if (isTogglingActiveShapeToolOff) {
          setTool('select');
          if (canvasSelectionEnabled) {
            setCanvasSelectionEnabled(false);
          }
          return;
        }

        setTool(nextTool);
        if (nextTool === 'select') {
          setCanvasSelectionEnabled(true);
          return;
        }
        if (canvasSelectionEnabled) {
          setCanvasSelectionEnabled(false);
        }
      },
      [canvasSelectionEnabled, setCanvasSelectionEnabled, setTool, tool]
    );

    const handleClearAllShapes = useCallback((): void => {
      if (maskShapes.length === 0) return;
      setMaskShapes([]);
      setActiveMaskId(null);
      setSelectedPointIndex(null);
    }, [maskShapes.length, setActiveMaskId, setMaskShapes, setSelectedPointIndex]);

    const handleToggleMoveImage = useCallback((): void => {
      setImageTransformMode(isMoveImageActive ? 'none' : 'move');
    }, [isMoveImageActive, setImageTransformMode]);

    const vectorToolbarContextValue = useMemo<VectorDrawingContextValue>(
      () => ({
        shapes: maskShapes,
        tool,
        activeShapeId: activeMaskId,
        selectedPointIndex,
        brushRadius,
        imageSrc: workingSlotImageSrc ?? null,
        allowWithoutImage: true,
        showEmptyState: false,
        emptyStateLabel: '',
        setShapes: setMaskShapes,
        setTool: handleSelectShapeTool,
        setActiveShapeId: setActiveMaskId,
        setSelectedPointIndex,
        onClear: handleClearAllShapes,
        disableClear: maskShapesLength === 0,
      }),
      [
        maskShapes,
        tool,
        activeMaskId,
        selectedPointIndex,
        brushRadius,
        workingSlotImageSrc,
        setMaskShapes,
        handleSelectShapeTool,
        setActiveMaskId,
        setSelectedPointIndex,
        handleClearAllShapes,
        maskShapesLength,
      ]
    );

    return (
      <>
        {!quickActionsHostEl ? (
          <div className='space-y-2 px-4 py-2'>{quickActionsPanelContent}</div>
        ) : null}
        <div className='relative flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto px-4 pb-4 pt-0'>
          <div className='space-y-3 shrink-0'>
            <div className='rounded border border-border/60 bg-card/30 p-3'>
              <div className='mb-2 text-[10px] uppercase tracking-wide text-gray-500'>
                Shape Tools
              </div>
              <div className='mb-2 flex items-center gap-2'>
                <Button
                  size='xs'
                  type='button'
                  variant={isSelectToolActive ? 'default' : 'outline'}
                  onClick={handleToggleSelectTool}
                  aria-pressed={isSelectToolActive}
                  title={
                    isSelectToolActive
                      ? 'Disable selection mode (canvas drag pans view)'
                      : 'Enable selection mode for canvas elements'
                  }
                  aria-label='Toggle select tool mode'
                  className={cn(
                    isSelectToolActive
                      ? 'border-cyan-400/70 bg-cyan-500/20 text-cyan-100 hover:bg-cyan-500/30'
                      : undefined
                  )}
                >
                  <MousePointer2 className='mr-1.5 size-3.5' />
                  Select
                </Button>
                <span className='text-[11px] text-gray-500'>When off, drag to pan.</span>
              </div>
              <VectorDrawingProvider value={vectorToolbarContextValue}>
                <VectorDrawingToolbar
                  showSelectTool={false}
                  className='w-full flex-wrap justify-start rounded-xl border-border/60 bg-card/40'
                />
              </VectorDrawingProvider>
              {activeShapeDrawingTool ? (
                <div className='mt-3 rounded border border-border/60 bg-card/30 p-3'>
                  <div className='grid grid-cols-[auto_1fr] gap-x-2 gap-y-2'>
                    <LabeledSlider
                      label='Mask Feather'
                      value={maskFeather}
                      onChange={setMaskFeather}
                    />
                    {activeShapeDrawingTool === 'brush' ? (
                      <LabeledSlider
                        label='Brush Radius'
                        value={brushRadius}
                        onChange={setBrushRadius}
                        min={1}
                        max={64}
                        fallbackValue={8}
                      />
                    ) : null}
                  </div>
                </div>
              ) : (
                <div className='mt-2 text-[11px] text-gray-500'>
                  {isSelectToolActive
                    ? 'Select mode is active. Click shapes to edit points or drag empty area to pan.'
                    : 'Select mode is off. Drag canvas to pan, or choose a drawing tool.'}
                </div>
              )}
            </div>

            <div className='rounded border border-border/60 bg-card/30 p-3'>
              <div className='mb-2 text-[10px] uppercase tracking-wide text-gray-500'>
                Image Transform
              </div>
              <div className='flex flex-wrap items-center gap-2'>
                <Button
                  size='xs'
                  type='button'
                  variant={isMoveImageActive ? 'default' : 'outline'}
                  onClick={handleToggleMoveImage}
                  disabled={!hasCanvasImage}
                  aria-pressed={isMoveImageActive}
                  title={
                    isMoveImageActive
                      ? 'Disable image reposition mode'
                      : 'Enable image reposition mode in canvas'
                  }
                  aria-label='Toggle image move mode'
                  className={cn(
                    isMoveImageActive
                      ? 'border-cyan-400/70 bg-cyan-500/20 text-cyan-100 hover:bg-cyan-500/30'
                      : undefined
                  )}
                >
                  <Move className='mr-1.5 size-3.5' />
                  Move Image
                </Button>
                <Button
                  size='xs'
                  type='button'
                  variant='outline'
                  onClick={resetCanvasImageOffset}
                  disabled={!canRecenterCanvasImage}
                  title={
                    isMoveImageActive
                      ? 'Re-center image on canvas'
                      : 'Enable Move Image to re-center'
                  }
                  aria-label='Re-center image on canvas'
                >
                  Re-center
                </Button>
                <Button
                  size='xs'
                  type='button'
                  variant='outline'
                  onClick={onOpenResizeCanvasModal}
                  disabled={resizeCanvasDisabled}
                  title='Resize project canvas'
                  aria-label='Resize project canvas'
                >
                  Resize Canvas
                </Button>
              </div>
              <div className='mt-2 text-[11px] text-gray-500'>
                Use Move Image, then drag the canvas image to manually align it in frame.
              </div>
              <div className='mt-1 text-[11px] text-gray-500'>
                Current canvas: {canvasSizeLabel}
              </div>
              <div className='mt-2 grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2'>
                <SelectSimple
                  size='sm'
                  value={canvasSizePresetValue}
                  onValueChange={setCanvasSizePresetValue}
                  options={canvasSizePresetOptions}
                  triggerClassName='h-8 text-xs'
                  placeholder='Select canvas size'
                  disabled={resizeCanvasDisabled}
                  ariaLabel='Canvas size preset'
                 title='Select canvas size'/>
                <Button
                  size='xs'
                  type='button'
                  variant='outline'
                  onClick={onApplyCanvasSizePreset}
                  disabled={!canApplyCanvasSizePreset}
                  aria-label='Apply canvas size preset'
                >
                  Apply Size
                </Button>
              </div>
              <div className='mt-1 text-[11px] text-gray-500'>
                Choose a preset size and apply directly, or use Resize Canvas for custom dimensions
                and direction.
              </div>
            </div>

            <div className='rounded border border-border/60 bg-card/30 p-3'>
              <div className='mb-2 text-[10px] uppercase tracking-wide text-gray-500'>
                Canvas Background
              </div>
              <div className='flex flex-wrap items-center gap-2'>
                <Button
                  size='xs'
                  type='button'
                  variant={canvasBackgroundLayerEnabled ? 'default' : 'outline'}
                  onClick={() => setCanvasBackgroundLayerEnabled(!canvasBackgroundLayerEnabled)}
                  aria-pressed={canvasBackgroundLayerEnabled}
                  title={
                    canvasBackgroundLayerEnabled
                      ? 'Disable canvas background layer'
                      : 'Enable canvas background layer'
                  }
                  aria-label='Toggle canvas background layer'
                  className={cn(
                    canvasBackgroundLayerEnabled
                      ? 'border-cyan-400/70 bg-cyan-500/20 text-cyan-100 hover:bg-cyan-500/30'
                      : undefined
                  )}
                >
                  {canvasBackgroundLayerEnabled ? 'Background On' : 'Background Off'}
                </Button>
                <label className='flex items-center gap-2 text-[11px] text-gray-300'>
                  <span>Color</span>
                  <input
                    type='color'
                    value={canvasBackgroundColor}
                    onChange={(event) => setCanvasBackgroundColor(event.target.value)}
                    aria-label='Canvas background color'
                    className='h-7 w-10 cursor-pointer rounded border border-border/60 bg-transparent p-0'
                  />
                </label>
                <code className='rounded border border-border/60 bg-card/40 px-2 py-1 text-[10px] text-gray-300'>
                  {canvasBackgroundColor}
                </code>
              </div>
              <div className='mt-2 text-[11px] text-gray-500'>
                Background layer sits under the image and helps preview transparent edges.
              </div>
            </div>

            <div className='rounded border border-border/60 bg-card/30 p-3'>
              <div className='mb-2 text-[10px] uppercase tracking-wide text-gray-500'>
                Image Operations
              </div>
              <GenerationToolbar />
            </div>

            <div className='rounded border border-border/60 bg-card/30 p-3'>
              <div className='mb-2 text-[10px] uppercase tracking-wide text-gray-500'>
                AI Object Analysis
              </div>
              <AiPathAnalysisTriggerProvider value={aiPathsAnalysis}>
                <AiPathAnalysisTriggerSection variant='compact' />
              </AiPathAnalysisTriggerProvider>
            </div>

            <div className='rounded border border-border/60 bg-card/30 p-3'>
              <div className='mb-2 text-[10px] uppercase tracking-wide text-gray-500'>
                Masking Tools
              </div>
              <div className='grid grid-cols-[auto_1fr] gap-x-2 gap-y-2'>
                <LabeledSlider
                  label='Threshold Sensitivity'
                  value={maskThresholdSensitivity}
                  onChange={setMaskThresholdSensitivity}
                  fallbackValue={55}
                  disabled={!workingSlotPresent}
                />
                <LabeledSlider
                  label='Edge Sensitivity'
                  value={maskEdgeSensitivity}
                  onChange={setMaskEdgeSensitivity}
                  fallbackValue={55}
                  disabled={!workingSlotPresent}
                />
              </div>
            </div>
          </div>

          <StudioCard label='Composite References'>
            <MultiSelect
              options={compositeAssetOptions}
              selected={compositeAssetIds}
              onChange={setCompositeAssetIds}
              placeholder='Select additional reference cards'
              searchPlaceholder='Search cards...'
              emptyMessage='No cards available.'
              className='w-full'
            />
            <div className='text-[10px] text-gray-500'>
              Selected references are sent with the base image for multi-image generation.
            </div>
          </StudioCard>
        </div>
      </>
    );
  }
);
