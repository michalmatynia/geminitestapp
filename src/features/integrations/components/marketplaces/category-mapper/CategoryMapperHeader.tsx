'use client';

import { Download, RefreshCw, Save } from 'lucide-react';
import React from 'react';

import { useCategoryMapper } from '@/features/integrations/context/CategoryMapperContext';
import { Button, SectionHeader } from '@/shared/ui';

export function CategoryMapperHeader(): React.JSX.Element {
  const context = useCategoryMapper() as {
    connectionName: string;
    handleFetchFromBase: () => Promise<void>;
    handleSave: () => Promise<void>;
    fetchMutation: { isPending: boolean };
    saveMutation: { isPending: boolean };
    pendingMappings: { size: number };
  };

  const {
    connectionName,
    handleFetchFromBase,
    handleSave,
    fetchMutation,
    saveMutation,
    pendingMappings,
  } = context;

  const isFetchPending = fetchMutation.isPending;
  const isSavePending = saveMutation.isPending;
  const pendingCount = pendingMappings.size;

  return (
    <SectionHeader
      title='Marketplace Categories'
      description={`Connection: ${connectionName}`}
      actions={
        <div className='flex items-center gap-2'>
          <Button
            variant='outline'
            size='xs'
            className='h-8'
            onClick={(): void => { void handleFetchFromBase(); }}
            disabled={isFetchPending}
          >
            {isFetchPending ? <RefreshCw className='mr-2 h-3.5 w-3.5 animate-spin' /> : <Download className='mr-2 h-3.5 w-3.5' />}
            {isFetchPending ? 'Fetching...' : 'Fetch Categories'}
          </Button>

          <Button
            size='xs'
            className='h-8'
            onClick={(): void => { void handleSave(); }}
            disabled={isSavePending || pendingCount === 0}
          >
            {isSavePending ? <RefreshCw className='mr-2 h-3.5 w-3.5 animate-spin' /> : <Save className='mr-2 h-3.5 w-3.5' />}
            {isSavePending ? 'Saving...' : `Save (${pendingCount})`}
          </Button>
        </div>
      }
    />
  );
}
