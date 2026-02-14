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
        <div className='flex items-center gap-3'>
          <Button
            onClick={(): void => { void handleFetchFromBase(); }}
            disabled={isFetchPending}
            className='flex items-center gap-2 rounded-md border bg-gray-800 px-4 py-2 text-sm text-white hover:bg-gray-700 disabled:opacity-50'
          >
            {isFetchPending ? (
              <RefreshCw className='h-4 w-4 animate-spin' />
            ) : (
              <Download className='h-4 w-4' />
            )}
            {isFetchPending ? 'Fetching...' : 'Fetch Categories'}
          </Button>

          <Button
            onClick={(): void => { void handleSave(); }}
            disabled={isSavePending || pendingCount === 0}
            className='flex items-center gap-2 rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-500 disabled:opacity-50'
          >
            {isSavePending ? (
              <RefreshCw className='h-4 w-4 animate-spin' />
            ) : (
              <Save className='h-4 w-4' />
            )}
            {isSavePending ? 'Saving...' : `Save (${pendingCount})`}
          </Button>
        </div>
      }
    />
  );
}
