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
  UpdateProductCategoryDto as UpdateCategoryDto
} from '../../dtos/index';

export type {
  ProductDto, 
  ProductTagDto, 
  CatalogDto, 
  PriceGroupDto, 
  ProductCategoryDto,
  CreateProductDto,
  UpdateProductDto,
  CreateCategoryDto,
  UpdateCategoryDto
};

export type ProductDbProvider = 'prisma' | 'mongodb';
export type ProductMigrationDirection = 'prisma-to-mongo' | 'mongo-to-prisma';

export type PriceGroupType = 'standard' | 'dependent';

export type ProductParameter = Entity & {
  catalogId: string;
  name_en: string;
  name_pl: string | null;
  name_de: string | null;
};

export type ProductParameterValue = {
  parameterId: string;
  value: string;
};

export type CurrencyRecord = Entity & {
  code: string;
  name: string;
  symbol: string | null;
};

/**
 * Domain record for a price group.
 * Extends PriceGroupDto with strict Entity base.
 */
export type PriceGroupRecord = Entity & Omit<PriceGroupDto, 'id' | 'createdAt' | 'updatedAt'>;

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
 * Extends CatalogDto with strict Entity base.
 */
export type CatalogRecord = Entity & Omit<CatalogDto, 'id' | 'createdAt' | 'updatedAt'>;

export type Catalog = CatalogRecord;

/**
 * Domain record for a product.
 * Extends ProductDto with strict Entity base and extra domain-only fields.
 */
export type ProductRecord = Entity & Omit<ProductDto, 'id' | 'createdAt' | 'updatedAt' | 'images' | 'tags' | 'catalogId' | 'published'> & {
  parameters?: ProductParameterValue[];
  noteIds: string[];
};

export type ProductImageRecord = {
  productId: string;
  imageFileId: string;
  assignedAt: string | Date;
  imageFile: ImageFileRecord;
};

export type ProductCatalogRecord = {
  productId: string;
  catalogId: string;
  assignedAt: string | Date;
  catalog: CatalogRecord;
};

export type ProductWithImages = ProductRecord & {
  images: ProductImageRecord[];
  catalogs: ProductCatalogRecord[];
  categoryId?: string | null;
  tags?: { tagId: string }[];
  producers?: { producerId: string }[];
};

/**
 * Domain record for a product category.
 * Extends ProductCategoryDto.
 */
export type ProductCategory = Entity & Omit<ProductCategoryDto, 'id' | 'createdAt' | 'updatedAt'> & {
  description: string | null;
};

export type ProductCategoryWithChildren = ProductCategory & {
  children: ProductCategoryWithChildren[];
};

/**
 * Domain record for a product tag.
 * Extends ProductTagDto.
 */
export type ProductTag = Entity & Omit<ProductTagDto, 'id' | 'createdAt' | 'updatedAt'>;

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

export type ProductAiJobType = 'description' | 'translation' | 'tags' | 'categories' | 'parameters';

export type IntegrationDbProvider = 'prisma' | 'mongodb';

export type SyncDirection = 'to_base' | 'from_base' | 'bidirectional' | 'none';

export type UserPreferences = {
  productListNameLocale: string | null;
  productListCatalogFilter: string | null;
  productListCurrencyCode: string | null;
  productListPageSize: number | null;
  productListThumbnailSource?: 'file' | 'link' | 'base64' | null;
  productListDraftIconColorMode?: 'theme' | 'custom' | null;
  productListDraftIconColor?: string | null;
  aiPathsActivePathId?: string | null;
  adminMenuCollapsed?: boolean | null;
};

export type ProductMigrationBatchResult = {
  direction: ProductMigrationDirection;
  productsProcessed: number;
  productsUpserted: number;
  nextCursor: string | null;
  missingImageFileIds: string[];
  missingCatalogIds: string[];
};
