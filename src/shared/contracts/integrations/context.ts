import type { UseMutationResult } from '@tanstack/react-query';
import type {
  Integration,
  IntegrationConnection,
  CategoryMappingWithDetails,
  ExternalCategory,
} from './index';
import type { PlaywrightPersona } from '../playwright';
import type { CatalogRecord, ProductCategory } from '../products';

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

export interface InternalCategoryOption {
  value: string;
  label: string;
}

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
  categoryTree: ExternalCategory[];
}

export interface CategoryMapperActions {
  handleFetchFromBase: () => Promise<void>;
  handleMappingChange: (externalCategoryId: string, internalCategoryId: string | null) => void;
  handleSave: () => Promise<void>;
  getMappingForExternal: (externalCategoryId: string) => string | null;
  fetchMutation: UseMutationResult<
    { fetched: number; message: string },
    Error,
    { connectionId: string }
  >;
  saveMutation: UseMutationResult<
    { upserted: number; message: string },
    Error,
    {
      connectionId: string;
      catalogId: string;
      mappings: { externalCategoryId: string; internalCategoryId: string | null }[];
    }
  >;
}
