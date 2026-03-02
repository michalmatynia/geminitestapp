export * from './base';
export * from './connections';
export * from './listings';
export * from './producers';
export * from './templates';
export * from './base-com';
export type { ImportTemplateParameterImport as BaseImportParameterImportSettings } from '../data-import-export';

import { z } from 'zod';
import { namedDtoSchema } from '../base';
import {
  productListingSchema,
  type ProductListing,
  type ProductListingExportEvent,
  type CreateProductListing,
  type ProductListingWithDetails,
  type ListingAttempt,
} from './listings';
import { type Integration, type ImageTransformOptions, type ImageRetryPreset } from './base';
import { type IntegrationConnection } from './connections';
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
} from './base-com';

export type {
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
};

import type { ImportTemplateParameterImport } from '../data-import-export';

import {
  type Template,
  type TemplateMapping,
} from './templates';

export type { Template, TemplateMapping };

/**
 * Session DTOs
 */

export const sessionCookieSchema = z.object({
  name: z.string(),
  value: z.string(),
  domain: z.string().optional(),
  path: z.string().optional(),
  expires: z.number().optional(),
  httpOnly: z.boolean().optional(),
  secure: z.boolean().optional(),
  sameSite: z.enum(['lax', 'strict', 'none']).optional(),
});

export type SessionCookie = z.infer<typeof sessionCookieSchema>;

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
 * Operation Logging DTOs
 */

export const capturedLogSchema = z.object({
  timestamp: z.string(),
  level: z.enum(['info', 'warn', 'error', 'debug']),
  message: z.string(),
  context: z.record(z.string(), z.unknown()).nullable().optional(),
});

export type CapturedLog = z.infer<typeof capturedLogSchema>;

/**
 * Connection Testing DTOs
 */

export type TestStatus = 'pending' | 'ok' | 'failed';

export type TestLogEntry = {
  step: string;
  status: TestStatus;
  timestamp: string;
  detail?: string;
};

export type TestConnectionResponse = {
  ok: boolean;
  steps: TestLogEntry[];
  inventoryCount?: number;
  profile?: Record<string, unknown>;
  [key: string]: unknown;
};

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

import {
  type ProductParameterDto as ProductParameter,
  type ProductParameterValueDto as ProductParameterValue,
  type CreateProductParameterDto as ParameterCreateInput,
} from '../products';

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

export const baseApiRawResultSchema = z
  .object({
    status: z.string(),
  })
  .catchall(z.unknown());

export type BaseApiRawResult = z.infer<typeof baseApiRawResultSchema>;

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

export const sessionPayloadSchema = z.object({
  cookies: z.array(sessionCookieSchema).optional(),
  origins: z.array(z.unknown()).optional(),
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
});

export type TraderaListingJobInput = z.infer<typeof traderaListingJobInputSchema>;

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
  'createdAt' | 'updatedAt' | 'playwrightStorageStateUpdatedAt' | 'traderaApiTokenUpdatedAt'
> & {
  createdAt: string | Date;
  updatedAt: string | Date | null;
  playwrightStorageStateUpdatedAt?: string | Date | null;
  traderaApiTokenUpdatedAt?: string | Date | null;
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
  listCategories: (
    integrationId: string
  ) => Promise<{ category_id: string; name: string; parent_id: string }[]>;
  syncCategories: (integrationId: string) => Promise<void>;
};

export type CategoryMappingRepository = {
  getMapping: (categoryId: string, integrationId: string) => Promise<string | null>;
  saveMapping: (categoryId: string, integrationId: string, externalId: string) => Promise<void>;
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
    Array<Pick<ProductListing, 'productId' | 'status' | 'integrationId' | 'marketplaceData'>>
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
] as const;

/**
 * Legacy Integration Type Aliases (Standardized names already defined above)
 */
export type ProductListingRecord = ProductListing;
export type IntegrationWithConnectionsBasic = IntegrationWithConnections;

/**
 * Base Import processing
 */

import type {
  Product as ProductRecord,
  CreateProduct as ProductCreateInput,
} from '../products';

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

// Backward-compatible aliases for modules that still import *Dto names.
export type ImageTransformOptionsDto = ImageTransformOptions;
export type ImageRetryPresetDto = ImageRetryPreset;
export type TemplateMappingDto = TemplateMapping;
export type TemplateDto = Template;
export type BaseInventoryDto = unknown;
export type FetchMarketplaceCategoriesRequestDto = unknown;
export type BulkCategoryMappingRequestDto = unknown;
export type BaseImportItemStatusDto = BaseImportItemStatus;
export type BaseImportModeDto = unknown;
export type BaseImportRunRecordDto = BaseImportRunRecord;
export type BaseImportStartResponseDto = BaseImportStartResponse;
export type BaseImportRunDetailResponseDto = BaseImportRunDetailResponse;
export type BaseImportParameterImportSettingsDto = ImportTemplateParameterImport;
export type SessionCookieDto = SessionCookie;
export type ImageUrlDiagnosticDto = ImageUrlDiagnostic;
export type ImageExportDiagnosticsDto = ImageExportDiagnostics;
export type CapturedLogDto = CapturedLog;
export type IntegrationConnectionBasicDto = IntegrationConnectionBasic;
export type IntegrationWithConnectionsDto = IntegrationWithConnections;
export type ImportParameterCacheResponseDto = ImportParameterCacheResponse;
export type ProductListingExportEventDto = ProductListingExportEvent;
export type ListingAttemptDto = ListingAttempt;

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
