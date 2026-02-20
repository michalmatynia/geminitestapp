import React from 'react';

import { Button, SelectSimple, Tooltip } from '@/shared/ui';

type SelectOption = {
  value: string;
  label: string;
};

type CropTooltipContent = {
  cancelCrop: string;
  crop: string;
  cropBoxTool: string;
  squareCrop: string;
  viewCrop: string;
};

type GenerationToolbarCropSectionProps = {
  boundaryStatusLabel: string;
  cropBusy: boolean;
  cropBusyLabel: string;
  cropMode: string;
  cropModeOptions: SelectOption[];
  cropTooltipContent: CropTooltipContent;
  cropTooltipsEnabled: boolean;
  hasCropBoundary: boolean;
  hasSourceImage: boolean;
  onCancelCrop: () => void;
  onCreateCropBox: () => void;
  onCrop: () => void;
  onCropModeChange: (value: string) => void;
  onSquareCrop: () => void;
  onViewCrop: () => void;
};

export function GenerationToolbarCropSection({
  boundaryStatusLabel,
  cropBusy,
  cropBusyLabel,
  cropMode,
  cropModeOptions,
  cropTooltipContent,
  cropTooltipsEnabled,
  hasCropBoundary,
  hasSourceImage,
  onCancelCrop,
  onCreateCropBox,
  onCrop,
  onCropModeChange,
  onSquareCrop,
  onViewCrop,
}: GenerationToolbarCropSectionProps): React.JSX.Element {
  const maybeWrapTooltip = (content: string, child: React.JSX.Element): React.JSX.Element => {
    if (!cropTooltipsEnabled) return child;
    return (
      <Tooltip content={content}>
        <span className='inline-flex'>{child}</span>
      </Tooltip>
    );
  };

  return (
    <div className='rounded border border-border/60 bg-card/40 p-3'>
      <div className='mb-2 flex items-center justify-between gap-2'>
        <div className='text-[10px] uppercase tracking-wide text-gray-500'>Crop</div>
        <span className='text-[11px] text-gray-500'>
          {boundaryStatusLabel}
        </span>
      </div>
      <div className='grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center'>
        <SelectSimple size='sm'
          className='w-full'
          value={cropMode}
          onValueChange={onCropModeChange}
          options={cropModeOptions}
          triggerClassName='h-8 text-xs'
          ariaLabel='Crop mode'
        />
        {maybeWrapTooltip(
          cropTooltipContent.cropBoxTool,
          <Button size='xs'
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
          <Button size='xs'
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
          <Button size='xs'
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
          <Button size='xs'
            type='button'
            variant='outline'
            onClick={onViewCrop}
            disabled={!hasSourceImage || cropBusy}
            title={cropTooltipsEnabled ? cropTooltipContent.viewCrop : undefined}
          >
            View Crop
          </Button>
        )}
        {cropBusy ? (
          maybeWrapTooltip(
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
        ) : null}
      </div>
    </div>
  );
}
