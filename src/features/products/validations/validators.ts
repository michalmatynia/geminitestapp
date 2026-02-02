import { z } from "zod";
import type { ProductCreateInput, ProductUpdateInput } from "./schemas";
import { ValidationApp } from "./core";

// Re-export core types for backward compatibility
export type {
  ValidationResult,
  ValidationError,
  ValidationMetadata,
  FieldValidationResult
} from "./core";

// Main validation functions using the new architecture
export const validateProductCreate = ValidationApp.validateProductCreate.bind(ValidationApp);
export const validateProductUpdate = ValidationApp.validateProductUpdate.bind(ValidationApp);
export const validateProductField = ValidationApp.validateProductField.bind(ValidationApp);
export const validateProductFields = ValidationApp.validateProductFieldsBatch.bind(ValidationApp);
export const validateProductsBatch = ValidationApp.validateProductsBatch.bind(ValidationApp);

// Type guards
export const isValidProductCreate = ValidationApp.isValidProductCreate.bind(ValidationApp);
export const isValidProductUpdate = ValidationApp.isValidProductUpdate.bind(ValidationApp);

// Utility functions
export function isProductLike(data: unknown): data is Record<string, any> {
  return data !== null && typeof data === 'object' && !Array.isArray(data);
}

export function hasRequiredProductFields(data: unknown): boolean {
  if (!isProductLike(data)) return false;
  return 'sku' in data || 'name_en' in data || 'price' in data;
}

// Validation summary utilities
export function getValidationSummary(result: any): {
  isValid: boolean;
  errorCount: number;
  warningCount: number;
  criticalErrors: any[];
  fieldErrors: Record<string, any[]>;
} {
  const errors = result.success ? [] : result.errors;
  const warnings = result.warnings || [];
  
  const criticalErrors = errors.filter((e: any) => e.severity === 'critical');
  const fieldErrors: Record<string, any[]> = {};
  
  [...errors, ...warnings].forEach((error: any) => {
    if (!fieldErrors[error.field]) {
      fieldErrors[error.field] = [];
    }
    fieldErrors[error.field].push(error);
  });
  
  return {
    isValid: result.success,
    errorCount: errors.length,
    warningCount: warnings.length,
    criticalErrors,
    fieldErrors
  };
}

export function mergeValidationResults<T>(results: any[]): any {
  const allErrors: any[] = [];
  const allWarnings: any[] = [];
  const validData: T[] = [];
  let totalTime = 0;
  const allRules: string[] = [];
  
  for (const result of results) {
    if (result.success) {
      validData.push(result.data);
    } else {
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
  
  const hasErrors = allErrors.length > 0;
  
  return {
    success: !hasErrors,
    ...(hasErrors ? { errors: allErrors } : { data: validData }),
    warnings: allWarnings.length > 0 ? allWarnings : undefined,
    metadata: {
      validationTime: totalTime,
      rulesApplied: [...new Set(allRules)],
      source: 'batch'
    }
  };
}