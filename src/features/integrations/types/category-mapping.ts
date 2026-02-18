import type { ProductCategoryDto } from '@/features/products';
import type {
  ExternalCategoryDto,
  ExternalCategoryWithChildrenDto,
  CategoryMappingDto as CategoryMappingDtoContract,
  CategoryMappingWithDetailsDto as CategoryMappingWithDetailsDtoContract,
} from '@/shared/contracts/integrations';

export type ExternalCategory = ExternalCategoryDto;

export type ExternalCategoryWithChildren = ExternalCategoryWithChildrenDto;

export type CategoryMapping = CategoryMappingDtoContract;

export type CategoryMappingWithDetails = Omit<CategoryMappingWithDetailsDtoContract, 'internalCategory'> & {
  internalCategory: ProductCategoryDto;
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
