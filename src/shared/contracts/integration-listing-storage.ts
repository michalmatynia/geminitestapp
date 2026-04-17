import type {
  CreateProductListing,
  ProductListing,
  ProductListingExportEvent,
  ProductListingWithDetails,
} from './integrations/listings';

export type CreateProductListingInput = Omit<
  CreateProductListing,
  'listedAt' | 'expiresAt' | 'nextRelistAt' | 'lastRelistedAt' | 'lastStatusCheckAt'
> & {
  listedAt?: string | Date | null;
  expiresAt?: string | Date | null;
  nextRelistAt?: string | Date | null;
  lastRelistedAt?: string | Date | null;
  lastStatusCheckAt?: string | Date | null;
};

export type ProductListingExportEventRecord = Omit<
  ProductListingExportEvent,
  'exportedAt' | 'expiresAt'
> & {
  exportedAt: string | Date;
  expiresAt?: string | Date | null | undefined;
};

export type ProductListingRepository = {
  getListingsByProductId: (productId: string) => Promise<ProductListingWithDetails[]>;
  getListingById: (id: string) => Promise<ProductListing | null>;
  createListing: (input: CreateProductListingInput) => Promise<ProductListingWithDetails>;
  updateListingExternalId: (id: string, externalListingId: string | null) => Promise<void>;
  updateListingStatus: (id: string, status: string) => Promise<void>;
  updateListing: (id: string, input: Partial<CreateProductListingInput>) => Promise<void>;
  updateListingInventoryId: (id: string, inventoryId: string | null) => Promise<void>;
  appendExportHistory: (id: string, event: ProductListingExportEventRecord) => Promise<void>;
  deleteListing: (id: string) => Promise<void>;
  listingExists: (productId: string, connectionId: string) => Promise<boolean>;
  getListingsByProductIds: (productIds: string[]) => Promise<ProductListing[]>;
  getListingsByConnection: (connectionId: string) => Promise<ProductListing[]>;
  listAllListings: () => Promise<
    Array<
      Pick<
        ProductListing,
        'productId' | 'status' | 'integrationId' | 'marketplaceData' | 'updatedAt'
      >
    >
  >;
};
