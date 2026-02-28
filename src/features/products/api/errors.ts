import type { ErrorCategory, SuggestedAction } from '@/shared/contracts/observability';
import { classifyError, getSuggestedActions } from '@/shared/errors/error-classifier';

export type ErrorCode =
  | 'VALIDATION_ERROR'
  | 'NOT_FOUND'
  | 'UNAUTHORIZED'
  | 'FORBIDDEN'
  | 'RATE_LIMITED'
  | 'DUPLICATE_RESOURCE'
  | 'INVALID_REQUEST'
  | 'SERVER_ERROR'
  | 'SERVICE_UNAVAILABLE'
  | 'UNSUPPORTED_VERSION'
  | 'FILE_TOO_LARGE'
  | 'INVALID_FILE_TYPE'
  | 'QUOTA_EXCEEDED';

export type ErrorDetail = {
  field?: string;
  message: string;
  code: string;
  value?: unknown;
};

export type ApiError = {
  error: {
    code: ErrorCode;
    message: string;
    category: ErrorCategory;
    suggestedActions: SuggestedAction[];
    details?: ErrorDetail[];
    timestamp: string;
    requestId?: string;
    documentation?: string;
  };
  meta?: {
    version: string;
    endpoint: string;
    method: string;
  };
};

export class ApiErrorBuilder {
  private error: ApiError['error'];
  private meta: ApiError['meta'];

  constructor(code: ErrorCode, message: string) {
    const dummyError = new Error(message);
    const category = classifyError(dummyError);
    const suggestedActions = getSuggestedActions(category, dummyError);

    this.error = {
      code,
      message,
      category,
      suggestedActions,
      timestamp: new Date().toISOString(),
    };
  }

  withCategory(category: ErrorCategory): this {
    this.error.category = category;
    this.error.suggestedActions = getSuggestedActions(category, new Error(this.error.message));
    return this;
  }

  withDetails(details: ErrorDetail[]): this {
    this.error.details = details;
    return this;
  }

  withRequestId(requestId: string): this {
    this.error.requestId = requestId;
    return this;
  }

  withDocumentation(url: string): this {
    this.error.documentation = url;
    return this;
  }

  withMeta(version: string, endpoint: string, method: string): this {
    this.meta = { version, endpoint, method };
    return this;
  }

  build(): ApiError {
    return {
      error: this.error,
      ...(this.meta && { meta: this.meta }),
    };
  }

  toResponse(status: number = 400): Response {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    // Add specific headers based on error type
    switch (this.error.code) {
      case 'RATE_LIMITED':
        headers['Retry-After'] = '60';
        break;
      case 'UNSUPPORTED_VERSION':
        headers['API-Supported-Versions'] = 'v2';
        break;
      case 'SERVICE_UNAVAILABLE':
        headers['Retry-After'] = '300';
        break;
    }

    return new Response(JSON.stringify(this.build()), {
      status,
      headers,
    });
  }
}

// Pre-built error responses
export class StandardErrors {
  static validationError(details: ErrorDetail[]): ApiErrorBuilder {
    return new ApiErrorBuilder('VALIDATION_ERROR', 'Request validation failed')
      .withDetails(details)
      .withDocumentation('/docs/validation');
  }

  static notFound(resource: string = 'Resource'): ApiErrorBuilder {
    return new ApiErrorBuilder('NOT_FOUND', `${resource} not found`).withDocumentation(
      '/docs/errors#not-found'
    );
  }

  static unauthorized(): ApiErrorBuilder {
    return new ApiErrorBuilder('UNAUTHORIZED', 'Authentication required').withDocumentation(
      '/docs/authentication'
    );
  }

  static forbidden(action?: string): ApiErrorBuilder {
    const message = action ? `Insufficient permissions for ${action}` : 'Access forbidden';
    return new ApiErrorBuilder('FORBIDDEN', message).withDocumentation('/docs/permissions');
  }

  static rateLimited(_retryAfter: number = 60): ApiErrorBuilder {
    return new ApiErrorBuilder('RATE_LIMITED', 'Rate limit exceeded').withDocumentation(
      '/docs/rate-limits'
    );
  }

