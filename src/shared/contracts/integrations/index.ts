import { z } from 'zod';
import { namedDtoSchema } from '@/shared/contracts/base';
import type {
  ProductParameter,
  ProductParameterValue,
  ProductParameterCreateInput as ParameterCreateInput,
} from '@/shared/contracts/products';
import {
  imageRetryPresetSchema,
  type Integration,
  type ImageExportLogger,
  type CapturedLog,
} from './base';
import {
  baseImportPreflightIssueSchema,
  type BaseImportItemStatus,
  type BaseImportItemAction,
  type BaseImportErrorCode,
  type BaseImportErrorClass,
  type BaseImportParameterImportSummary,
  type BaseImportRunRecord,
  type BaseImportRunStatus,
  type BaseImportPreflight,
  type BaseImportStartResponse,
  type BaseImportRunDetailResponse,
  type BaseImportItemRecord,
  type ImportParameterCacheResponse,
  type ExportToBaseVariables,
  type ExportResponse,
  type CategoryMappingAssignment,
} from './base-com';
import type {
  IntegrationConnection,
  ConnectionDeleteOptions,
  ConnectionDependencyCounts,
  ConnectionFormState,
  StepWithResult,
  SaveConnectionOptions,
} from './connections';
import {
  playwrightRelistBrowserModeSchema,
  productListingSchema,
  type BaseCategory,
  type CategoryMapping,
  type CategoryMappingCreateInput,
  type CategoryMappingUpdateInput,
  type CategoryMappingWithDetails,
  type ProductListing,
  type ProductListingExportEvent,
  type CreateProductListing,
  type ProductListingWithDetails,
  type ExternalCategory,
  type ExternalCategoryWithChildren,
} from './listings';
import type { ImportTemplateParameterImport } from './templates';

export * from './base';
export * from './connections';
export * from './listings';
export * from './marketplace';
export * from './mongo';
export * from './oauth';
export * from './producers';
export * from './context';
export {
  integrationTemplateMappingSchema,
  type IntegrationTemplateMapping,
  integrationTemplateSchema,
  type IntegrationTemplate,
  importTemplateParameterImportSchema,
  type ImportTemplateParameterImport,
  createIntegrationTemplateSchema,
  type CreateIntegrationTemplate,
  type UpdateIntegrationTemplate,
} from './templates';
export * from './base-com';
export {
  importExportTemplateSchema,
  createImportExportTemplateSchema,
  baseImportInventoriesPayloadSchema,
  baseImportInventoriesResponseSchema,
  baseImportWarehousesPayloadSchema,
  baseImportWarehousesResponseSchema,
  baseImportWarehousesDebugPayloadSchema,
  baseImportWarehousesDebugResponseSchema,
  baseImportListPayloadSchema,
  baseImportListResponseSchema,
  baseImportParametersPayloadSchema,
  baseImportParametersResponseSchema,
  baseImportParametersClearResponseSchema,
} from './import-export';
export type {
  BaseImportInventoriesPayload,
  BaseImportInventoriesResponse,
  BaseImportListPayload,
  BaseImportListResponse,
  BaseImportParametersPayload,
  BaseImportParametersResponse,
  BaseImportParametersClearResponse,
  ImportExportTemplateCreateInput,
  BaseImportWarehousesPayload,
  BaseImportWarehousesResponse,
  BaseImportWarehousesDebugPayload,
  BaseImportWarehousesDebugResponse,
  CatalogOption,
  DebugWarehouses,
  ExportParameterDoc,
  ImportExportTemplate,
  ImportExportTemplateMapping,
  ImportExportTemplateMappingDto,
  ImportListItem,
  ImportListStats,
  ImportResponse,
  ImportRunDetail,
  InventoryOption,
  Template,
  TemplateMapping,
  WarehouseOption,
} from './import-export';

