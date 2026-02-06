import type { ProductCategoryDto } from '@/shared/dtos';

// Re-export DTOs as types for backward compatibility
export type {
  ProductDto,
  ProductTagDto as ProductTag,
  CatalogDto,
  PriceGroupDto,
  CreateProductDto,
  UpdateProductDto,
  CreateCategoryDto,
  UpdateCategoryDto,
  ProductCategoryDto,
  ProductCategoryDto as ProductCategory
} from '@/shared/dtos';

export type {
  PriceGroupType,
  ProductDbProvider,
  ProductMigrationDirection,
  ProductParameter,
  ProductParameterValue,
  ProductAiJobType,
  ProductMigrationBatchResult,
  SyncDirection,
  IntegrationDbProvider,
  UserPreferences,
  Producer,
} from '@/shared/types/domain/products';

export type ProductCategoryWithChildren = ProductCategoryDto & {
  children: ProductCategoryWithChildren[];
};

export type {
  CatalogRecord,
  ProductRecord,
  ProductImageRecord,
  ProductCatalogRecord,
  ProductWithImages,
  PriceGroupWithDetails,
  PriceGroupForCalculation,
  CatalogRecord as Catalog,
  PriceGroupRecord as PriceGroup,
} from './records';

export type { ProductFormData } from './forms';
export type {
  ProductDraft,
  CreateProductDraftInput,
  UpdateProductDraftInput,
} from './drafts';
