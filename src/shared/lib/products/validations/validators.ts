import {
  productCreateSchema,
  productUpdateSchema,
  type ProductCreateInput,
  type ProductUpdateInput,
} from './schemas';

import type { ZodIssue } from 'zod';
import { logClientError } from '@/shared/utils/observability/client-error-logger';

const reportValidationError = async (
  message: string,
  context: Record<string, unknown> = {}
): Promise<void> => {
  try {
    const { reportValidationError: report } =
      await import('@/shared/utils/observability/validation-reporter');
    await report(message, context);
  } catch (error) {
    logClientError(error);
    const { logger } = await import('@/shared/utils/logger');
    logger.error('[validators] Failed to report validation error', { message });
  }
};

// Core validation types
export type ValidationError = {
  field: string;
  message: string;
  code: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  context?: Record<string, unknown> | undefined;
};

export type ValidationMetadata = {
  validationTime: number;
  rulesApplied: string[];
  cacheHit: boolean;
  source: 'schema' | 'config' | 'external' | 'rule' | 'batch';
  metadata?: Record<string, unknown>;
};

export type ValidationResult<T> =
  | {
      success: true;
      data: T;
      warnings?: ValidationError[] | undefined;
      metadata: ValidationMetadata;
    }
  | {
      success: false;
      errors: ValidationError[];
      warnings?: ValidationError[] | undefined;
      metadata: ValidationMetadata;
    };

export type FieldValidationResult = {
  field: string;
  isValid: boolean;
  errors: ValidationError[];
  warnings?: ValidationError[] | undefined;
};

// Helpers

function zodIssueSeverity(code: string): ValidationError['severity'] {
  if (code === 'invalid_type') return 'high';
  return 'medium';
}

function zodIssuesToErrors(issues: ZodIssue[]): ValidationError[] {
  return issues.map((issue) => ({
    field: issue.path.join('.') || 'root',
    message: issue.message,
    code: issue.code,
    severity: zodIssueSeverity(issue.code),
    context: {
      path: issue.path,
      // Include more specific context from the Zod issue
      ...(issue.message && { message: issue.message }),
      ...(issue.params && { params: issue.params }),
      ...(issue.code && { code: issue.code }),
    },
  }));
}

function createMetadata(startTime: number): ValidationMetadata {
  return {
    validationTime: performance.now() - startTime,
    rulesApplied: [],
    cacheHit: false,
    source: 'schema',
  };
}

// Main validation functions

export async function validateProductCreate(
  data: unknown,
  report: boolean = false
): Promise<ValidationResult<ProductCreateInput>> {
  const startTime = performance.now();
  const result = productCreateSchema.safeParse(data);
  const metadata = createMetadata(startTime);

  if (!result.success) {
    const errors = zodIssuesToErrors(result.error.issues);
    if (report) {
      void reportValidationError('Product creation validation failed', {
        service: 'product-service',
        action: 'validateProductCreate',
        errors: errors.map((e) => ({ field: e.field, message: e.message })),
        data: data, // Consider redacting if it contains sensitive info
      });
    }
    return { success: false, errors, metadata };
  }
  return { success: true, data: result.data, metadata };
}

export async function validateProductUpdate(
  data: unknown,
  report: boolean = false
): Promise<ValidationResult<ProductUpdateInput>> {
  const startTime = performance.now();
  const result = productUpdateSchema.safeParse(data);
  const metadata = createMetadata(startTime);

  if (!result.success) {
    const errors = zodIssuesToErrors(result.error.issues);
    if (report) {
      void reportValidationError('Product update validation failed', {
        service: 'product-service',
        action: 'validateProductUpdate',
        errors: errors.map((e) => ({ field: e.field, message: e.message })),
        data: data,
      });
    }
    return { success: false, errors, metadata };
  }
  return { success: true, data: result.data, metadata };
}

export async function validateProductField(
  field: string,
  value: unknown,
  context: 'create' | 'update' = 'create'
): Promise<FieldValidationResult> {
  const partialData = { [field]: value };
  const result =
    context === 'create'
      ? await validateProductCreate(partialData)
      : await validateProductUpdate(partialData);

  return {
    field,
    isValid: result.success,
    errors: result.success ? [] : result.errors.filter((e) => e.field === field),
    warnings: result.warnings?.filter((e) => e.field === field),
  };
}

export async function validateProductFields(
  fields: Record<string, unknown>,
  context: 'create' | 'update' = 'create'
): Promise<Record<string, FieldValidationResult>> {
  const results: Record<string, FieldValidationResult> = {};
  await Promise.all(
    Object.entries(fields).map(async ([field, value]) => {
      results[field] = await validateProductField(field, value, context);
    })
  );
  return results;
}

export async function validateProductsBatch(
  products: unknown[],
  context: 'create' | 'update' = 'create'
): Promise<{
  results: Array<{ index: number; result: ValidationResult<unknown> }>;
  summary: { total: number; successful: number; failed: number };
}> {
  const validate = context === 'create' ? validateProductCreate : validateProductUpdate;

  const results = await Promise.all(
    products.map(async (product, index) => ({
      index,
      result: await validate(product),
    }))
  );

  const successful = results.filter((r) => r.result.success).length;

  return {
    results,
    summary: { total: results.length, successful, failed: results.length - successful },
  };
}

// Type guards

export async function isValidProductCreate(data: unknown): Promise<boolean> {
  const result = await validateProductCreate(data);
  return result.success;
}

export async function isValidProductUpdate(data: unknown): Promise<boolean> {
  const result = await validateProductUpdate(data);
  return result.success;
}

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
  const errors = result.success ? [] : result.errors || [];
  const warnings = result.warnings || [];

  const criticalErrors = errors.filter((e) => e.severity === 'critical');
  const fieldErrors: Record<string, ValidationError[]> = {};

  [...errors, ...warnings].forEach((error) => {
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
    fieldErrors,
  };
}

export function mergeValidationResults<T>(results: ValidationResult<T>[]): ValidationResult<T[]> {
  const allErrors: ValidationError[] = [];
  const allWarnings: ValidationError[] = [];
  const validData: T[] = [];
  let totalTime = 0;
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
  const metadata: ValidationMetadata = {
    validationTime: totalTime,
    rulesApplied: [...new Set(allRules)],
    cacheHit: false,
    source: 'batch',
  };

  if (allErrors.length > 0) {
    return { success: false, errors: allErrors, warnings, metadata };
  }

  return { success: true, data: validData, warnings, metadata };
}
