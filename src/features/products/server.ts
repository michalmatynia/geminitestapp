import 'server-only';

export * from '@/shared/lib/api/parse-json';
export * from '@/shared/lib/products/services/catalog-repository';
export * from '@/shared/lib/products/services/category-repository';
export * from '@/shared/lib/products/services/parameter-repository';
export * from '@/shared/lib/products/services/producer-repository';
export * from '@/shared/lib/products/services/tag-repository';
export * from '@/shared/lib/products/services/validation-pattern-repository';
export * from '@/shared/lib/products/services/product-migration';
export * from '@/shared/lib/products/services/productService';
export * from '@/shared/lib/products/services/product-service-form-utils';
export { CachedProductService } from './performance';
export { ProductsImagesUploadPOST } from './api/routes/images-upload-route';

// Infrastructure
export {
  getProductDataProvider,
  invalidateProductDataProviderCache,
} from '@/shared/lib/products/services/product-provider';
export { getProductRepository } from '@/shared/lib/products/services/product-repository';

// Explicitly export to resolve ambiguity
export {
  productFilterSchema,
  productDbProviderSchema,
  type ProductDbProvider,
  type ProductRepository,
} from '@/shared/contracts/products';

// Contracts & Types
export * from '@/shared/contracts/products';

// Performance & Caching
export * from './performance';

// Validations & Utils
export * from '@/shared/lib/products/validations';
export * from '@/shared/lib/products/utils';
export {
  validateAndNormalizeRuntimeConfig,
  parseRuntimeConfigForEvaluation,
} from './validations/validator-runtime-config';
export * from './workers/productAiQueue';
