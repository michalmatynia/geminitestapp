'use client';

import React, { useCallback, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import dynamic from 'next/dynamic';

import { useExportProductToEcommerce } from '@/features/products/hooks/useProductEcommerceExportMutations';
import type { ProductWithImages } from '@/shared/contracts/products/product';
import { invalidateListingBadges } from '@/shared/lib/query-invalidation';
import { useToast } from '@/shared/ui/toast';
import { logClientError } from '@/shared/utils/observability/client-error-logger';

import { getMarketplaceButtonClass } from '../product-column-utils';
import {
  PRODUCT_LIST_MARKETPLACE_DISABLED_INTERACTION_CLASS,
  ProductListMarketplacePendingTextButton,
} from './ProductListMarketplaceButton';
import {
  getEcommerceExportToastVariant,
  isMissingEcommerceCategoryError,
} from './ecommerce-export-warning';

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
        void invalidateListingBadges(queryClient);
      })
      .catch((error: unknown) => {
        if (!isMissingEcommerceCategoryError(error)) logClientError(error);
        toast(
          error instanceof Error ? error.message : 'Failed to export product to ecommerce.',
          { variant: getEcommerceExportToastVariant(error) }
        );
      });
  }, [isPending, isActive, mutateAsync, product.id, queryClient, toast]);

  const ariaLabel = isActive ? 'Manage ecommerce product' : 'Export to ecommerce';
  const toneClass = getMarketplaceButtonClass(isActive ? 'active' : 'not_started', isActive, 'ecommerce');

  return (
    <>
      <ProductListMarketplacePendingTextButton
        type='button'
        disabled={isPending}
        onClick={handleClick}
        aria-label={ariaLabel}
        title={ariaLabel}
        disabledInteractionClass={isPending && PRODUCT_LIST_MARKETPLACE_DISABLED_INTERACTION_CLASS}
        toneClass={toneClass}
        isPending={isPending}
        label='EC'
      />
      {modalOpen && <EcommerceManageModal product={product} open={modalOpen} onClose={(): void => setModalOpen(false)} />}
    </>
  );
}
