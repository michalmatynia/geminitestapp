import { DtoBase, NamedDto } from '../types/base';

// Integrations DTOs
export interface IntegrationDto extends NamedDto {
  type: string;
  config: Record<string, unknown>;
  enabled: boolean;
}

export interface IntegrationConnectionDto extends NamedDto {
  integrationId: string;
  config: Record<string, unknown>;
  status: 'connected' | 'disconnected' | 'error';
  lastSync: string | null;
}

export interface ProductListingDto extends DtoBase {
  productId: string;
  connectionId: string;
  externalId: string;
  status: 'active' | 'inactive' | 'error';
  lastSync: string | null;
  syncData: Record<string, unknown>;
}

export interface CategoryMappingDto extends DtoBase {
  localCategoryId: string;
  externalCategoryId: string;
  connectionId: string;
  mappingData: Record<string, unknown>;
}

export interface CreateIntegrationDto {
  name: string;
  type: string;
  config: Record<string, unknown>;
  enabled?: boolean;
}

export interface UpdateIntegrationDto {
  name?: string;
  config?: Record<string, unknown>;
  enabled?: boolean;
}

export interface CreateConnectionDto {
  integrationId: string;
  name: string;
  config: Record<string, unknown>;
}

export interface UpdateConnectionDto {
  name?: string;
  config?: Record<string, unknown>;
}
