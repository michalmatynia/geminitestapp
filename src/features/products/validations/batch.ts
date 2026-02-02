import { validateProductCreate, validateProductUpdate, type ValidationError } from "./validators";
import { withMetrics } from "./metrics";

export type BatchValidationResult<T> = {
  index: number;
  success: boolean;
  data?: T;
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
    for (let i = 0; i < items.length; i += concurrency) {
      const batch = items.slice(i, i + concurrency);
      const batchPromises = batch.map(async (item, batchIndex) => {
        const actualIndex = i + batchIndex;
        try {
          const result = await validator(item);
          return {
            index: actualIndex,
            success: result.success,
            data: result.data,
            errors: result.errors
          };
        } catch (error) {
          return {
            index: actualIndex,
            success: false,
            errors: [{
              field: 'root',
              message: error instanceof Error ? error.message : 'Validation failed',
              code: 'validation_exception'
            }]
          };
        }
      });

      const batchResults = await Promise.all(batchPromises);
      results.push(...batchResults);

      // Stop on first error if configured
      if (stopOnFirstError && batchResults.some(r => !r.success)) {
        break;
      }
    }

    const successful = results.filter(r => r.success).length;
    const failed = results.length - successful;

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
    const seen = new Map<string, number[]>();

    items.forEach((item, index) => {
      if (typeof item === 'object' && item !== null) {
        fields.forEach(field => {
          const value = (item as any)[field];
          if (value !== undefined && value !== null) {
            const key = `${field}:${value}`;
            if (!seen.has(key)) {
              seen.set(key, []);
            }
            seen.get(key)!.push(index);
          }
        });
      }
    });

    seen.forEach((indices, key) => {
      if (indices.length > 1) {
        const [field, value] = key.split(':', 2);
        errors.push({
          field: 'batch',
          message: `Duplicate ${field} "${value}" found at indices: ${indices.join(', ')}`,
          code: 'duplicate_value'
        });
      }
    });

    return errors;
  }

  async validateProductsCreate(
    items: unknown[],
    options?: BatchValidationOptions
  ): Promise<BatchValidationSummary<any>> {
    return this.validateBatch(
      items,
      async (item) => {
        const result = await validateProductCreate(item);
        return result;
      },
      options
    );
  }

  async validateProductsUpdate(
    items: unknown[],
    options?: BatchValidationOptions
  ): Promise<BatchValidationSummary<any>> {
    return this.validateBatch(
      items,
      async (item) => {
        const result = await validateProductUpdate(item);
        return result;
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