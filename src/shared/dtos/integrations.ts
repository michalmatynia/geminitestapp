import { DtoBase, NamedDto } from '../types/base';

// Integrations DTOs
export interface IntegrationDto extends NamedDto {
  slug: string;
}

export interface IntegrationConnectionDto extends NamedDto {
  integrationId: string;
  username?: string;
  password?: string;
  playwrightStorageState?: string | null;
  playwrightStorageStateUpdatedAt?: string | null;
  playwrightHeadless?: boolean;
  playwrightSlowMo?: number;
  playwrightTimeout?: number;
  playwrightNavigationTimeout?: number;
  playwrightHumanizeMouse?: boolean;
  playwrightMouseJitter?: number;
  playwrightClickDelayMin?: number;
  playwrightClickDelayMax?: number;
  playwrightInputDelayMin?: number;
  playwrightInputDelayMax?: number;
  playwrightActionDelayMin?: number;
  playwrightActionDelayMax?: number;
  playwrightProxyEnabled?: boolean;
  playwrightProxyServer?: string | null;
  playwrightProxyUsername?: string | null;
  playwrightProxyPassword?: string | null;
  playwrightEmulateDevice?: boolean;
  playwrightDeviceName?: string | null;
  allegroAccessToken?: string | null;
  allegroRefreshToken?: string | null;
  allegroTokenType?: string | null;
  allegroScope?: string | null;
  allegroExpiresAt?: string | null;
  allegroTokenUpdatedAt?: string | null;
  allegroUseSandbox?: boolean;
  baseApiToken?: string | null;
  baseTokenUpdatedAt?: string | null;
  baseLastInventoryId?: string | null;
}

export interface ProductListingExportEventDto {
  exportedAt: string;
  status?: string | null;
  inventoryId?: string | null;
  templateId?: string | null;
  warehouseId?: string | null;
  externalListingId?: string | null;
  fields?: string[] | null;
  requestId?: string | null;
}

export interface ProductListingDto extends DtoBase {
  productId: string;
  integrationId: string;
  connectionId: string;
  externalListingId: string | null;
  inventoryId: string | null;
  status: string;
  listedAt: string | null;
  exportHistory: ProductListingExportEventDto[] | null;
}

export interface CategoryMappingDto extends DtoBase {
  connectionId: string;
  externalCategoryId: string;
  internalCategoryId: string;
  catalogId: string;
  isActive: boolean;
}

export interface CategoryMappingInputDto {
  externalCategoryId: string;
  internalCategoryId: string | null;
}

export interface BulkCategoryMappingRequestDto {
  connectionId: string;
  catalogId: string;
  mappings: CategoryMappingInputDto[];
}

export interface FetchMarketplaceCategoriesRequestDto {
  connectionId: string;
}

export interface CreateIntegrationDto {
  name: string;
  slug: string;
}

export interface UpdateIntegrationDto extends Partial<CreateIntegrationDto> {}

export interface CreateIntegrationConnectionDto {
  integrationId: string;
  name: string;
  username: string;
  password: string;
}

export interface UpdateIntegrationConnectionDto extends Partial<CreateIntegrationConnectionDto> {
  playwrightStorageState?: string | null;
  playwrightHeadless?: boolean;
  playwrightSlowMo?: number;
  playwrightTimeout?: number;
  playwrightNavigationTimeout?: number;
  playwrightHumanizeMouse?: boolean;
  playwrightMouseJitter?: number;
  playwrightClickDelayMin?: number;
  playwrightClickDelayMax?: number;
  playwrightInputDelayMin?: number;
  playwrightInputDelayMax?: number;
  playwrightActionDelayMin?: number;
  playwrightActionDelayMax?: number;
  playwrightProxyEnabled?: boolean;
  playwrightProxyServer?: string | null;
  playwrightProxyUsername?: string | null;
  playwrightProxyPassword?: string | null;
  playwrightEmulateDevice?: boolean;
  playwrightDeviceName?: string | null;
  allegroAccessToken?: string | null;
  allegroRefreshToken?: string | null;
  allegroTokenType?: string | null;
  allegroScope?: string | null;
  allegroExpiresAt?: string | null;
  allegroUseSandbox?: boolean;
  baseApiToken?: string | null;
  baseLastInventoryId?: string | null;
}

/**
 * Field mapping for a data template.
 */
export interface TemplateMappingDto {
  sourceField: string;
  targetField: string;
  transform?: string;
}

/**
 * Template for data import/export between system and external providers.
 */
export interface TemplateDto extends NamedDto {
  description?: string;
  provider: string;
  mapping: TemplateMappingDto[];
  config: Record<string, unknown>;
}

/**
 * Base.com Inventory metadata.
 */
export interface BaseInventoryDto {
  inventory_id: string;
  name: string;
  is_default: boolean;
}

/**
 * Base.com Warehouse metadata.
 */
export interface BaseWarehouseDto {
  warehouse_id: string;
  name: string;
  is_default: boolean;
}

/**
 * Base.com Category metadata.
 */
export interface BaseCategoryDto {
  category_id: string;
  name: string;
  parent_id: string;
}
