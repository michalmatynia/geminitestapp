import { z } from "zod";
import { validateWithConfig } from "./config";
import { withMetrics } from "./metrics";
import { withCache } from "./cache";

// Enhanced validation result types
export type ValidationResult<T> = {
  success: true;
  data: T;
  warnings?: ValidationError[] | undefined;
  metadata?: ValidationMetadata | undefined;
} | {
  success: false;
  errors: ValidationError[];
  warnings?: ValidationError[] | undefined;
  metadata?: ValidationMetadata | undefined;
};

export type ValidationError = {
  field: string;
  message: string;
  code: string;
  severity?: 'low' | 'medium' | 'high' | 'critical' | undefined;
  context?: Record<string, any> | undefined;
};

export type ValidationMetadata = {
  validationTime: number;
  rulesApplied: string[];
  cacheHit?: boolean | undefined;
  source: 'schema' | 'config' | 'external' | 'custom' | 'batch';
};

// Enhanced error transformation with context
function transformZodError(error: z.ZodError, source: string = 'schema'): ValidationError[] {
  return error.issues.map((err: z.ZodIssue) => ({
    field: err.path.join('.') || 'root',
    message: err.message,
    code: err.code,
    severity: getSeverityFromCode(err.code),
    context: {
      path: err.path,
      received: (err as any).received,
      expected: (err as any).expected,
      source
    }
  }));
}

// Severity mapping for error codes
function getSeverityFromCode(code: string): 'low' | 'medium' | 'high' | 'critical' {
  const severityMap: Record<string, 'low' | 'medium' | 'high' | 'critical'> = {
    'invalid_type': 'high',
    'invalid_string': 'medium',
    'too_small': 'medium',
    'too_big': 'medium',
    'invalid_enum_value': 'high',
    'unrecognized_keys': 'low',
    'invalid_arguments': 'critical',
    'invalid_return_type': 'critical',
    'invalid_date': 'medium',
    'invalid_literal': 'high',
    'custom': 'medium'
  };
  return severityMap[code] || 'medium';
}

// Enhanced validation with comprehensive error handling
async function validateWithEnhancedErrorHandling<T>(
  data: unknown,
  schemaImport: () => Promise<{ schema: z.ZodSchema<T> }>,
  validationType: string
): Promise<ValidationResult<T>> {
  const startTime = performance.now();
  const metadata: ValidationMetadata = {
    validationTime: 0,
    rulesApplied: [],
    source: 'schema'
  };

  try {
    // Import schema dynamically
    const { schema } = await schemaImport();
    
    // Schema validation
    const result = schema.safeParse(data);
    const errors: ValidationError[] = [];
    const warnings: ValidationError[] = [];
    
    if (!result.success) {
      errors.push(...transformZodError(result.error, 'schema'));
    }
    
    // Config validation (always run for warnings)
    try {
      const configTarget: Record<string, unknown> =
        result.success && result.data && typeof result.data === "object"
          ? (result.data as Record<string, unknown>)
          : data && typeof data === "object"
            ? (data as Record<string, unknown>)
            : {};

      const configErrors = validateWithConfig(configTarget, schema);
      configErrors.forEach(error => {
        if (error.code.includes('warning') || error.severity === 'low') {
          warnings.push(error);
        } else {
          errors.push({ ...error, source: 'config' } as any);
        }
      });
      metadata.rulesApplied.push('config');
    } catch (configError) {
      // Config validation is optional, don't fail the entire validation
      warnings.push({
        field: 'config',
        message: 'Configuration validation failed',
        code: 'config_error',
        severity: 'low'
      });
    }
    
    metadata.validationTime = performance.now() - startTime;
    
    if (errors.length > 0) {
      return {
        success: false,
        errors,
        warnings: warnings.length > 0 ? warnings : undefined,
        metadata
      };
    }
    
    return {
      success: true,
      data: result.data as T,
      warnings: warnings.length > 0 ? warnings : undefined,
      metadata
    };
    
  } catch (error) {
    metadata.validationTime = performance.now() - startTime;
    
    return {
      success: false,
      errors: [{
        field: 'root',
        message: error instanceof Error ? error.message : 'Validation failed',
        code: 'validation_exception',
        severity: 'critical',
        context: { validationType, error: String(error) }
      }],
      metadata
    };
  }
}

