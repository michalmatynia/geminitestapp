/**
 * Products Feature - Server Entry Point
 *
 * This is the server-side entry point for the products feature.
 * It must only be imported into server-side code (Node.js runtime).
 */
import 'server-only';

import { productCacheEvents } from '@/shared/events/products';

import { CachedProductService } from './performance/cached-service';

/** Utility to parse JSON body from requests */
export { parseJsonBody, parseObjectJsonBody } from '@/shared/lib/api/parse-json';

/** Repository for product catalog operations */
export { getCatalogRepository } from '@/shared/lib/products/services/catalog-repository';

/** Repository for product category management */
export { getCategoryRepository } from '@/shared/lib/products/services/category-repository';

/** Repository for product custom fields */
export { getCustomFieldRepository } from '@/shared/lib/products/services/custom-field-repository';

/** Repository for product parameters */
export { getParameterRepository } from '@/shared/lib/products/services/parameter-repository';

/** Repository for product producers/brands */
export { getProducerRepository } from '@/shared/lib/products/services/producer-repository';

/** Repository for product shipping groups */
export { getShippingGroupRepository } from '@/shared/lib/products/services/shipping-group-repository';

/** Repository for product tags */
export { getTagRepository } from '@/shared/lib/products/services/tag-repository';

/** Repository for product title terms */
export { getTitleTermRepository } from '@/shared/lib/products/services/title-term-repository';

/** Repository for product validation patterns */
export { getValidationPatternRepository } from '@/shared/lib/products/services/validation-pattern-repository';

/**
 * Utilities for normalizing product validation payloads and form data conversion
 */
export {
  buildNormalizedProductValidationPayload,
  formDataToObject,
} from '@/shared/lib/products/services/product-service-form-utils';

/** Main product service for core business logic */
export { productService } from '@/shared/lib/products/services/productService';

/**
 * Data provider for products with integrated caching
 */
export {
  getProductDataProvider,
  invalidateProductDataProviderCache,
} from '@/shared/lib/products/services/product-provider';

/** Repository for low-level product database operations */
export { getProductRepository } from '@/shared/lib/products/services/product-repository';

/** Repository for handling product order imports */
export { getProductOrdersImportRepository } from '@/shared/lib/products/services/product-orders-import-repository';

/**
 * Product schemas and TypeScript interfaces for data transfer
 */
export {
  productFilterSchema,
  type CreateProductDraftInput,
  type ProductCreateInput,
  type ProductDraft,
  type ProductParameterUpdateInput,
  type ProductTagUpdateInput,
  type ProductWithImages,
  type UpdateProductDraftInput,
} from '@/shared/contracts/products';

/** Type definition for parsed product filters */
export { type ProductFiltersParsed } from '@/shared/lib/products/validations';

/** Service providing cached product data access */
export { CachedProductService } from './performance/cached-service';

/** Utilities for cached product mutations and cache invalidation wrappers */
export { CachedProductMutations, withCacheInvalidation } from './performance/cache-invalidation';

/** API route handler for product image uploads */
export { ProductsImagesUploadPOST } from './api/routes/images-upload-route';

/**
 * Utilities for validating and parsing runtime validator configurations
 */
export {
  validateAndNormalizeRuntimeConfig,
  parseRuntimeConfigForEvaluation,
} from './validations/validator-runtime-config';

// Listen to shared events to break circular dependencies with integrations
productCacheEvents.on('invalidate-all', () => {
  CachedProductService.invalidateAll();
});
