import React from 'react';

import { SelectSimple } from '@/shared/ui';

type SelectOption = {
  value: string;
  label: string;
};

type GenerationToolbarDefaultsSectionProps = {
  imageCount: string;
  imageCountOptions: SelectOption[];
  model: string;
  modelOptions: SelectOption[];
  onImageCountChange: (value: string) => void;
  onModelChange: (value: string) => void;
};

export function GenerationToolbarDefaultsSection({
  imageCount,
  imageCountOptions,
  model,
  modelOptions,
  onImageCountChange,
  onModelChange,
}: GenerationToolbarDefaultsSectionProps): React.JSX.Element {
  return (
    <div className='rounded border border-border/60 bg-card/40 p-3'>
      <div className='mb-2 text-[10px] uppercase tracking-wide text-gray-500'>
        Generation Defaults
      </div>
      <div className='grid gap-2 sm:grid-cols-[minmax(0,1fr)_70px]'>
        <SelectSimple size='sm'
          className='w-full min-w-0'
          value={model}
          onValueChange={onModelChange}
          options={modelOptions}
          placeholder='Model'
          triggerClassName='h-8 w-full text-xs'
          ariaLabel='Generation model'
        />
        <SelectSimple size='sm'
          className='w-full'
          value={imageCount}
          onValueChange={onImageCountChange}
          options={imageCountOptions}
          triggerClassName='h-8 text-xs'
          ariaLabel='Generation image count'
        />
      </div>
    </div>
  );
}
