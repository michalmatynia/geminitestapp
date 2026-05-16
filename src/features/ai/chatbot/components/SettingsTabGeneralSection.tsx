'use client';

import * as React from 'react';

import type { LabeledOptionDto } from '@/shared/contracts/base';
import {
  SelectSimple,
  FormSection,
  FormField,
  ToggleRow,
} from '@/shared/ui/forms-and-actions.public';
import { UI_GRID_RELAXED_CLASSNAME } from '@/shared/ui/navigation-and-layout.public';

const SEARCH_PROVIDER_OPTIONS = [
  { value: 'serpapi', label: 'SerpApi' },
  { value: 'google', label: 'Google' },
  { value: 'bing', label: 'Bing' },
] as const satisfies ReadonlyArray<LabeledOptionDto<'serpapi' | 'google' | 'bing'>>;

interface GeneralSettingsSectionProps {
  model: string;
  searchProvider: string;
  setSearchProvider: (value: string) => void;
  webSearchEnabled: boolean;
  setWebSearchEnabled: (value: boolean) => void;
  useGlobalContext: boolean;
  setUseGlobalContext: (value: boolean) => void;
  useLocalContext: boolean;
  setUseLocalContext: (value: boolean) => void;
}

export function GeneralSettingsSection({
  model,
  searchProvider,
  setSearchProvider,
  webSearchEnabled,
  setWebSearchEnabled,
  useGlobalContext,
  setUseGlobalContext,
  useLocalContext,
  setUseLocalContext,
}: GeneralSettingsSectionProps): React.JSX.Element {
  return (
    <FormSection title='General Settings' variant='subtle' className='p-4'>
      <div className={`${UI_GRID_RELAXED_CLASSNAME} md:grid-cols-2 mt-4`}>
        <FormField label='AI Routing'>
          <div className='rounded-md border border-border/60 bg-card/30 px-3 py-2'>
            <div className='text-xs font-medium text-gray-200'>
              {model !== '' ? model : 'No Brain model configured'}
            </div>
            <div className='mt-1 text-[11px] text-gray-500'>
              Managed by Brain. Update `/admin/brain?tab=routing` to change Chatbot model routing.
            </div>
          </div>
        </FormField>
        <FormField label='Search Provider'>
          <SelectSimple
            size='sm'
            value={searchProvider}
            onValueChange={(value: string): void => setSearchProvider(value)}
            options={SEARCH_PROVIDER_OPTIONS}
            ariaLabel='Search Provider'
            title='Search Provider'
          />
        </FormField>
      </div>
      <div className='flex flex-wrap items-center gap-4 mt-4'>
        <ToggleRow
          label='Web Search'
          checked={webSearchEnabled}
          onCheckedChange={setWebSearchEnabled}
          className='border-none bg-transparent hover:bg-transparent p-0'
        />
        <ToggleRow
          label='Global Context'
          checked={useGlobalContext}
          onCheckedChange={setUseGlobalContext}
          className='border-none bg-transparent hover:bg-transparent p-0'
        />
        <ToggleRow
          label='Local Context'
          checked={useLocalContext}
          onCheckedChange={setUseLocalContext}
          className='border-none bg-transparent hover:bg-transparent p-0'
        />
      </div>
    </FormSection>
  );
}
