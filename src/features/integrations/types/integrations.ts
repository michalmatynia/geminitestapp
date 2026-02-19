import type { 
  TemplateMappingDto, 
  ImageTransformOptionsDto, 
  ImageRetryPresetDto, 
  ImageBase64ModeDto,
  IntegrationConnectionDto,
  ProductListingDto
} from '@/shared/contracts/integrations';

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
  ImageTransformOptionsDto,
  ImageRetryPresetDto as ImageRetryPreset,
  ImageExportDiagnosticsDto as ImageExportDiagnostics,
  ImageUrlDiagnosticDto as ImageUrlDiagnostic,
  CapturedLogDto as CapturedLog,
  BaseProductRecordDto as BaseProductRecord,
  BaseApiRawResultDto as BaseApiRawResult,
  ImportParameterCacheDto as ImportParameterCache,
} from '@/shared/contracts/integrations';

// Integration domain record types

export type ImageBase64Mode = ImageBase64ModeDto;

export type ImageTransformOptions = ImageTransformOptionsDto;

export type TemplateMapping = TemplateMappingDto;

export type IntegrationRecord = Omit<IntegrationDto, 'createdAt' | 'updatedAt'> & {
  createdAt: string | Date;
  updatedAt: string | Date | null;
};

export type IntegrationConnectionRecord = Omit<IntegrationConnectionDto, 'createdAt' | 'updatedAt' | 'playwrightStorageStateUpdatedAt' | 'traderaApiTokenUpdatedAt'> & {
  createdAt: string | Date;
  updatedAt: string | Date | null;
  playwrightStorageStateUpdatedAt?: string | Date | null;
  traderaApiTokenUpdatedAt?: string | Date | null;
};

export type ProductListingRecord = Omit<ProductListingDto, 'createdAt' | 'updatedAt' | 'listedAt' | 'expiresAt' | 'nextRelistAt' | 'lastRelistedAt' | 'lastStatusCheckAt'> & {
  createdAt: string | Date;
  updatedAt: string | Date;
  listedAt?: string | Date | null;
  expiresAt?: string | Date | null;
  nextRelistAt?: string | Date | null;
  lastRelistedAt?: string | Date | null;
  lastStatusCheckAt?: string | Date | null;
};

export type ExternalCategoryRepository = {
  listCategories: (integrationId: string) => Promise<{ category_id: string; name: string; parent_id: string }[]>;
  syncCategories: (integrationId: string) => Promise<void>;
};

export type CategoryMappingRepository = {
  getMapping: (categoryId: string, integrationId: string) => Promise<string | null>;
  saveMapping: (categoryId: string, integrationId: string, externalId: string) => Promise<void>;
};
