// Re-export core architecture
export * from "./core";

// Re-export schemas and types
import {
  productCreateSchema,
  productUpdateSchema,
  type ProductCreateInput,
  type ProductUpdateInput,
} from "./schemas";

export {
  productCreateSchema,
  productUpdateSchema,
  type ProductCreateInput,
  type ProductUpdateInput,
};

// Re-export enhanced validation utilities
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
} from "./validators";

// Re-export middleware
export {
  validateProductCreateMiddleware,
  validateProductUpdateMiddleware,
  type ValidationMiddlewareOptions,
} from "./middleware";

// Re-export hooks
export {
  useProductCreateValidation,
  useProductUpdateValidation,
  type UseValidationOptions,
  type ValidationState,
} from "./hooks";

// Re-export context
export {
  ValidationProvider,
  useValidationContext,
} from "./context";

// Re-export utilities
export {
  createConditionalSchema,
  validateFieldDependencies,
  ValidationQueue,
  getCachedValidation,
  setCachedValidation,
  withValidationMetrics,
} from "./utils";

// Re-export configuration
export {
  setValidationConfig,
  getValidationConfig,
  resetValidationConfig,
  validateWithConfig,
  type ValidationConfig,
} from "./config";

// Re-export decorators
export {
  ValidateInput,
  ValidateProductCreate,
  ValidateProductUpdate,
  ValidationException,
  ValidationResult as ValidationResultClass,
} from "./decorators";

// Re-export pipeline
export {
  ValidationPipeline,
  createProductValidationPipeline,
  createProductUpdatePipeline,
  type ValidationStep,
  type PipelineResult,
} from "./pipeline";

// Re-export metrics
export {
  validationMetrics,
  withMetrics,
  getValidationHealth,
} from "./metrics";

// Re-export advanced features
export {
  validationCache,
  withCache,
} from "./cache";

export {
  batchValidator,
  validateProductsBatch as validateProductsBatchLegacy,
  validateProductsUpdateBatch,
  type BatchValidationResult,
  type BatchValidationSummary,
  type BatchValidationOptions,
} from "./batch";

export {
  validationStreamer,
  useStreamValidation,
  createValidationSSE,
  type ValidationStream,
  type StreamValidationOptions,
} from "./streaming";

export {
  externalValidationService,
  validateWithExternalService,
  VALIDATION_PROVIDERS,
  type ExternalValidationProvider,
  type ExternalValidationRequest,
  type ExternalValidationResponse,
} from "./external";

export {
  validationRuleEngine,
  PRODUCT_VALIDATION_RULES,
  type ValidationRule,
  type RuleCondition,
  type RuleAction,
  type RuleExecutionContext,
  type RuleExecutionResult,
} from "./rules";

// Legacy type aliases for backward compatibility
export type ProductCreateData = ProductCreateInput;
export type ProductUpdateData = ProductUpdateInput;
