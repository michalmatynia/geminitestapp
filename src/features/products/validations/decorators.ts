import { z } from "zod";
import { validateProductCreate, validateProductUpdate, type ValidationError } from "./validators";

// Validation decorator for methods
export function ValidateInput(schema: z.ZodSchema) {
  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      const [input] = args;
      const result = schema.safeParse(input);
      
      if (!result.success) {
        const errors: ValidationError[] = result.error.errors.map(err => ({
          field: err.path.join('.'),
          message: err.message,
          code: err.code,
        }));
        
        throw new ValidationException("Input validation failed", errors);
      }

      return originalMethod.apply(this, [result.data, ...args.slice(1)]);
    };

    return descriptor;
  };
}

// Validation decorator for product creation
export function ValidateProductCreate() {
  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      const [input] = args;
      const result = await validateProductCreate(input);
      
      if (!result.success) {
        throw new ValidationException("Product creation validation failed", result.errors);
      }

      return originalMethod.apply(this, [result.data, ...args.slice(1)]);
    };

    return descriptor;
  };
}

// Validation decorator for product updates
export function ValidateProductUpdate() {
  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      const [input] = args;
      const result = await validateProductUpdate(input);
      
      if (!result.success) {
        throw new ValidationException("Product update validation failed", result.errors);
      }

      return originalMethod.apply(this, [result.data, ...args.slice(1)]);
    };

    return descriptor;
  };
}

// Custom validation exception
export class ValidationException extends Error {
  constructor(
    message: string,
    public readonly errors: ValidationError[],
    public readonly code: string = "VALIDATION_ERROR"
  ) {
    super(message);
    this.name = "ValidationException";
  }

  toJSON() {
    return {
      name: this.name,
      message: this.message,
      code: this.code,
      errors: this.errors,
    };
  }
}

// Validation result wrapper
export class ValidationResult<T> {
  constructor(
    public readonly success: boolean,
    public readonly data?: T,
    public readonly errors?: ValidationError[]
  ) {}

  static success<T>(data: T): ValidationResult<T> {
    return new ValidationResult(true, data);
  }

  static failure<T>(errors: ValidationError[]): ValidationResult<T> {
    return new ValidationResult(false, undefined, errors);
  }

  map<U>(fn: (data: T) => U): ValidationResult<U> {
    if (this.success && this.data !== undefined) {
      return ValidationResult.success(fn(this.data));
    }
    return ValidationResult.failure(this.errors || []);
  }

  flatMap<U>(fn: (data: T) => ValidationResult<U>): ValidationResult<U> {
    if (this.success && this.data !== undefined) {
      return fn(this.data);
    }
    return ValidationResult.failure(this.errors || []);
  }
}