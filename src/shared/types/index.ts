// Core types - single sources of truth
export * from './core/base-types';
export * from './core/errors';

// Domain types
export * from './domain/notes';
export * from './domain/files';
export * from './domain/settings';
export * from './domain/internationalization';
export * from './domain/user-preferences';

// API types
export * from './api/api';
export * from './api/system-logs';
export * from './api/listing-jobs';
export * from './api/jobs';

// AI & Runtime types
export * from './ai-paths';
export * from './ai-paths-runtime';
export * from './chatbot';
export * from './agent-teaching';

// System types
export * from './system';

// Product types (detailed exports)
export {
  type CatalogRecord,
  type ProductRecord,
  type ProductImageRecord,
  type ProductCatalogRecord,
  type ProductWithImages,
  type PriceGroupWithDetails,
  type Catalog,
  type ProductCategory,
  type ProductCategoryWithChildren,
  type ProductTag,
  type ProductParameter,
  type ProductParameterValue,
  type ProductDto,
  type ProductTagDto,
  type CatalogDto,
  type PriceGroupDto,
  type CreateProductDto,
  type UpdateProductDto,
  type CreateCategoryDto,
  type UpdateCategoryDto,
  type ProductCategoryDto
} from './domain/products';
