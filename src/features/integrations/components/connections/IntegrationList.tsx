'use client';

import { PlusIcon, SettingsIcon } from 'lucide-react';
import Link from 'next/link';

import { useIntegrationList } from '@/features/integrations/hooks/useIntegrationList';
import { Button, ListPanel, StatusBadge } from '@/shared/ui';


export function IntegrationList(): React.JSX.Element {
  const {
    handleIntegrationClick,
    integrationSlugs,
    hasIntegrations,
    traderaDefinition,
    traderaApiDefinition,
    allegroDefinition,
    baselinkerDefinition,
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
      <div className='relative overflow-hidden rounded-xl border border-border/60 bg-card/40 p-6'>
        <div className='absolute -left-20 -top-20 size-64 rounded-full bg-emerald-500/10 blur-3xl' />
        <div className='absolute -bottom-24 right-10 size-72 rounded-full bg-sky-500/10 blur-3xl' />
        <div className='absolute -right-16 top-20 size-48 rounded-full bg-purple-500/10 blur-3xl' />

        <div className='relative mx-auto flex min-h-[420px] max-w-5xl items-center justify-center'>
          <div className='relative z-10 flex flex-col items-center gap-6'>
            <div className='rounded-2xl border border-emerald-400/40 bg-emerald-500/10 px-6 py-5 text-center text-white shadow-lg'>
              <p className='text-xs uppercase tracking-[0.3em] text-emerald-200'>
                Core
              </p>
              <p className='mt-2 text-xl font-semibold'>Stardb Hub</p>
            </div>
            <div className='flex flex-wrap items-center justify-center gap-3'>
              {[
                { 
                  slug: 'tradera', 
                  label: 'Tradera', 
                  type: 'Browser', 
                  variant: 'warning' as const, 
                  color: 'sky',
                  definition: traderaDefinition 
                },
                { 
                  slug: 'tradera-api', 
                  label: 'Tradera API', 
                  type: 'API', 
                  variant: 'info' as const, 
                  color: 'cyan',
                  definition: traderaApiDefinition 
                },
                { 
                  slug: 'allegro', 
                  label: 'Allegro', 
                  type: 'API', 
                  variant: 'info' as const, 
                  color: 'amber',
                  definition: allegroDefinition 
                },
                { 
                  slug: 'baselinker', 
                  label: 'Baselinker', 
                  type: 'Platform', 
                  variant: 'processing' as const, 
                  color: 'purple',
                  definition: baselinkerDefinition 
                }
              ].map((item) => {
                if (!integrationSlugs.includes(item.slug)) return null;
                const borderClass = {
                  sky: 'border-sky-400/50 bg-sky-500/10 text-sky-200',
                  cyan: 'border-cyan-400/50 bg-cyan-500/10 text-cyan-200',
                  amber: 'border-amber-400/50 bg-amber-500/10 text-amber-200',
                  purple: 'border-purple-400/50 bg-purple-500/10 text-purple-200',
                }[item.color];

                return (
                  <div key={item.slug} className={`flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs ${borderClass}`}>
                    <StatusBadge status={item.type} variant={item.variant} size='sm' className='h-4 font-bold' />
                    {item.label}
                    <Button
                      type='button'
                      onClick={() => {
                        if (item.definition) {
                          void handleIntegrationClick(item.definition);
                        }
                      }}
                      className='rounded-full border border-white/20 bg-white/10 p-1 text-white hover:bg-white/20'
                      aria-label={`Manage ${item.label} settings`}
                    >
                      <SettingsIcon className='size-3.5' />
                    </Button>
                  </div>
                );
              })}
              {!hasIntegrations && (
                <div className='text-xs text-gray-500'>
                  No integrations added yet.
                </div>
              )}
            </div>
          </div>
        </div>

        <div className='mt-6 grid gap-3 text-xs text-gray-500 md:grid-cols-3'>
          <div className='rounded-md border border-border/40 bg-card/30 p-3 text-xs text-muted-foreground'>
            Connect marketplaces and automate listings.
          </div>
          <div className='rounded-md border border-border/40 bg-card/30 p-3 text-xs text-muted-foreground'>
            Monitor sync status and data flow.
          </div>
          <div className='rounded-md border border-border/40 bg-card/30 p-3 text-xs text-muted-foreground'>
            Add new nodes to expand your stack.
          </div>
        </div>
      </div>
    </ListPanel>
  );
}
