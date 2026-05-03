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
    listingToMoveToUnsold,
    setListingToMoveToUnsold,
    listingToPurge,
    setListingToPurge,
    isSyncImagesConfirmOpen,
    setIsSyncImagesConfirmOpen,
  } = useProductListingsModals();

  const {
    handleDeleteFromBase,
    handleMoveTraderaListingToUnsold,
    handlePurgeListing,
    handleSyncBaseImages,
  } =
    useProductListingsActions();

  const baseListing =
    listings.find((listing) =>
      ['baselinker', 'base-com', 'base'].includes(
        normalizeIntegrationSlug(listing.integration.slug)
      )
    ) ?? null;

  const confirmDialogs = [
    {
      id: 'delete-from-base',
      open: Boolean(listingToDelete),
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
      id: 'move-tradera-listing-to-unsold',
      open: Boolean(listingToMoveToUnsold),
      onOpenChange: (open: boolean) => !open && setListingToMoveToUnsold(null),
      onConfirm: () => {
        if (listingToMoveToUnsold) void handleMoveTraderaListingToUnsold(listingToMoveToUnsold, {
          browserMode: 'headed',
        });
      },
      title: 'End On Tradera',
      description:
        'End this Tradera listing and move it to Unsold if possible? The app connection and listing history will be kept so you can relist it later.',
      confirmText: 'End Listing',
      isDestructive: true,
    },
    {
      id: 'purge-listing',
      open: Boolean(listingToPurge),
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
