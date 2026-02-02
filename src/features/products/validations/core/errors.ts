import { ValidationError } from './interfaces';

// Base error classes
export abstract class ValidationErrorBase extends Error {
  abstract readonly code: string;
  abstract readonly severity: 'low' | 'medium' | 'high' | 'critical';
  
  constructor(
    message: string,
    public readonly field: string = 'root',
    public readonly context?: Record<string, unknown>
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
  readonly code: string = 'SCHEMA_VALIDATION_ERROR';
  readonly severity: 'low' | 'medium' | 'high' | 'critical' = 'high';
}

export class BusinessRuleError extends ValidationErrorBase {
  readonly code: string = 'BUSINESS_RULE_ERROR';
  readonly severity: 'low' | 'medium' | 'high' | 'critical' = 'medium';
}

export class ConfigurationError extends ValidationErrorBase {
  readonly code: string = 'CONFIGURATION_ERROR';
  readonly severity: 'low' | 'medium' | 'high' | 'critical' = 'low';
}

export class ExternalServiceError extends ValidationErrorBase {
  readonly code: string = 'EXTERNAL_SERVICE_ERROR';
  readonly severity: 'low' | 'medium' | 'high' | 'critical' = 'medium';
}

export class ValidationSystemError extends ValidationErrorBase {
  readonly code: string = 'VALIDATION_SYSTEM_ERROR';
  readonly severity: 'low' | 'medium' | 'high' | 'critical' = 'critical';
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

  handle(error: Error): ValidationError[] {
    const zodError = error as { errors?: Array<{ path?: string[]; message: string; code: string; received?: unknown }> };
    return zodError.errors?.map((err: { path?: string[]; message: string; code: string; received?: unknown }) => ({
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
  canHandle(_error: Error): boolean {
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
    const handler = this.handlers.find((h: IErrorHandler) => h.canHandle(error));
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
  context?: Record<string, unknown>
): ValidationError {
  return { field, message, code, severity, context };
}