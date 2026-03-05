'use client';

import React from 'react';

import {
  useProductListingsActions,
  useProductListingsData,
  useProductListingsModals,
} from '@/features/integrations/context/ProductListingsContext';
import { ConfirmDialogBatch } from '@/shared/ui/templates';

const normalizeIntegrationSlug = (value: string | null | undefined): string =>
  (value ?? '').trim().toLowerCase();

export function ProductListingsConfirmDialogs(): React.JSX.Element {
  const { listings } = useProductListingsData();
  const {
    listingToDelete,
    setListingToDelete,
    listingToPurge,
    setListingToPurge,
    isSyncImagesConfirmOpen,
    setIsSyncImagesConfirmOpen,
  } = useProductListingsModals();

  const {
    handleDeleteFromBase,
    handlePurgeListing,
    handleSyncBaseImages,
  } = useProductListingsActions();

  const baseListing =
    listings.find((listing) =>
      ['baselinker', 'base-com', 'base'].includes(
        normalizeIntegrationSlug(listing.integration.slug)
      )
    ) ?? null;

  const confirmDialogs = [
    {
      id: 'delete-from-base',
      open: !!listingToDelete,
      onOpenChange: (open: boolean) => !open && setListingToDelete(null),
      onConfirm: () => {
        if (listingToDelete) void handleDeleteFromBase(listingToDelete);
      },
      title: 'Delete from Base.com',
      description: 'Delete this product from Base.com? This cannot be undone.',
      confirmText: 'Delete',
      isDestructive: true,
    },
    {
      id: 'purge-listing',
      open: !!listingToPurge,
      onOpenChange: (open: boolean) => !open && setListingToPurge(null),
      onConfirm: () => {
        if (listingToPurge) void handlePurgeListing(listingToPurge);
      },
      title: 'Remove History',
      description:
        'Remove this integration connection and its history? This will NOT delete the product from the marketplace.',
      confirmText: 'Remove',
      isDestructive: true,
    },
    {
      id: 'sync-images',
      open: isSyncImagesConfirmOpen,
      onOpenChange: (open: boolean) => setIsSyncImagesConfirmOpen(open),
      onConfirm: () => {
        void handleSyncBaseImages(baseListing);
      },
      title: 'Sync Images from Base.com',
      description:
        'Sync image URLs from Base.com into this product? This will overwrite existing image links in the corresponding slots.',
      confirmText: 'Sync Images',
    },
  ];

  return <ConfirmDialogBatch dialogs={confirmDialogs} />;
}