export type {
  Integration,
  ProductListing,
  BaseImportItemStatus,
  BaseImportItemAction,
  BaseImportErrorCode,
  BaseImportErrorClass,
  BaseImportParameterImportSummary,
  BaseImportRunRecord,
  BaseImportRunStatus,
  BaseImportPreflight,
  BaseImportStartResponse,
  BaseImportRunDetailResponse,
  BaseImportItemRecord,
  ImportParameterCacheResponse,
  ExportToBaseVariables,
  ExportResponse,
  ImageExportLogger,
  ConnectionDeleteOptions,
  ConnectionDependencyCounts,
  CapturedLog,
  ConnectionFormState,
  StepWithResult,
  SaveConnectionOptions,
};

/**
 * Session DTOs
 */

const sessionCookieSameSiteSchema = z
  .enum(['lax', 'strict', 'none', 'Lax', 'Strict', 'None'])
  .transform((value) => value.toLowerCase() as 'lax' | 'strict' | 'none');

export const sessionCookieSchema = z.object({
  name: z.string(),
  value: z.string(),
  domain: z.string().optional(),
  path: z.string().optional(),
  expires: z.number().optional(),
  httpOnly: z.boolean().optional(),
  secure: z.boolean().optional(),
  sameSite: sessionCookieSameSiteSchema.optional(),
});

export type SessionCookie = z.infer<typeof sessionCookieSchema>;

export const sessionOriginLocalStorageEntrySchema = z.object({
  name: z.string(),
  value: z.string(),
});

export type SessionOriginLocalStorageEntry = z.infer<typeof sessionOriginLocalStorageEntrySchema>;

export const sessionOriginSchema = z.object({
  origin: z.string(),
  localStorage: z.array(sessionOriginLocalStorageEntrySchema),
});

export type SessionOrigin = z.infer<typeof sessionOriginSchema>;

export const playwrightStorageStateSchema = z.object({
  cookies: z.array(sessionCookieSchema),
  origins: z.array(sessionOriginSchema),
});

export type PlaywrightStorageState = z.infer<typeof playwrightStorageStateSchema>;

/**
 * Image Diagnostic DTOs
 */

export const imageUrlDiagnosticSchema = z.object({
  url: z.string(),
  status: z.enum(['ok', 'error', 'pending', 'missing']),
  error: z.string().nullable().optional(),
  size: z.number().nullable().optional(),
  mimetype: z.string().nullable().optional(),
  dimensions: z
    .object({
      width: z.number(),
      height: z.number(),
    })
    .nullable()
    .optional(),
});

export type ImageUrlDiagnostic = z.infer<typeof imageUrlDiagnosticSchema>;

export const imageExportDiagnosticsSchema = z.object({
  listingId: z.string(),
  productId: z.string(),
  checkedAt: z.string(),
  images: z.array(imageUrlDiagnosticSchema),
});

export type ImageExportDiagnostics = z.infer<typeof imageExportDiagnosticsSchema>;

/**
 * Connection Testing DTOs
 */

export const testStatusSchema = z.enum(['pending', 'ok', 'failed']);

export type TestStatus = z.infer<typeof testStatusSchema>;

export const testLogEntrySchema = z.object({
  step: z.string(),
  status: testStatusSchema,
  timestamp: z.string(),
  detail: z.string().optional(),
});

export type TestLogEntry = z.infer<typeof testLogEntrySchema>;

export const testConnectionResponseSchema = z
  .object({
    ok: z.boolean(),
    steps: z.array(testLogEntrySchema),
    inventoryCount: z.number().optional(),
    profile: z.unknown().optional(),
    sessionReady: z.boolean().optional(),
  })
  .passthrough();

export type TestConnectionResponse = z.infer<typeof testConnectionResponseSchema>;

export const integrationConnectionActionTargetSchema = z.object({
  integrationId: z.string().trim().min(1),
  connectionId: z.string().trim().min(1),
});

export type IntegrationConnectionActionTarget = z.infer<
  typeof integrationConnectionActionTargetSchema
>;

export const integrationConnectionTestTypeSchema = z.enum(['test', 'base/test', 'allegro/test']);

export type IntegrationConnectionTestType = z.infer<typeof integrationConnectionTestTypeSchema>;

export const integrationConnectionTestModeSchema = z.enum([
  'auto',
  'manual',
  'quicklist_preflight',
]);

