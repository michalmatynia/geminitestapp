import type {
  BaseCategory,
  CategoryMapping,
  CategoryMappingCreateInputDto,
  CategoryMappingUpdateInputDto,
  CategoryMappingWithDetails,
  ExternalCategory,
  ExternalCategorySyncInputDto,
  ExternalCategoryWithChildren,
} from '@/shared/contracts/integrations';

export type {
  BaseCategory,
  CategoryMapping,
  CategoryMappingWithDetails,
  ExternalCategory,
  ExternalCategoryWithChildren,
};

export type CategoryMappingCreateInput = CategoryMappingCreateInputDto;
export type CategoryMappingUpdateInput = CategoryMappingUpdateInputDto;
export type ExternalCategorySyncInput = ExternalCategorySyncInputDto;
