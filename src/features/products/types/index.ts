import type { ProductCategoryDto } from '@/shared/dtos';

// DTO type exports
export type {
  ProductDto,
  ProductTagDto as ProductTag,
  CatalogDto,
  PriceGroupDto,
  CreateProductDto,
  UpdateProductDto,
  CreateProductCategoryDto as CreateCategoryDto,
  UpdateProductCategoryDto as UpdateCategoryDto,
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
  ProductValidationPattern,
  ProductValidationTarget,
  ProductValidationSeverity,
  ProductValidatorConfig,
  ProductCategoryWithChildren,
} from '@/shared/types/domain/products';

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
