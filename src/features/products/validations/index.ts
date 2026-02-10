// Schemas and types
import {
  productCreateSchema,
  productUpdateSchema,
  productFilterSchema,
  type ProductCreateInput,
  type ProductUpdateInput,
  type ProductFiltersParsed,
} from './schemas';

export {
  productCreateSchema,
  productUpdateSchema,
  productFilterSchema,
  type ProductCreateInput,
  type ProductUpdateInput,
  type ProductFiltersParsed,
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
