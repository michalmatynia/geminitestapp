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
};

export type ProductAiJobType = 'description' | 'translation' | 'tags' | 'categories' | 'parameters';

export type ProductMigrationBatchResult = {
  direction: ProductMigrationDirection;
  productsProcessed: number;
  productsUpserted: number;
  nextCursor: string | null;
  missingImageFileIds: string[];
  missingCatalogIds: string[];
};