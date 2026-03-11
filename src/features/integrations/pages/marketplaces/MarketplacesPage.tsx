'use client';

import React, { useState } from 'react';

import { useSyncAllBaseImagesMutation } from '@/features/integrations/hooks/useIntegrationMutations';
import { Button, Card, NavigationCard, NavigationCardGrid, SectionHeader, useToast } from '@/shared/ui';
import { ConfirmModal } from '@/shared/ui/templates/modals/ConfirmModal';


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
      const response = await syncMutation.mutateAsync();
      toast(`Base.com image sync queued (job ${response.jobId}).`, { variant: 'success' });
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

      <NavigationCardGrid className='md:grid-cols-2'>
        {marketplaces.map((marketplace: { name: string; description: string; href: string }) => (
          <NavigationCard
            key={marketplace.name}
            href={marketplace.href}
            title={marketplace.name}
            description={marketplace.description}
            variant='subtle'
            linkClassName='group'
            className='border-border bg-card/40 group-hover:border-primary/40 group-hover:bg-card/60'
          />
        ))}
      </NavigationCardGrid>

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
