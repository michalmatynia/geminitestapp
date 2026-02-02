import { ValidationError } from './interfaces';

// Base error classes
export abstract class ValidationErrorBase extends Error {
  abstract readonly code: string;
  abstract readonly severity: 'low' | 'medium' | 'high' | 'critical';
  
  constructor(
    message: string,
    public readonly field: string = 'root',
    public readonly context?: Record<string, any>
  ) {
    super(message);
    this.name = this.constructor.name;
  }

  toValidationError(): ValidationError {
    return {
      field: this.field,
      message: this.message,
      code: this.code,
      severity: this.severity,
      context: this.context
    };
  }
}

// Specific error types
export class SchemaValidationError extends ValidationErrorBase {
  readonly code = 'SCHEMA_VALIDATION_ERROR';
  readonly severity = 'high' as const;
}

export class BusinessRuleError extends ValidationErrorBase {
  readonly code = 'BUSINESS_RULE_ERROR';
  readonly severity = 'medium' as const;
}

export class ConfigurationError extends ValidationErrorBase {
  readonly code = 'CONFIGURATION_ERROR';
  readonly severity = 'low' as const;
}

export class ExternalServiceError extends ValidationErrorBase {
  readonly code = 'EXTERNAL_SERVICE_ERROR';
  readonly severity = 'medium' as const;
}

export class ValidationSystemError extends ValidationErrorBase {
  readonly code = 'VALIDATION_SYSTEM_ERROR';
  readonly severity = 'critical' as const;
}

// Error handler interface
export interface IErrorHandler {
  handle(error: Error): ValidationError[];
  canHandle(error: Error): boolean;
}

// Error handler implementations
export class ZodErrorHandler implements IErrorHandler {
  canHandle(error: Error): boolean {
    return error.name === 'ZodError';
  }

  handle(error: any): ValidationError[] {
    return error.errors?.map((err: any) => ({
      field: err.path?.join('.') || 'root',
      message: err.message,
      code: err.code,
      severity: this.getSeverity(err.code),
      context: { path: err.path, received: err.received }
    })) || [];
  }

  private getSeverity(code: string): 'low' | 'medium' | 'high' | 'critical' {
    const severityMap: Record<string, 'low' | 'medium' | 'high' | 'critical'> = {
      'invalid_type': 'high',
      'too_small': 'medium',
      'too_big': 'medium',
      'invalid_string': 'medium',
      'custom': 'medium'
    };
    return severityMap[code] || 'medium';
  }
}

export class ValidationErrorHandler implements IErrorHandler {
  canHandle(error: Error): boolean {
    return error instanceof ValidationErrorBase;
  }

  handle(error: Error): ValidationError[] {
    if (error instanceof ValidationErrorBase) {
      return [error.toValidationError()];
    }
    return [];
  }
}

export class GenericErrorHandler implements IErrorHandler {
  canHandle(): boolean {
    return true; // Fallback handler
  }

  handle(error: Error): ValidationError[] {
    return [{
      field: 'root',
      message: error.message || 'Unknown validation error',
      code: 'UNKNOWN_ERROR',
      severity: 'medium',
      context: { originalError: error.name }
    }];
  }
}

// Error handler registry
export class ErrorHandlerRegistry {
  private handlers: IErrorHandler[] = [
    new ZodErrorHandler(),
    new ValidationErrorHandler(),
    new GenericErrorHandler() // Must be last (fallback)
  ];

  handle(error: Error): ValidationError[] {
    const handler = this.handlers.find(h => h.canHandle(error));
    return handler?.handle(error) || [];
  }

  addHandler(handler: IErrorHandler, priority: number = 0): void {
    this.handlers.splice(priority, 0, handler);
  }
}

// Global error handler instance
export const errorHandler = new ErrorHandlerRegistry();

// Error handling utilities
export function handleValidationError(error: unknown): ValidationError[] {
  if (error instanceof Error) {
    return errorHandler.handle(error);
  }
  
  return [{
    field: 'root',
    message: String(error) || 'Unknown error occurred',
    code: 'UNKNOWN_ERROR',
    severity: 'medium'
  }];
}

export function createValidationError(
  field: string,
  message: string,
  code: string,
  severity: 'low' | 'medium' | 'high' | 'critical' = 'medium',
  context?: Record<string, any>
): ValidationError {
  return { field, message, code, severity, context };
}