  static duplicateResource(field: string, value: unknown): ApiErrorBuilder {
    return new ApiErrorBuilder('DUPLICATE_RESOURCE', 'Resource already exists').withDetails([
      {
        field,
        message: `${field} '${String(value)}' already exists`,
        code: 'DUPLICATE_VALUE',
        value,
      },
    ]);
  }

  static invalidRequest(message: string = 'Invalid request format'): ApiErrorBuilder {
    return new ApiErrorBuilder('INVALID_REQUEST', message).withDocumentation('/docs/api-reference');
  }

  static serverError(): ApiErrorBuilder {
    return new ApiErrorBuilder('SERVER_ERROR', 'Internal server error').withDocumentation(
      '/docs/support'
    );
  }

  static serviceUnavailable(): ApiErrorBuilder {
    return new ApiErrorBuilder(
      'SERVICE_UNAVAILABLE',
      'Service temporarily unavailable'
    ).withDocumentation('/docs/status');
  }

  static unsupportedVersion(requested: string, supported: string[]): ApiErrorBuilder {
    return new ApiErrorBuilder(
      'UNSUPPORTED_VERSION',
      `API version '${requested}' is not supported`
    ).withDetails([
      {
        field: 'version',
        message: `Supported versions: ${supported.join(', ')}`,
        code: 'UNSUPPORTED_VERSION',
        value: requested,
      },
    ]);
  }

  static fileTooLarge(maxSize: number): ApiErrorBuilder {
    return new ApiErrorBuilder('FILE_TOO_LARGE', 'File size exceeds limit').withDetails([
      {
        field: 'file',
        message: `Maximum file size is ${maxSize} bytes`,
        code: 'FILE_SIZE_EXCEEDED',
        value: maxSize,
      },
    ]);
  }

  static invalidFileType(allowed: string[]): ApiErrorBuilder {
    return new ApiErrorBuilder('INVALID_FILE_TYPE', 'File type not allowed').withDetails([
      {
        field: 'file',
        message: `Allowed types: ${allowed.join(', ')}`,
        code: 'INVALID_MIME_TYPE',
        value: allowed,
      },
    ]);
  }

  static quotaExceeded(resource: string, limit: number): ApiErrorBuilder {
    return new ApiErrorBuilder('QUOTA_EXCEEDED', `${resource} quota exceeded`).withDetails([
      {
        field: resource,
        message: `Maximum ${limit} ${resource} allowed`,
        code: 'QUOTA_LIMIT_REACHED',
        value: limit,
      },
    ]);
  }
}

// Error response helpers
export function createVersionedErrorResponse(
  error: Error | ApiErrorBuilder,
  status: number = 500,
  requestId?: string
): Response {
  if (error instanceof ApiErrorBuilder) {
    if (requestId) {
      error.withRequestId(requestId);
    }
    return error.toResponse(status);
  }

  // Handle generic errors
  const category = classifyError(error);
  const builder = new ApiErrorBuilder(
    'SERVER_ERROR',
    error.message || 'An unexpected error occurred'
  ).withCategory(category);

  if (requestId) {
    builder.withRequestId(requestId);
  }

  // In development, include error details
  if (process.env['NODE_ENV'] === 'development') {
    builder.withDetails([
      {
        message: error.message,
        code: 'INTERNAL_ERROR',
      },
    ]);
  }

  return builder.toResponse(status);
}

// HTTP status code mapping
export const ErrorStatusCodes: Record<ErrorCode, number> = {
  VALIDATION_ERROR: 400,
  NOT_FOUND: 404,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  RATE_LIMITED: 429,
  DUPLICATE_RESOURCE: 409,
  INVALID_REQUEST: 400,
  SERVER_ERROR: 500,
  SERVICE_UNAVAILABLE: 503,
  UNSUPPORTED_VERSION: 400,
  FILE_TOO_LARGE: 413,
  INVALID_FILE_TYPE: 415,
  QUOTA_EXCEEDED: 429,
};
