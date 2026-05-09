import { ErrorSystem } from '@/shared/utils/observability/error-system';
import { type CaseResolverOcrErrorCategory } from '@/features/case-resolver/server/ocr-runtime-job-store';

/**
 * Classifies OCR errors into categories for appropriate handling.
 * 
 * Categories:
 * - timeout: Operation exceeded time limit
 * - rate_limit: API rate limit exceeded
 * - network: Connection/network failures
 * - provider: OCR service unavailable
 * - validation: Invalid input parameters
 * - unknown: Unclassified errors
 */
export const classifyCaseResolverOcrError = (error: unknown): CaseResolverOcrErrorCategory => {
  const message =
    error instanceof Error ? error.message.toLowerCase() : String(error).toLowerCase();
  
  if (isTimeoutError(message)) return 'timeout';
  if (isRateLimitError(message)) return 'rate_limit';
  if (isNetworkError(message)) return 'network';
  if (isProviderError(message)) return 'provider';
  if (isValidationError(message)) return 'validation';

  void ErrorSystem.logWarning('Unclassified OCR error detected', {
    message,
    originalError: error,
  });

  return 'unknown';
};

/** Detects timeout errors - Operation took too long */
const isTimeoutError = (m: string): boolean => m.includes('timed out') || m.includes('timeout');

/** Detects rate limit errors - Too many API requests */
const isRateLimitError = (m: string): boolean =>
  m.includes('rate limit') || m.includes('429') || m.includes('too many requests');

/** Detects network errors - Connection failures */
const isNetworkError = (m: string): boolean =>
  m.includes('econnreset') ||
  m.includes('econnrefused') ||
  m.includes('socket hang up') ||
  m.includes('network');

/** Detects provider errors - OCR service unavailable (5xx errors) */
const isProviderError = (m: string): boolean =>
  m.includes('temporarily unavailable') ||
  m.includes('503') ||
  m.includes('502') ||
  m.includes('504');

/** Detects validation errors - Invalid input parameters */
const isValidationError = (m: string): boolean =>
  m.includes('invalid filepath') ||
  m.includes('only image and pdf files are supported') ||
  m.includes('filepath is required') ||
  m.includes('ocr model is not configured');

/**
 * Determines if an OCR error is retryable.
 * Retryable errors: timeout, rate_limit, network, provider
 * Non-retryable errors: validation, unknown
 */
export const isRetryableCaseResolverOcrError = (error: unknown): boolean => {
  const category = classifyCaseResolverOcrError(error);
  return (
    category === 'timeout' ||
    category === 'rate_limit' ||
    category === 'network' ||
    category === 'provider'
  );
};
