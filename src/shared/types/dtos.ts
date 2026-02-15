/**
 * Consolidated DTO types for the entire application
 * 
 * This file serves as the single source of truth for Data Transfer Objects.
 * It re-exports types from specialized contract files and provides base utilities.
 */

export * from './dto-base';

// Re-export core domain DTOs
export type {
  ProductDto,
  CatalogDto,
  PriceGroupDto,
  ProductCategoryDto,
  CreateProductDto,
  UpdateProductDto,
  ProductDraftDto,
  CreateProductDraftDto,
  UpdateProductDraftDto,
} from '@/shared/contracts/products';

export type {
  CmsPageDto,
  CmsSlugDto,
  CmsThemeDto,
  CmsDomainDto,
} from '@/shared/contracts/cms';

export type {
  IntegrationDto,
  IntegrationConnectionDto,
  ProductListingDto,
  CategoryMappingDto,
} from '@/shared/contracts/integrations';

export type {
  FileDto,
  ImageFileDto,
  UploadFileDto,
  UpdateFileDto,
} from '@/shared/contracts/files';
