import type { 
  IntegrationDto, 
  IntegrationConnectionDto, 
  ProductListingDto,
  ImageTransformOptionsDto,
  ImageRetryPresetDto,
  TemplateDto,
  TemplateMappingDto,
  ImportExportTemplateDto,
  ImportExportTemplateMappingDto,
  BaseInventoryDto,
  BaseWarehouseDto,
  BaseCategoryDto
} from '../dtos';

export type Integration = IntegrationDto;
export type IntegrationConnection = IntegrationConnectionDto;
export type ProductListing = ProductListingDto;
export type Template = TemplateDto;
export type TemplateMapping = TemplateMappingDto;
export type BaseInventory = BaseInventoryDto;
export type BaseWarehouse = BaseWarehouseDto;
export type BaseCategory = BaseCategoryDto;

export type ListingJob = ProductListingDto & {
  integrationName: string;
  integrationSlug: string;
  connectionName: string;
};

export type ListingAttempt = NonNullable<ProductListingDto['exportHistory']>[number];

export type ProductJob = {
  productId: string;
  productName: string;
  productSku: string | null;
  listings: ListingJob[];
};

export type IntegrationConnectionBasic = {
  id: string;
  name: string;
  integrationId: string;
  traderaDefaultTemplateId?: string | null;
  traderaDefaultDurationHours?: number | null;
  traderaAutoRelistEnabled?: boolean | null;
  traderaAutoRelistLeadMinutes?: number | null;
};

export type IntegrationWithConnections = {
  id: string;
  name: string;
  slug: string;
  connections: IntegrationConnectionBasic[];
};

export type IntegrationWithConnectionsBasic = IntegrationWithConnections;

export type ImageBase64Mode = 'base-only' | 'full-data-uri';

export type ImageTransformOptions = ImageTransformOptionsDto;

export type ImageRetryPreset = ImageRetryPresetDto;

export type ImportExportTemplateMapping = ImportExportTemplateMappingDto;
export type ImportExportTemplate = ImportExportTemplateDto;
