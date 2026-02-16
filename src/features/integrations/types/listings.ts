import type { 
  IntegrationConnectionBasic, 
  IntegrationWithConnections, 
  IntegrationWithConnectionsBasic 
} from '@/shared/types/domain/integrations';

export type { ListingJob, ListingAttempt, ProductJob } from '@/shared/types/domain/listing-jobs';

export type ProductListingRecord = {
  id: string;
  productId: string;
  integrationId: string;
  connectionId: string;
  externalListingId: string | null;
  inventoryId: string | null;
  status: string;
  listedAt: Date | null;
  expiresAt: Date | null;
  nextRelistAt: Date | null;
  relistPolicy: ProductListingRelistPolicy | null;
  relistAttempts: number;
  lastRelistedAt: Date | null;
  lastStatusCheckAt: Date | null;
  marketplaceData: Record<string, unknown> | null;
  failureReason: string | null;
  exportHistory: ProductListingExportEvent[] | null;
  createdAt: Date;
  updatedAt: Date;
};

export type ProductListingExportEvent = {
  exportedAt: Date;
  status?: string | null;
  inventoryId?: string | null;
  templateId?: string | null;
  warehouseId?: string | null;
  externalListingId?: string | null;
  expiresAt?: Date | null;
  failureReason?: string | null;
  relist?: boolean;
  fields?: string[] | null;
  requestId?: string | null;
};

export type ProductListingRelistPolicy = {
  enabled?: boolean;
  leadMinutes?: number;
  maxAttempts?: number;
  durationHours?: number;
  templateId?: string | null;
};

export type ProductListingWithDetails = ProductListingRecord & {
  integration: {
    id: string;
    name: string;
    slug: string;
  };
  connection: {
    id: string;
    name: string;
  };
};

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
  expiresAt?: Date | null;
  nextRelistAt?: Date | null;
  relistPolicy?: ProductListingRelistPolicy | null;
  relistAttempts?: number;
  lastRelistedAt?: Date | null;
  lastStatusCheckAt?: Date | null;
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
