// Server-only entrypoint for product server helpers and repositories.
// Import from '@/features/products/server' in API routes or other server-side code.
// This file intentionally uses `import 'server-only'` to prevent accidental client bundles.
import 'server-only';

import { productCacheEvents } from '@/shared/events/products';

import { CachedProductService } from './performance/cached-service';

// Server exports: stable server-only API for the products feature.
// Export repositories, service helpers, validation utilities, and types used by
// API route handlers and background workers. Keep this surface minimal and
// server-only (this file uses `import 'server-only'`) so app-layer imports use
// the feature's public/server entrypoints rather than deep internal paths.
export { parseJsonBody, parseObjectJsonBody } from '@/shared/lib/api/parse-json';
export { getCatalogRepository } from '@/shared/lib/products/services/catalog-repository';
export { getCategoryRepository } from '@/shared/lib/products/services/category-repository';
export { getCustomFieldRepository } from '@/shared/lib/products/services/custom-field-repository';
export { getParameterRepository } from '@/shared/lib/products/services/parameter-repository';
export { getProducerRepository } from '@/shared/lib/products/services/producer-repository';
export { getShippingGroupRepository } from '@/shared/lib/products/services/shipping-group-repository';
export { getTagRepository } from '@/shared/lib/products/services/tag-repository';
export { getTitleTermRepository } from '@/shared/lib/products/services/title-term-repository';
export { getValidationPatternRepository } from '@/shared/lib/products/services/validation-pattern-repository';
export {
  buildNormalizedProductValidationPayload,
  formDataToObject,
} from '@/shared/lib/products/services/product-service-form-utils';
export { productService } from '@/shared/lib/products/services/productService';
export {
  getProductDataProvider,
  invalidateProductDataProviderCache,
} from '@/shared/lib/products/services/product-provider';
export { getProductRepository } from '@/shared/lib/products/services/product-repository';
export { getProductOrdersImportRepository } from '@/shared/lib/products/services/product-orders-import-repository';
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
export { type ProductFiltersParsed } from '@/shared/lib/products/validations';
export { CachedProductMutations, CachedProductService, withCacheInvalidation } from './performance/cached-service';
export { ProductsImagesUploadPOST } from './api/routes/images-upload-route';
export {
  validateAndNormalizeRuntimeConfig,
  parseRuntimeConfigForEvaluation,
} from './validations/validator-runtime-config';

// Listen to shared events to break circular dependencies with integrations
productCacheEvents.on('invalidate-all', () => {
  CachedProductService.invalidateAll();
});
