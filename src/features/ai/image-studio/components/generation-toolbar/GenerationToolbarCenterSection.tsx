import React from 'react';

import { Button, SelectSimple } from '@/shared/ui';

type SelectOption = {
  value: string;
  label: string;
};

type GenerationToolbarCenterSectionProps = {
  centerBusy: boolean;
  centerBusyLabel: string;
  centerGuidesEnabled: boolean;
  centerLayoutEnabled: boolean;
  centerLayoutPadding: string;
  centerLayoutPaddingX: string;
  centerLayoutPaddingY: string;
  centerLayoutSplitAxes: boolean;
  centerMode: string;
  centerModeOptions: SelectOption[];
  hasSourceImage: boolean;
  onCancelCenter: () => void;
  onCenterLayoutPaddingChange: (value: string) => void;
  onCenterLayoutPaddingXChange: (value: string) => void;
  onCenterLayoutPaddingYChange: (value: string) => void;
  onCenterObject: () => void;
  onCenterModeChange: (value: string) => void;
  onToggleCenterLayoutSplitAxes: () => void;
  onToggleCenterGuides: () => void;
};

export function GenerationToolbarCenterSection({
  centerBusy,
  centerBusyLabel,
  centerGuidesEnabled,
  centerLayoutEnabled,
  centerLayoutPadding,
  centerLayoutPaddingX,
  centerLayoutPaddingY,
  centerLayoutSplitAxes,
  centerMode,
  centerModeOptions,
  hasSourceImage,
  onCancelCenter,
  onCenterLayoutPaddingChange,
  onCenterLayoutPaddingXChange,
  onCenterLayoutPaddingYChange,
  onCenterObject,
  onCenterModeChange,
  onToggleCenterLayoutSplitAxes,
  onToggleCenterGuides,
}: GenerationToolbarCenterSectionProps): React.JSX.Element {
  return (
    <div className='rounded border border-border/60 bg-card/40 p-3'>
      <div className='mb-2 text-[10px] uppercase tracking-wide text-gray-500'>Center</div>
      <div className='grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center'>
        <SelectSimple size='sm'
          className='w-full'
          value={centerMode}
          onValueChange={onCenterModeChange}
          options={centerModeOptions}
          triggerClassName='h-8 text-xs'
          ariaLabel='Center object mode'
        />
        <Button size='xs'
          type='button'
          variant='outline'
          onClick={onToggleCenterGuides}
          title='Toggle center guides overlay'
        >
          {centerGuidesEnabled ? 'Hide Guides' : 'Show Guides'}
        </Button>
      </div>
      {centerLayoutEnabled ? (
        <div className='mt-2 space-y-2'>
          <div className='grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center'>
            <div className='grid grid-cols-[minmax(0,1fr)_72px] items-center gap-2'>
              <input
                type='range'
                min={0}
                max={40}
                step={0.5}
                value={centerLayoutPadding}
                onChange={(event: React.ChangeEvent<HTMLInputElement>) => {
                  onCenterLayoutPaddingChange(event.target.value);
                }}
                className='w-full accent-gray-300'
                aria-label='Object layout padding percent slider'
              />
              <input
                type='number'
                min={0}
                max={40}
                step={0.5}
                value={centerLayoutPadding}
                onChange={(event: React.ChangeEvent<HTMLInputElement>) => {
                  onCenterLayoutPaddingChange(event.target.value);
                }}
                className='h-8 w-full rounded border border-border/60 bg-card/40 px-2 text-xs text-gray-100 outline-none'
                placeholder='Padding %'
                aria-label='Object layout padding percent'
                title='Padding around detected object after centering/scaling'
              />
            </div>
            <Button
              size='xs'
              type='button'
              variant='outline'
              onClick={onToggleCenterLayoutSplitAxes}
              title='Toggle separate horizontal and vertical padding'
            >
              {centerLayoutSplitAxes ? 'Linked X/Y' : 'Split X/Y'}
            </Button>
          </div>
          {centerLayoutSplitAxes ? (
            <div className='grid gap-1 sm:grid-cols-2'>
              <div className='grid grid-cols-[72px_auto] items-center gap-2'>
                <input
                  type='number'
                  min={0}
                  max={40}
                  step={0.5}
                  value={centerLayoutPaddingX}
                  onChange={(event: React.ChangeEvent<HTMLInputElement>) => {
                    onCenterLayoutPaddingXChange(event.target.value);
                  }}
                  className='h-8 w-full rounded border border-border/60 bg-card/40 px-2 text-xs text-gray-100 outline-none'
                  placeholder='X %'
                  aria-label='Object layout horizontal padding percent'
                  title='Horizontal padding around detected object'
                />
                <div className='text-[11px] text-gray-400'>Padding X %</div>
              </div>
              <div className='grid grid-cols-[72px_auto] items-center gap-2'>
                <input
                  type='number'
                  min={0}
                  max={40}
                  step={0.5}
                  value={centerLayoutPaddingY}
                  onChange={(event: React.ChangeEvent<HTMLInputElement>) => {
                    onCenterLayoutPaddingYChange(event.target.value);
                  }}
                  className='h-8 w-full rounded border border-border/60 bg-card/40 px-2 text-xs text-gray-100 outline-none'
                  placeholder='Y %'
                  aria-label='Object layout vertical padding percent'
                  title='Vertical padding around detected object'
                />
                <div className='text-[11px] text-gray-400'>Padding Y %</div>
              </div>
            </div>
          ) : null}
        </div>
      ) : null}
      <div className='mt-2 flex flex-wrap items-center gap-2'>
        <Button size='xs'
          type='button'
          variant='outline'
          onClick={onCenterObject}
          disabled={!hasSourceImage || centerBusy}
          title='Create a centered linked variant from the active slot'
          loading={centerBusy}
        >
          {centerBusyLabel}
        </Button>
        {centerBusy ? (
          <Button
            size='xs'
            type='button'
            variant='outline'
            onClick={onCancelCenter}
            title='Cancel centering request'
          >
            Cancel Center
          </Button>
        ) : null}
      </div>
    </div>
  );
}
