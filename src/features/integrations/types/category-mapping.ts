import type {
  ExternalCategoryDto,
  ExternalCategoryWithChildrenDto,
  CategoryMappingDto as CategoryMappingDtoContract,
  CategoryMappingWithDetailsDto as CategoryMappingWithDetailsDtoContract,
  BaseCategoryFromApiDto,
  BaseCategoryDto as BaseCategoryDtoContract,
  ExternalCategorySyncInputDto,
  CategoryMappingCreateInputDto,
  CategoryMappingUpdateInputDto,
} from '@/shared/contracts/integrations';
import type { ProductCategoryDto } from '@/shared/contracts/products';

export type ExternalCategory = ExternalCategoryDto;

export type ExternalCategoryWithChildren = ExternalCategoryWithChildrenDto;

export type CategoryMapping = CategoryMappingDtoContract;

export type CategoryMappingWithDetails = Omit<CategoryMappingWithDetailsDtoContract, 'internalCategory'> & {
  internalCategory: ProductCategoryDto;
};

// Types for Base.com API responses
export type BaseCategoryFromApi = BaseCategoryFromApiDto;

export type BaseCategory = BaseCategoryDtoContract;

// Input types for repository operations
export type ExternalCategorySyncInput = ExternalCategorySyncInputDto;

export type CategoryMappingCreateInput = CategoryMappingCreateInputDto;

export type CategoryMappingUpdateInput = CategoryMappingUpdateInputDto;
