import type { CategoryMappingAssignment } from './base-com';
import type {
  BaseCategory,
  CategoryMapping,
  CategoryMappingCreateInput,
  CategoryMappingUpdateInput,
  CategoryMappingWithDetails,
  ExternalCategory,
  ExternalCategoryWithChildren,
} from './listings';
export type {
  CreateProductListingInput,
  ProductListingExportEventRecord,
  ProductListingRepository,
} from '../integration-listing-storage';
export type {
  IntegrationConnectionRecord,
  IntegrationConnectionUpdateInput,
  IntegrationLookupRepository,
  IntegrationRecord,
  IntegrationRepository,
} from '../integration-storage';

export type ExternalCategoryRepository = {
  syncFromBase: (connectionId: string, categories: BaseCategory[]) => Promise<number>;
  listByConnection: (connectionId: string) => Promise<ExternalCategory[]>;
  getTreeByConnection: (connectionId: string) => Promise<ExternalCategoryWithChildren[]>;
  getById: (id: string) => Promise<ExternalCategory | null>;
  getByExternalId: (
    connectionId: string,
    externalId: string
  ) => Promise<ExternalCategory | null>;
  /**
   * Returns all leaf descendants of the given external category ID.
   * Traverses the stored tree via the path field to find all categories
   * that are descended from this category and have no children.
   */
  getLeafDescendants: (connectionId: string, externalId: string) => Promise<ExternalCategory[]>;
  deleteByConnection: (connectionId: string) => Promise<number>;
};

export type CategoryMappingRepository = {
  create: (input: CategoryMappingCreateInput) => Promise<CategoryMapping>;
  update: (id: string, input: CategoryMappingUpdateInput) => Promise<CategoryMapping>;
  delete: (id: string) => Promise<void>;
  getById: (id: string) => Promise<CategoryMapping | null>;
  listByInternalCategory: (
    internalCategoryId: string,
    catalogId?: string
  ) => Promise<CategoryMappingWithDetails[]>;
  listByConnection: (
    connectionId: string,
    catalogId?: string
  ) => Promise<CategoryMappingWithDetails[]>;
  getByExternalCategory: (
    connectionId: string,
    externalCategoryId: string,
    catalogId: string
  ) => Promise<CategoryMapping | null>;
  bulkUpsert: (
    connectionId: string,
    catalogId: string,
    mappings: CategoryMappingAssignment[]
  ) => Promise<number>;
  deleteByConnection: (connectionId: string) => Promise<number>;
};
