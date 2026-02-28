import type {
  CreateProductListingInput,
  ProductListing,
  ProductListingExportEvent,
  ProductListingExportEventRecord,
  ProductListingRepository,
  ProductListingWithDetails,
} from '@/shared/contracts/integrations';

export type {
  CreateProductListingInput,
  ProductListingExportEvent,
  ProductListingExportEventRecord,
  ProductListingRepository,
  ProductListingWithDetails,
};

// Legacy alias used by integration repositories/services.
export type ProductListingRecord = ProductListing;
