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
export * from './types/drafts';
export * from './types/products-ui';
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
