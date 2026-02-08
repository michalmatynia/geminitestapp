'use client';

import React from 'react';

import { useProductListingsContext } from '@/features/integrations/context/ProductListingsContext';
import { ConfirmDialog } from '@/shared/ui';

const normalizeIntegrationSlug = (value: string | null | undefined): string =>
  (value ?? '').trim().toLowerCase();

export function ProductListingsConfirmDialogs(): React.JSX.Element {
  const {
    listingToDelete,
    setListingToDelete,
    handleDeleteFromBase,
    listingToPurge,
    setListingToPurge,
    handlePurgeListing,
    isSyncImagesConfirmOpen,
    setIsSyncImagesConfirmOpen,
    handleSyncBaseImages,
    listings,
  } = useProductListingsContext();

  const baseListing = listings.find(
    (listing) => ['baselinker', 'base-com'].includes(normalizeIntegrationSlug(listing.integration.slug))
  ) ?? null;

  return (
    <>
      <ConfirmDialog
        open={!!listingToDelete}
        onOpenChange={(open: boolean) => !open && setListingToDelete(null)}
        onConfirm={() => { if (listingToDelete) void handleDeleteFromBase(listingToDelete); }}
        title="Delete from Base.com"
        description="Delete this product from Base.com? This cannot be undone."
        confirmText="Delete"
        variant="destructive"
      />
      <ConfirmDialog
        open={!!listingToPurge}
        onOpenChange={(open: boolean) => !open && setListingToPurge(null)}
        onConfirm={() => { if (listingToPurge) void handlePurgeListing(listingToPurge); }}
        title="Remove History"
        description="Remove this integration connection and its history? This will NOT delete the product from the marketplace."
        confirmText="Remove"
        variant="destructive"
      />
      <ConfirmDialog
        open={isSyncImagesConfirmOpen}
        onOpenChange={(open: boolean) => setIsSyncImagesConfirmOpen(open)}
        onConfirm={() => { void handleSyncBaseImages(baseListing); }}
        title="Sync Images from Base.com"
        description="Sync image URLs from Base.com into this product? This will overwrite existing image links in the corresponding slots."
        confirmText="Sync Images"
      />
    </>
  );
}
