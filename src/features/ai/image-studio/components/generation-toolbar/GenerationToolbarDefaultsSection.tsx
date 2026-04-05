import React from 'react';

import { InsetPanel } from '@/shared/ui/navigation-and-layout.public';
import { Input } from '@/shared/ui/primitives.public';
import { SelectSimple } from '@/shared/ui/forms-and-actions.public';

import { useGenerationToolbarDefaultsSectionRuntime } from './GenerationToolbarSectionContexts';

export function GenerationToolbarDefaultsSection(): React.JSX.Element {
  const { imageCount, imageCountOptions, model, onImageCountChange } =
    useGenerationToolbarDefaultsSectionRuntime();

  return (
    <InsetPanel radius='compact' padding='sm'>
      <div className='mb-2 text-[10px] uppercase tracking-wide text-gray-500'>
        Generation Defaults
      </div>
      <div className='grid gap-2 sm:grid-cols-[minmax(0,1fr)_70px]'>
        <Input
          size='sm'
          className='w-full min-w-0'
          value={model}
          readOnly
          disabled
          placeholder='Not configured in AI Brain'
          aria-label='Brain-managed generation model'
         title='Not configured in AI Brain'/>
        <SelectSimple
          size='sm'
          className='w-full'
          value={imageCount}
          onValueChange={onImageCountChange}
          options={imageCountOptions}
          triggerClassName='h-8 text-xs'
          ariaLabel='Generation image count'
         title='Select option'/>
      </div>
    </InsetPanel>
  );
}
