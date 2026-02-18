import type {
  IntegrationDto,
  IntegrationConnectionDto,
  ProductListingDto,
  ImageTransformOptionsDto,
  ImageRetryPresetDto,
  TemplateDto,
  TemplateMappingDto,
  BaseInventoryDto,
  BaseWarehouseDto,
  BaseCategoryDto,
  IntegrationConnectionBasicDto,
  IntegrationWithConnectionsDto,
  ListingJobDto,
  ProductJobDto,
  ExportJobDetailDto
} from '../../contracts/integrations';

export type Integration = IntegrationDto;
export type IntegrationConnection = IntegrationConnectionDto;
export type ProductListing = ProductListingDto;
export type Template = TemplateDto;
export type TemplateMapping = TemplateMappingDto;
export type BaseInventory = BaseInventoryDto;
export type BaseWarehouse = BaseWarehouseDto;
export type BaseCategory = BaseCategoryDto;

export type ListingJob = ListingJobDto;

export type ListingAttempt = NonNullable<ProductListingDto['exportHistory']>[number];

export type ProductJob = ProductJobDto;

export type ExportJobDetail = ExportJobDetailDto;

export type IntegrationConnectionBasic = IntegrationConnectionBasicDto;

export type IntegrationWithConnections = IntegrationWithConnectionsDto;

export type IntegrationWithConnectionsBasic = IntegrationWithConnections;

export type ImageBase64Mode = 'base-only' | 'full-data-uri';

export type ImageTransformOptions = ImageTransformOptionsDto;

export type ImageRetryPreset = ImageRetryPresetDto;

export type ImportExportTemplateMapping = ImportExportTemplateMappingDto;
export type ImportExportTemplate = ImportExportTemplateDto;
export type ImportTemplateParameterImport = ImportTemplateParameterImportDto;
