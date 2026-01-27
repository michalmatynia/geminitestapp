import type { ProductCategory } from "@/features/products/types";

export type ExternalCategory = {
  id: string;
  connectionId: string;
  externalId: string;
  name: string;
  parentExternalId: string | null;
  path: string | null;
  depth: number;
  isLeaf: boolean;
  metadata: Record<string, unknown> | null;
  fetchedAt: Date;
  createdAt: Date;
  updatedAt: Date;
};

export type ExternalCategoryWithChildren = ExternalCategory & {
  children: ExternalCategoryWithChildren[];
};

export type CategoryMapping = {
  id: string;
  connectionId: string;
  externalCategoryId: string;
  internalCategoryId: string;
  catalogId: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
};

export type CategoryMappingWithDetails = CategoryMapping & {
  externalCategory: ExternalCategory;
  internalCategory: ProductCategory;
};

// Types for Base.com API responses
export type BaseCategoryFromApi = {
  category_id: number | string;
  name: string;
  parent_id: number | string | null;
};

export type BaseCategory = {
  id: string;
  name: string;
  parentId: string | null;
};

// Input types for repository operations
export type ExternalCategorySyncInput = {
  connectionId: string;
  externalId: string;
  name: string;
  parentExternalId: string | null;
  path: string | null;
  depth: number;
  isLeaf: boolean;
  metadata?: Record<string, unknown>;
};

export type CategoryMappingCreateInput = {
  connectionId: string;
  externalCategoryId: string;
  internalCategoryId: string;
  catalogId: string;
};

export type CategoryMappingUpdateInput = {
  internalCategoryId?: string;
  isActive?: boolean;
};
