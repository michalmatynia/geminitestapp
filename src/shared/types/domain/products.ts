import { Entity } from '../core/base-types';

import type { ImageFileRecord } from './files';
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

export type ProductSimpleParameter = Omit<ProductParameterDto, 'selectorType' | 'optionLabels'>;

export type ProductSimpleParameterValue = {
  parameterId: string;
  value?: string | null;
};

export type CurrencyRecord = ProductCurrencyDto;

/**
 * Domain record for a price group.
 */
export type PriceGroupRecord = PriceGroupDto;

export type PriceGroupWithDetails = PriceGroupRecord & {
  currency: CurrencyRecord;
  currencyCode: string;
};

export type PriceGroupForCalculation = {
  id: string;
  groupId?: string;
  currencyId: string;
  type: string;
  isDefault: boolean;
  sourceGroupId: string | null;
  priceMultiplier: number;
  addToPrice: number;
  currency: { code: string };
  currencyCode?: string;
};

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

export type ProductImageRecord = Omit<ProductImageDto, 'imageFile'> & {
  imageFile: ImageFileRecord;
};

export type ProductCatalogRecord = ProductCatalogDto & {
  catalog: CatalogRecord;
};

export type ProductWithImages = Omit<ProductRecord, 'images' | 'catalogs' | 'tags' | 'producers'> & {
  images: ProductImageRecord[];
  catalogs: ProductCatalogRecord[];
  categoryId?: string | null;
  tags?: ProductTagRelationDto[];
  producers?: ProductProducerRelationDto[];
};

/**
 * Domain record for a product category.
 */
export type ProductCategory = ProductCategoryDto;

export type ProductCategoryWithChildren = ProductCategory & {
  children: ProductCategoryWithChildren[];
};

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
export const IntegrationDbProvider = {
  PRISMA: 'prisma',
  MONGODB: 'mongodb',
} as const;

export type ProductMigrationBatchResult = ProductMigrationBatchResultDto;
