'use client';

import { Download, RefreshCw, Save } from 'lucide-react';
import React from 'react';

import { useCategoryMapper } from '@/features/integrations/context/CategoryMapperContext';
import { Button, SectionHeader } from '@/shared/ui';

export function CategoryMapperHeader(): React.JSX.Element {
  const {
    connectionName,
    handleFetchFromBase,
    handleSave,
    fetchMutation,
    saveMutation,
    pendingMappings,
  } = useCategoryMapper();

  return (
    <SectionHeader
      title='Base.com Categories'
      description={`Connection: ${connectionName}`}
      actions={
        <div className='flex items-center gap-3'>
          <Button
            onClick={(): void => { void handleFetchFromBase(); }}
            disabled={fetchMutation.isPending}
            className='flex items-center gap-2 rounded-md border bg-gray-800 px-4 py-2 text-sm text-white hover:bg-gray-700 disabled:opacity-50'
          >
            {fetchMutation.isPending ? (
              <RefreshCw className='h-4 w-4 animate-spin' />
            ) : (
              <Download className='h-4 w-4' />
            )}
            {fetchMutation.isPending ? 'Fetching...' : 'Fetch Categories'}
          </Button>

          <Button
            onClick={(): void => { void handleSave(); }}
            disabled={saveMutation.isPending || pendingMappings.size === 0}
            className='flex items-center gap-2 rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-500 disabled:opacity-50'
          >
            {saveMutation.isPending ? (
              <RefreshCw className='h-4 w-4 animate-spin' />
            ) : (
              <Save className='h-4 w-4' />
            )}
            {saveMutation.isPending ? 'Saving...' : `Save (${pendingMappings.size})`}
          </Button>
        </div>
      }
    />
  );
}
