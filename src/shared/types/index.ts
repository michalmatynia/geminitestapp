// Core types - single sources of truth
export type { 
  DtoBase, 
  NamedDto, 
  Localized, 
  CreateDto, 
  UpdateDto, 
  ListResponse, 
  SavePayload, 
  CreatePayload, 
  UpdatePayload, 
  ApiResponse, 
  ApiError 
} from './dto-base';
export * from './core/errors';

// DTO utilities and query result types
export * from './query-result-types';

// Modal props types
export * from './modal-props';
export * from './domain/notes';
export * from './domain/files';
export * from './domain/settings';
export * from './domain/internationalization';
export * from './domain/user-preferences';
export * from './domain/integrations';
export * from './domain/viewer3d';

// API types
export type {
  DeleteResponse,
  ApiHandlerContext,
  ApiHandlerOptions,
  ApiRouteHandler,
  ApiRouteHandlerWithParams,
  JsonParseResult,
  ParseJsonOptions
} from './api/api';
export * from './domain/system-logs';
export * from './domain/listing-jobs';
export * from './domain/jobs';

// AI & Runtime types
export * from './domain/ai-paths';
export * from './domain/ai-paths-runtime';
export * from './domain/chatbot';
export * from './domain/agent-teaching';
export * from './domain/analytics';
export * from './ai-insights';

// System types
export * from './domain/system';

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
  type ProductParameterSelectorType,
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
