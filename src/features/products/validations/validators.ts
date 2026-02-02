import { ValidationApp, type ValidationResult, type ValidationError } from "./core";

// Re-export core types for backward compatibility
export type {
  ValidationResult,
  ValidationError,
  ValidationMetadata,
  FieldValidationResult
} from "./core";

// Main validation functions using the new architecture
export const validateProductCreate: typeof ValidationApp.validateProductCreate = ValidationApp.validateProductCreate.bind(ValidationApp);
export const validateProductUpdate: typeof ValidationApp.validateProductUpdate = ValidationApp.validateProductUpdate.bind(ValidationApp);
export const validateProductField: typeof ValidationApp.validateProductField = ValidationApp.validateProductField.bind(ValidationApp);
export const validateProductFields: typeof ValidationApp.validateProductFieldsBatch = ValidationApp.validateProductFieldsBatch.bind(ValidationApp);
export const validateProductsBatch: typeof ValidationApp.validateProductsBatch = ValidationApp.validateProductsBatch.bind(ValidationApp);

// Type guards
export const isValidProductCreate: typeof ValidationApp.isValidProductCreate = ValidationApp.isValidProductCreate.bind(ValidationApp);
export const isValidProductUpdate: typeof ValidationApp.isValidProductUpdate = ValidationApp.isValidProductUpdate.bind(ValidationApp);

// Utility functions
export function isProductLike(data: unknown): data is Record<string, unknown> {
  return data !== null && typeof data === 'object' && !Array.isArray(data);
}

export function hasRequiredProductFields(data: unknown): boolean {
  if (!isProductLike(data)) return false;
  return 'sku' in data || 'name_en' in data || 'price' in data;
}

// Validation summary utilities
export function getValidationSummary(result: ValidationResult<unknown>): {
  isValid: boolean;
  errorCount: number;
  warningCount: number;
  criticalErrors: ValidationError[];
  fieldErrors: Record<string, ValidationError[]>;
} {
  const errors = result.success ? [] : (result.errors || []);
  const warnings = result.warnings || [];
  
  const criticalErrors = errors.filter((e: ValidationError) => e.severity === 'critical');
  const fieldErrors: Record<string, ValidationError[]> = {};
  
  [...errors, ...warnings].forEach((error: ValidationError) => {
    if (!fieldErrors[error.field]) {
      fieldErrors[error.field] = [];
    }
    fieldErrors[error.field]!.push(error);
  });
  
  return {
    isValid: result.success,
    errorCount: errors.length,
    warningCount: warnings.length,
    criticalErrors,
    fieldErrors
  };
}

export function mergeValidationResults<T>(results: ValidationResult<T>[]): ValidationResult<T[]> {
  const allErrors: ValidationError[] = [];
  const allWarnings: ValidationError[] = [];
  const validData: T[] = [];
  let totalTime: number = 0;
  const allRules: string[] = [];
  
  for (const result of results) {
    if (result.success && result.data !== undefined) {
      validData.push(result.data);
    } else if (!result.success && result.errors) {
      allErrors.push(...result.errors);
    }
    
    if (result.warnings) {
      allWarnings.push(...result.warnings);
    }
    
    if (result.metadata) {
      totalTime += result.metadata.validationTime;
      allRules.push(...result.metadata.rulesApplied);
    }
  }
  
  const warnings = allWarnings.length > 0 ? allWarnings : undefined;
  const metadata = {
    validationTime: totalTime,
    rulesApplied: [...new Set(allRules)],
    cacheHit: false,
    source: 'batch' as const
  };

  if (allErrors.length > 0) {
    return {
      success: false,
      errors: allErrors,
      warnings,
      metadata
    };
  }

  return {
    success: true,
    data: validData,
    warnings,
    metadata
  };
}
