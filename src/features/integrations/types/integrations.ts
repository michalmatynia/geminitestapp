import type { TemplateMappingDto } from '@/shared/contracts/integrations';

// DTO type exports
export type {
  IntegrationDto,
  IntegrationConnectionDto,
  ProductListingDto,
  CategoryMappingDto,
  CreateIntegrationDto,
  UpdateIntegrationDto,
  CreateIntegrationConnectionDto as CreateConnectionDto,
  UpdateIntegrationConnectionDto as UpdateConnectionDto,
  TemplateMappingDto,
  TemplateDto as Template,
  BaseInventoryDto as BaseInventory,
  BaseWarehouseDto as BaseWarehouse,
  BaseCategoryDto as BaseCategory,
} from '@/shared/contracts/integrations';

// Integration domain record types
export type IntegrationRecord = {
  id: string;
  name: string;
  slug: string;
  createdAt: Date;
  updatedAt: Date;
};

export type IntegrationConnectionRecord = {
  id: string;
  integrationId: string;
  name: string;
  username: string;
  password: string;
  playwrightStorageState?: string | null;
  playwrightStorageStateUpdatedAt?: Date | null;
  playwrightHeadless?: boolean | null;
  playwrightSlowMo?: number | null;
  playwrightTimeout?: number | null;
  playwrightNavigationTimeout?: number | null;
  playwrightHumanizeMouse?: boolean | null;
  playwrightMouseJitter?: number | null;
  playwrightClickDelayMin?: number | null;
  playwrightClickDelayMax?: number | null;
  playwrightInputDelayMin?: number | null;
  playwrightInputDelayMax?: number | null;
  playwrightActionDelayMin?: number | null;
  playwrightActionDelayMax?: number | null;
  playwrightProxyEnabled?: boolean | null;
  playwrightProxyServer?: string | null;
  playwrightProxyUsername?: string | null;
  playwrightProxyPassword?: string | null;
  playwrightEmulateDevice?: boolean | null;
  playwrightDeviceName?: string | null;
  allegroAccessToken?: string | null;
  allegroRefreshToken?: string | null;
  allegroTokenType?: string | null;
  allegroScope?: string | null;
  allegroExpiresAt?: Date | null;
  allegroTokenUpdatedAt?: Date | null;
  allegroUseSandbox?: boolean | null;
  baseApiToken?: string | null;
  baseTokenUpdatedAt?: Date | null;
  baseLastInventoryId?: string | null;
  createdAt: Date;
  updatedAt: Date;
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
    input: { name: string; username: string; password: string }
  ) => Promise<IntegrationConnectionRecord>;
  updateConnection: (
    id: string,
    input: Partial<IntegrationConnectionRecord>
  ) => Promise<IntegrationConnectionRecord>;
  deleteConnection: (id: string) => Promise<void>;
};

export interface CapturedLog {
  level: 'info' | 'warn' | 'error' | 'debug';
  message: string;
  timestamp: string;
  context?: Record<string, unknown>;
}

export type ImageExportDiagnostics = {
  total: number;
  successful: number;
  failed: number;
  skipped: number;
  errors: Array<{
    imageId: string;
    error: string;
  }>;
};

export type ImageBase64Mode = 'base-only' | 'full-data-uri';

export type ImageTransformOptions = {
  maxWidth?: number;
  maxHeight?: number;
  quality?: number;
  format?: 'jpeg' | 'png' | 'webp';
};

export type ImageUrlDiagnostic = {
  url: string;
  status: 'valid' | 'invalid' | 'unreachable';
  error?: string;
};

export type TemplateMapping = TemplateMappingDto;

export type ImportParameterCache = {
  key: string;
  value: unknown;
  expiresAt: number;
};

export type BaseProductRecord = Record<string, unknown>;

export type BaseApiRawResult = {
  status: string;
  [key: string]: unknown;
};

export type ExternalCategoryRepository = {
  listCategories: (integrationId: string) => Promise<{ category_id: string; name: string; parent_id: string }[]>;
  syncCategories: (integrationId: string) => Promise<void>;
};

export type CategoryMappingRepository = {
  getMapping: (categoryId: string, integrationId: string) => Promise<string | null>;
  saveMapping: (categoryId: string, integrationId: string, externalId: string) => Promise<void>;
};