export type IntegrationConnectionTestMode = z.infer<typeof integrationConnectionTestModeSchema>;

export const integrationConnectionTestRequestSchema = z.object({
  mode: integrationConnectionTestModeSchema.optional().catch(undefined),
  manualTimeoutMs: z.number().int().positive().optional().catch(undefined),
});

export type IntegrationConnectionTestRequest = z.infer<typeof integrationConnectionTestRequestSchema>;

export const integrationConnectionTestVariablesSchema =
  integrationConnectionActionTargetSchema.extend({
    type: integrationConnectionTestTypeSchema.optional(),
    body: z.record(z.string(), z.unknown()).optional(),
    timeoutMs: z.number().int().positive().optional(),
  });

export type IntegrationConnectionTestVariables = z.infer<
  typeof integrationConnectionTestVariablesSchema
>;

export const integrationBaseApiPayloadSchema = z.object({
  method: z.string().trim().min(1),
  parameters: z.unknown().optional(),
});

export type IntegrationBaseApiPayload = z.infer<typeof integrationBaseApiPayloadSchema>;

export const integrationBaseApiRequestSchema = integrationConnectionActionTargetSchema.extend(
  integrationBaseApiPayloadSchema.shape
);

export type IntegrationBaseApiRequest = z.infer<typeof integrationBaseApiRequestSchema>;

export const integrationBaseApiResponseSchema = z.object({
  data: z.unknown().optional(),
});

export type IntegrationBaseApiResponse = z.infer<typeof integrationBaseApiResponseSchema>;

export const integrationAllegroApiMethodSchema = z.enum(['GET', 'POST', 'PUT', 'PATCH', 'DELETE']);

export type IntegrationAllegroApiMethod = z.infer<typeof integrationAllegroApiMethodSchema>;

export const integrationAllegroApiPayloadSchema = z.object({
  method: integrationAllegroApiMethodSchema,
  path: z.string().trim().min(1),
  body: z.unknown().optional(),
});

export type IntegrationAllegroApiPayload = z.infer<typeof integrationAllegroApiPayloadSchema>;

export const integrationAllegroApiRequestSchema = integrationConnectionActionTargetSchema.extend(
  integrationAllegroApiPayloadSchema.shape
);

export type IntegrationAllegroApiRequest = z.infer<typeof integrationAllegroApiRequestSchema>;

export const integrationAllegroApiResponseSchema = z.object({
  status: z.number().int(),
  statusText: z.string(),
  data: z.unknown().optional(),
  refreshed: z.boolean().optional(),
});

export type IntegrationAllegroApiResponse = z.infer<typeof integrationAllegroApiResponseSchema>;

export const integrationDisconnectResponseSchema = z.object({
  ok: z.boolean(),
});

export type IntegrationDisconnectResponse = z.infer<typeof integrationDisconnectResponseSchema>;

export const baseActiveTemplatePreferencePayloadSchema = z.object({
  templateId: z.string().trim().min(1).nullable().optional(),
});

export type BaseTemplatePreferencePayload = z.infer<typeof baseActiveTemplatePreferencePayloadSchema>;

export const basePreferenceScopeSchema = z.object({
  connectionId: z.string().trim().min(1).nullable().optional(),
  inventoryId: z.string().trim().min(1).nullable().optional(),
});

export type BasePreferenceScope = z.infer<typeof basePreferenceScopeSchema>;

export const baseScopedPreferenceQuerySchema = basePreferenceScopeSchema;

export type BaseScopedPreferenceQuery = z.infer<typeof baseScopedPreferenceQuerySchema>;

export const baseScopedTemplatePreferencePayloadSchema = baseActiveTemplatePreferencePayloadSchema.merge(
  basePreferenceScopeSchema
);

export type BaseActiveTemplatePreferencePayload = z.infer<
  typeof baseScopedTemplatePreferencePayloadSchema
>;

export const baseActiveTemplatePreferenceResponseSchema = z.object({
  templateId: z.string().nullable(),
});

export type BaseActiveTemplatePreferenceResponse = z.infer<
  typeof baseActiveTemplatePreferenceResponseSchema
