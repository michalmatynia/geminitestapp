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
  centerMode: string;
  centerModeOptions: SelectOption[];
  hasSourceImage: boolean;
  onCancelCenter: () => void;
  onCenterObject: () => void;
  onCenterModeChange: (value: string) => void;
  onToggleCenterGuides: () => void;
};

export function GenerationToolbarCenterSection({
  centerBusy,
  centerBusyLabel,
  centerGuidesEnabled,
  centerMode,
  centerModeOptions,
  hasSourceImage,
  onCancelCenter,
  onCenterObject,
  onCenterModeChange,
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
