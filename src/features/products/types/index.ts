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
  ProductCategoryDto as ProductCategory,
  
  // From domain aliases
  PriceGroupTypeDto as PriceGroupType,
  ProductDbProviderDto as ProductDbProvider,
  ProductMigrationDirectionDto as ProductMigrationDirection,
  ProductParameterDto as ProductParameter,
  ProductParameterValueDto as ProductParameterValue,
  ProductSimpleParameterDto as ProductSimpleParameter,
  ProductSimpleParameterValueDto as ProductSimpleParameterValue,
  ProductMigrationBatchResultDto as ProductMigrationBatchResult,
  SyncDirectionDto as SyncDirection,
  IntegrationDbProviderDto as IntegrationDbProvider,
  ProducerDto as Producer,
  ProductValidationPatternDto as ProductValidationPattern,
  ProductValidationTargetDto as ProductValidationTarget,
  ProductValidationSeverityDto as ProductValidationSeverity,
  ProductValidatorConfigDto as ProductValidatorConfig,
  ProductCategoryWithChildrenDto as ProductCategoryWithChildren,
} from '@/shared/contracts/products';

export type {
  ProductAiJobTypeDto as ProductAiJobType,
} from '@/shared/contracts/jobs';

export type {
  UserPreferencesDto as UserPreferences,
} from '@/shared/contracts/auth';

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
  ProductDraftDto,
  CreateProductDraftDto,
  UpdateProductDraftDto,
  ProductDraftDto as ProductDraft,
  CreateProductDraftDto as CreateProductDraftInput,
  UpdateProductDraftDto as UpdateProductDraftInput,
} from './drafts';
export type {
  ProductStudioSequencingConfig,
  ProductStudioSequencingDiagnostics,
  ProductStudioSequenceReadiness,
} from './product-studio';
