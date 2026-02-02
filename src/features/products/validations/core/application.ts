import { ValidationServiceFactory } from './services';
import { InfrastructureFactory } from './infrastructure';
import { IValidator, ValidationResult, FieldValidationResult } from './interfaces';

// Application service that orchestrates validation
export class ValidationApplication {
  private serviceFactory: ValidationServiceFactory;
  private productCreateValidator: IValidator<unknown>;
  private productUpdateValidator: IValidator<unknown>;

  constructor() {
    const dependencies = InfrastructureFactory.createDependencies();
    this.serviceFactory = new ValidationServiceFactory(dependencies);
    this.productCreateValidator = this.serviceFactory.createProductCreateValidator();
    this.productUpdateValidator = this.serviceFactory.createProductUpdateValidator();
  }

  // Product validation methods
  async validateProductCreate(data: unknown): Promise<ValidationResult<unknown>> {
    return this.productCreateValidator.validate(data);
  }

  async validateProductUpdate(data: unknown): Promise<ValidationResult<unknown>> {
    return this.productUpdateValidator.validate(data);
  }

  async validateProductField(
    field: string, 
    value: unknown, 
    context: 'create' | 'update' = 'create'
  ): Promise<FieldValidationResult> {
    const validator = context === 'create' 
      ? this.productCreateValidator 
      : this.productUpdateValidator;
    
    return validator.validateField(field, value);
  }

  // Batch validation
  async validateProductsBatch(
    products: unknown[], 
    context: 'create' | 'update' = 'create'
  ): Promise<{
    results: Array<{ index: number; result: ValidationResult<unknown> }>;
    summary: { total: number; successful: number; failed: number };
  }> {
    const validator: IValidator<unknown> = context === 'create' 
      ? this.productCreateValidator 
      : this.productUpdateValidator;

    const results = await Promise.all(
      products.map(async (product: unknown, index: number): Promise<{ index: number; result: ValidationResult<unknown> }> => ({
        index,
        result: await validator.validate(product)
      }))
    );

    const successful: number = results.filter((r: { index: number; result: ValidationResult<unknown> }) => r.result.success).length;
    const failed: number = results.length - successful;

    return {
      results,
      summary: {
        total: results.length,
        successful,
        failed
      }
    };
  }

  // Field batch validation
  async validateProductFieldsBatch(
    fields: Record<string, unknown>,
    context: 'create' | 'update' = 'create'
  ): Promise<Record<string, FieldValidationResult>> {
    const results: Record<string, FieldValidationResult> = {};
    
    await Promise.all(
      Object.entries(fields).map(async ([field, value]: [string, unknown]) => {
        results[field] = await this.validateProductField(field, value, context);
      })
    );

    return results;
  }

  // Type guards
  async isValidProductCreate(data: unknown): Promise<boolean> {
    const result = await this.validateProductCreate(data);
    return result.success;
  }

  async isValidProductUpdate(data: unknown): Promise<boolean> {
    const result = await this.validateProductUpdate(data);
    return result.success;
  }
}

// Singleton instance
export const validationApp = new ValidationApplication();