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
              {integrationSlugs.includes('tradera') && (
                <div className='flex items-center gap-2 rounded-full border border-sky-400/50 bg-sky-500/10 px-3 py-1.5 text-xs text-sky-200'>
                  <StatusBadge status='Browser' variant='warning' size='sm' className='h-4 font-bold' />
                  Tradera
                  <Button
                    type='button'
                    onClick={() => {
                      if (traderaDefinition) {
                        void handleIntegrationClick(traderaDefinition);
                      }
                    }}
                    className='rounded-full border border-white/20 bg-white/10 p-1 text-white hover:bg-white/20'
                    aria-label='Manage Tradera settings'
                  >
                    <SettingsIcon className='size-3.5' />
                  </Button>
                </div>
              )}
              {integrationSlugs.includes('tradera-api') && (
                <div className='flex items-center gap-2 rounded-full border border-cyan-400/50 bg-cyan-500/10 px-3 py-1.5 text-xs text-cyan-200'>
                  <StatusBadge status='API' variant='info' size='sm' className='h-4 font-bold' />
                  Tradera API
                  <Button
                    type='button'
                    onClick={() => {
                      if (traderaApiDefinition) {
                        void handleIntegrationClick(traderaApiDefinition);
                      }
                    }}
                    className='rounded-full border border-white/20 bg-white/10 p-1 text-white hover:bg-white/20'
                    aria-label='Manage Tradera API settings'
                  >
                    <SettingsIcon className='size-3.5' />
                  </Button>
                </div>
              )}
              {integrationSlugs.includes('allegro') && (
                <div className='flex items-center gap-2 rounded-full border border-amber-400/50 bg-amber-500/10 px-3 py-1.5 text-xs text-amber-200'>
                  <StatusBadge status='API' variant='info' size='sm' className='h-4 font-bold' />
                  Allegro
                  <Button
                    type='button'
                    onClick={() => {
                      if (allegroDefinition) {
                        void handleIntegrationClick(allegroDefinition);
                      }
                    }}
                    className='rounded-full border border-white/20 bg-white/10 p-1 text-white hover:bg-white/20'
                    aria-label='Manage Allegro settings'
                  >
                    <SettingsIcon className='size-3.5' />
                  </Button>
                </div>
              )}
              {integrationSlugs.includes('baselinker') && (
                <div className='flex items-center gap-2 rounded-full border border-purple-400/50 bg-purple-500/10 px-3 py-1.5 text-xs text-purple-200'>
                  <StatusBadge status='Platform' variant='processing' size='sm' className='h-4 font-bold' />
                  Baselinker
                  <Button
                    type='button'
                    onClick={() => {
                      if (baselinkerDefinition) {
                        void handleIntegrationClick(baselinkerDefinition);
                      }
                    }}
                    className='rounded-full border border-white/20 bg-white/10 p-1 text-white hover:bg-white/20'
                    aria-label='Manage Baselinker settings'
                  >
                    <SettingsIcon className='size-3.5' />
                  </Button>
                </div>
              )}
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
