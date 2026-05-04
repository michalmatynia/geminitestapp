/**
 * Product Security Middleware
 * 
 * Comprehensive security layer for product-related operations.
 * Provides protection through:
 * - Rate limiting to prevent abuse and DoS attacks
 * - Input sanitization and validation for XSS prevention
 * - Secure file upload handling with type validation
 * - Configurable security policies per endpoint
 * - Automatic threat detection and logging
 * 
 * This middleware ensures all product operations meet
 * security standards while maintaining performance.
 */

import { NextRequest, type NextResponse } from 'next/server';

import { AppError } from '@/shared/errors/app-error';

import { withSecureFileUpload } from './file-upload';
import {
  InputSanitizer,
  ProductSanitizationRules,
  validateProductInput,
  type SanitizationOptions,
} from './input-sanitization';
import { withRateLimit, rateLimiters } from './rate-limiting';
import { logClientError } from '@/shared/utils/observability/client-error-logger';

// Configuration options for security middleware
type SecurityConfig = {
  enableRateLimit?: boolean | undefined; // Enable request rate limiting
  enableInputSanitization?: boolean | undefined; // Enable input cleaning
  enableFileUploadSecurity?: boolean | undefined; // Enable file validation
  rateLimiter?: 'api' | 'productCreate' | 'imageUpload' | 'search' | 'auth' | undefined; // Rate limit type
  customSanitizationRules?: Record<string, SanitizationOptions> | undefined; // Custom sanitization rules
};

// Sanitized file with validated name
interface SanitizedFile {
  file: File;
  sanitizedName: string;
  hash: string;
}

type RequestValidationResult = {
  allowed: boolean;
  headers?: Record<string, string> | undefined;
  status?: number | undefined;
  message?: string | undefined;
  sanitizedData?: unknown;
};

type FileUploadValidationResult = {
  allowed: boolean;
  headers?: Record<string, string> | undefined;
  status?: number | undefined;
  message?: string | undefined;
  files?: SanitizedFile[] | undefined;
};

const createRequestDeniedResult = (
  status: number,
  message: string,
  headers?: Record<string, string>
): RequestValidationResult => ({
  allowed: false,
  headers,
  status,
  message,
});

const validateRequestRateLimit = async (
  req: NextRequest,
  config: SecurityConfig
): Promise<RequestValidationResult | null> => {
  if (config.enableRateLimit === false) return null;

  const limiter = rateLimiters[config.rateLimiter ?? 'api'];
  const rateLimitResult = await withRateLimit(limiter)(req);

  if (rateLimitResult.allowed) return null;

  return createRequestDeniedResult(
    rateLimitResult.status ?? 429,
    rateLimitResult.message ?? 'Too many requests',
    rateLimitResult.headers
  );
};

const sanitizeJsonRequestBody = async (
  req: NextRequest,
  config: SecurityConfig
): Promise<RequestValidationResult> => {
  try {
    const contentType = req.headers.get('content-type') ?? '';
    if (!contentType.includes('application/json')) return { allowed: true };

    const body = (await req.json()) as Record<string, unknown>;
    const rules = config.customSanitizationRules ?? ProductSanitizationRules;
    const sanitizedData = InputSanitizer.sanitizeObject(
      body,
      rules as Partial<Record<string, SanitizationOptions>>
    );
    const validation = validateProductInput(sanitizedData);

    if (validation.isValid) {
      return {
        allowed: true,
        sanitizedData,
      };
    }

    return createRequestDeniedResult(
      400,
      `Validation failed: ${validation.errors.join(', ')}`
    );
  } catch (error) {
    logClientError(error);
    return createRequestDeniedResult(400, 'Invalid request body');
  }
};

const hasSanitizedData = (
  validation: RequestValidationResult
): validation is RequestValidationResult & { sanitizedData: unknown } =>
  Object.prototype.hasOwnProperty.call(validation, 'sanitizedData');

export class SecurityMiddleware {
  static async validateRequest(
    req: NextRequest,
    config: SecurityConfig = {}
  ): Promise<RequestValidationResult> {
    const rateLimitFailure = await validateRequestRateLimit(req, config);
    if (rateLimitFailure !== null) return rateLimitFailure;

    if (config.enableInputSanitization === false) return { allowed: true };
    return await sanitizeJsonRequestBody(req, config);
  }

