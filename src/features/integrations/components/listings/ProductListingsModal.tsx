'use client';

import React, { useMemo } from 'react';

import { ExportLogViewer } from '@/features/integrations/components/listings/ExportLogViewer';
import { BASE_INTEGRATION_SLUGS } from '@/features/integrations/constants/slugs';
import {
  ProductListingsProvider,
  useProductListingsData,
  useProductListingsLogs,
  useProductListingsModals,
} from '@/features/integrations/context/ProductListingsContext';
import {
  matchesProductListingsIntegrationScope,
  normalizeProductListingsIntegrationScope,
  resolveProductListingsIntegrationScope,
  resolveProductListingsIntegrationScopeLabel,
} from '@/features/integrations/utils/product-listings-recovery';
import type { ProductListingsRecoveryContext } from '@/shared/contracts/integrations';
import type { ProductListingWithDetails } from '@/shared/contracts/integrations';
import type { ProductWithImages } from '@/shared/contracts/products';
import type { EntityModalProps } from '@/shared/contracts/ui';
import { DetailModal } from '@/shared/ui/templates/modals';

import {
  ProductListingsModalViewProvider,
  useProductListingsModalViewContext,
} from './product-listings-modal/context/ProductListingsModalViewContext';
import {
  ProductListingsViewProvider,
  type ProductListingsViewContextValue,
} from './product-listings-modal/context/ProductListingsViewContext';
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
  const { onClose, onStartListing, filterIntegrationSlug, recoveryContext } =
    useProductListingsModals();

  const productName: string =
    product.name_en || product.name_pl || product.name_de || 'Unnamed Product';
  const effectiveFilterIntegrationSlug = resolveProductListingsIntegrationScope({
    filterIntegrationSlug,
    recoveryContext,
  });

  const filteredListings: ProductListingWithDetails[] = useMemo(() => {
    return effectiveFilterIntegrationSlug
      ? listings.filter((listing: ProductListingWithDetails): boolean =>
        matchesProductListingsIntegrationScope(listing.integration.slug, effectiveFilterIntegrationSlug)
      )
      : listings;
  }, [effectiveFilterIntegrationSlug, listings]);

  const integrationScopeLabel = resolveProductListingsIntegrationScopeLabel(
    effectiveFilterIntegrationSlug
  );
  const isBaseFilter = BASE_INTEGRATION_SLUGS.has(
    normalizeProductListingsIntegrationScope(effectiveFilterIntegrationSlug)?.toLowerCase() ?? ''
  );
  const statusTargetLabel: string = integrationScopeLabel ?? 'integration';
  const canStartListing: boolean = Boolean(onStartListing);
  const productListingsViewContextValue: ProductListingsViewContextValue = useMemo(
    () => ({
      filteredListings,
      statusTargetLabel,
      filterIntegrationSlug: effectiveFilterIntegrationSlug,
      isBaseFilter,
      showSync: Boolean(effectiveFilterIntegrationSlug),
    }),
    [effectiveFilterIntegrationSlug, filteredListings, isBaseFilter, statusTargetLabel]
  );
  const modalTitle = integrationScopeLabel
    ? `${integrationScopeLabel} - ${productName}`
    : `Integrations - ${productName}`;

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

        {exportLogs.length > 0 && (
          <div className='mt-4 border-t border pt-4'>
            <ExportLogViewer />
          </div>
        )}
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
