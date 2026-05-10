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

const getProductName = (product: ProductWithImages): string =>
  product.name_en ?? product.name_pl ?? product.name_de ?? product.sku ?? product.id;

function useEcommerceManageModalModel(product: ProductWithImages, onClose: () => void): {
  deletePending: boolean;
  handleDelete: () => void;
  handleSync: () => void;
  isPending: boolean;
  productName: string;
  syncPending: boolean;
} {
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
        void invalidateListingBadges(queryClient);
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
        void invalidateListingBadges(queryClient);
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

  return {
    deletePending: deleteMutation.isPending,
    handleDelete,
    handleSync,
    isPending,
    productName: getProductName(product),
    syncPending: exportMutation.isPending,
  };
}

function EcommerceManageActions({
  model,
  onClose,
}: {
  model: ReturnType<typeof useEcommerceManageModalModel>;
  onClose: () => void;
}): React.JSX.Element {
  return (
    <DialogFooter className='flex-col gap-2 sm:flex-col'>
      <Button type='button' onClick={model.handleSync} disabled={model.isPending} className='w-full bg-emerald-600 hover:bg-emerald-700 text-white'>
        {model.syncPending ? 'Syncing…' : 'Sync to ecommerce'}
      </Button>
      <Button type='button' variant='destructive' onClick={model.handleDelete} disabled={model.isPending} className='w-full'>
        {model.deletePending ? 'Removing…' : 'Remove from ecommerce'}
      </Button>
      <Button type='button' variant='ghost' onClick={onClose} disabled={model.isPending} className='w-full'>
        Cancel
      </Button>
    </DialogFooter>
  );
}

export function EcommerceManageModal({
  product,
  open,
  onClose,
}: EcommerceManageModalProps): React.JSX.Element {
  const model = useEcommerceManageModalModel(product, onClose);

  return (
    <Dialog open={open} onOpenChange={(isOpen): void => { if (!isOpen) onClose(); }}>
      <DialogContent className='max-w-sm'>
        <DialogHeader>
          <DialogTitle className='text-base'>Ecommerce Store</DialogTitle>
        </DialogHeader>
        <p className='text-sm text-muted-foreground truncate' title={model.productName}>
          {model.productName}
        </p>
        <EcommerceManageActions model={model} onClose={onClose} />
      </DialogContent>
    </Dialog>
  );
}
