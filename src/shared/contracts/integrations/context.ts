import type {
  BulkCategoryMappingRequest,
  Integration,
  IntegrationConnection,
  CategoryMappingWithDetails,
  ExternalCategory,
  MarketplaceBulkUpsertResponse,
  MarketplaceConnectionRequest,
  MarketplaceFetchResponse,
} from './index';
import type { PlaywrightPersona } from '../playwright';
import type { CatalogRecord, ProductCategory } from '../products';
import type { LabelValueOptionDto as InternalCategoryOption } from '../ui';
import type { UseMutationResult } from '@tanstack/react-query';

export interface IntegrationsData {
  integrations: Integration[];
  integrationsLoading: boolean;
  activeIntegration: Integration | null;
  setActiveIntegration: (integration: Integration | null) => void;
  connections: IntegrationConnection[];
  connectionsLoading: boolean;
  playwrightPersonas: PlaywrightPersona[];
  playwrightPersonasLoading: boolean;
}

export type { InternalCategoryOption };

export type CategoryMapperTreeRow = ExternalCategory & {
  subRows?: CategoryMapperTreeRow[] | undefined;
};

export interface CategoryMapperData {
  catalogs: CatalogRecord[];
  catalogsLoading: boolean;
  selectedCatalogId: string | null;
  setSelectedCatalogId: (id: string | null) => void;
  internalCategories: ProductCategory[];
  internalCategoriesLoading: boolean;
  internalCategoryOptions: InternalCategoryOption[];
  externalCategories: ExternalCategory[];
  externalCategoriesLoading: boolean;
  externalIds: Set<string>;
  mappings: CategoryMappingWithDetails[];
  mappingsLoading: boolean;
  categoryTree: CategoryMapperTreeRow[];
}

export interface CategoryMapperActions {
  handleFetchFromBase: () => Promise<void>;
  handleAutoMatchByName: () => void;
  handleMappingChange: (externalCategoryId: string, internalCategoryId: string | null) => void;
  handleSave: () => Promise<void>;
  getMappingForExternal: (externalCategoryId: string) => string | null;
  fetchMutation: UseMutationResult<MarketplaceFetchResponse, Error, MarketplaceConnectionRequest>;
  saveMutation: UseMutationResult<MarketplaceBulkUpsertResponse, Error, BulkCategoryMappingRequest>;
}
