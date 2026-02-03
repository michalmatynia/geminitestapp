import { z } from "zod";
import { logClientError } from "@/features/observability";
import type { ValidationError } from "./validators";

// Conditional validation helpers
export function createConditionalSchema<T extends z.ZodRawShape>(
  baseSchema: z.ZodObject<T>,
  conditions: Array<{
    when: (data: unknown) => boolean;
    then: z.ZodSchema;
    field: keyof T;
  }>
): z.ZodType<z.infer<z.ZodObject<T>>> {
  return baseSchema.superRefine((data: z.infer<z.ZodObject<T>>, ctx: z.RefinementCtx) => {
    conditions.forEach(({ when, then, field }: { when: (data: unknown) => boolean; then: z.ZodSchema; field: keyof T }) => {
      if (when(data)) {
        const result = then.safeParse((data as Record<string, unknown>)[field as string]);
        if (!result.success) {
          result.error.issues.forEach((error: z.ZodIssue) => {
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
  data: Record<string, unknown>,
  dependencies: Array<{
    field: string;
    dependsOn: string[];
    validator: (value: unknown, deps: Record<string, unknown>) => string | null;
  }>
): ValidationError[] {
  const errors: ValidationError[] = [];

  dependencies.forEach(({ field, dependsOn, validator }: { field: string; dependsOn: string[]; validator: (value: unknown, deps: Record<string, unknown>) => string | null }) => {
    const value = data[field];
    const deps = dependsOn.reduce((acc: Record<string, unknown>, dep: string) => ({
      ...acc,
      [dep]: data[dep]
    }), {});

    const error = validator(value, deps);
    if (error) {
      errors.push({
        field,
        message: error,
        code: "dependency_validation_failed",
        severity: 'medium'
      });
    }
  });

  return errors;
}

// Async validation queue
export class ValidationQueue {
  private queue: Array<() => Promise<ValidationError[]>> = [];
  private isProcessing: boolean = false;

  add(validator: () => Promise<ValidationError[]>): void {
    this.queue.push(validator);
    if (!this.isProcessing) {
      void this.process();
    }
  }

  private async process(): Promise<ValidationError[]> {
    this.isProcessing = true;
    const allErrors: ValidationError[] = [];

    while (this.queue.length > 0) {
      const validator = this.queue.shift()!;
      try {
        const errors = await validator();
        allErrors.push(...errors);
      } catch (_error: unknown) {
        allErrors.push({
          field: "unknown",
          message: "Validation error occurred",
          code: "validation_exception",
          severity: 'critical'
        });
      }
    }

    this.isProcessing = false;
    return allErrors;
  }
}

// Validation caching
const validationCache: Map<string, { result: unknown; timestamp: number }> = new Map<string, { result: unknown; timestamp: number }>();
const CACHE_TTL: number = 5000; // 5 seconds

export function getCachedValidation<T>(key: string): T | null {
  const cached = validationCache.get(key);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.result as T;
  }
  return null;
}

export function setCachedValidation<T>(key: string, result: T): void {
  validationCache.set(key, { result, timestamp: Date.now() });
}

// Validation performance monitoring
export function withValidationMetrics<T extends (...args: unknown[]) => Promise<unknown>>(
  fn: T,
  name: string
): T {
  return (async (...args: Parameters<T>): Promise<unknown> => {
    const start = performance.now();
    try {
      const result = await fn(...args);
      const duration = performance.now() - start;
      console.debug(`Validation ${name} took ${duration.toFixed(2)}ms`);
      return result;
    } catch (error) {
      const duration = performance.now() - start;
      logClientError(error, { context: { source: "ValidationMetrics", action: "validate", name, durationMs: duration } });
      throw error;
    }
  }) as T;
}
