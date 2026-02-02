import type { ValidationError } from "./validators";
import { validateWithConfig } from "./config";
import { z } from "zod";

export type ValidationStep<T = any> = {
  name: string;
  validator: (data: T) => Promise<ValidationError[]> | ValidationError[];
  optional?: boolean;
  dependsOn?: string[];
};

export type PipelineResult<T> = {
  success: boolean;
  data?: T | undefined;
  errors: ValidationError[];
  stepResults: Record<string, { success: boolean; errors: ValidationError[] }>;
};

export class ValidationPipeline<T = any> {
  private steps: ValidationStep<T>[] = [];
  private middleware: Array<(data: T) => Promise<T> | T> = [];

  addStep(step: ValidationStep<T>): this {
    this.steps.push(step);
    return this;
  }

  addMiddleware(fn: (data: T) => Promise<T> | T): this {
    this.middleware.push(fn);
    return this;
  }

  async execute(data: T): Promise<PipelineResult<T>> {
    let processedData = data;
    const stepResults: Record<string, { success: boolean; errors: ValidationError[] }> = {};
    const allErrors: ValidationError[] = [];

    // Apply middleware first
    for (const middleware of this.middleware) {
      try {
        processedData = await middleware(processedData);
      } catch (error) {
        allErrors.push({
          field: "middleware",
          message: error instanceof Error ? error.message : "Middleware error",
          code: "middleware_error",
          severity: 'critical'
        });
        return {
          success: false,
          errors: allErrors,
          stepResults
        };
      }
    }

    // Execute validation steps
    for (const step of this.steps) {
      // Check dependencies
      if (step.dependsOn) {
        const dependenciesMet = step.dependsOn.every(dep => 
          stepResults[dep]?.success !== false
        );
        if (!dependenciesMet) {
          stepResults[step.name] = {
            success: false,
            errors: [{
              field: "dependency",
              message: `Step ${step.name} skipped due to failed dependencies`,
              code: "dependency_failed",
              severity: 'low'
            }]
          };
          continue;
        }
      }

      try {
        const errors = await step.validator(processedData);
        const success = errors.length === 0;
        
        stepResults[step.name] = { success, errors };
        
        if (!success && !step.optional) {
          allErrors.push(...errors);
        }
      } catch (error) {
        const validationError: ValidationError = {
          field: step.name,
          message: error instanceof Error ? error.message : "Validation step failed",
          code: "step_execution_error",
          severity: 'high'
        };
        
        stepResults[step.name] = {
          success: false,
          errors: [validationError]
        };
        
        if (!step.optional) {
          allErrors.push(validationError);
        }
      }
    }

    return {
      success: allErrors.length === 0,
      data: allErrors.length === 0 ? processedData : undefined,
      errors: allErrors,
      stepResults
    };
  }
}

// Pre-built pipelines
export function createProductValidationPipeline(): ValidationPipeline {
  return new ValidationPipeline()
    .addMiddleware((data: any) => {
      // Normalize data
      if (typeof data.price === "string") {
        data.price = parseFloat(data.price) || undefined;
      }
      if (typeof data.stock === "string") {
        data.stock = parseInt(data.stock) || undefined;
      }
      return data;
    })
    .addStep({
      name: "schema_validation",
      validator: async (data) => {
        const { productCreateSchema } = await import("./schemas");
        const result = productCreateSchema.safeParse(data);
        return result.success ? [] : result.error.issues.map((err: z.ZodIssue) => ({
          field: err.path.join('.'),
          message: err.message,
          code: err.code,
          severity: 'high'
        }));
      }
    })
    .addStep({
      name: "business_rules",
      validator: (data) => validateWithConfig(data, z.any()),
      dependsOn: ["schema_validation"]
    })
    .addStep({
      name: "duplicate_check",
      validator: async (data) => {
        // This would typically check against database
        if (data.sku === "DUPLICATE") {
          return [{
            field: "sku",
            message: "SKU already exists",
            code: "duplicate_sku",
            severity: 'medium'
          }];
        }
        return [];
      },
      dependsOn: ["schema_validation"]
    });
}

export function createProductUpdatePipeline(): ValidationPipeline {
  return new ValidationPipeline()
    .addMiddleware((data: any) => {
      // Remove undefined values for updates
      return Object.fromEntries(
        Object.entries(data).filter(([_, value]) => value !== undefined)
      );
    })
    .addStep({
      name: "schema_validation",
      validator: async (data) => {
        const { productUpdateSchema } = await import("./schemas");
        const result = productUpdateSchema.safeParse(data);
        return result.success ? [] : result.error.issues.map((err: z.ZodIssue) => ({
          field: err.path.join('.'),
          message: err.message,
          code: err.code,
          severity: 'high'
        }));
      }
    })
    .addStep({
      name: "business_rules",
      validator: (data) => validateWithConfig(data, z.any()),
      dependsOn: ["schema_validation"],
      optional: true
    });
}