import type {
  CreateProductListingInput,
  ProductListing,
  ProductListingExportEvent,
  ProductListingRepository,
  ProductListingWithDetails,
} from '@/shared/contracts/integrations';

export type {
  CreateProductListingInput,
  ProductListingExportEvent,
  ProductListingRepository,
  ProductListingWithDetails,
};

// Legacy alias used by integration repositories/services.
export type ProductListingRecord = ProductListing;
