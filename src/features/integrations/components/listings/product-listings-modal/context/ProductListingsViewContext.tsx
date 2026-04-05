'use client';

import { BASE_INTEGRATION_SLUGS } from '@/features/integrations/constants/slugs';
import {
  matchesProductListingsIntegrationScope,
  normalizeProductListingsIntegrationScope,
  resolveProductListingsIntegrationScopeLabel,
} from '@/features/integrations/utils/product-listings-recovery';
import type { ProductListingWithDetails } from '@/shared/contracts/integrations/listings';
import { createStrictViewContext } from '../../createStrictViewContext';

export type ProductListingsViewContextValue = {
  filteredListings: ProductListingWithDetails[];
  integrationScopeLabel: string | null;
  statusTargetLabel: string;
  filterIntegrationSlug: string | null | undefined;
  isScopedMarketplaceFlow: boolean;
  isBaseFilter: boolean;
  showSync: boolean;
};

export const {
  Provider: ProductListingsViewProvider,
  useValue: useProductListingsViewContext,
} = createStrictViewContext<ProductListingsViewContextValue>({
  providerName: 'ProductListingsViewProvider',
  errorMessage: 'useProductListingsViewContext must be used within ProductListingsViewProvider',
});

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
