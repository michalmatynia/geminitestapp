// Integrations DTOs
export interface IntegrationDto {
  id: string;
  name: string;
  type: string;
  config: Record<string, unknown>;
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface IntegrationConnectionDto {
  id: string;
  integrationId: string;
  name: string;
  config: Record<string, unknown>;
  status: 'connected' | 'disconnected' | 'error';
  lastSync: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ProductListingDto {
  id: string;
  productId: string;
  connectionId: string;
  externalId: string;
  status: 'active' | 'inactive' | 'error';
  lastSync: string | null;
  syncData: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface CategoryMappingDto {
  id: string;
  localCategoryId: string;
  externalCategoryId: string;
  connectionId: string;
  mappingData: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
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
