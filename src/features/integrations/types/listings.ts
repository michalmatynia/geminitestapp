import type {
  ProductListingDto,
  ProductListingExportEventDto,
  ProductListingRelistPolicyDto,
  ProductListingWithDetailsDto,
  CreateProductListingDto,
  IntegrationWithConnectionsDto,
  ListingJobDto,
  ProductJobDto,
} from '@/shared/contracts/integrations';

export type ListingJob = ListingJobDto;
export type ListingAttempt = NonNullable<ProductListingDto['exportHistory']>[number];
export type ProductJob = ProductJobDto;

export type ProductListingRecord = ProductListingDto;

export type ProductListingExportEvent = Omit<ProductListingExportEventDto, 'exportedAt' | 'expiresAt'> & {
  exportedAt: string | Date;
  expiresAt?: string | Date | null | undefined;
};

export type ProductListingRelistPolicy = ProductListingRelistPolicyDto;

export type ProductListingWithDetails = ProductListingWithDetailsDto;

export type IntegrationConnectionBasic = IntegrationWithConnectionsDto;
export type IntegrationWithConnections = IntegrationWithConnectionsDto;
export type IntegrationWithConnectionsBasic = IntegrationWithConnectionsDto;

export type CreateProductListingInput = Omit<CreateProductListingDto, 'listedAt' | 'expiresAt' | 'nextRelistAt' | 'lastRelistedAt' | 'lastStatusCheckAt'> & {
  listedAt?: string | Date | null;
  expiresAt?: string | Date | null;
  nextRelistAt?: string | Date | null;
  lastRelistedAt?: string | Date | null;
  lastStatusCheckAt?: string | Date | null;
};

export type ProductListingRepository = {
  getListingsByProductId: (productId: string) => Promise<ProductListingWithDetails[]>;
  getListingById: (id: string) => Promise<ProductListingRecord | null>;
  createListing: (input: CreateProductListingInput) => Promise<ProductListingWithDetails>;
  updateListingExternalId: (id: string, externalListingId: string | null) => Promise<void>;
  updateListingStatus: (id: string, status: string) => Promise<void>;
  updateListing: (id: string, input: Partial<CreateProductListingInput>) => Promise<void>;
  updateListingInventoryId: (id: string, inventoryId: string | null) => Promise<void>;
  appendExportHistory: (id: string, event: ProductListingExportEvent) => Promise<void>;
  deleteListing: (id: string) => Promise<void>;
  listingExists: (productId: string, connectionId: string) => Promise<boolean>;
  listAllListings: () => Promise<Array<Pick<ProductListingRecord, 'productId' | 'status' | 'integrationId' | 'marketplaceData'>>>;
};
