'use client';

import React from 'react';

import {
  Input,
  Label,
  SectionPanel,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/ui';

import { usePromptEngine, type SeverityFilter } from '../context/PromptEngineContext';

export function PromptEngineFilters(): React.JSX.Element {
  const { query, setQuery, severity, setSeverity, includeDisabled, setIncludeDisabled } = usePromptEngine();

  return (
    <SectionPanel>
      <div className='flex flex-wrap items-center gap-3'>
        <div className='flex-1'>
          <Label className='text-xs text-gray-400'>Search rules</Label>
          <Input
            value={query}
            onChange={(event: React.ChangeEvent<HTMLInputElement>) => setQuery(event.target.value)}
            placeholder='Search ids, patterns, suggestions...'
          />
        </div>
        <div className='w-[180px]'>
          <Label className='text-xs text-gray-400'>Severity</Label>
          <Select value={severity} onValueChange={(value: string) => setSeverity(value as SeverityFilter)}>
            <SelectTrigger className='h-9'>
              <SelectValue placeholder='All' />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value='all'>All</SelectItem>
              <SelectItem value='error'>Error</SelectItem>
              <SelectItem value='warning'>Warning</SelectItem>
              <SelectItem value='info'>Info</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className='flex items-end gap-2'>
          <label className='flex items-center gap-2 text-[11px] text-gray-400'>
            <input
              type='checkbox'
              className='h-3 w-3 rounded border-gray-500'
              checked={includeDisabled}
              onChange={(event: React.ChangeEvent<HTMLInputElement>) => setIncludeDisabled(event.target.checked)}
            />
            Include disabled
          </label>
        </div>
      </div>
    </SectionPanel>
  );
}
