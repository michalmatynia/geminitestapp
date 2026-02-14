'use client';

import React from 'react';

import { Input, Label,  SelectSimple, Checkbox } from '@/shared/ui';

import { usePromptEngine, type SeverityFilter } from '../context/PromptEngineContext';

export function PromptEngineFilters(): React.JSX.Element {
  const { query, setQuery, severity, setSeverity, includeDisabled, setIncludeDisabled } = usePromptEngine();

  return (
    <>
      <div className='flex flex-wrap items-end gap-4'>
        <div className='flex-1'>
          <Label className='text-xs text-gray-400 mb-1.5 block'>Search rules</Label>
          <Input
            value={query}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setQuery(e.target.value)}
            placeholder='Search ids, patterns, suggestions...'
          />
        </div>
        <div className='w-[160px]'>
          <Label className='text-xs text-gray-400 mb-1.5 block'>Severity</Label>
          <SelectSimple size='sm'
            value={severity}
            onValueChange={(value: string) => setSeverity(value as SeverityFilter)}
            options={[
              { value: 'all', label: 'All' },
              { value: 'error', label: 'Error' },
              { value: 'warning', label: 'Warning' },
              { value: 'info', label: 'Info' },
            ]}
            triggerClassName='h-9'
          />
        </div>
        <div>
          <label className='flex items-center gap-2 text-[11px] text-gray-400'>
            <Checkbox
              checked={includeDisabled}
              onCheckedChange={(checked: boolean) => setIncludeDisabled(checked)}
            />
            Include disabled
          </label>
        </div>
      </div>
    </>
  );
}
