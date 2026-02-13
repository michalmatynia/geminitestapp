'use client';

import React, { useMemo } from 'react';
import { Store } from 'lucide-react';
import Link from 'next/link';
import { GenericPickerDropdown } from '@/shared/ui/templates/pickers';
import type { PickerOption, PickerGroup } from '@/shared/ui/templates/pickers/types';
import { useCategoryMapperPageContext } from '@/features/integrations/context/CategoryMapperPageContext';
import type { IntegrationWithConnections } from '@/features/integrations/types/listings';
import { EmptyState, Skeleton } from '@/shared/ui';

export function MarketplaceSelector(): React.JSX.Element {
  const { integrations, loading, selectedConnectionId, setSelectedConnectionId } = useCategoryMapperPageContext();

  const groups = useMemo<PickerGroup[]>(
    () =>
      integrations.map((integration: IntegrationWithConnections) => ({
        label: integration.name,
        icon: <Store className='h-3 w-3' />,
        options: integration.connections.map((connection) => ({
          value: connection.id,
          label: connection.name,
          description: `From ${integration.name}`,
        })),
      })),
    [integrations]
  );

  if (loading) {
    return (
      <div className='space-y-4'>
        <h2 className='mb-4 text-sm font-semibold text-gray-300'>Connections</h2>
        <div className='space-y-2'>
          <Skeleton className='h-8 w-full' />
          <Skeleton className='h-8 w-full' />
        </div>
      </div>
    );
  }

  if (integrations.length === 0) {
    return (
      <div className='space-y-4'>
        <h2 className='mb-4 text-sm font-semibold text-gray-300'>Connections</h2>
        <EmptyState
          title='No connections found'
          description='Configure a Base.com connection in Integrations first.'
          className='p-6'
          action={
            <Link href='/admin/integrations' className='text-blue-400 hover:underline text-sm'>
              Go to Integrations
            </Link>
          }
        />
      </div>
    );
  }

  return (
    <div className='space-y-4'>
      <h2 className='text-sm font-semibold text-gray-300'>Connections</h2>
      <GenericPickerDropdown
        groups={groups}
        selectedValue={selectedConnectionId ?? ''}
        onSelect={(opt: PickerOption) => setSelectedConnectionId(opt.value)}
        searchable
        searchPlaceholder='Search connections...'
      />
    </div>
  );
}
