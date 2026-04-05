'use client';

import React, { useMemo } from 'react';

import {
  ProductListingsProvider,
  useProductListingsData,
  useProductListingsLogs,
  useProductListingsModals,
} from '@/features/integrations/context/ProductListingsContext';
import {
  resolveProductListingsIntegrationScope,
} from '@/features/integrations/utils/product-listings-recovery';
import type { ProductListingsRecoveryContext } from '@/shared/contracts/integrations/listings';
import type { ProductWithImages } from '@/shared/contracts/products/product';
import type { EntityModalProps } from '@/shared/contracts/ui/modals';
import { DetailModal } from '@/shared/ui/templates/modals';

import {
  ProductListingsModalViewProvider,
  useProductListingsModalViewContext,
} from './product-listings-modal/context/ProductListingsModalViewContext';
import {
  ProductListingsViewProvider,
  createProductListingsViewContextValue,
  type ProductListingsViewContextValue,
} from './product-listings-modal/context/ProductListingsViewContext';
import { ExportLogsPanel } from './ExportLogsPanel';
import { resolveProductListingsModalTitle } from './product-listings-copy';
import { resolveProductListingsProductName } from './product-listings-labels';
import { ProductListingsConfirmDialogs } from './product-listings-modal/ProductListingsConfirmDialogs';
import { ProductListingsContent } from './product-listings-modal/ProductListingsContent';
import { ProductListingsEmpty } from './product-listings-modal/ProductListingsEmpty';
import { ProductListingsError } from './product-listings-modal/ProductListingsError';
import { ProductListingsLoading } from './product-listings-modal/ProductListingsLoading';
import { ProductListingsStartPanel } from './product-listings-modal/ProductListingsStartPanel';

interface ProductListingsModalProps extends EntityModalProps<ProductWithImages> {
  onStartListing?:
    | ((
        integrationId: string,
        connectionId: string,
        options?: { autoSubmit?: boolean }
      ) => void)
    | undefined;
  filterIntegrationSlug?: string | null | undefined;
  onListingsUpdated?: (() => void) | undefined;
  recoveryContext?: ProductListingsRecoveryContext | null | undefined;
}

function ProductListingsModalContent(): React.JSX.Element {
  const { product, listings, isLoading, error } = useProductListingsData();
  const { exportLogs } = useProductListingsLogs();
  const { onClose, onStartListing, filterIntegrationSlug } = useProductListingsModals();

  const productName = resolveProductListingsProductName(product);
  const effectiveFilterIntegrationSlug = filterIntegrationSlug ?? null;
  const productListingsViewContextValue: ProductListingsViewContextValue = useMemo(
    () =>
      createProductListingsViewContextValue({
        listings,
        filterIntegrationSlug: effectiveFilterIntegrationSlug,
      }),
    [effectiveFilterIntegrationSlug, listings]
  );
  const { filteredListings, integrationScopeLabel } = productListingsViewContextValue;
  const canStartListing: boolean = Boolean(onStartListing);
  const modalTitle = resolveProductListingsModalTitle({
    productName,
    integrationScopeLabel,
  });

  return (
    <DetailModal isOpen={true} onClose={onClose} title={modalTitle} size='xl'>
      <ProductListingsConfirmDialogs />

      <div className='space-y-4'>
        {isLoading ? (
          <ProductListingsLoading />
        ) : error ? (
          <ProductListingsError />
        ) : (
          <ProductListingsViewProvider value={productListingsViewContextValue}>
            <div className='space-y-3'>
              {canStartListing && <ProductListingsStartPanel />}

              {filteredListings.length === 0 ? (
                <ProductListingsEmpty />
              ) : (
                <ProductListingsContent />
              )}
            </div>
          </ProductListingsViewProvider>
        )}

        <ExportLogsPanel logs={exportLogs} />
      </div>
    </DetailModal>
  );
}

function ProductListingsModalProviders(): React.JSX.Element {
  const { product, onListingsUpdated, onClose, onStartListing, filterIntegrationSlug, recoveryContext } =
    useProductListingsModalViewContext();

  return (
    <ProductListingsProvider
      product={product}
      onListingsUpdated={onListingsUpdated}
      onClose={onClose}
      onStartListing={onStartListing}
      filterIntegrationSlug={filterIntegrationSlug}
      recoveryContext={recoveryContext}
    >
      <ProductListingsModalContent />
    </ProductListingsProvider>
  );
}

export function ProductListingsModal({
  isOpen = true,
  item: product,
  onClose,
  onStartListing,
  filterIntegrationSlug,
  onListingsUpdated,
  recoveryContext,
}: ProductListingsModalProps): React.JSX.Element | null {
  const effectiveFilterIntegrationSlug = resolveProductListingsIntegrationScope({
    filterIntegrationSlug,
    recoveryContext,
  });
  const viewContextValue = React.useMemo(
    () => ({
      product: product!,
      onClose,
      ...(onStartListing !== undefined && { onStartListing }),
      ...(effectiveFilterIntegrationSlug !== null && {
        filterIntegrationSlug: effectiveFilterIntegrationSlug,
      }),
      ...(onListingsUpdated !== undefined && { onListingsUpdated }),
      ...(recoveryContext !== undefined && { recoveryContext }),
    }),
    [
      effectiveFilterIntegrationSlug,
      onClose,
      onListingsUpdated,
      onStartListing,
      product,
      recoveryContext,
    ]
  );

  if (!product || !isOpen) return null;

  return (
    <ProductListingsModalViewProvider value={viewContextValue}>
      <ProductListingsModalProviders />
    </ProductListingsModalViewProvider>
  );
}

export default ProductListingsModal;
