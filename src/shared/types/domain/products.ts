import type { 
  ProductDto, 
  ProductTagDto, 
  CatalogDto, 
  PriceGroupDto, 
  ProductCategoryDto,
  CreateProductDto,
  UpdateProductDto,
  CreateProductCategoryDto as CreateCategoryDto,
  UpdateProductCategoryDto as UpdateCategoryDto,
  ProductParameterSelectorTypeDto,
  ProductImageDto,
  ProductCatalogDto,
  ProductTagRelationDto,
  ProductProducerRelationDto,
  ProductParameterValueDto,
  ProductDbProviderDto,
  ProductMigrationDirectionDto,
  SyncDirectionDto,
  PriceGroupTypeDto,
  ProductValidatorConfigDto,
  ProductValidatorSettingsDto,
  ProductMigrationBatchResultDto,
  ProducerDto,
  ProductCurrencyDto,
  ProductParameterDto,
  ProductValidationTargetDto,
  ProductValidationSeverityDto,
  ProductValidationDenyBehaviorDto,
  ProductValidationInstanceScopeDto,
  ProductValidationPostAcceptBehaviorDto,
  ProductValidationRuntimeTypeDto,
  ProductValidationChainModeDto,
  ProductValidationLaunchSourceModeDto,
  ProductValidationLaunchOperatorDto,
  ProductValidationLaunchScopeBehaviorDto,
  ProductValidationPatternDto,
  ProductSimpleParameterDto,
  ProductSimpleParameterValueDto,
  PriceGroupWithDetailsDto,
  PriceGroupForCalculationDto,
  ProductImageRecordDto,
  ProductCatalogRecordDto,
  ProductWithImagesDto,
  ProductCategoryWithChildrenDto,
  IntegrationDbProviderDto,
} from '../../contracts/products';

export type {
  ProductDto, 
  ProductTagDto, 
  CatalogDto, 
  PriceGroupDto, 
  ProductCategoryDto,
  CreateProductDto,
  UpdateProductDto,
  CreateCategoryDto,
  UpdateCategoryDto,
  ProductParameterSelectorTypeDto,
  ProductImageDto,
  ProductCatalogDto,
  ProductTagRelationDto,
  ProductProducerRelationDto,
  ProductParameterValueDto
};

export type ProductDbProvider = ProductDbProviderDto;
export type ProductMigrationDirection = ProductMigrationDirectionDto;
export type SyncDirection = SyncDirectionDto;

export type PriceGroupType = PriceGroupTypeDto;
export type ProductParameterSelectorType = ProductParameterSelectorTypeDto;

export type ProductParameter = ProductParameterDto;

export type ProductParameterValue = ProductParameterValueDto;

export type ProductSimpleParameter = ProductSimpleParameterDto;

export type ProductSimpleParameterValue = ProductSimpleParameterValueDto;

export type CurrencyRecord = ProductCurrencyDto;

/**
 * Domain record for a price group.
 */
export type PriceGroupRecord = PriceGroupDto;

export type PriceGroupWithDetails = PriceGroupWithDetailsDto;

export type PriceGroupForCalculation = PriceGroupForCalculationDto;

/**
 * Domain record for a catalog.
 */
export type CatalogRecord = CatalogDto;

export type Catalog = CatalogRecord;

/**
 * Domain record for a product.
 * Extends ProductDto with domain-only fields.
 */
export type ProductRecord = ProductDto;

export type ProductImageRecord = ProductImageRecordDto;

export type ProductCatalogRecord = ProductCatalogRecordDto;

export type ProductWithImages = ProductWithImagesDto;

/**
 * Domain record for a product category.
 */
export type ProductCategory = ProductCategoryDto;

export type ProductCategoryWithChildren = ProductCategoryWithChildrenDto;

/**
 * Domain record for a product tag.
 */
export type ProductTag = ProductTagDto;

export type Producer = ProducerDto;

export type ProductValidationTarget = ProductValidationTargetDto;

export type ProductValidationSeverity = ProductValidationSeverityDto;
export type ProductValidationDenyBehavior = ProductValidationDenyBehaviorDto;
export type ProductValidationPatternDenyBehaviorOverride =
  | ProductValidationDenyBehavior
  | null;
export type ProductValidationInstanceScope = ProductValidationInstanceScopeDto;
export type ProductValidationInstanceDenyBehaviorMap = Record<
  ProductValidationInstanceScope,
  ProductValidationDenyBehavior
>;
export type ProductValidationPostAcceptBehavior = ProductValidationPostAcceptBehaviorDto;
export type ProductValidationRuntimeType = ProductValidationRuntimeTypeDto;
export type ProductValidationChainMode = ProductValidationChainModeDto;
export type ProductValidationLaunchSourceMode = ProductValidationLaunchSourceModeDto;
export type ProductValidationLaunchOperator = ProductValidationLaunchOperatorDto;
export type ProductValidationLaunchScopeBehavior = ProductValidationLaunchScopeBehaviorDto;

export type ProductValidationPattern = ProductValidationPatternDto;

export type ProductValidatorConfig = ProductValidatorConfigDto;

export type ProductValidatorSettings = ProductValidatorSettingsDto;

export interface CreateProductDraftInput extends Partial<CreateProductDto> {
  sku: string;
}

export interface UpdateProductDraftInput extends Partial<UpdateProductDto> {
  sku?: string;
}

export { type ProductAiJobType } from './jobs';
export { type UserPreferences } from './user-preferences';

export type IntegrationDbProvider = IntegrationDbProviderDto;
export const INTEGRATION_DB_PROVIDER = {
  PRISMA: 'prisma',
  MONGODB: 'mongodb',
} as const;

export type ProductMigrationBatchResult = ProductMigrationBatchResultDto;
