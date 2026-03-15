import React from 'react';

import { Button, SelectSimple, Tooltip } from '@/shared/ui';

import { useGenerationToolbarContext, type CropMode } from './GenerationToolbarContext';
import { useGenerationToolbarCropSectionRuntime } from './GenerationToolbarSectionContexts';

export function GenerationToolbarCropSection(): React.JSX.Element {
  const { cropMode, setCropMode, cropBusy } = useGenerationToolbarContext();
  const {
    boundaryStatusLabel,
    cropBusyLabel,
    cropModeOptions,
    cropTooltipContent,
    cropTooltipsEnabled,
    hasCropBoundary,
    hasSourceImage,
    onCancelCrop,
    onCreateCropBox,
    onCrop,
    onSquareCrop,
    onViewCrop,
  } = useGenerationToolbarCropSectionRuntime();

  const maybeWrapTooltip = (content: string, child: React.JSX.Element): React.JSX.Element => {
    if (!cropTooltipsEnabled) return child;
    return (
      <Tooltip content={content} className='inline-flex'>
        {child}
      </Tooltip>
    );
  };

  return (
    <div className='rounded border border-border/60 bg-card/40 p-3'>
      <div className='mb-2 flex items-center justify-between gap-2'>
        <div className='text-[10px] uppercase tracking-wide text-gray-500'>Crop</div>
        <span className='text-[11px] text-gray-500'>{boundaryStatusLabel}</span>
      </div>
      <div className='grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center'>
        <SelectSimple
          size='sm'
          className='w-full'
          value={cropMode}
          onValueChange={(val) => setCropMode(val as CropMode)}
          options={cropModeOptions}
          triggerClassName='h-8 text-xs'
          ariaLabel='Crop mode'
         title='Select option'/>
        {maybeWrapTooltip(
          cropTooltipContent.cropBoxTool,
          <Button
            size='xs'
            type='button'
            variant='outline'
            onClick={onCreateCropBox}
            disabled={!hasSourceImage}
            title={cropTooltipsEnabled ? cropTooltipContent.cropBoxTool : undefined}
          >
            Create Rectangle
          </Button>
        )}
      </div>
      <div className='mt-2 flex flex-wrap items-center gap-2'>
        {maybeWrapTooltip(
          cropTooltipContent.crop,
          <Button
            size='xs'
            type='button'
            variant='outline'
            onClick={onCrop}
            disabled={!hasSourceImage || cropBusy || !hasCropBoundary}
            title={cropTooltipsEnabled ? cropTooltipContent.crop : undefined}
            loading={cropBusy}
          >
            {cropBusyLabel}
          </Button>
        )}
        {maybeWrapTooltip(
          cropTooltipContent.squareCrop,
          <Button
            size='xs'
            type='button'
            variant='outline'
            onClick={onSquareCrop}
            disabled={!hasSourceImage || cropBusy}
            title={cropTooltipsEnabled ? cropTooltipContent.squareCrop : undefined}
          >
            Square Crop
          </Button>
        )}
        {maybeWrapTooltip(
          cropTooltipContent.viewCrop,
          <Button
            size='xs'
            type='button'
            variant='outline'
            onClick={onViewCrop}
            disabled={!hasSourceImage || cropBusy}
            title={cropTooltipsEnabled ? cropTooltipContent.viewCrop : undefined}
          >
            View Crop
          </Button>
        )}
        {cropBusy
          ? maybeWrapTooltip(
            cropTooltipContent.cancelCrop,
            <Button
              size='xs'
              type='button'
              variant='outline'
              onClick={onCancelCrop}
              title={cropTooltipsEnabled ? cropTooltipContent.cancelCrop : undefined}
            >
                Cancel Crop
            </Button>
          )
          : null}
      </div>
    </div>
  );
}
