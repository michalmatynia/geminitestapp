// Schemas and types
import {
  productCreateSchema,
  productUpdateSchema,
  type ProductCreateInput,
  type ProductUpdateInput,
} from './schemas';

export {
  productCreateSchema,
  productUpdateSchema,
  type ProductCreateInput,
  type ProductUpdateInput,
};

// Validators and core types
export {
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
  type ValidationResult,
  type ValidationError,
  type ValidationMetadata,
  type FieldValidationResult,
} from './validators';

// Middleware
export {
  validateProductCreateMiddleware,
  validateProductUpdateMiddleware,
  type ValidationMiddlewareOptions,
} from './middleware';

// Hooks
export {
  useProductCreateValidation,
  useProductUpdateValidation,
  type UseValidationOptions,
  type ValidationState,
} from './hooks';

// Context
export {
  ValidationProvider,
  useValidationContext,
} from './context';

// Legacy type aliases for backward compatibility
export type ProductCreateData = ProductCreateInput;
export type ProductUpdateData = ProductUpdateInput;
