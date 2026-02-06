import { NamedDto } from '../types/base';

export interface ProductDto extends NamedDto {
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
  published: boolean;
  categoryId: string | null;
  catalogId: string;
  tags: string[];
  images: string[];
  imageLinks: string[];
  imageBase64s: string[];
  noteIds: string[];
}

export interface ProductCategoryDto extends NamedDto {
  color: string | null;
  parentId: string | null;
  catalogId: string;
}

export interface ProductTagDto extends NamedDto {
  color: string | null;
  catalogId: string;
}

export interface CatalogDto extends NamedDto {
  isDefault: boolean;
  languageIds: string[];
  defaultLanguageId: string | null;
  defaultPriceGroupId: string | null;
  priceGroupIds: string[];
}

export interface PriceGroupDto extends NamedDto {
  groupId: string;
  currencyId: string;
  currencyCode: string;
  isDefault: boolean;
  groupType: 'standard' | 'dependent';
  basePriceField: string;
  sourceGroupId: string | null;
  priceMultiplier: number;
  addToPrice: number;
}

export interface CreateProductDto {
  sku: string;
  name_en?: string | null;
  name_pl?: string | null;
  name_de?: string | null;
  description_en?: string | null;
  description_pl?: string | null;
  description_de?: string | null;
  price?: number | null;
  stock?: number | null;
  weight?: number | null;
  length?: number | null;
  sizeLength?: number | null;
  sizeWidth?: number | null;
  supplierName?: string | null;
  supplierLink?: string | null;
  priceComment?: string | null;
  published?: boolean;
  categoryId?: string | null;
  catalogIds?: string[];
  tagIds?: string[];
  producerIds?: string[];
  noteIds?: string[];
  imageLinks?: string[];
  imageBase64s?: string[];
}

export interface UpdateProductDto {
  sku?: string;
  name_en?: string | null;
  name_pl?: string | null;
  name_de?: string | null;
  description_en?: string | null;
  description_pl?: string | null;
  description_de?: string | null;
  price?: number | null;
  stock?: number | null;
  weight?: number | null;
  length?: number | null;
  sizeLength?: number | null;
  sizeWidth?: number | null;
  supplierName?: string | null;
  supplierLink?: string | null;
  priceComment?: string | null;
  published?: boolean;
  categoryId?: string | null;
  catalogIds?: string[];
  tagIds?: string[];
  producerIds?: string[];
  noteIds?: string[];
  imageLinks?: string[];
  imageBase64s?: string[];
}

export interface CreateProductCategoryDto {
  name: string;
  description?: string;
  color?: string;
  parentId?: string;
  catalogId: string;
}

export interface UpdateProductCategoryDto {
  name?: string;
  description?: string;
  color?: string;
  parentId?: string;
}