  static async validateFileUpload(
    req: NextRequest,
    config: SecurityConfig = {}
  ): Promise<FileUploadValidationResult> {
    // Rate limiting for file uploads
    if (config.enableRateLimit !== false) {
      const rateLimitResult = await withRateLimit(rateLimiters.imageUpload)(req);

      if (!rateLimitResult.allowed) {
        return {
          allowed: false,
          headers: rateLimitResult.headers,
          status: rateLimitResult.status,
          message: rateLimitResult.message,
        };
      }
    }

    // File upload security
    if (config.enableFileUploadSecurity !== false) {
      const uploadResult = await withSecureFileUpload(req);

      if (!uploadResult.isValid) {
        return {
          allowed: false,
          status: 400,
          message: `File upload failed: ${uploadResult.errors.join(', ')}`,
        };
      }

      return {
        allowed: true,
        files: uploadResult.sanitizedFiles as SanitizedFile[],
      };
    }

    return { allowed: true };
  }
}

// Security headers middleware
export function addSecurityHeaders(response: NextResponse): NextResponse {
  // Content Security Policy
  response.headers.set(
    'Content-Security-Policy',
    'default-src \'self\'; img-src \'self\' data: https:; media-src \'self\' data:; script-src \'self\' \'unsafe-inline\'; style-src \'self\' \'unsafe-inline\''
  );

  // Other security headers
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');

  // Remove server information
  response.headers.delete('Server');
  response.headers.delete('X-Powered-By');

  return response;
}

type Handler = (req: NextRequest, ...args: unknown[]) => Promise<Response>;

// API route wrapper with security
export function withSecurity(
  handler: Handler,
  config: SecurityConfig = {}
): (req: NextRequest, ...args: unknown[]) => Promise<Response> {
  return async (req: NextRequest, ...args: unknown[]): Promise<Response> => {
    try {
      // Validate request
      const validation = await SecurityMiddleware.validateRequest(req, config);

      if (!validation.allowed) {
        throw new AppError(validation.message ?? 'Request not allowed', {
          code: 'SECURITY_VALIDATION_FAILED',
          httpStatus: validation.status ?? 403,
          meta: validation.headers,
        });
      }

      // Call original handler with sanitized data
      const modifiedReq = hasSanitizedData(validation)
        ? new NextRequest(req.url, {
          ...req,
          body: JSON.stringify(validation.sanitizedData),
        })
        : req;

      const response = await handler(modifiedReq, ...args);

      // Add security headers to response
      return addSecurityHeaders(response as NextResponse);
    } catch (error) {
      logClientError(error);
      const { createErrorResponse } = await import('@/shared/lib/api/handle-api-error');
      const response = await createErrorResponse(error, {
        request: req,
        source: 'products.security.middleware',
        fallbackMessage: 'Internal server error',
      });
      return addSecurityHeaders(response);
    }
  };
}

type FileUploadHandler = (
  req: NextRequest,
  files: SanitizedFile[],
  ...args: unknown[]
) => Promise<Response>;

// File upload wrapper with security
export function withFileUploadSecurity(
  handler: FileUploadHandler,
  config: SecurityConfig = {}
): (req: NextRequest, ...args: unknown[]) => Promise<Response> {
  return async (req: NextRequest, ...args: unknown[]): Promise<Response> => {
    try {
      const validation = await SecurityMiddleware.validateFileUpload(req, config);

      if (!validation.allowed) {
        throw new AppError(validation.message ?? 'File upload not allowed', {
          code: 'FILE_UPLOAD_SECURITY_FAILED',
          httpStatus: validation.status ?? 403,
          meta: validation.headers,
        });
      }

      const response = await handler(req, validation.files ?? [], ...args);
      return addSecurityHeaders(response as NextResponse);
    } catch (error) {
      logClientError(error);
      const { createErrorResponse } = await import('@/shared/lib/api/handle-api-error');
      const response = await createErrorResponse(error, {
        request: req,
        source: 'products.security.fileupload',
        fallbackMessage: 'File upload failed',
      });
      return addSecurityHeaders(response);
    }
  };
}
