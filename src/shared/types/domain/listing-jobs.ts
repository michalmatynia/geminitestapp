export type ListingJob = {
  id: string;
  productId: string;
  integrationId: string;
  integrationName: string;
  integrationSlug: string;
  connectionId: string;
  connectionName: string;
  status: string;
  externalListingId: string | null;
  inventoryId: string | null;
  listedAt: string | null;
  exportHistory: Array<{
    exportedAt: string;
    status?: string | null;
    inventoryId?: string | null;
    templateId?: string | null;
    warehouseId?: string | null;
    externalListingId?: string | null;
    fields?: string[] | null;
    requestId?: string | null;
  }> | null;
  createdAt: string;
  updatedAt: string;
};

export type ListingAttempt = NonNullable<ListingJob['exportHistory']>[number];

export type ProductJob = {
  productId: string;
  productName: string;
  productSku: string | null;
  listings: ListingJob[];
};
