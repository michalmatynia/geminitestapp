'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo } from 'react';

import { useCreateIntegration } from '@/features/integrations/hooks/useIntegrationMutations';
import { useIntegrations } from '@/features/integrations/hooks/useIntegrationQueries';
import type { Integration } from '@/features/integrations/types/integrations-ui';
import { logClientError } from '@/features/observability';
import { useToast, Button, SectionHeader, StatusBadge } from '@/shared/ui';

const AVAILABLE_INTEGRATIONS = [
  {
    name: 'Base.com',
    slug: 'baselinker',
    description: 'Integrate with Base.com for marketplace management and inventory sync.',
    type: 'platform',
    method: 'api',
  },
  {
    name: 'Allegro',
    slug: 'allegro',
    description: 'Direct integration with Allegro marketplace via OAuth2.',
    type: 'marketplace',
    method: 'api',
  },
  {
    name: 'Tradera',
    slug: 'tradera',
    description: 'Direct integration with Tradera marketplace.',
    type: 'marketplace',
    method: 'browser',
  },
  {
    name: 'Tradera API',
    slug: 'tradera-api',
    description: 'Direct integration with Tradera API (App ID/App Key/User Token).',
    type: 'marketplace',
    method: 'api',
  },
] as const;

export default function AddIntegrationPage(): React.JSX.Element {
  const router = useRouter();
  const integrationsQuery = useIntegrations();
  const createIntegrationMutation = useCreateIntegration();
  const { toast } = useToast();

  useEffect(() => {
    if (!integrationsQuery.isError) return;
    logClientError(integrationsQuery.error, { context: { source: 'AddIntegrationPage', action: 'loadIntegrations' } });
    const message =
      integrationsQuery.error instanceof Error
        ? integrationsQuery.error.message
        : 'Failed to load integrations.';
    toast(message, { variant: 'error' });
  }, [integrationsQuery.error, integrationsQuery.isError, toast]);

  const handleAdd = async (integration: (typeof AVAILABLE_INTEGRATIONS)[number]): Promise<void> => {
    try {
      await createIntegrationMutation.mutateAsync({
        name: integration.name,
        slug: integration.slug,
      });
      router.push('/admin/integrations');
    } catch (error: unknown) {
      logClientError(error, { context: { source: 'AddIntegrationPage', action: 'addIntegration', slug: integration.slug } });
      const message =
        error instanceof Error ? error.message : 'Failed to add integration.';
      toast(message, { variant: 'error' });
    }
  };

  const integrationCounts = useMemo((): Record<string, number> => {
    const data = integrationsQuery.data ?? [];
    return data.reduce<Record<string, number>>((acc: Record<string, number>, integration: Integration) => {
      acc[integration.slug] = (acc[integration.slug] || 0) + 1;
      return acc;
    }, {});
  }, [integrationsQuery.data]);

  return (
    <div className='container mx-auto max-w-5xl py-10'>
      <SectionHeader
        title='Add Integrations'
        description='Select a marketplace connection to add to your map.'
        eyebrow={(
          <Link href='/admin/integrations' className='text-blue-300 hover:text-blue-200'>
            ← Back to integrations
          </Link>
        )}
        className='mb-6'
      />

      <div className='grid gap-6 md:grid-cols-2'>
        {AVAILABLE_INTEGRATIONS.map((integration: (typeof AVAILABLE_INTEGRATIONS)[number]) => (
          <div
            key={integration.slug}
            className='rounded-xl border bg-card p-5'
          >
            <div className='flex items-start justify-between'>
              <div>
                <h2 className='text-xl font-semibold text-white'>
                  {integration.name}
                </h2>
                <p className='mt-2 text-sm text-gray-400'>
                  {integration.description}
                </p>
              </div>
              <div className='flex flex-col items-end gap-2'>
                <StatusBadge
                  status={integration.type === 'marketplace' ? 'Marketplace' : 'Platform'}
                  variant={integration.type === 'marketplace' ? 'success' : 'processing'}
                  size='sm'
                  className='font-semibold'
                />
                <StatusBadge
                  status={integration.method === 'api' ? 'API' : 'Browser'}
                  variant={integration.method === 'api' ? 'info' : 'warning'}
                  size='sm'
                  className='font-semibold'
                />
                <StatusBadge
                  status={`Added: ${integrationCounts[integration.slug] ?? 0}`}
                  variant='neutral'
                  size='sm'
                  className='font-semibold'
                />
              </div>
            </div>
            <div className='mt-6 flex justify-end'>
              <Button
                className='rounded-md bg-white px-4 py-2 text-sm font-semibold text-gray-900 hover:bg-gray-200'
                type='button'
                disabled={createIntegrationMutation.isPending}
                onClick={() => { void handleAdd(integration); }}
              >
                  Add
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
