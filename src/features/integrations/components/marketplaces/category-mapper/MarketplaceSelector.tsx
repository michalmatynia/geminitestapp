'use client';

import { Store } from 'lucide-react';
import Link from 'next/link';

import { useCategoryMapperPageContext } from '@/features/integrations/context/CategoryMapperPageContext';
import type { IntegrationConnectionBasic, IntegrationWithConnections } from '@/features/integrations/types/listings';
import { Button, EmptyState, Skeleton } from '@/shared/ui';


export function MarketplaceSelector(): React.JSX.Element {
  const {
    integrations,
    loading,
    selectedConnectionId,
    setSelectedConnectionId,
  } = useCategoryMapperPageContext();

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

      {integrations.map((integration: IntegrationWithConnections) => (
        <div key={integration.id} className='space-y-1'>
          <div className='flex items-center gap-2 text-xs text-gray-400'>
            <Store className='h-3 w-3' />
            <span>{integration.name}</span>
          </div>

          <div className='ml-5 space-y-1'>
            {integration.connections.length === 0 ? (
              <p className='text-xs text-gray-600'>No connections</p>
            ) : (
              integration.connections.map((connection: IntegrationConnectionBasic) => (
                <Button
                  key={connection.id}
                  onClick={(): void => setSelectedConnectionId(connection.id)}
                  className={`w-full rounded px-3 py-2 text-left text-sm transition ${
                    selectedConnectionId === connection.id
                      ? 'bg-gray-800 text-white'
                      : 'text-gray-300 hover:bg-muted/50/60'
                  }`}
                >
                  {connection.name}
                </Button>
              ))
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
