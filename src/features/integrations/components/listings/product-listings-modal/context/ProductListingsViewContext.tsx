'use client';

import React from 'react';

import { BASE_INTEGRATION_SLUGS } from '@/features/integrations/constants/slugs';
import {
  matchesProductListingsIntegrationScope,
  normalizeProductListingsIntegrationScope,
  resolveProductListingsIntegrationScopeLabel,
} from '@/features/integrations/utils/product-listings-recovery';
import type { ProductListingWithDetails } from '@/shared/contracts/integrations';
import { internalError } from '@/shared/errors/app-error';

export type ProductListingsViewContextValue = {
  filteredListings: ProductListingWithDetails[];
  integrationScopeLabel: string | null;
  statusTargetLabel: string;
  filterIntegrationSlug: string | null | undefined;
  isScopedMarketplaceFlow: boolean;
  isBaseFilter: boolean;
  showSync: boolean;
};

const ProductListingsViewContext = React.createContext<ProductListingsViewContextValue | null>(
  null
);

type ProductListingsViewProviderProps = {
  value: ProductListingsViewContextValue;
  children: React.ReactNode;
};

export function ProductListingsViewProvider({
  value,
  children,
}: ProductListingsViewProviderProps): React.JSX.Element {
  return (
    <ProductListingsViewContext.Provider value={value}>
      {children}
    </ProductListingsViewContext.Provider>
  );
}

export function useProductListingsViewContext(): ProductListingsViewContextValue {
  const context = React.useContext(ProductListingsViewContext);
  if (!context) {
    throw internalError(
      'useProductListingsViewContext must be used within ProductListingsViewProvider'
    );
  }
  return context;
}

export function createProductListingsViewContextValue({
  listings,
  filterIntegrationSlug,
}: {
  listings: ProductListingWithDetails[];
  filterIntegrationSlug: string | null;
}): ProductListingsViewContextValue {
  const normalizedFilterIntegrationSlug =
    normalizeProductListingsIntegrationScope(filterIntegrationSlug);
  const filteredListings = filterIntegrationSlug
    ? listings.filter((listing: ProductListingWithDetails): boolean =>
      matchesProductListingsIntegrationScope(listing.integration.slug, filterIntegrationSlug)
    )
    : listings;
  const integrationScopeLabel = resolveProductListingsIntegrationScopeLabel(
    normalizedFilterIntegrationSlug
  );
  const isBaseFilter = BASE_INTEGRATION_SLUGS.has(
    normalizedFilterIntegrationSlug?.toLowerCase() ?? ''
  );

  return {
    filteredListings,
    integrationScopeLabel,
    statusTargetLabel: integrationScopeLabel ?? 'integration',
    filterIntegrationSlug: normalizedFilterIntegrationSlug,
    isScopedMarketplaceFlow: Boolean(normalizedFilterIntegrationSlug),
    isBaseFilter,
    showSync: Boolean(normalizedFilterIntegrationSlug),
  };
}