// Cached validation functions
const validateProductCreateCached = withCache(
  (data: unknown) => validateWithEnhancedErrorHandling(
    data,
    async () => {
      const { productCreateSchema } = await import("./schemas");
      return { schema: productCreateSchema as z.ZodSchema<any> };
    },
    'product_create'
  ),
  (data) => `create:${JSON.stringify(data).slice(0, 100)}`,
  60000 // 1 minute cache
);

const validateProductUpdateCached = withCache(
  (data: unknown) => validateWithEnhancedErrorHandling(
    data,
    async () => {
      const { productUpdateSchema } = await import("./schemas");
      return { schema: productUpdateSchema as z.ZodSchema<any> };
    },
    'product_update'
  ),
  (data) => `update:${JSON.stringify(data).slice(0, 100)}`,
  60000 // 1 minute cache
);

// Main validation functions with metrics
export const validateProductCreate = withMetrics(
  validateProductCreateCached,
  'product_create_validation'
);

export const validateProductUpdate = withMetrics(
  validateProductUpdateCached,
  'product_update_validation'
);

// Enhanced type guards with detailed checking
export async function isValidProductCreate(data: unknown): Promise<boolean> {
  if (data === null || data === undefined) return false;
  if (typeof data !== 'object') return false;
  
  const result = await validateProductCreate(data);
  return result.success;
}

export async function isValidProductUpdate(data: unknown): Promise<boolean> {
  if (data === null || data === undefined) return false;
  if (typeof data !== 'object') return false;
  
  const result = await validateProductUpdate(data);
  return result.success;
}

// Synchronous type guards for basic checks
export function isProductLike(data: unknown): data is Record<string, any> {
  return data !== null && typeof data === 'object' && !Array.isArray(data);
}

export function hasRequiredProductFields(data: unknown): boolean {
  if (!isProductLike(data)) return false;
  return 'sku' in data || 'name_en' in data || 'price' in data;
}

// Field-specific validators
export async function validateProductField(
  field: string,
  value: unknown,
  context: 'create' | 'update' = 'create'
): Promise<ValidationResult<unknown>> {
  const partialData = { [field]: value };
  
  if (context === 'create') {
    const result = await validateProductCreate(partialData);
    return {
      ...result,
      data: result.success ? value : undefined
    } as ValidationResult<unknown>;
  } else {
    const result = await validateProductUpdate(partialData);
    return {
      ...result,
      data: result.success ? value : undefined
    } as ValidationResult<unknown>;
  }
}

// Batch field validation
export async function validateProductFields(
  fields: Record<string, unknown>,
  context: 'create' | 'update' = 'create'
): Promise<Record<string, ValidationResult<unknown>>> {
  const results: Record<string, ValidationResult<unknown>> = {};
  
  await Promise.all(
    Object.entries(fields).map(async ([field, value]) => {
      results[field] = await validateProductField(field, value, context);
    })
  );
  
  return results;
}

// Validation summary utilities
export function getValidationSummary(result: ValidationResult<any>): {
  isValid: boolean;
  errorCount: number;
  warningCount: number;
  criticalErrors: ValidationError[];
  fieldErrors: Record<string, ValidationError[]>;
} {
  const errors = result.success ? [] : result.errors;
  const warnings = result.warnings || [];
  
  const criticalErrors = errors.filter(e => e.severity === 'critical');
  const fieldErrors: Record<string, ValidationError[]> = {};
  
  [...errors, ...warnings].forEach(error => {
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

// Validation result utilities
export function mergeValidationResults<T>(
  results: ValidationResult<T>[]
): ValidationResult<T[]> {
  const allErrors: ValidationError[] = [];
  const allWarnings: ValidationError[] = [];
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
  } as ValidationResult<T[]>;
}
