import { z } from "zod";
import type { ValidationError } from "./validators";

// Conditional validation helpers
export function createConditionalSchema<T extends z.ZodRawShape>(
  baseSchema: z.ZodObject<T>,
  conditions: Array<{
    when: (data: any) => boolean;
    then: z.ZodSchema;
    field: keyof T;
  }>
) {
  return baseSchema.superRefine((data, ctx) => {
    conditions.forEach(({ when, then, field }) => {
      if (when(data)) {
        const result = then.safeParse(data[field]);
        if (!result.success) {
          result.error.errors.forEach(error => {
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              path: [field as string],
              message: error.message,
            });
          });
        }
      }
    });
  });
}

// Field dependency validation
export function validateFieldDependencies(
  data: Record<string, any>,
  dependencies: Array<{
    field: string;
    dependsOn: string[];
    validator: (value: any, deps: Record<string, any>) => string | null;
  }>
): ValidationError[] {
  const errors: ValidationError[] = [];

  dependencies.forEach(({ field, dependsOn, validator }) => {
    const value = data[field];
    const deps = dependsOn.reduce((acc, dep) => ({
      ...acc,
      [dep]: data[dep]
    }), {});

    const error = validator(value, deps);
    if (error) {
      errors.push({
        field,
        message: error,
        code: "dependency_validation_failed"
      });
    }
  });

  return errors;
}

// Async validation queue
export class ValidationQueue {
  private queue: Array<() => Promise<ValidationError[]>> = [];
  private isProcessing = false;

  add(validator: () => Promise<ValidationError[]>) {
    this.queue.push(validator);
    if (!this.isProcessing) {
      this.process();
    }
  }

  private async process() {
    this.isProcessing = true;
    const allErrors: ValidationError[] = [];

    while (this.queue.length > 0) {
      const validator = this.queue.shift()!;
      try {
        const errors = await validator();
        allErrors.push(...errors);
      } catch (error) {
        allErrors.push({
          field: "unknown",
          message: "Validation error occurred",
          code: "validation_exception"
        });
      }
    }

    this.isProcessing = false;
    return allErrors;
  }
}

// Validation caching
const validationCache = new Map<string, { result: any; timestamp: number }>();
const CACHE_TTL = 5000; // 5 seconds

export function getCachedValidation<T>(key: string): T | null {
  const cached = validationCache.get(key);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.result;
  }
  return null;
}

export function setCachedValidation<T>(key: string, result: T): void {
  validationCache.set(key, { result, timestamp: Date.now() });
}

// Validation performance monitoring
export function withValidationMetrics<T extends (...args: any[]) => Promise<any>>(
  fn: T,
  name: string
): T {
  return (async (...args: Parameters<T>) => {
    const start = performance.now();
    try {
      const result = await fn(...args);
      const duration = performance.now() - start;
      console.debug(`Validation ${name} took ${duration.toFixed(2)}ms`);
      return result;
    } catch (error) {
      const duration = performance.now() - start;
      console.error(`Validation ${name} failed after ${duration.toFixed(2)}ms`, error);
      throw error;
    }
  }) as T;
}