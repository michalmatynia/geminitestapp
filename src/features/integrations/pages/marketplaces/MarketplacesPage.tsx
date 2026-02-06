'use client';

import Link from 'next/link';
import React, { useState } from 'react';

import { Button, SectionHeader, SectionPanel, useToast, ConfirmDialog } from '@/shared/ui';

import { useSyncAllBaseImagesMutation } from '../../hooks/useIntegrationMutations';

const marketplaces = [
  {
    name: 'Allegro',
    description:
      'Manage Allegro listings, connections, mappings, and templates.',
    href: '/admin/integrations/marketplaces/allegro',
  },
  {
    name: 'Category Mapper',
    description:
      'Map external marketplace categories to your internal product categories for import/export.',
    href: '/admin/integrations/marketplaces/category-mapper',
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
      toast(
        error instanceof Error ? error.message : 'Failed to enqueue Base.com image sync',
        { variant: 'error' }
      );
    } finally {
      setShowSyncConfirm(false);
    }
  };

  return (
    <SectionPanel className="p-6">
      <SectionHeader
        title="Marketplaces"
        description="Configure and manage external marketplaces for product listings."
        className="mb-6"
      />

      <div className="grid gap-4 md:grid-cols-2">
        {marketplaces.map((marketplace: { name: string; description: string; href: string }) => (
          <Link
            key={marketplace.name}
            href={marketplace.href}
            className="rounded-md border border-border bg-gray-900 p-4 transition hover:border-border/60"
          >
            <h2 className="text-lg font-semibold text-white">
              {marketplace.name}
            </h2>
            <p className="mt-1 text-sm text-gray-400">
              {marketplace.description}
            </p>
          </Link>
        ))}
      </div>

      <div className="mt-6 rounded-md border border-border bg-gray-900 p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="text-base font-semibold text-white">Base.com image sync</h3>
            <p className="text-sm text-gray-400">
              Queue a job to sync all Base.com image URLs into product image links.
            </p>
          </div>
          <Button
            type="button"
            variant="outline"
            onClick={() => setShowSyncConfirm(true)}
            disabled={syncMutation.isPending}
          >
            {syncMutation.isPending ? 'Queueing...' : 'Sync all Base images'}
          </Button>
        </div>
      </div>

      <ConfirmDialog
        open={showSyncConfirm}
        onOpenChange={setShowSyncConfirm}
        title="Sync Base.com images for all listings?"
        description="This will enqueue a background job to pull image URLs from Base.com for every listing."
        onConfirm={() => void handleSyncBaseImages()}
        confirmText="Queue Sync"
        variant="success"
        loading={syncMutation.isPending}
      />
    </SectionPanel>
  );
}
