'use client';

import React, { useMemo } from 'react';

import { ExportLogViewer } from '@/features/integrations/components/listings/ExportLogViewer';
import {
  BASE_INTEGRATION_SLUGS,
  TRADERA_INTEGRATION_SLUGS,
} from '@/features/integrations/constants/slugs';
import { ProductListingsProvider, useProductListingsContext } from '@/features/integrations/context/ProductListingsContext';
import type { ProductListingWithDetails } from '@/features/integrations/types/listings';
import type { ProductWithImages } from '@/features/products/types';
import { AppModal } from '@/shared/ui';

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

type ProductListingsModalProps = {
  product: ProductWithImages;
  onClose: () => void;
  onStartListing?: ((integrationId: string, connectionId: string) => void) | undefined;
  filterIntegrationSlug?: string | null | undefined;
  onListingsUpdated?: (() => void) | undefined;
};

const normalizeSlug = (value: string | null | undefined): string =>
  (value ?? '').trim().toLowerCase();

const matchesIntegrationSlug = (
  listingSlug: string,
  filterIntegrationSlug: string | null | undefined
): boolean => {
  const filter = normalizeSlug(filterIntegrationSlug);
  if (!filter) return true;
  const listing = normalizeSlug(listingSlug);
  if (BASE_INTEGRATION_SLUGS.has(filter)) {
    return BASE_INTEGRATION_SLUGS.has(listing);
  }
  if (TRADERA_INTEGRATION_SLUGS.has(filter)) {
    return TRADERA_INTEGRATION_SLUGS.has(listing);
  }
  return listing === filter;
};

function ProductListingsModalContent(): React.JSX.Element {
  const {
    product,
    listings,
    isLoading,
    error,
    exportLogs,
    logsOpen,
    setLogsOpen,
    onClose,
    onStartListing,
    filterIntegrationSlug,
  } = useProductListingsContext();

  const productName: string =
    product.name_en || product.name_pl || product.name_de || 'Unnamed Product';

  const filteredListings: ProductListingWithDetails[] = useMemo(() => {
    return filterIntegrationSlug
      ? listings.filter((listing: ProductListingWithDetails): boolean =>
        matchesIntegrationSlug(listing.integration.slug, filterIntegrationSlug)
      )
      : listings;
  }, [listings, filterIntegrationSlug]);

  const isBaseFilter = BASE_INTEGRATION_SLUGS.has(normalizeSlug(filterIntegrationSlug));
  const statusTargetLabel: string = isBaseFilter ? 'Base.com' : filterIntegrationSlug ?? 'integration';
  const canStartListing: boolean = Boolean(onStartListing) && !filterIntegrationSlug;
  const productListingsViewContextValue: ProductListingsViewContextValue = useMemo(
    () => ({
      filteredListings,
      statusTargetLabel,
      filterIntegrationSlug,
      isBaseFilter,
      showSync: Boolean(filterIntegrationSlug),
    }),
    [
      filterIntegrationSlug,
      filteredListings,
      isBaseFilter,
      statusTargetLabel,
    ]
  );

  return (
    <AppModal
      open={true}
      onClose={onClose}
      title={`Integrations - ${productName}`}
    >
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
            <ExportLogViewer
              logs={exportLogs}
              isOpen={logsOpen}
              onToggle={setLogsOpen}
            />
          </div>
        )}
      </div>
    </AppModal>
  );
}

function ProductListingsModalProviders(): React.JSX.Element {
  const {
    product,
    onListingsUpdated,
    onClose,
    onStartListing,
    filterIntegrationSlug,
  } = useProductListingsModalViewContext();

  return (
    <ProductListingsProvider
      product={product}
      onListingsUpdated={onListingsUpdated}
      onClose={onClose}
      onStartListing={onStartListing}
      filterIntegrationSlug={filterIntegrationSlug}
    >
      <ProductListingsModalContent />
    </ProductListingsProvider>
  );
}

export function ProductListingsModal({
  product,
  onClose,
  onStartListing,
  filterIntegrationSlug,
  onListingsUpdated,
}: ProductListingsModalProps): React.JSX.Element {
  const viewContextValue = React.useMemo(
    () => ({
      product,
      onClose,
      ...(onStartListing !== undefined && { onStartListing }),
      ...(filterIntegrationSlug !== undefined && { filterIntegrationSlug }),
      ...(onListingsUpdated !== undefined && { onListingsUpdated }),
    }),
    [filterIntegrationSlug, onClose, onListingsUpdated, onStartListing, product]
  );

  return (
    <ProductListingsModalViewProvider value={viewContextValue}>
      <ProductListingsModalProviders />
    </ProductListingsModalViewProvider>
  );
}

export default ProductListingsModal;
