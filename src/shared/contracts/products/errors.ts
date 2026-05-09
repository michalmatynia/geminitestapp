import type { ErrorCategory, SuggestedAction } from '@/shared/contracts/observability';

/**
 * Product API error codes for standardized error responses.
 * Each code maps to a specific HTTP status and error scenario.
 */
export type ProductApiErrorCode =
  | 'VALIDATION_ERROR'      // Request data failed validation (400)
  | 'NOT_FOUND'             // Resource doesn't exist (404)
  | 'UNAUTHORIZED'          // Authentication required (401)
  | 'FORBIDDEN'             // Insufficient permissions (403)
  | 'RATE_LIMITED'          // Too many requests (429)
  | 'DUPLICATE_RESOURCE'    // Resource already exists (409)
  | 'INVALID_REQUEST'       // Malformed request (400)
  | 'SERVER_ERROR'          // Internal server error (500)
  | 'SERVICE_UNAVAILABLE'   // Temporary service outage (503)
  | 'UNSUPPORTED_VERSION'   // API version not supported (400)
  | 'FILE_TOO_LARGE'        // File exceeds size limit (413)
  | 'INVALID_FILE_TYPE'     // File type not allowed (415)
  | 'QUOTA_EXCEEDED';       // Usage quota exceeded (429)

/**
 * Detailed error information for specific fields or validation failures.
 */
export type ProductApiErrorDetail = {
  field?: string;      // Field name that caused the error
  message: string;     // Human-readable error description
  code: string;        // Machine-readable error code
  value?: unknown;     // The invalid value that caused the error
};

/**
 * Standardized product API error response structure.
 * Includes error details, category, suggested actions, and metadata.
 */
export type ProductApiError = {
  error: {
    code: ProductApiErrorCode;              // Error code for programmatic handling
    message: string;                        // Human-readable error message
    category: ErrorCategory;                // Error category (NETWORK, AUTH, etc.)
    suggestedActions: SuggestedAction[];    // User-facing recovery actions
    details?: ProductApiErrorDetail[];      // Field-level error details
    timestamp: string;                      // ISO timestamp of error occurrence
    requestId?: string;                     // Request ID for tracking/debugging
    documentation?: string;                 // Link to error documentation
  };
  meta?: {
    version: string;    // API version used
    endpoint: string;   // API endpoint that failed
    method: string;     // HTTP method used
  };
};