>;

export const baseDefaultInventoryPreferencePayloadSchema = z.object({
  inventoryId: z.string().trim().min(1).nullable().optional(),
});

export type BaseDefaultInventoryPreferencePayload = z.infer<
  typeof baseDefaultInventoryPreferencePayloadSchema
>;

export const baseDefaultInventoryPreferenceResponseSchema = z.object({
  inventoryId: z.string().nullable(),
});

export type BaseDefaultInventoryPreferenceResponse = z.infer<
  typeof baseDefaultInventoryPreferenceResponseSchema
>;

export const baseExportWarehousePreferencePayloadSchema = z.object({
  warehouseId: z.string().trim().min(1).nullable().optional(),
  inventoryId: z.string().trim().min(1),
});

export type BaseExportWarehousePreferencePayload = z.infer<
  typeof baseExportWarehousePreferencePayloadSchema
>;

export const baseExportWarehousePreferenceQuerySchema = z.object({
  inventoryId: z.string().trim().min(1).nullable().optional(),
});

export type BaseExportWarehousePreferenceQuery = z.infer<
  typeof baseExportWarehousePreferenceQuerySchema
>;

export const baseExportWarehousePreferenceResponseSchema = z.object({
  warehouseId: z.string().nullable(),
});

export type BaseExportWarehousePreferenceResponse = z.infer<
  typeof baseExportWarehousePreferenceResponseSchema
>;

export const baseDefaultConnectionPreferencePayloadSchema = z.object({
  connectionId: z.string().trim().min(1).nullable().optional(),
});

export type BaseDefaultConnectionPreferencePayload = z.infer<
  typeof baseDefaultConnectionPreferencePayloadSchema
>;

export const baseDefaultConnectionPreferenceResponseSchema = z.object({
  connectionId: z.string().nullable(),
});

export type BaseDefaultConnectionPreferenceResponse = z.infer<
  typeof baseDefaultConnectionPreferenceResponseSchema
>;

export const traderaDefaultConnectionPreferencePayloadSchema = z.object({
  connectionId: z.string().trim().min(1).nullable().optional(),
});

export type TraderaDefaultConnectionPreferencePayload = z.infer<
  typeof traderaDefaultConnectionPreferencePayloadSchema
>;

export const traderaDefaultConnectionPreferenceResponseSchema = z.object({
  connectionId: z.string().nullable(),
});

export type TraderaDefaultConnectionPreferenceResponse = z.infer<
  typeof traderaDefaultConnectionPreferenceResponseSchema
>;

export const baseStockFallbackPreferencePayloadSchema = z.object({
  enabled: z.boolean(),
});

export type BaseStockFallbackPreferencePayload = z.infer<
  typeof baseStockFallbackPreferencePayloadSchema
>;

export const baseStockFallbackPreferenceResponseSchema = z.object({
  enabled: z.boolean(),
});

export type BaseStockFallbackPreferenceResponse = z.infer<
  typeof baseStockFallbackPreferenceResponseSchema
>;

export const baseImageRetryPresetsPayloadSchema = z.object({
  presets: z.array(imageRetryPresetSchema).min(1),
});

export type BaseImageRetryPresetsPayload = z.infer<typeof baseImageRetryPresetsPayloadSchema>;

export const baseImageRetryPresetsResponseSchema = z.object({
  presets: z.array(imageRetryPresetSchema),
});

export type BaseImageRetryPresetsResponse = z.infer<typeof baseImageRetryPresetsResponseSchema>;

export const baseSyncAllImagesResponseSchema = z.object({
  status: z.literal('ok'),
  jobId: z.string(),
});

export type BaseSyncAllImagesResponse = z.infer<typeof baseSyncAllImagesResponseSchema>;

export const baseSampleProductPayloadSchema = z.object({
  inventoryId: z.string().trim().optional().nullable(),
  productId: z.string().trim().min(1).optional(),
  connectionId: z.string().trim().min(1).optional(),
  saveOnly: z.boolean().optional(),
});

