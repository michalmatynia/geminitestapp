import { MousePointer2, Move } from 'lucide-react';
import React from 'react';

import {
  type VectorToolMode,
  VectorDrawingToolbar,
} from '@/features/vector-drawing';
import { Button, MultiSelect } from '@/shared/ui';
import { cn } from '@/shared/utils';

import { GenerationToolbar } from '../GenerationToolbar';
import { LabeledSlider } from '../LabeledSlider';
import { StudioCard } from '../StudioCard';

type RightSidebarControlsTabProps = {
  activeShapeDrawingTool: VectorToolMode | null;
  brushRadius: number;
  canRecenterCanvasImage: boolean;
  compositeAssetIds: string[];
  compositeAssetOptions: Array<{ value: string; label: string }>;
  hasCanvasImage: boolean;
  isMoveImageActive: boolean;
  isSelectToolActive: boolean;
  maskEdgeSensitivity: number;
  maskFeather: number;
  maskShapesLength: number;
  maskThresholdSensitivity: number;
  onBrushRadiusChange: (value: number) => void;
  onClearAllShapes: () => void;
  onCompositeAssetIdsChange: (value: string[]) => void;
  onMaskEdgeSensitivityChange: (value: number) => void;
  onMaskFeatherChange: (value: number) => void;
  onMaskThresholdSensitivityChange: (value: number) => void;
  onRecenterCanvasImage: () => void;
  onSelectShapeTool: (nextTool: VectorToolMode) => void;
  onToggleMoveImage: () => void;
  onToggleSelectTool: () => void;
  quickActionsHostEl: HTMLElement | null;
  quickActionsPanelContent: React.ReactNode;
  tool: VectorToolMode;
  workingSlotPresent: boolean;
};

export function RightSidebarControlsTab({
  activeShapeDrawingTool,
  brushRadius,
  canRecenterCanvasImage,
  compositeAssetIds,
  compositeAssetOptions,
  hasCanvasImage,
  isMoveImageActive,
  isSelectToolActive,
  maskEdgeSensitivity,
  maskFeather,
  maskShapesLength,
  maskThresholdSensitivity,
  onBrushRadiusChange,
  onClearAllShapes,
  onCompositeAssetIdsChange,
  onMaskEdgeSensitivityChange,
  onMaskFeatherChange,
  onMaskThresholdSensitivityChange,
  onRecenterCanvasImage,
  onSelectShapeTool,
  onToggleMoveImage,
  onToggleSelectTool,
  quickActionsHostEl,
  quickActionsPanelContent,
  tool,
  workingSlotPresent,
}: RightSidebarControlsTabProps): React.JSX.Element {
  return (
    <>
      {!quickActionsHostEl ? (
        <div className='space-y-2 px-4 py-2'>
          {quickActionsPanelContent}
        </div>
      ) : null}
      <div className='relative flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto px-4 pb-4 pt-0'>
        <div className='space-y-3 shrink-0'>
          <div className='rounded border border-border/60 bg-card/30 p-3'>
            <div className='mb-2 text-[10px] uppercase tracking-wide text-gray-500'>Shape Tools</div>
            <div className='mb-2 flex items-center gap-2'>
              <Button
                size='xs'
                type='button'
                variant={isSelectToolActive ? 'default' : 'outline'}
                onClick={onToggleSelectTool}
                aria-pressed={isSelectToolActive}
                title={isSelectToolActive
                  ? 'Disable selection mode (canvas drag pans view)'
                  : 'Enable selection mode for canvas elements'}
                aria-label='Toggle select tool mode'
                className={cn(
                  isSelectToolActive
                    ? 'border-cyan-400/70 bg-cyan-500/20 text-cyan-100 hover:bg-cyan-500/30'
                    : undefined,
                )}
              >
                <MousePointer2 className='mr-1.5 size-3.5' />
                Select
              </Button>
              <span className='text-[11px] text-gray-500'>When off, drag to pan.</span>
            </div>
            <VectorDrawingToolbar
              tool={tool}
              onSelectTool={onSelectShapeTool}
              showSelectTool={false}
              onClear={onClearAllShapes}
              disableClear={maskShapesLength === 0}
              className='w-full flex-wrap justify-start rounded-xl border-border/60 bg-card/40'
            />
            {activeShapeDrawingTool ? (
              <div className='mt-3 rounded border border-border/60 bg-card/30 p-3'>
                <div className='grid grid-cols-[auto_1fr] gap-x-2 gap-y-2'>
                  <LabeledSlider
                    label='Mask Feather'
                    value={maskFeather}
                    onChange={onMaskFeatherChange}
                  />
                  {activeShapeDrawingTool === 'brush' ? (
                    <LabeledSlider
                      label='Brush Radius'
                      value={brushRadius}
                      onChange={onBrushRadiusChange}
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
            <div className='mb-2 text-[10px] uppercase tracking-wide text-gray-500'>Image Transform</div>
            <div className='flex flex-wrap items-center gap-2'>
              <Button
                size='xs'
                type='button'
                variant={isMoveImageActive ? 'default' : 'outline'}
                onClick={onToggleMoveImage}
                disabled={!hasCanvasImage}
                aria-pressed={isMoveImageActive}
                title={isMoveImageActive ? 'Disable image reposition mode' : 'Enable image reposition mode in canvas'}
                aria-label='Toggle image move mode'
                className={cn(
                  isMoveImageActive
                    ? 'border-cyan-400/70 bg-cyan-500/20 text-cyan-100 hover:bg-cyan-500/30'
                    : undefined,
                )}
              >
                <Move className='mr-1.5 size-3.5' />
                Move Image
              </Button>
              <Button
                size='xs'
                type='button'
                variant='outline'
                onClick={onRecenterCanvasImage}
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
            </div>
            <div className='mt-2 text-[11px] text-gray-500'>
              Use Move Image, then drag the canvas image to manually align it in frame.
            </div>
          </div>

          <div className='rounded border border-border/60 bg-card/30 p-3'>
            <div className='mb-2 text-[10px] uppercase tracking-wide text-gray-500'>
              Image Operations
            </div>
            <GenerationToolbar />
          </div>

          <div className='rounded border border-border/60 bg-card/30 p-3'>
            <div className='mb-2 text-[10px] uppercase tracking-wide text-gray-500'>Masking Tools</div>
            <div className='grid grid-cols-[auto_1fr] gap-x-2 gap-y-2'>
              <LabeledSlider
                label='Threshold Sensitivity'
                value={maskThresholdSensitivity}
                onChange={onMaskThresholdSensitivityChange}
                fallbackValue={55}
                disabled={!workingSlotPresent}
              />
              <LabeledSlider
                label='Edge Sensitivity'
                value={maskEdgeSensitivity}
                onChange={onMaskEdgeSensitivityChange}
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
            onChange={onCompositeAssetIdsChange}
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
