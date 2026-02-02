import { validateProductCreate, validateProductUpdate, type ValidationError } from "./validators";
import { withMetrics } from "./metrics";

export type BatchValidationResult<T> = {
  index: number;
  success: boolean;
  data?: T | undefined;
  errors: ValidationError[];
};

export type BatchValidationSummary<T> = {
  total: number;
  successful: number;
  failed: number;
  results: BatchValidationResult<T>[];
  globalErrors: ValidationError[];
};

export type BatchValidationOptions = {
  concurrency?: number;
  stopOnFirstError?: boolean;
  validateDuplicates?: boolean;
  duplicateFields?: string[];
};

class BatchValidator {
  private async validateBatch<T>(
    items: unknown[],
    validator: (item: unknown) => Promise<{ success: boolean; data?: T; errors: ValidationError[] }>,
    options: BatchValidationOptions = {}
  ): Promise<BatchValidationSummary<T>> {
    const {
      concurrency = 10,
      stopOnFirstError = false,
      validateDuplicates = true,
      duplicateFields = ['sku']
    } = options;

    const results: BatchValidationResult<T>[] = [];
    const globalErrors: ValidationError[] = [];
    
    // Check for duplicates if enabled
    if (validateDuplicates) {
      const duplicates = this.findDuplicates(items, duplicateFields);
      if (duplicates.length > 0) {
        globalErrors.push(...duplicates);
        if (stopOnFirstError) {
          return {
            total: items.length,
            successful: 0,
            failed: items.length,
            results: [],
            globalErrors
          };
        }
      }
    }

    // Process items in batches
    for (let i: number = 0; i < items.length; i += concurrency) {
      const batch: unknown[] = items.slice(i, i + concurrency);
      const batchPromises = batch.map(async (item: unknown, batchIndex: number) => {
        const actualIndex: number = i + batchIndex;
        try {
          const result = await validator(item);
          return {
            index: actualIndex,
            success: result.success,
            data: result.data,
            errors: result.errors
          };
        } catch (error: unknown) {
          const validationError: ValidationError = {
            field: 'root',
            message: error instanceof Error ? error.message : 'Validation failed',
            code: 'validation_exception',
            severity: 'critical'
          };
          return {
            index: actualIndex,
            success: false,
            errors: [validationError]
          };
        }
      });

      const batchResults = await Promise.all(batchPromises);
      results.push(...batchResults);

      // Stop on first error if configured
      if (stopOnFirstError && batchResults.some((r: BatchValidationResult<T>) => !r.success)) {
        break;
      }
    }

    const successful: number = results.filter((r: BatchValidationResult<T>) => r.success).length;
    const failed: number = results.length - successful;

    return {
      total: items.length,
      successful,
      failed,
      results,
      globalErrors
    };
  }

  private findDuplicates(items: unknown[], fields: string[]): ValidationError[] {
    const errors: ValidationError[] = [];
    const seen: Map<string, number[]> = new Map<string, number[]>();

    items.forEach((item: unknown, index: number) => {
      if (typeof item === 'object' && item !== null) {
        fields.forEach((field: string) => {
          const value: unknown = (item as Record<string, unknown>)[field];
          if (value !== undefined && value !== null) {
            const valueStr: string = typeof value === 'object' ? JSON.stringify(value) : String(value);
            const key: string = `${field}:${valueStr}`;
            if (!seen.has(key)) {
              seen.set(key, []);
            }
            seen.get(key)!.push(index);
          }
        });
      }
    });

    seen.forEach((indices: number[], key: string) => {
      if (indices.length > 1) {
        const parts: string[] = key.split(':');
        const field: string = parts[0] || 'unknown';
        const value: string = parts.slice(1).join(':');
        errors.push({
          field: 'batch',
          message: `Duplicate ${field} "${value}" found at indices: ${indices.join(', ')}`,
          code: 'duplicate_value',
          severity: 'high'
        });
      }
    });

    return errors;
  }

  async validateProductsCreate(
    items: unknown[],
    options?: BatchValidationOptions
  ): Promise<BatchValidationSummary<unknown>> {
    return this.validateBatch<unknown>(
      items,
      async (item: unknown) => {
        const result = await validateProductCreate(item);
        return {
          success: result.success,
          data: result.success ? result.data : undefined,
          errors: result.success ? [] : result.errors
        };
      },
      options
    );
  }

  async validateProductsUpdate(
    items: unknown[],
    options?: BatchValidationOptions
  ): Promise<BatchValidationSummary<unknown>> {
    return this.validateBatch<unknown>(
      items,
      async (item: unknown) => {
        const result = await validateProductUpdate(item);
        return {
          success: result.success,
          data: result.success ? result.data : undefined,
          errors: result.success ? [] : result.errors
        };
      },
      { ...options, validateDuplicates: false } // Updates don't need duplicate checking
    );
  }
}

export const batchValidator = new BatchValidator();

// Metrics-wrapped batch validation
export const validateProductsBatch = withMetrics(
  batchValidator.validateProductsCreate.bind(batchValidator),
  'batch_product_create_validation'
);

export const validateProductsUpdateBatch = withMetrics(
  batchValidator.validateProductsUpdate.bind(batchValidator),
  'batch_product_update_validation'
);