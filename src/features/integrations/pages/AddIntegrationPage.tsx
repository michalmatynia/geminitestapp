'use client';

import { useRouter } from 'nextjs-toploader/app';
import { useEffect, useMemo, startTransition } from 'react';

import { useCreateIntegration } from '@/features/integrations/hooks/useIntegrationMutations';
import { useIntegrations } from '@/features/integrations/hooks/useIntegrationQueries';
import type { Integration } from '@/shared/contracts/integrations/base';
import { AdminIntegrationsPageLayout } from '@/shared/ui/admin.public';
import { Button, useToast } from '@/shared/ui/primitives.public';
import { StatusBadge } from '@/shared/ui/data-display.public';
import { SimpleSettingsList } from '@/shared/ui/templates.public';
import { logClientCatch, logClientError } from '@/shared/utils/observability/client-error-logger';

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
    name: 'LinkedIn',
    slug: 'linkedin',
    description: 'Connect a LinkedIn personal profile for social updates.',
    type: 'platform',
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
    name: 'Vinted.pl',
    slug: 'vinted',
    description:
      'Browser-based Vinted.pl integration with reusable Playwright session storage.',
    type: 'marketplace',
    method: 'browser',
  },
  {
    name: '1688',
    slug: '1688',
    description:
      'Browser-based 1688 supplier scanning integration with reusable Playwright session storage.',
    type: 'marketplace',
    method: 'browser',
  },
] as const;

export default function AddIntegrationPage(): React.JSX.Element {
  const router = useRouter();
  const integrationsQuery = useIntegrations();
  const createIntegrationMutation = useCreateIntegration();
  const { toast } = useToast();

  useEffect(() => {
    router.prefetch('/admin/integrations');
  }, [router]);

  useEffect(() => {
    if (!integrationsQuery.isError) return;
    logClientError(integrationsQuery.error, {
      context: { source: 'AddIntegrationPage', action: 'loadIntegrations' },
    });
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
      startTransition(() => { router.push('/admin/integrations'); });
    } catch (error: unknown) {
      logClientCatch(error, {
        source: 'AddIntegrationPage',
        action: 'addIntegration',
        slug: integration.slug,
      });
      const message = error instanceof Error ? error.message : 'Failed to add integration.';
      toast(message, { variant: 'error' });
    }
  };

  const integrationCounts = useMemo((): Record<string, number> => {
    const data = integrationsQuery.data ?? [];
    return data.reduce<Record<string, number>>(
      (acc: Record<string, number>, integration: Integration) => {
        acc[integration.slug] = (acc[integration.slug] || 0) + 1;
        return acc;
      },
      {}
    );
  }, [integrationsQuery.data]);

  return (
    <AdminIntegrationsPageLayout
      title='Add Integrations'
      current='Add'
      description='Select a marketplace connection to add to your map.'
    >
      <SimpleSettingsList
        items={AVAILABLE_INTEGRATIONS.map((integration) => ({
          id: integration.slug,
          title: integration.name,
          description: integration.description,
          original: integration,
        }))}
        isLoading={integrationsQuery.isLoading}
        columns={2}
        renderActions={(item) => (
          <Button
            size='sm'
            disabled={createIntegrationMutation.isPending}
            onClick={() => {
              void handleAdd(item.original);
            }}
          >
            Add
          </Button>
        )}
        renderCustomContent={(item) => (
          <div className='flex items-center gap-2 mt-2'>
            <StatusBadge
              status={item.original.type === 'marketplace' ? 'Marketplace' : 'Platform'}
              variant={item.original.type === 'marketplace' ? 'success' : 'processing'}
              size='sm'
              className='font-semibold'
            />
            <StatusBadge
              status={item.original.method === 'api' ? 'API' : 'Browser'}
              variant={item.original.method === 'api' ? 'info' : 'warning'}
              size='sm'
              className='font-semibold'
            />
            <StatusBadge
              status={`Added: ${integrationCounts[item.original.slug] ?? 0}`}
              variant='neutral'
              size='sm'
              className='font-semibold'
            />
          </div>
        )}
      />
    </AdminIntegrationsPageLayout>
  );
}
