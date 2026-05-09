/**
 * Products API Error Management
 * 
 * Error handling and classification for Products API.
 * Provides:
 * - Structured error building with metadata
 * - Error category classification and mapping
 * - Suggested action generation for errors
 * - Type-safe error code and detail handling
 * - Observability integration for error tracking
 */

import type { ErrorCategory } from '@/shared/contracts/observability';
import type { ProductApiError, ProductApiErrorCode, ProductApiErrorDetail } from '@/shared/contracts/products/errors';
import { classifyError, getSuggestedActions } from '@/shared/errors/error-classifier';

export type ErrorCode = ProductApiErrorCode;
export type ErrorDetail = ProductApiErrorDetail;
type ApiError = ProductApiError;

/** Builder class for constructing structured API errors with metadata */
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
    const result: ApiError = { error: this.error };
    if (this.meta !== undefined) result.meta = this.meta;
    return result;
  }

  toResponse(status: number = 400): Response {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    const code = this.error.code;
    if (code === 'RATE_LIMITED') headers['Retry-After'] = '60';
    else if (code === 'UNSUPPORTED_VERSION') headers['API-Supported-Versions'] = 'v2';
    else if (code === 'SERVICE_UNAVAILABLE') headers['Retry-After'] = '300';

    return new Response(JSON.stringify(this.build()), {
      status,
      headers,
    });
  }
}

/**
 * Pre-built error responses for common API error scenarios.
 * Each method returns a configured ApiErrorBuilder with appropriate error code,
 * message, and documentation link.
 */
export class StandardErrors {
  /** Validation error - Request data failed schema validation */
  static validationError(details: ErrorDetail[]): ApiErrorBuilder {
    return new ApiErrorBuilder('VALIDATION_ERROR', 'Request validation failed')
      .withDetails(details)
      .withDocumentation('/docs/validation');
  }

  /** Not found error - Requested resource doesn't exist */
  static notFound(resource: string = 'Resource'): ApiErrorBuilder {
    return new ApiErrorBuilder('NOT_FOUND', `${resource} not found`).withDocumentation(
      '/docs/errors#not-found'
    );
  }

  /** Unauthorized error - User not authenticated */
  static unauthorized(): ApiErrorBuilder {
    return new ApiErrorBuilder('UNAUTHORIZED', 'Authentication required').withDocumentation(
      '/docs/authentication'
    );
  }

  /** Forbidden error - User lacks required permissions */
  static forbidden(action?: string): ApiErrorBuilder {
    const message = (typeof action === 'string' && action !== '') ? `Insufficient permissions for ${action}` : 'Access forbidden';
    return new ApiErrorBuilder('FORBIDDEN', message).withDocumentation('/docs/permissions');
  }

  /** Rate limited error - Too many requests from client */
  static rateLimited(_retryAfter: number = 60): ApiErrorBuilder {
    return new ApiErrorBuilder('RATE_LIMITED', 'Rate limit exceeded').withDocumentation(
      '/docs/rate-limits'
    );
  }

  /** Duplicate resource error - Unique constraint violation */
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

  /** Invalid request error - Malformed request structure */
  static invalidRequest(message: string = 'Invalid request format'): ApiErrorBuilder {
    return new ApiErrorBuilder('INVALID_REQUEST', message).withDocumentation('/docs/api-reference');
  }

  /** Server error - Unexpected internal error */
  static serverError(): ApiErrorBuilder {
    return new ApiErrorBuilder('SERVER_ERROR', 'Internal server error').withDocumentation(
      '/docs/support'
    );
  }

  /** Service unavailable error - Temporary service outage */
  static serviceUnavailable(): ApiErrorBuilder {
    return new ApiErrorBuilder(
      'SERVICE_UNAVAILABLE',
      'Service temporarily unavailable'
    ).withDocumentation('/docs/status');
  }

  /** Unsupported version error - API version not supported */
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

  /** File too large error - Upload exceeds size limit */
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

  /** Invalid file type error - File MIME type not allowed */
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

  /** Quota exceeded error - Resource usage limit reached */
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
const attachRequestId = (builder: ApiErrorBuilder, requestId?: string): ApiErrorBuilder => {
  if (typeof requestId === 'string' && requestId !== '') {
    builder.withRequestId(requestId);
  }
  return builder;
};

const resolveErrorMessage = (error: Error): string =>
  typeof error.message === 'string' && error.message !== ''
    ? error.message
    : 'An unexpected error occurred';

const buildGenericErrorBuilder = (error: Error): ApiErrorBuilder => {
  const category = classifyError(error);
  const builder = new ApiErrorBuilder('SERVER_ERROR', resolveErrorMessage(error)).withCategory(
    category
  );

  if (process.env['NODE_ENV'] === 'development') {
    builder.withDetails([{ message: error.message, code: 'INTERNAL_ERROR' }]);
  }

  return builder;
};

export function createVersionedErrorResponse(
  error: Error | ApiErrorBuilder,
  status: number = 500,
  requestId?: string
): Response {
  if (error instanceof ApiErrorBuilder) {
    return attachRequestId(error, requestId).toResponse(status);
  }

  return attachRequestId(buildGenericErrorBuilder(error), requestId).toResponse(status);
}

/**
 * HTTP status code mapping for product API error codes.
 * Maps each error code to its appropriate HTTP status code.
 */
export const ErrorStatusCodes: Record<ErrorCode, number> = {
  VALIDATION_ERROR: 400,        // Bad Request - Invalid input data
  NOT_FOUND: 404,               // Not Found - Resource doesn't exist
  UNAUTHORIZED: 401,            // Unauthorized - Authentication required
  FORBIDDEN: 403,               // Forbidden - Insufficient permissions
  RATE_LIMITED: 429,            // Too Many Requests - Rate limit exceeded
  DUPLICATE_RESOURCE: 409,      // Conflict - Resource already exists
  INVALID_REQUEST: 400,         // Bad Request - Malformed request
  SERVER_ERROR: 500,            // Internal Server Error - Unexpected error
  SERVICE_UNAVAILABLE: 503,     // Service Unavailable - Temporary outage
  UNSUPPORTED_VERSION: 400,     // Bad Request - API version not supported
  FILE_TOO_LARGE: 413,          // Payload Too Large - File exceeds size limit
  INVALID_FILE_TYPE: 415,       // Unsupported Media Type - File type not allowed
  QUOTA_EXCEEDED: 429,          // Too Many Requests - Usage quota exceeded
};
