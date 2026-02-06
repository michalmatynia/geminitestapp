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

export interface ProductListingDto extends DtoBase {
  productId: string;
  integrationId: string;
  connectionId: string;
  externalListingId: string | null;
  inventoryId: string | null;
  status: string;
  listedAt: string | null;
  exportHistory: any;
}

export interface CategoryMappingDto extends DtoBase {
  connectionId: string;
  externalCategoryId: string;
  internalCategoryId: string;
  catalogId: string;
  isActive: boolean;
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
