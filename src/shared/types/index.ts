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
export * from './domain/case-resolver';
export * from './domain/prompt-exploder';
export * from './domain/cms';
export * from './domain/auth';
export * from './domain/database';
export * from './domain/admin';
export * from './domain/drafter';
export * from './domain/gsap';
export * from './domain/playwright';
export * from './domain/foldertree';
export * from './domain/agent-runtime';
export * from './domain/agents';
export * from './domain/ai-brain';
export * from './domain/app-embeds';
export * from './domain/cms-menu';
export * from './domain/cms-theme';
export * from './domain/document-editor';
export * from './domain/filemaker';
export * from './domain/image-slots';
export * from './domain/image-studio';
export * from './domain/master-folder-tree';
export * from './domain/system';
export * from './domain/vector';
export * from './domain/ai-trigger-buttons';

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
export * from './domain/listing-jobs';
export * from './domain/jobs';

// AI & Runtime types
export * from './domain/ai-paths';
export * from './domain/ai-paths-runtime';
export * from './domain/ai-paths-semantic-grammar';
export * from './domain/chatbot';
export * from './domain/agent-teaching';
export * from './domain/analytics';
export * from './ai-insights';

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
