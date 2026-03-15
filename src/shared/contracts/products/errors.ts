import type { ErrorCategory, SuggestedAction } from '@/shared/contracts/observability';

export type ProductApiErrorCode =
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

export type ProductApiErrorDetail = {
  field?: string;
  message: string;
  code: string;
  value?: unknown;
};

export type ProductApiError = {
  error: {
    code: ProductApiErrorCode;
    message: string;
    category: ErrorCategory;
    suggestedActions: SuggestedAction[];
    details?: ProductApiErrorDetail[];
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
