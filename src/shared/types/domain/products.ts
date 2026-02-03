import { Entity } from '../base-types';
import type { ImageFileRecord } from './files';

export type ProductDbProvider = "prisma" | "mongodb";
export type ProductMigrationDirection = "prisma-to-mongo" | "mongo-to-prisma";

export type PriceGroupType = "standard" | "dependent";

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

export type PriceGroupRecord = Entity & {
  groupId: string;
  isDefault: boolean;
  name: string;
  description: string | null;
  currencyId: string;
  currencyCode: string;
  groupType: PriceGroupType;
  type: string;
  basePriceField: string;
  sourceGroupId: string | null;
  priceMultiplier: number;
  addToPrice: number;
};

export type PriceGroupWithDetails = PriceGroupRecord & {
  currency: CurrencyRecord;
  currencyCode: string;
};

export type CatalogRecord = Entity & {
  name: string;
  description: string | null;
  isDefault: boolean;
  defaultLanguageId?: string | null;
  defaultPriceGroupId?: string | null;
  priceGroupIds: string[];
  languageIds: string[];
};

export type Catalog = CatalogRecord;

export type ProductRecord = Entity & {
  sku: string | null;
  baseProductId: string | null;
  defaultPriceGroupId: string | null;
  ean: string | null;
  gtin: string | null;
  asin: string | null;
  name_en: string | null;
  name_pl: string | null;
  name_de: string | null;
  description_en: string | null;
  description_pl: string | null;
  description_de: string | null;
  supplierName: string | null;
  supplierLink: string | null;
  priceComment: string | null;
  stock: number | null;
  price: number | null;
  sizeLength: number | null;
  sizeWidth: number | null;
  weight: number | null;
  length: number | null;
  parameters?: ProductParameterValue[];
  imageLinks: string[];
  imageBase64s: string[];
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
  categories?: { categoryId: string }[];
  tags?: { tagId: string }[];
  producers?: { producerId: string }[];
};

export type ProductCategory = Entity & {
  name: string;
  description: string | null;
  color: string | null;
  parentId: string | null;
  catalogId: string;
};

export type ProductCategoryWithChildren = ProductCategory & {
  children: ProductCategoryWithChildren[];
};

export type ProductTag = {
  id: string;
  name: string;
  color: string | null;
  catalogId: string;
};

export type Producer = Entity & {
  name: string;
  website: string | null;
};

// DTO re-exports for consistency if needed, but here we define structural types
export type ProductDto = ProductRecord & { id: string };
export type ProductTagDto = ProductTag;
export type CatalogDto = CatalogRecord & { id: string };
export type PriceGroupDto = PriceGroupRecord & { id: string };
export type ProductCategoryDto = ProductCategory;

export interface CreateProductDto {
  name: string;
  description?: string;
  price?: number;
  published?: boolean;
  categoryId?: string;
  catalogId: string;
  tags?: string[];
}

export interface UpdateProductDto {
  name?: string;
  description?: string;
  price?: number;
  published?: boolean;
  categoryId?: string;
  tags?: string[];
}

export interface CreateCategoryDto {
  name: string;
  description?: string;
  color?: string;
  parentId?: string;
  catalogId: string;
}

export interface UpdateCategoryDto {
  name?: string;
  description?: string;
  color?: string;
  parentId?: string;
}

export interface CreateProductDraftInput extends Partial<CreateProductDto> {
  sku: string;
}

export interface UpdateProductDraftInput extends Partial<UpdateProductDto> {
  sku?: string;
}

export type ProductAiJobType = 'description' | 'translation' | 'tags' | 'categories' | 'parameters';

export type IntegrationDbProvider = "prisma" | "mongodb";

export type SyncDirection = "to_base" | "from_base" | "bidirectional" | "none";

export type UserPreferences = {
  productListNameLocale: string | null;
  productListCatalogFilter: string | null;
  productListCurrencyCode: string | null;
  productListPageSize: number | null;
  productListThumbnailSource?: "file" | "link" | "base64" | null;
  aiPathsActivePathId?: string | null;
  aiPathsExpandedGroups?: string[] | null;
  aiPathsPaletteCollapsed?: boolean | null;
  aiPathsPathIndex?: unknown[] | null;
  aiPathsPathConfigs?: Record<string, unknown> | string | null;
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