export type BaseSampleProductPayload = z.infer<typeof baseSampleProductPayloadSchema>;

export const baseSampleProductResponseSchema = z.object({
  productId: z.string().nullable().optional(),
  inventoryId: z.string().nullable().optional(),
});

export type BaseSampleProductResponse = z.infer<typeof baseSampleProductResponseSchema>;

/**
 * Parameter Import DTOs
 */

export type ExtractedBaseParameter = {
  baseParameterId: string | null;
  namesByLanguage: Record<string, string>;
  valuesByLanguage: Record<string, string>;
};

export type BaseParameterImportSummary = {
  extracted: number;
  resolved: number;
  created: number;
  written: number;
};

export type ApplyBaseParameterImportInput = {
  settings: ImportTemplateParameterImport;
  record: Record<string, unknown>;
  templateMappings: Array<{ sourceKey: string; targetField: string }>;
  existingValues: ProductParameterValue[];
  catalogId: string;
  catalogLanguageCodes: string[];
  defaultLanguageCode?: string | null;
  connectionId?: string | null;
  inventoryId?: string | null;
  prefetchedParameters?: ProductParameter[] | null;
  prefetchedLinks?: Record<string, string> | null;
  parameterRepository: {
    listParameters: (input: { catalogId: string }) => Promise<ProductParameter[]>;
    createParameter: (input: ParameterCreateInput) => Promise<ProductParameter>;
  };
};

export type ApplyBaseParameterImportResult = {
  applied: boolean;
  parameters: ProductParameterValue[];
  summary: {
    extracted: number;
    resolved: number;
    created: number;
    written: number;
  };
};

/**
 * Integration Domain DTOs
 */

export const integrationConnectionBasicSchema = z.object({
  id: z.string(),
  name: z.string(),
  integrationId: z.string(),
  traderaBrowserMode: z.enum(['builtin', 'scripted']).nullable().optional(),
  hasPlaywrightListingScript: z.boolean().optional(),
  traderaDefaultTemplateId: z.string().nullable().optional(),
  traderaDefaultDurationHours: z.number().nullable().optional(),
  traderaAutoRelistEnabled: z.boolean().nullable().optional(),
  traderaAutoRelistLeadMinutes: z.number().nullable().optional(),
  traderaApiAppId: z.number().nullable().optional(),
  traderaApiPublicKey: z.string().nullable().optional(),
  traderaApiUserId: z.number().nullable().optional(),
  traderaApiSandbox: z.boolean().nullable().optional(),
});

export type IntegrationConnectionBasic = z.infer<typeof integrationConnectionBasicSchema>;

export const integrationWithConnectionsSchema = namedDtoSchema.extend({
  slug: z.string(),
  connections: z.array(integrationConnectionBasicSchema),
});

export type IntegrationWithConnections = z.infer<typeof integrationWithConnectionsSchema>;

export const listingJobSchema = productListingSchema.extend({
  integrationName: z.string(),
  integrationSlug: z.string(),
  connectionName: z.string(),
});

export type ListingJob = z.infer<typeof listingJobSchema>;

export const productJobSchema = z.object({
  productId: z.string(),
  productName: z.string(),
  productSku: z.string().nullable(),
  listings: z.array(listingJobSchema),
});

export type ProductJob = z.infer<typeof productJobSchema>;

export type ListingRow = {
  job: ProductJob;
  listing: ListingJob;
};

export const exportJobDetailSchema = z.object({
  job: productJobSchema,
  listing: listingJobSchema,
});

export type ExportJobDetail = z.infer<typeof exportJobDetailSchema>;

/**
 * Base.com API DTOs
 */

export const baseProductRecordSchema = z.record(z.string(), z.unknown());
export type BaseProductRecord = z.infer<typeof baseProductRecordSchema>;

export const importParameterCacheSchema = z.object({
  key: z.string(),
  value: z.unknown(),
  expiresAt: z.number(),
});

export type ImportParameterCache = z.infer<typeof importParameterCacheSchema>;

export const baseApiResponseSchema = z
  .object({
    status: z.string().optional(),
    error_code: z.string().optional(),
    error_message: z.string().optional(),
  })
  .catchall(z.unknown());

