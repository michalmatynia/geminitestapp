'use client';

import React, { useCallback, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import dynamic from 'next/dynamic';

import { useExportProductToEcommerce } from '@/features/products/hooks/useProductEcommerceExportMutations';
import type { ProductWithImages } from '@/shared/contracts/products/product';
import { invalidateListingBadges } from '@/shared/lib/query-invalidation';
import { Button } from '@/shared/ui/button';
import { useToast } from '@/shared/ui/toast';
import { logClientError } from '@/shared/utils/observability/client-error-logger';
import { cn } from '@/shared/utils/ui-utils';

const EcommerceManageModal = dynamic(
  () => import('./EcommerceManageModal').then((mod) => mod.EcommerceManageModal),
  { ssr: false }
);

type EcommerceExportButtonProps = {
  product: ProductWithImages;
  showEcommerceBadge?: boolean;
};

const resolveSuccessMessage = (status: string): string => {
  if (status === 'created') return 'Product exported to ecommerce.';
  if (status === 'updated') return 'Ecommerce product updated.';
  return 'Ecommerce product is already up to date.';
};

export function EcommerceExportButton({
  product,
  showEcommerceBadge = false,
}: EcommerceExportButtonProps): React.JSX.Element {
  const { mutateAsync, isPending } = useExportProductToEcommerce();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [modalOpen, setModalOpen] = useState(false);

  const handleClick = useCallback((): void => {
    if (isPending) return;
    if (showEcommerceBadge) {
      setModalOpen(true);
      return;
    }
    void mutateAsync(product.id)
      .then((response) => {
        toast(resolveSuccessMessage(response.status), { variant: 'success' });
        invalidateListingBadges(queryClient);
      })
      .catch((error: unknown) => {
        logClientError(error);
        toast(
          error instanceof Error ? error.message : 'Failed to export product to ecommerce.',
          { variant: 'error' }
        );
      });
  }, [isPending, showEcommerceBadge, mutateAsync, product.id, queryClient, toast]);

  return (
    <>
      <Button
        type='button'
        disabled={isPending}
        onClick={handleClick}
        variant='ghost'
        size='icon'
        aria-label={showEcommerceBadge ? 'Manage ecommerce product' : 'Export to ecommerce'}
        title={showEcommerceBadge ? 'Manage ecommerce product' : 'Export to ecommerce'}
        className={cn(
          'size-8 rounded-full border p-0',
          showEcommerceBadge
            ? 'border-emerald-400/70 bg-emerald-500/15 text-emerald-100 hover:border-emerald-300/80 hover:bg-emerald-500/25'
            : 'border-violet-400/60 bg-transparent text-violet-200 hover:border-violet-300/70 hover:bg-violet-500/15 hover:text-violet-100',
          isPending && 'cursor-not-allowed opacity-60'
        )}
      >
        <span
          aria-hidden='true'
          className='text-[9px] font-black uppercase leading-none tracking-tight'
        >
          {isPending ? '...' : 'EC'}
        </span>
      </Button>
      {modalOpen && (
        <EcommerceManageModal
          product={product}
          open={modalOpen}
          onClose={(): void => setModalOpen(false)}
        />
      )}
    </>
  );
}
