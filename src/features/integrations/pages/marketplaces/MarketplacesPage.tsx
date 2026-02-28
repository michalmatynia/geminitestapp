'use client';

import Link from 'next/link';
import React, { useState } from 'react';

import { Button, SectionHeader, useToast, Card } from '@/shared/ui';
import { ConfirmModal } from '@/shared/ui/templates/modals/ConfirmModal';

import { useSyncAllBaseImagesMutation } from '@/shared/lib/integrations/hooks/useIntegrationMutations';

const marketplaces = [
  {
    name: 'Allegro',
    description: 'Manage Allegro listings, connections, mappings, and templates.',
    href: '/admin/integrations/marketplaces/allegro',
  },
  {
    name: 'Category Mapper',
    description:
      'Map external marketplace categories to your internal product categories for import/export.',
    href: '/admin/integrations/aggregators/base-com/category-mapping',
  },
];

export default function MarketplacesPage(): React.JSX.Element {
  const { toast } = useToast();
  const [showSyncConfirm, setShowSyncConfirm] = useState(false);

  const syncMutation = useSyncAllBaseImagesMutation();

  const handleSyncBaseImages = async (): Promise<void> => {
    try {
      await syncMutation.mutateAsync();
      toast('Base.com image sync queued.', { variant: 'success' });
    } catch (error) {
      toast(error instanceof Error ? error.message : 'Failed to enqueue Base.com image sync', {
        variant: 'error',
      });
    } finally {
      setShowSyncConfirm(false);
    }
  };

  return (
    <div className='container mx-auto max-w-5xl py-10'>
      <SectionHeader
        title='Marketplaces'
        description='Configure and manage external marketplaces for product listings.'
        className='mb-6'
      />

      <div className='grid gap-4 md:grid-cols-2'>
        {marketplaces.map((marketplace: { name: string; description: string; href: string }) => (
          <Link key={marketplace.name} href={marketplace.href} className='block group'>
            <Card
              variant='subtle'
              padding='md'
              className='border-border bg-card/40 transition group-hover:border-primary/40 group-hover:bg-card/60 h-full'
            >
              <h2 className='text-lg font-semibold text-white'>{marketplace.name}</h2>
              <p className='mt-1 text-sm text-gray-400'>{marketplace.description}</p>
            </Card>
          </Link>
        ))}
      </div>

      <Card variant='subtle' padding='md' className='mt-6 border-border bg-card/40'>
        <div className='flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between'>
          <div>
            <h3 className='text-base font-semibold text-white'>Base.com image sync</h3>
            <p className='text-sm text-gray-400'>
              Queue a job to sync all Base.com image URLs into product image links.
            </p>
          </div>
          <Button
            type='button'
            variant='outline'
            onClick={() => setShowSyncConfirm(true)}
            loading={syncMutation.isPending}
          >
            Sync all Base images
          </Button>
        </div>
      </Card>

      <ConfirmModal
        isOpen={showSyncConfirm}
        onClose={() => setShowSyncConfirm(false)}
        onConfirm={handleSyncBaseImages}
        title='Sync Base.com images for all listings?'
        message='This will enqueue a background job to pull image URLs from Base.com for every listing.'
        confirmText='Queue Sync'
        loading={syncMutation.isPending}
      />
    </div>
  );
}
