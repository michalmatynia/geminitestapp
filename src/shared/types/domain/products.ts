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
  ProductParameterValueDto
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

export type ProductDbProvider = 'prisma' | 'mongodb';
export type ProductMigrationDirection = 'prisma-to-mongo' | 'mongo-to-prisma';
export type SyncDirection = 'to_base' | 'from_base' | 'bidirectional';

export type PriceGroupType = 'standard' | 'dependent';
export type ProductParameterSelectorType = ProductParameterSelectorTypeDto;

export type ProductParameter = Entity & {
  catalogId: string;
  name_en: string;
  name_pl: string | null;
  name_de: string | null;
  selectorType: ProductParameterSelectorType;
  optionLabels: string[];
};

export type ProductParameterValue = ProductParameterValueDto;

export type ProductSimpleParameter = Entity & {
  catalogId: string;
  name_en: string;
  name_pl: string | null;
  name_de: string | null;
};

export type ProductSimpleParameterValue = {
  parameterId: string;
  value?: string | null;
};

export type CurrencyRecord = Entity & {
  code: string;
  name: string;
  symbol: string | null;
};

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

export type Producer = Entity & {
  name: string;
  website: string | null;
};

export type ProductValidationTarget =
  | 'name'
  | 'description'
  | 'sku'
  | 'price'
  | 'stock'
  | 'category'
  | 'size_length'
  | 'size_width'
  | 'length'
  | 'weight';

export type ProductValidationSeverity = 'error' | 'warning';
export type ProductValidationDenyBehavior = 'ask_again' | 'mute_session';
export type ProductValidationPatternDenyBehaviorOverride =
  | ProductValidationDenyBehavior
  | null;
export type ProductValidationInstanceScope =
  | 'draft_template'
  | 'product_create'
  | 'product_edit';
export type ProductValidationInstanceDenyBehaviorMap = Record<
  ProductValidationInstanceScope,
  ProductValidationDenyBehavior
>;
export type ProductValidationPostAcceptBehavior =
  | 'revalidate'
  | 'stop_after_accept';
export type ProductValidationRuntimeType =
  | 'none'
  | 'database_query'
  | 'ai_prompt';
export type ProductValidationChainMode = 'continue' | 'stop_on_match' | 'stop_on_replace';
export type ProductValidationLaunchSourceMode =
  | 'current_field'
  | 'form_field'
  | 'latest_product_field';
export type ProductValidationLaunchOperator =
  | 'equals'
  | 'not_equals'
  | 'contains'
  | 'starts_with'
  | 'ends_with'
  | 'regex'
  | 'gt'
  | 'gte'
  | 'lt'
  | 'lte'
  | 'is_empty'
  | 'is_not_empty';
export type ProductValidationLaunchScopeBehavior = 'gate' | 'condition_only';

export type ProductValidationPattern = Entity & {
  label: string;
  target: ProductValidationTarget;
  locale: string | null;
  regex: string;
  flags: string | null;
  message: string;
  severity: ProductValidationSeverity;
  enabled: boolean;
  replacementEnabled: boolean;
  replacementAutoApply: boolean;
  skipNoopReplacementProposal: boolean;
  replacementValue: string | null;
  replacementFields: string[];
  replacementAppliesToScopes?: ProductValidationInstanceScope[];
  runtimeEnabled: boolean;
  runtimeType: ProductValidationRuntimeType;
  runtimeConfig: string | null;
  postAcceptBehavior: ProductValidationPostAcceptBehavior;
  denyBehaviorOverride: ProductValidationPatternDenyBehaviorOverride;
  validationDebounceMs: number;
  sequenceGroupId: string | null;
  sequenceGroupLabel: string | null;
  sequenceGroupDebounceMs: number;
  sequence: number | null;
  chainMode: ProductValidationChainMode;
  maxExecutions: number;
  passOutputToNext: boolean;
  launchEnabled: boolean;
  launchAppliesToScopes?: ProductValidationInstanceScope[];
  launchScopeBehavior?: ProductValidationLaunchScopeBehavior;
  launchSourceMode: ProductValidationLaunchSourceMode;
  launchSourceField: string | null;
  launchOperator: ProductValidationLaunchOperator;
  launchValue: string | null;
  launchFlags: string | null;
  appliesToScopes?: ProductValidationInstanceScope[];
};

export type ProductValidatorConfig = {
  enabledByDefault: boolean;
  instanceDenyBehavior: ProductValidationInstanceDenyBehaviorMap;
  patterns: ProductValidationPattern[];
};

export type ProductValidatorSettings = {
  enabledByDefault: boolean;
  instanceDenyBehavior: ProductValidationInstanceDenyBehaviorMap;
};

export interface CreateProductDraftInput extends Partial<CreateProductDto> {
  sku: string;
}

export interface UpdateProductDraftInput extends Partial<UpdateProductDto> {
  sku?: string;
}

export { type ProductAiJobType } from './jobs';
export { type UserPreferences } from './user-preferences';

export type IntegrationDbProvider = 'prisma' | 'mongodb';

export type ProductMigrationBatchResult = {
  direction: ProductMigrationDirection;
  productsProcessed: number;
  productsUpserted: number;
  nextCursor: string | null;
  missingImageFileIds: string[];
  missingCatalogIds: string[];
};
