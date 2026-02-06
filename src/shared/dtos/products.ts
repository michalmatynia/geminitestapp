import { NamedDto } from '../types/base';

export interface ProductDto extends NamedDto {
  price: number | null;
  published: boolean;
  categoryId: string | null;
  catalogId: string;
  tags: string[];
  images: string[];
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
