'use client';

import React, { useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';

import type { ProductWithImages } from '@/shared/contracts/products/product';
import { invalidateListingBadges } from '@/shared/lib/query-invalidation';
import { Button } from '@/shared/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/shared/ui/dialog';
import { useToast } from '@/shared/ui/toast';
import { logClientError } from '@/shared/utils/observability/client-error-logger';

import {
  useDeleteProductFromEcommerce,
  useExportProductToEcommerce,
} from '@/features/products/hooks/useProductEcommerceExportMutations';

type EcommerceManageModalProps = {
  product: ProductWithImages;
  open: boolean;
  onClose: () => void;
};

export function EcommerceManageModal({
  product,
  open,
  onClose,
}: EcommerceManageModalProps): React.JSX.Element {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const exportMutation = useExportProductToEcommerce();
  const deleteMutation = useDeleteProductFromEcommerce();

  const isPending = exportMutation.isPending || deleteMutation.isPending;

  const handleSync = useCallback((): void => {
    if (isPending) return;
    void exportMutation.mutateAsync(product.id)
      .then(() => {
        toast('Ecommerce product synced successfully.', { variant: 'success' });
        invalidateListingBadges(queryClient);
        onClose();
      })
      .catch((error: unknown) => {
        logClientError(error);
        toast(
          error instanceof Error ? error.message : 'Failed to sync product to ecommerce.',
          { variant: 'error' }
        );
      });
  }, [exportMutation, isPending, onClose, product.id, queryClient, toast]);

  const handleDelete = useCallback((): void => {
    if (isPending) return;
    void deleteMutation.mutateAsync(product.id)
      .then(() => {
        toast('Product removed from ecommerce store.', { variant: 'success' });
        invalidateListingBadges(queryClient);
        onClose();
      })
      .catch((error: unknown) => {
        logClientError(error);
        toast(
          error instanceof Error ? error.message : 'Failed to remove product from ecommerce.',
          { variant: 'error' }
        );
      });
  }, [deleteMutation, isPending, onClose, product.id, queryClient, toast]);

  const productName =
    product.name_en ?? product.name_pl ?? product.name_de ?? product.sku ?? product.id;

  return (
    <Dialog open={open} onOpenChange={(isOpen): void => { if (!isOpen) onClose(); }}>
      <DialogContent className='max-w-sm'>
        <DialogHeader>
          <DialogTitle className='text-base'>Ecommerce Store</DialogTitle>
        </DialogHeader>
        <p className='text-sm text-muted-foreground truncate' title={productName ?? undefined}>
          {productName}
        </p>
        <DialogFooter className='flex-col gap-2 sm:flex-col'>
          <Button
            type='button'
            onClick={handleSync}
            disabled={isPending}
            className='w-full bg-emerald-600 hover:bg-emerald-700 text-white'
          >
            {exportMutation.isPending ? 'Syncing…' : 'Sync to ecommerce'}
          </Button>
          <Button
            type='button'
            variant='destructive'
            onClick={handleDelete}
            disabled={isPending}
            className='w-full'
          >
            {deleteMutation.isPending ? 'Removing…' : 'Remove from ecommerce'}
          </Button>
          <Button
            type='button'
            variant='ghost'
            onClick={onClose}
            disabled={isPending}
            className='w-full'
          >
            Cancel
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