export type BaseApiResponse = z.infer<typeof baseApiResponseSchema>;

export const baseApiRawResultSchema = z.object({
  ok: z.boolean(),
  statusCode: z.number(),
  payload: baseApiResponseSchema.nullable(),
  error: z.string().optional(),
});

export type BaseApiRawResult = z.infer<typeof baseApiRawResultSchema>;

export const priceGroupLookupSchema = z.object({
  id: z.string(),
  groupId: z.string().nullable().optional(),
  currencyId: z.string().nullable().optional(),
  currencyCode: z.string().nullable().optional(),
  isDefault: z.boolean().optional(),
});

export type PriceGroupLookup = z.infer<typeof priceGroupLookupSchema>;

export const baseConnectionContextSchema = z.object({
  baseIntegrationId: z.string().nullable(),
  connectionId: z.string().nullable(),
  token: z.string().nullable(),
  issue: baseImportPreflightIssueSchema.nullable(),
});

export type BaseConnectionContext = z.infer<typeof baseConnectionContextSchema>;

/**
 * Tradera API DTOs
 */

export const traderaApiCredentialsSchema = z.object({
  appId: z.number(),
  appKey: z.string(),
  userId: z.number(),
  token: z.string(),
  sandbox: z.boolean().optional(),
  maxResultAgeSeconds: z.number().optional(),
});

export type TraderaApiCredentials = z.infer<typeof traderaApiCredentialsSchema>;

export const traderaApiUserInfoSchema = z.object({
  userId: z.number(),
  alias: z.string().nullable(),
  email: z.string().nullable(),
  firstName: z.string().nullable(),
  lastName: z.string().nullable(),
});

export type TraderaApiUserInfo = z.infer<typeof traderaApiUserInfoSchema>;

export const traderaAddShopItemInputSchema = z.object({
  title: z.string(),
  description: z.string(),
  categoryId: z.number(),
  price: z.number(),
  quantity: z.number(),
  shippingCondition: z.string(),
  paymentCondition: z.string(),
  acceptedBuyerId: z.number().optional(),
});

export type TraderaAddShopItemInput = z.infer<typeof traderaAddShopItemInputSchema>;

export const traderaAddShopItemResultSchema = z.object({
  itemId: z.number(),
  requestId: z.number().nullable(),
  resultCode: z.string().nullable(),
  resultMessage: z.string().nullable(),
});

export type TraderaAddShopItemResult = z.infer<typeof traderaAddShopItemResultSchema>;

/**
 * Session & Payload DTOs
 */

export const sessionPayloadSchema = playwrightStorageStateSchema.partial().extend({
  updatedAt: z.string().optional(),
  error: z.string().optional(),
});

export type SessionPayload = z.infer<typeof sessionPayloadSchema>;

/**
 * Tradera System Settings DTO
 */

export const traderaSystemSettingsSchema = z.object({
  defaultDurationHours: z.number(),
  autoRelistEnabled: z.boolean(),
  autoRelistLeadMinutes: z.number(),
  schedulerEnabled: z.boolean(),
  schedulerIntervalMs: z.number(),
  allowSimulatedSuccess: z.boolean(),
  listingFormUrl: z.string(),
  selectorProfile: z.string(),
});

export type TraderaSystemSettings = z.infer<typeof traderaSystemSettingsSchema>;

export const traderaListingJobInputSchema = z.object({
  listingId: z.string(),
  action: z.enum(['list', 'relist']),
  source: z.enum(['manual', 'scheduler', 'api']).optional(),
  jobId: z.string().optional(),
  browserMode: playwrightRelistBrowserModeSchema.optional(),
});

export type TraderaListingJobInput = z.infer<typeof traderaListingJobInputSchema>;

export const playwrightListingJobInputSchema = z.object({
  listingId: z.string(),
  action: z.enum(['list', 'relist']),
  source: z.enum(['manual', 'scheduler', 'api']).optional(),
  jobId: z.string().optional(),
  browserMode: playwrightRelistBrowserModeSchema.optional(),
});

