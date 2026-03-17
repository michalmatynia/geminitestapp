'use client';

import { PlusIcon, SettingsIcon } from 'lucide-react';
import Link from 'next/link';

import { useIntegrationList } from '@/features/integrations/hooks/useIntegrationList';
import { Button, ListPanel, StatusBadge, Badge, Card } from '@/shared/ui';

export function IntegrationList(): React.JSX.Element {
  const {
    handleIntegrationClick,
    integrationSlugs,
    hasIntegrations,
    traderaDefinition,
    traderaApiDefinition,
    allegroDefinition,
    baselinkerDefinition,
    linkedinDefinition,
  } = useIntegrationList();

  return (
    <ListPanel
      title='Integrations'
      description='Visualize and manage marketplace and platform connections.'
      headerActions={
        <Button asChild className='gap-2'>
          <Link href='/admin/integrations/add'>
            <PlusIcon className='size-4' />
            Add Integration
          </Link>
        </Button>
      }
    >
      <Card variant='glass' padding='lg' className='relative overflow-hidden'>
        <div className='absolute -left-20 -top-20 size-64 rounded-full bg-emerald-500/10 blur-3xl' />
        <div className='absolute -bottom-24 right-10 size-72 rounded-full bg-sky-500/10 blur-3xl' />
        <div className='absolute -right-16 top-20 size-48 rounded-full bg-purple-500/10 blur-3xl' />

        <div className='relative mx-auto flex min-h-[420px] max-w-5xl items-center justify-center'>
          <div className='relative z-10 flex flex-col items-center gap-6'>
            <Card
              variant='subtle'
              padding='lg'
              className='border-emerald-400/40 bg-emerald-500/10 text-center shadow-lg rounded-2xl'
            >
              <p className='text-xs uppercase tracking-[0.3em] text-emerald-200'>Core</p>
              <p className='mt-2 text-xl font-semibold text-white'>Stardb Hub</p>
            </Card>
            <div className='flex flex-wrap items-center justify-center gap-3'>
              {[
                {
                  slug: 'tradera',
                  label: 'Tradera',
                  type: 'Browser',
                  variant: 'warning' as const,
                  color: 'info' as const,
                  definition: traderaDefinition,
                },
                {
                  slug: 'tradera-api',
                  label: 'Tradera API',
                  type: 'API',
                  variant: 'info' as const,
                  color: 'info' as const,
                  definition: traderaApiDefinition,
                },
                {
                  slug: 'allegro',
                  label: 'Allegro',
                  type: 'API',
                  variant: 'info' as const,
                  color: 'warning' as const,
                  definition: allegroDefinition,
                },
                {
                  slug: 'baselinker',
                  label: 'Baselinker',
                  type: 'Platform',
                  variant: 'processing' as const,
                  color: 'active' as const,
                  definition: baselinkerDefinition,
                },
                {
                  slug: 'linkedin',
                  label: 'LinkedIn',
                  type: 'Social',
                  variant: 'info' as const,
                  color: 'info' as const,
                  definition: linkedinDefinition,
                },
              ].map((item) => {
                if (!integrationSlugs.includes(item.slug)) return null;

                return (
                  <Badge
                    key={item.slug}
                    variant={item.color}
                    className='flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-normal'
                  >
                    <StatusBadge
                      status={item.type}
                      variant={item.variant}
                      size='sm'
                      className='h-4 font-bold'
                    />
                    <span className='font-medium'>{item.label}</span>
                    <Button
                      type='button'
                      onClick={() => {
                        if (item.definition) {
                          void handleIntegrationClick(item.definition);
                        }
                      }}
                      className='h-6 w-6 rounded-full border border-white/20 bg-white/10 p-0 text-white hover:bg-white/20'
                      aria-label={`Manage ${item.label} settings`}
                      title={`Manage ${item.label} settings`}>
                      <SettingsIcon className='size-3' />
                    </Button>
                  </Badge>
                );
              })}
              {!hasIntegrations && (
                <div className='text-xs text-gray-500'>No integrations added yet.</div>
              )}
            </div>
          </div>
        </div>

        <div className='mt-6 grid gap-3 text-xs text-gray-500 md:grid-cols-3'>
          <Card variant='subtle-compact' padding='sm' className='text-xs text-muted-foreground'>
            Connect marketplaces and automate listings.
          </Card>
          <Card variant='subtle-compact' padding='sm' className='text-xs text-muted-foreground'>
            Monitor sync status and data flow.
          </Card>
          <Card variant='subtle-compact' padding='sm' className='text-xs text-muted-foreground'>
            Add new nodes to expand your stack.
          </Card>
        </div>
      </Card>
    </ListPanel>
  );
}
