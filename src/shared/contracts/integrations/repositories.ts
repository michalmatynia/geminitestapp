import type { Integration } from './base';
import type { CategoryMappingAssignment } from './base-com';
import type {
  ConnectionDeleteOptions,
  IntegrationConnection,
} from './connections';
import type {
  BaseCategory,
  CategoryMapping,
  CategoryMappingCreateInput,
  CategoryMappingUpdateInput,
  CategoryMappingWithDetails,
  CreateProductListing,
  ExternalCategory,
  ExternalCategoryWithChildren,
  ProductListing,
  ProductListingExportEvent,
  ProductListingWithDetails,
} from './listings';

export type IntegrationRecord = Omit<Integration, 'createdAt' | 'updatedAt'> & {
  createdAt: string | Date;
  updatedAt: string | Date | null;
};

export type IntegrationConnectionRecord = Omit<
  IntegrationConnection,
  | 'createdAt'
  | 'updatedAt'
  | 'playwrightStorageStateUpdatedAt'
  | 'traderaApiTokenUpdatedAt'
  | 'linkedinTokenUpdatedAt'
  | 'linkedinExpiresAt'
> & {
  createdAt: string | Date;
  updatedAt: string | Date | null;
  playwrightStorageStateUpdatedAt?: string | Date | null;
  traderaApiTokenUpdatedAt?: string | Date | null;
  linkedinTokenUpdatedAt?: string | Date | null;
  linkedinExpiresAt?: string | Date | null;
};

type NullablePlaywrightConnectionOverrideKey =
  | 'playwrightIdentityProfile'
  | 'playwrightHeadless'
  | 'playwrightSlowMo'
  | 'playwrightTimeout'
  | 'playwrightNavigationTimeout'
  | 'playwrightLocale'
  | 'playwrightTimezoneId'
  | 'playwrightHumanizeMouse'
  | 'playwrightMouseJitter'
  | 'playwrightClickDelayMin'
  | 'playwrightClickDelayMax'
  | 'playwrightInputDelayMin'
  | 'playwrightInputDelayMax'
  | 'playwrightActionDelayMin'
  | 'playwrightActionDelayMax'
  | 'playwrightProxyEnabled'
  | 'playwrightProxyServer'
  | 'playwrightProxyUsername'
  | 'playwrightProxyPassword'
  | 'playwrightProxySessionAffinity'
  | 'playwrightProxySessionMode'
  | 'playwrightProxyProviderPreset'
  | 'playwrightEmulateDevice'
  | 'playwrightDeviceName';

export type IntegrationConnectionUpdateInput = Omit<
  Partial<IntegrationConnectionRecord>,
  NullablePlaywrightConnectionOverrideKey
> & {
  [K in NullablePlaywrightConnectionOverrideKey]?: IntegrationConnectionRecord[K] | null;
};

export type IntegrationRepository = {
  listIntegrations: () => Promise<IntegrationRecord[]>;
  upsertIntegration: (input: { name: string; slug: string }) => Promise<IntegrationRecord>;
  getIntegrationById: (id: string) => Promise<IntegrationRecord | null>;
  listConnections: (integrationId: string) => Promise<IntegrationConnectionRecord[]>;
  getConnectionById: (id: string) => Promise<IntegrationConnectionRecord | null>;
  getConnectionByIdAndIntegration: (
    id: string,
    integrationId: string
  ) => Promise<IntegrationConnectionRecord | null>;
  createConnection: (
    integrationId: string,
    input: Record<string, unknown>
  ) => Promise<IntegrationConnectionRecord>;
  updateConnection: (
    id: string,
    input: IntegrationConnectionUpdateInput
  ) => Promise<IntegrationConnectionRecord>;
  deleteConnection: (
    id: string,
    options?: ConnectionDeleteOptions
  ) => Promise<void>;
};

export type IntegrationLookupRepository = Pick<
  IntegrationRepository,
  'getConnectionById' | 'getIntegrationById'
>;

export type ExternalCategoryRepository = {
  syncFromBase: (connectionId: string, categories: BaseCategory[]) => Promise<number>;
  listByConnection: (connectionId: string) => Promise<ExternalCategory[]>;
  getTreeByConnection: (connectionId: string) => Promise<ExternalCategoryWithChildren[]>;
  getById: (id: string) => Promise<ExternalCategory | null>;
  getByExternalId: (
    connectionId: string,
    externalId: string
  ) => Promise<ExternalCategory | null>;
  /**
   * Returns all leaf descendants of the given external category ID.
   * Traverses the stored tree via the path field to find all categories
   * that are descended from this category and have no children.
   */
  getLeafDescendants: (connectionId: string, externalId: string) => Promise<ExternalCategory[]>;
  deleteByConnection: (connectionId: string) => Promise<number>;
};

export type CategoryMappingRepository = {
  create: (input: CategoryMappingCreateInput) => Promise<CategoryMapping>;
  update: (id: string, input: CategoryMappingUpdateInput) => Promise<CategoryMapping>;
  delete: (id: string) => Promise<void>;
  getById: (id: string) => Promise<CategoryMapping | null>;
  listByConnection: (
    connectionId: string,
    catalogId?: string
  ) => Promise<CategoryMappingWithDetails[]>;
  getByExternalCategory: (
    connectionId: string,
    externalCategoryId: string,
    catalogId: string
  ) => Promise<CategoryMapping | null>;
  bulkUpsert: (
    connectionId: string,
    catalogId: string,
    mappings: CategoryMappingAssignment[]
  ) => Promise<number>;
  deleteByConnection: (connectionId: string) => Promise<number>;
};

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
