import 'server-only';

export { default as ProductEditPage } from './pages/ProductEditPage';
export { ProductPublicPage } from './pages/ProductPublicPage';
export * from '@/shared/lib/api/parse-json';
export * from './services/aiDescriptionService';
export * from './services/aiTranslationService';
export * from './services/catalog-repository';
export * from './services/category-repository';
export * from './services/parameter-repository';
export * from './services/producer-repository';
export * from './services/tag-repository';
export * from './services/validation-pattern-repository';
export * from './services/product-migration';
export * from './services/product-provider';
export * from './services/product-repository';
export * from './services/productService';
export * from './services/product-provider';
export {
  ProductsImagesUploadPOST,
} from './api/routes/images-upload-route';
export {
  ProductsV2GET,
  ProductsV2POST,
} from './api/routes/v2-products-route';
export * from '@/shared/contracts/products/drafts';
export * from '@/shared/contracts/products/products-ui';
export type { ProductWithImages } from '@/shared/contracts/products';
// Only re-export server-safe validations (schemas, validators, types).
// Client hooks (useProductCreateValidation, etc.) and context (ValidationProvider)
// must be imported directly from './validations' or './validations/hooks'.
export {
  productCreateSchema,
  productUpdateSchema,
  validateProductCreate,
  validateProductUpdate,
  isValidProductCreate,
  isValidProductUpdate,
  isProductLike,
  hasRequiredProductFields,
  validateProductField,
  validateProductFields,
  validateProductsBatch,
  getValidationSummary,
  mergeValidationResults,
  type ProductCreateInput,
  type ProductUpdateInput,
  type ValidationResult,
  type ValidationError,
  type ValidationMetadata,
  type FieldValidationResult,
} from './validations';
export * from './utils';
