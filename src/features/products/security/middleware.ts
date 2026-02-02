import { NextRequest, NextResponse } from 'next/server';
import { InputSanitizer, ProductSanitizationRules, validateProductInput } from './input-sanitization';
import { withRateLimit, rateLimiters } from './rate-limiting';
import { withSecureFileUpload } from './file-upload';

type SecurityConfig = {
  enableRateLimit?: boolean | undefined;
  enableInputSanitization?: boolean | undefined;
  enableFileUploadSecurity?: boolean | undefined;
  rateLimiter?: 'api' | 'productCreate' | 'imageUpload' | 'search' | 'auth' | undefined;
  customSanitizationRules?: Record<string, any> | undefined;
};

interface SanitizedFile {
  file: File;
  sanitizedName: string;
  hash: string;
}

export class SecurityMiddleware {
  static async validateRequest(
    req: NextRequest,
    config: SecurityConfig = {}
  ): Promise<{
    allowed: boolean;
    headers?: Record<string, string> | undefined;
    status?: number | undefined;
    message?: string | undefined;
    sanitizedData?: unknown | undefined;
  }> {
    const {
      enableRateLimit = true,
      enableInputSanitization = true,
      rateLimiter = 'api'
    } = config;

    // Rate limiting check
    if (enableRateLimit) {
      const limiter = rateLimiters[rateLimiter];
      const rateLimitResult = await withRateLimit(limiter)(req);
      
      if (!rateLimitResult.allowed) {
        return {
          allowed: false,
          headers: rateLimitResult.headers,
          status: rateLimitResult.status,
          message: rateLimitResult.message
        };
      }
    }

    // Input sanitization
    let sanitizedData: unknown;
    if (enableInputSanitization) {
      try {
        const contentType = req.headers.get('content-type') || '';
        
        if (contentType.includes('application/json')) {
          const body = (await req.json()) as Record<string, unknown>;
          sanitizedData = InputSanitizer.sanitizeObject(
            body,
            config.customSanitizationRules || ProductSanitizationRules
          );
          
          // Validate sanitized data
          const validation = validateProductInput(sanitizedData as any);
          if (!validation.isValid) {
            return {
              allowed: false,
              status: 400,
              message: `Validation failed: ${validation.errors.join(', ')}`
            };
          }
        }
      } catch (error) {
        return {
          allowed: false,
          status: 400,
          message: 'Invalid request body'
        };
      }
    }

    return {
      allowed: true,
      sanitizedData
    };
  }

  static async validateFileUpload(
    req: NextRequest,
    config: SecurityConfig = {}
  ): Promise<{
    allowed: boolean;
    headers?: Record<string, string> | undefined;
    status?: number | undefined;
    message?: string | undefined;
    files?: SanitizedFile[] | undefined;
  }> {
    // Rate limiting for file uploads
    if (config.enableRateLimit !== false) {
      const rateLimitResult = await withRateLimit(rateLimiters.imageUpload)(req);
      
      if (!rateLimitResult.allowed) {
        return {
          allowed: false,
          headers: rateLimitResult.headers,
          status: rateLimitResult.status,
          message: rateLimitResult.message
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
          message: `File upload failed: ${uploadResult.errors.join(', ')}`
        };
      }

      return {
        allowed: true,
        files: uploadResult.sanitizedFiles as SanitizedFile[]
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
    "default-src 'self'; img-src 'self' data: https:; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'"
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

type Handler = (req: NextRequest, ...args: any[]) => Promise<Response>;

// API route wrapper with security
export function withSecurity(
  handler: Handler,
  config: SecurityConfig = {}
) {
  return async (req: NextRequest, ...args: unknown[]): Promise<Response> => {
    try {
      // Validate request
      const validation = await SecurityMiddleware.validateRequest(req, config);
      
      if (!validation.allowed) {
        const response = NextResponse.json(
          { error: validation.message || 'Request not allowed' },
          { status: validation.status || 403 }
        );
        
        // Add rate limit headers if present
        if (validation.headers) {
          Object.entries(validation.headers).forEach(([key, value]) => {
            response.headers.set(key, value);
          });
        }
        
        return addSecurityHeaders(response);
      }

      // Call original handler with sanitized data
      const modifiedReq = validation.sanitizedData 
        ? new NextRequest(req.url, {
            ...req,
            body: JSON.stringify(validation.sanitizedData)
          })
        : req;

      const response = await handler(modifiedReq, ...args);
      
      // Add security headers to response
      return addSecurityHeaders(response as NextResponse);

    } catch (error) {
      const errorResponse = NextResponse.json(
        { error: 'Internal server error' },
        { status: 500 }
      );
      
      return addSecurityHeaders(errorResponse);
    }
  };
}

type FileUploadHandler = (req: NextRequest, files: SanitizedFile[], ...args: any[]) => Promise<Response>;

// File upload wrapper with security
export function withFileUploadSecurity(
  handler: FileUploadHandler,
  config: SecurityConfig = {}
) {
  return async (req: NextRequest, ...args: unknown[]): Promise<Response> => {
    try {
      const validation = await SecurityMiddleware.validateFileUpload(req, config);
      
      if (!validation.allowed) {
        const response = NextResponse.json(
          { error: validation.message || 'File upload not allowed' },
          { status: validation.status || 403 }
        );
        
        if (validation.headers) {
          Object.entries(validation.headers).forEach(([key, value]) => {
            response.headers.set(key, value);
          });
        }
        
        return addSecurityHeaders(response);
      }

      const response = await handler(req, validation.files || [], ...args);
      return addSecurityHeaders(response as NextResponse);

    } catch (error) {
      const errorResponse = NextResponse.json(
        { error: 'File upload failed' },
        { status: 500 }
      );
      
      return addSecurityHeaders(errorResponse);
    }
  };
}