export type PlaywrightListingJobInput = z.infer<typeof playwrightListingJobInputSchema>;

export const traderaCategoryRecordSchema = z.object({
  id: z.string(),
  name: z.string(),
  parentId: z.string(),
});

export type TraderaCategoryRecord = z.infer<typeof traderaCategoryRecordSchema>;

/**
 * Base.com Listing processing
 */

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
    input: Partial<IntegrationConnectionRecord>
  ) => Promise<IntegrationConnectionRecord>;
  deleteConnection: (
    id: string,
    options?: { replacementConnectionId?: string | null }
  ) => Promise<void>;
};

export type ExternalCategoryRepository = {
  syncFromBase: (connectionId: string, categories: BaseCategory[]) => Promise<number>;
  listByConnection: (connectionId: string) => Promise<ExternalCategory[]>;
  getTreeByConnection: (connectionId: string) => Promise<ExternalCategoryWithChildren[]>;
  getById: (id: string) => Promise<ExternalCategory | null>;
  getByExternalId: (
    connectionId: string,
    externalId: string
  ) => Promise<ExternalCategory | null>;
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

/**
 * Integration UI Constants
 */

export const integrationDefinitions = [
  { name: 'Tradera', slug: 'tradera' },
  { name: 'Tradera API', slug: 'tradera-api' },
  { name: 'Allegro', slug: 'allegro' },
  { name: 'Baselinker', slug: 'baselinker' },
  { name: 'LinkedIn', slug: 'linkedin' },
  { name: 'Playwright (Programmable)', slug: 'playwright-programmable' },
] as const;

/**
 * Base Import processing
 */

import type { Product as ProductRecord, CreateProduct as ProductCreateInput } from '../products';

export type ImportDecision =
  | { type: 'create' }
  | { type: 'update'; target: ProductRecord }
  | { type: 'skip'; code: BaseImportErrorCode; message: string }
  | { type: 'fail'; code: BaseImportErrorCode; message: string };

export type ProcessItemResult = {
  status: Exclude<BaseImportItemStatus, 'pending' | 'processing'>;
  action: BaseImportItemAction | null;
  importedProductId?: string | null;
  baseProductId?: string | null;
  sku?: string | null;
  errorCode?: BaseImportErrorCode | null;
  errorClass?: BaseImportErrorClass | null;
  errorMessage?: string | null;
  retryable?: boolean | null;
  nextRetryAt?: string | null;
  lastErrorAt?: string | null;
  payloadSnapshot?: ProductCreateInput | null;
  parameterImportSummary?: BaseImportParameterImportSummary | null;
};

export type NormalizedMappedProduct = ProductCreateInput & {
  producerIds?: string[];
  tagIds?: string[];
};

export const defaultBaseImportParameterImportSettings: ImportTemplateParameterImport = {
  enabled: false,
  mode: 'all',
  languageScope: 'catalog_languages',
  createMissingParameters: false,
  overwriteExistingValues: false,
  matchBy: 'base_id_then_name',
};

export const normalizeBaseImportParameterImportSettings = (
  value: unknown
): ImportTemplateParameterImport => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return { ...defaultBaseImportParameterImportSettings };
  }
  const v = value as Record<string, unknown>;
  return {
    enabled:
      typeof v['enabled'] === 'boolean'
        ? v['enabled']
        : defaultBaseImportParameterImportSettings.enabled,
    mode: v['mode'] === 'mapped' ? 'mapped' : 'all',
    languageScope: v['languageScope'] === 'default_only' ? 'default_only' : 'catalog_languages',
    createMissingParameters:
      typeof v['createMissingParameters'] === 'boolean'
        ? v['createMissingParameters']
        : defaultBaseImportParameterImportSettings.createMissingParameters,
    overwriteExistingValues:
      typeof v['overwriteExistingValues'] === 'boolean'
        ? v['overwriteExistingValues']
        : defaultBaseImportParameterImportSettings.overwriteExistingValues,
    matchBy: v['matchBy'] === 'name_only' ? 'name_only' : 'base_id_then_name',
  };
};
