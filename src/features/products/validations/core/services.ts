import { 
  IValidator, 
  IValidationCache, 
  IValidationMetrics, 
  IValidationRuleEngine,
  ValidationResult,
  FieldValidationResult,
  ValidationMetadata,
  ValidationError,
  ValidationMetric
} from './interfaces';
import { handleValidationError } from './errors';

// Service dependencies
export interface ValidationServiceDependencies {
  cache: IValidationCache;
  metrics: IValidationMetrics;
  ruleEngine: IValidationRuleEngine;
}

// Base validation service
export abstract class BaseValidationService<T> implements IValidator<T> {
  constructor(protected dependencies: ValidationServiceDependencies) {}

  async validate(data: unknown): Promise<ValidationResult<T>> {
    const startTime: number = performance.now();
    const metadata: ValidationMetadata = {
      validationTime: 0,
      rulesApplied: [],
      cacheHit: false,
      source: 'schema'
    };

    try {
      // Check cache first
      const cacheKey: string = this.getCacheKey(data);
      const cached: ValidationResult<T> | null = this.dependencies.cache.get<ValidationResult<T>>(cacheKey);
      
      if (cached) {
        metadata.cacheHit = true;
        metadata.validationTime = performance.now() - startTime;
        return { ...cached, metadata };
      }

      // Perform validation
      const result: ValidationResult<T> = await this.performValidation(data, metadata);
      
      // Cache successful results
      if (result.success) {
        this.dependencies.cache.set(cacheKey, result, 60000);
      }

      // Record metrics
      const metric: ValidationMetric = {
        name: this.getValidationName(),
        duration: metadata.validationTime,
        success: result.success,
        errorCount: result.success ? 0 : result.errors.length
      };
      this.dependencies.metrics.record(metric);

      return result;

    } catch (error: unknown) {
      metadata.validationTime = performance.now() - startTime;
      const errors: ValidationError[] = handleValidationError(error);
      
      return {
        success: false,
        errors,
        metadata
      };
    }
  }

  async validateField(field: string, value: unknown): Promise<FieldValidationResult> {
    const partialData: Record<string, unknown> = { [field]: value };
    const result: ValidationResult<T> = await this.validate(partialData);
    
    return {
      field,
      isValid: result.success,
      errors: result.success ? [] : result.errors.filter((e: ValidationError) => e.field === field),
      warnings: result.warnings?.filter((e: ValidationError) => e.field === field)
    };
  }

  protected abstract performValidation(data: unknown, metadata: ValidationMetadata): Promise<ValidationResult<T>>;
  protected abstract getCacheKey(data: unknown): string;
  protected abstract getValidationName(): string;
}

// Product-specific validation services
export class ProductCreateValidationService extends BaseValidationService<unknown> {
  protected async performValidation(data: unknown, metadata: ValidationMetadata): Promise<ValidationResult<unknown>> {
    const startTime = performance.now();
    
    try {
      // Schema validation
      const { productCreateSchema } = await import('../schemas');
      const schemaResult = productCreateSchema.safeParse(data);
      
      if (!schemaResult.success) {
        const errors = handleValidationError(schemaResult.error);
        metadata.validationTime = performance.now() - startTime;
        return { success: false, errors, metadata };
      }

      // Rule engine validation
      const ruleResult = this.dependencies.ruleEngine.executeRules({
        data: schemaResult.data
      });
      
      metadata.rulesApplied = ruleResult.rulesExecuted;
      metadata.validationTime = performance.now() - startTime;

      if (ruleResult.errors.length > 0) {
        return {
          success: false,
          errors: ruleResult.errors,
          warnings: ruleResult.warnings,
          metadata
        };
      }

      return {
        success: true,
        data: schemaResult.data,
        warnings: ruleResult.warnings,
        metadata
      };

    } catch (error) {
      metadata.validationTime = performance.now() - startTime;
      throw error;
    }
  }

  protected getCacheKey(data: unknown): string {
    return `product:create:${JSON.stringify(data).slice(0, 100)}`;
  }

  protected getValidationName(): string {
    return 'product_create';
  }
}

export class ProductUpdateValidationService extends BaseValidationService<unknown> {
  protected async performValidation(data: unknown, metadata: ValidationMetadata): Promise<ValidationResult<unknown>> {
    const startTime = performance.now();
    
    try {
      // Schema validation
      const { productUpdateSchema } = await import('../schemas');
      const schemaResult = productUpdateSchema.safeParse(data);
      
      if (!schemaResult.success) {
        const errors = handleValidationError(schemaResult.error);
        metadata.validationTime = performance.now() - startTime;
        return { success: false, errors, metadata };
      }

      // Rule engine validation (optional for updates)
      const ruleResult = this.dependencies.ruleEngine.executeRules({
        data: schemaResult.data
      });
      
      metadata.rulesApplied = ruleResult.rulesExecuted;
      metadata.validationTime = performance.now() - startTime;

      return {
        success: true,
        data: schemaResult.data,
        warnings: ruleResult.warnings,
        metadata
      };

    } catch (error) {
      metadata.validationTime = performance.now() - startTime;
      throw error;
    }
  }

  protected getCacheKey(data: unknown): string {
    return `product:update:${JSON.stringify(data).slice(0, 100)}`;
  }

  protected getValidationName(): string {
    return 'product_update';
  }
}

// Service factory
export class ValidationServiceFactory {
  constructor(private dependencies: ValidationServiceDependencies) {}

  createProductCreateValidator(): IValidator<unknown> {
    return new ProductCreateValidationService(this.dependencies);
  }

  createProductUpdateValidator(): IValidator<unknown> {
    return new ProductUpdateValidationService(this.dependencies);
  }
}