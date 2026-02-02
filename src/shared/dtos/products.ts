import type { Entity } from '@/shared/types/base-types';

export interface ProductDto extends Entity {
  name: string;
  description: string | null;
  price: number | null;
  published: boolean;
  categoryId: string | null;
  catalogId: string;
  createdAt: string;
  updatedAt: string;
  tags: string[];
  images: string[];
}

export interface ProductCategoryDto extends Entity {
  name: string;
  description: string | null;
  color: string | null;
  parentId: string | null;
  catalogId: string;
  createdAt: string;
  updatedAt: string;
}

export interface ProductTagDto {
  id: string;
  name: string;
  color: string | null;
  catalogId: string;
}

export interface CatalogDto {
  id: string;
  name: string;
  description: string | null;
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
  languageIds: string[];
  defaultLanguageId: string | null;
  defaultPriceGroupId: string | null;
  priceGroupIds: string[];
}

export interface PriceGroupDto {
  id: string;
  groupId: string;
  name: string;
  description: string;
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
