'use client';

import { Store } from 'lucide-react';
import Link from 'next/link';
import React, { useMemo } from 'react';

import {
  useCategoryMapperPageData,
  useCategoryMapperPageSelection,
} from '@/features/integrations/context/CategoryMapperPageContext';
import type {
  IntegrationWithConnections,
  IntegrationConnectionBasic,
} from '@/shared/contracts/integrations';
import type { PickerOption, PickerGroup } from '@/shared/contracts/ui';
import { Button, Skeleton } from '@/shared/ui/primitives.public';
import { EmptyState } from '@/shared/ui/navigation-and-layout.public';
import { GenericPickerDropdown } from '@/shared/ui/templates/pickers';

export function MarketplaceSelector(): React.JSX.Element {
  const { marketplaces, integrations, loading } = useCategoryMapperPageData();
  const {
    selectedMarketplace,
    selectedMarketplaceLabel,
    selectedConnectionId,
    setSelectedMarketplace,
    setSelectedConnectionId,
  } = useCategoryMapperPageSelection();

  const groups = useMemo<PickerGroup[]>(
    () =>
      integrations.map((integration: IntegrationWithConnections) => ({
        label: integration.name,
        icon: <Store className='h-3 w-3' />,
        options: integration.connections.map((connection: IntegrationConnectionBasic) => ({
          key: connection.id,
          label: connection.name,
          description: `From ${integration.name}`,
        })),
      })),
    [integrations]
  );

  if (loading) {
    return (
      <div className='space-y-4'>
        <h2 className='mb-4 text-sm font-semibold text-gray-300'>Marketplace</h2>
        <div className='space-y-2'>
          <Skeleton className='h-8 w-full' />
          <Skeleton className='h-8 w-full' />
          <Skeleton className='h-8 w-full' />
        </div>
      </div>
    );
  }

  if (integrations.length === 0) {
    return (
      <div className='space-y-4'>
        <div className='space-y-2'>
          <h2 className='text-sm font-semibold text-gray-300'>Marketplace</h2>
          <div className='grid gap-2'>
            {marketplaces.map((marketplace) => (
              <Button
                key={marketplace.value}
                type='button'
                variant={selectedMarketplace === marketplace.value ? 'solid' : 'outline'}
                className='justify-start'
                onClick={() => setSelectedMarketplace(marketplace.value)}
              >
                {marketplace.label}
              </Button>
            ))}
          </div>
        </div>
        <h2 className='mb-4 text-sm font-semibold text-gray-300'>Connections</h2>
        <EmptyState
          title={`No ${selectedMarketplaceLabel} connections found`}
          description={`Configure a ${selectedMarketplaceLabel} connection in Integrations first.`}
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
      <div className='space-y-2'>
        <h2 className='text-sm font-semibold text-gray-300'>Marketplace</h2>
        <div className='grid gap-2'>
          {marketplaces.map((marketplace) => (
            <Button
              key={marketplace.value}
              type='button'
              variant={selectedMarketplace === marketplace.value ? 'solid' : 'outline'}
              className='justify-start'
              onClick={() => setSelectedMarketplace(marketplace.value)}
            >
              {marketplace.label}
            </Button>
          ))}
        </div>
      </div>
      <h2 className='text-sm font-semibold text-gray-300'>Connections</h2>
      <GenericPickerDropdown
        groups={groups}
        selectedKey={selectedConnectionId ?? ''}
        onSelect={(opt: PickerOption) => setSelectedConnectionId(opt.key)}
        searchable
        searchPlaceholder='Search connections...'
      />
    </div>
  );
}
