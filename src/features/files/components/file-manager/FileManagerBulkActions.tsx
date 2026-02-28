'use client';

import React from 'react';

import { Input, SelectSimple, Button } from '@/shared/ui';

import { useFileManager } from '../../contexts/FileManagerContext';

export function FileManagerBulkActions(): React.JSX.Element {
  const {
    mode,
    selectionMode,
    showBulkActions,
    bulkTagInput,
    setBulkTagInput,
    bulkTagMode,
    setBulkTagMode,
    handleApplyTags,
    isPending,
  } = useFileManager();

  if (!(mode === 'select' && selectionMode === 'multiple' && showBulkActions)) {
    return <></>;
  }

  return (
    <div className='mb-4 flex flex-wrap items-center gap-2'>
      <Input
        type='text'
        placeholder='Tags to apply (comma-separated)'
        value={bulkTagInput}
        onChange={(e: React.ChangeEvent<HTMLInputElement>): void => setBulkTagInput(e.target.value)}
        className='w-full md:w-72 p-2 bg-gray-800 rounded'
      />
      <SelectSimple
        size='sm'
        value={bulkTagMode}
        onValueChange={(value: string): void => setBulkTagMode(value as 'add' | 'replace')}
        options={[
          { value: 'add', label: 'Add' },
          { value: 'replace', label: 'Replace' },
        ]}
        className='w-full md:w-32'
        triggerClassName='text-sm'
      />
      <Button
        size='sm'
        onClick={(): void => {
          void handleApplyTags();
        }}
        disabled={isPending}
      >
        {isPending ? 'Saving...' : 'Apply tags'}
      </Button>
    </div>
  );
}
