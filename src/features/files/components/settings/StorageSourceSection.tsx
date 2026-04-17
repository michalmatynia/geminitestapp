'use client';

import React from 'react';
import { Card } from '@/shared/ui/primitives.public';
import { FormField, Hint, SelectSimple } from '@/shared/ui/forms-and-actions.public';
import type { FileStorageSource } from '@/shared/lib/files/constants';
import { FormSection } from '@/shared/ui/forms-and-actions.public';

const normalizeSource = (value: string | null | undefined): FileStorageSource =>
  value === 'fastcomet' ? 'fastcomet' : 'local';

const sourceOptions = [
  {
    value: 'local',
    label: 'Local folder',
    description: 'Store files in /public/uploads.',
  },
  {
    value: 'fastcomet',
    label: 'FastComet',
    description: 'Upload files to your FastComet server.',
  },
];

export const StorageSourceSection = ({
  source,
  setSource,
}: {
  source: FileStorageSource;
  setSource: (s: FileStorageSource) => void;
}): React.JSX.Element => (
  <FormSection
    title='Storage Source'
    description='Switch where new uploads are written and where file URLs point.'
    className='p-6'
  >
    <FormField label='Active provider'>
      <SelectSimple
        size='sm'
        value={source}
        onValueChange={(value: string): void => setSource(normalizeSource(value))}
        options={sourceOptions}
        placeholder='Select file source'
        ariaLabel='Select file source'
        title='Select file source'
      />
      <Hint className='mt-1'>
        Local keeps uploads in this app. FastComet writes new uploads to your external server.
      </Hint>
    </FormField>

    <Card variant='subtle-compact' padding='md' className='border-border bg-muted/20 space-y-1'>
      <div className='flex justify-between text-sm text-gray-300'>
        <span>Current mode</span>
        <span className='font-medium text-gray-100'>
          {source === 'local' ? 'Local folder' : 'FastComet'}
        </span>
      </div>
      <Hint variant='muted'>
        Existing file records are not auto-migrated. This setting affects new uploads.
      </Hint>
    </Card>
  </FormSection>
);
