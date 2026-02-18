import type {
  ProductListingDto,
  ProductListingExportEventDto,
  ProductListingRelistPolicyDto,
  ProductListingWithDetailsDto,
} from '@/shared/contracts/integrations';
import type { 
  IntegrationConnectionBasic, 
  IntegrationWithConnections, 
  IntegrationWithConnectionsBasic 
} from '@/shared/types/domain/integrations';

export type { ListingJob, ListingAttempt, ProductJob } from '@/shared/types/domain/listing-jobs';

export type ProductListingRecord = ProductListingDto;

export type ProductListingExportEvent = ProductListingExportEventDto;

export type ProductListingRelistPolicy = ProductListingRelistPolicyDto;

export type ProductListingWithDetails = ProductListingWithDetailsDto;

export type {
  IntegrationConnectionBasic,
  IntegrationWithConnections,
  IntegrationWithConnectionsBasic,
};

export type CreateProductListingInput = {
  productId: string;
  integrationId: string;
  connectionId: string;
  status?: string;
  externalListingId?: string | null;
  inventoryId?: string | null;
  expiresAt?: string | null;
  nextRelistAt?: string | null;
  relistPolicy?: ProductListingRelistPolicy | null;
  relistAttempts?: number;
  lastRelistedAt?: string | null;
  lastStatusCheckAt?: string | null;
  marketplaceData?: Record<string, unknown> | null;
  failureReason?: string | null;
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
