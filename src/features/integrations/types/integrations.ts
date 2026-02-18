import type { TemplateMappingDto, ImageTransformOptionsDto, ImageRetryPresetDto } from '@/shared/contracts/integrations';

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

export type ImageBase64Mode = 'base-only' | 'full-data-uri';

export type ImageTransformOptions = ImageTransformOptionsDto;

export type TemplateMapping = TemplateMappingDto;

export type ExternalCategoryRepository = {
  listCategories: (integrationId: string) => Promise<{ category_id: string; name: string; parent_id: string }[]>;
  syncCategories: (integrationId: string) => Promise<void>;
};

export type CategoryMappingRepository = {
  getMapping: (categoryId: string, integrationId: string) => Promise<string | null>;
  saveMapping: (categoryId: string, integrationId: string, externalId: string) => Promise<void>;
};
