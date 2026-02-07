'use client';

import React, { useMemo } from 'react';

import type { ImageRetryPreset } from '@/features/data-import-export';
import { ExportLogViewer } from '@/features/integrations/components/listings/ExportLogViewer';
import { useImageRetryPresets } from '@/features/integrations/components/listings/useImageRetryPresets';
import { isImageExportError } from '@/features/integrations/components/listings/utils';
import { ProductListingsProvider, useProductListingsContext } from '@/features/integrations/context/ProductListingsContext';
import type { ProductListingWithDetails } from '@/features/integrations/types/listings';
import type { ProductWithImages } from '@/features/products/types';
import {
  SharedModal,
  ImageRetryDropdown,
  Alert,
} from '@/shared/ui';

import { ProductListingItem } from './product-listings-modal/ProductListingItem';
import { ProductListingsConfirmDialogs } from './product-listings-modal/ProductListingsConfirmDialogs';
import { ProductListingsStartPanel } from './product-listings-modal/ProductListingsStartPanel';
import { ProductListingsSyncPanel } from './product-listings-modal/ProductListingsSyncPanel';

type ProductListingsModalProps = {
  product: ProductWithImages;
  onClose: () => void;
  onStartListing?: ((integrationId: string, connectionId: string) => void) | undefined;
  filterIntegrationSlug?: string | null | undefined;
  onListingsUpdated?: (() => void) | undefined;
};

const BASE_INTEGRATION_SLUGS = new Set(['baselinker', 'base-com']);

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
  return listing === filter;
};

function ProductListingsModalContent(): React.JSX.Element {
  const {
    product,
    listings,
    isLoading,
    error,
    exportingListing,
    exportLogs,
    logsOpen,
    setLogsOpen,
    lastExportListingId,
    handleImageRetry,
    onClose,
    onStartListing,
    filterIntegrationSlug,
  } = useProductListingsContext();

  const imageRetryPresets: ImageRetryPreset[] = useImageRetryPresets();

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

  const statusTargetLabel: string =
    isBaseFilter
      ? 'Base.com'
      : filterIntegrationSlug ?? 'integration';

  const canStartListing: boolean = Boolean(onStartListing) && !filterIntegrationSlug;

  return (
    <SharedModal
      open={true}
      onClose={onClose}
      title={`Integrations - ${productName}`}
    >
      <ProductListingsConfirmDialogs />
      
      <div className="space-y-4">
        {isLoading ? (
          <p className="text-sm text-gray-400">Loading listings...</p>
        ) : error ? (
          <Alert variant="error">
            <div className="flex flex-col gap-3">
              <span>{error}</span>
              {isImageExportError(error) && lastExportListingId ? (
                <div className="flex flex-wrap items-center gap-2">
                  <ImageRetryDropdown
                    presets={imageRetryPresets}
                    onRetry={(preset: ImageRetryPreset) => void handleImageRetry(preset)}
                    disabled={Boolean(exportingListing)}
                  />
                  <span className="text-xs text-red-200/80">
                    Applies JPEG resize/compression and retries automatically.
                  </span>
                </div>
              ) : null}
            </div>
          </Alert>
        ) : (
          <div className="space-y-3">
            {canStartListing && <ProductListingsStartPanel />}
            
            {filteredListings.length === 0 ? (
              <div className="rounded-md border bg-card/50 px-4 py-8 text-center">
                {filterIntegrationSlug ? (
                  <div className="space-y-3">
                    <div className="text-sm text-gray-300">
                      {statusTargetLabel} status
                    </div>
                    <div className="rounded-md border border-border bg-card/60 px-3 py-2 text-xs text-gray-400">
                      Not connected.
                    </div>
                    {isBaseFilter && <ProductListingsSyncPanel />}
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="border-t border-border pt-3">
                      <p className="text-sm text-gray-400">
                        This product is not listed on any marketplace yet.
                      </p>
                      <p className="mt-2 text-xs text-gray-500">
                        Use the + button in the header to list products on a marketplace.
                      </p>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-3">
                {filterIntegrationSlug && (
                  <div className="rounded-md border border-border bg-card/60 px-3 py-2 text-xs text-gray-300">
                    {statusTargetLabel} status: {filteredListings[0]?.status ?? 'Unknown'}
                  </div>
                )}
                {isBaseFilter && <ProductListingsSyncPanel />}
                {filteredListings.map((listing: ProductListingWithDetails) => (
                  <ProductListingItem key={listing.id} listing={listing} />
                ))}
              </div>
            )}
          </div>
        )}
        
        {exportLogs.length > 0 && (
          <div className="mt-4 border-t border pt-4">
            <ExportLogViewer
              logs={exportLogs}
              isOpen={logsOpen}
              onToggle={setLogsOpen}
            />
          </div>
        )}
      </div>
    </SharedModal>
  );
}

export function ProductListingsModal(props: ProductListingsModalProps): React.JSX.Element {
  return (
    <ProductListingsProvider 
      product={props.product} 
      onListingsUpdated={props.onListingsUpdated}
      onClose={props.onClose}
      onStartListing={props.onStartListing}
      filterIntegrationSlug={props.filterIntegrationSlug}
    >
      <ProductListingsModalContent />
    </ProductListingsProvider>
  );
}

export default ProductListingsModal;
