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
  ecommerceStatus?: string;
};

const resolveSuccessMessage = (status: string): string => {
  if (status === 'created') return 'Product exported to ecommerce.';
  if (status === 'updated') return 'Ecommerce product updated.';
  return 'Ecommerce product is already up to date.';
};

export function EcommerceExportButton({
  product,
  showEcommerceBadge = false,
  ecommerceStatus,
}: EcommerceExportButtonProps): React.JSX.Element {
  const { mutateAsync, isPending } = useExportProductToEcommerce();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [modalOpen, setModalOpen] = useState(false);

  const isActive = showEcommerceBadge && ecommerceStatus === 'active';

  const handleClick = useCallback((): void => {
    if (isPending) return;
    if (isActive) {
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
  }, [isPending, isActive, mutateAsync, product.id, queryClient, toast]);

  const ariaLabel = isActive ? 'Manage ecommerce product' : 'Export to ecommerce';

  return (
    <>
      <Button
        type='button'
        disabled={isPending}
        onClick={handleClick}
        variant='ghost'
        size='icon'
        aria-label={ariaLabel}
        title={ariaLabel}
        className={cn(
          'size-8 rounded-full border p-0',
          isActive
            ? 'border-emerald-400/70 bg-emerald-500/15 text-emerald-100 hover:border-emerald-300/80 hover:bg-emerald-500/25'
            : 'border-gray-500/60 bg-gray-500/10 text-gray-400 hover:border-gray-400/70 hover:bg-gray-500/20 hover:text-gray-300',
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
