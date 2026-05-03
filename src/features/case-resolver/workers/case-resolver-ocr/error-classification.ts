import { type CaseResolverOcrErrorCategory } from '@/features/case-resolver/server/ocr-runtime-job-store';

export const classifyCaseResolverOcrError = (error: unknown): CaseResolverOcrErrorCategory => {
  const message =
    error instanceof Error ? error.message.toLowerCase() : String(error).toLowerCase();
  
  if (isTimeoutError(message)) return 'timeout';
  if (isRateLimitError(message)) return 'rate_limit';
  if (isNetworkError(message)) return 'network';
  if (isProviderError(message)) return 'provider';
  if (isValidationError(message)) return 'validation';
  return 'unknown';
};

const isTimeoutError = (m: string) => m.includes('timed out') || m.includes('timeout');
const isRateLimitError = (m: string) => m.includes('rate limit') || m.includes('429') || m.includes('too many requests');
const isNetworkError = (m: string) => m.includes('econnreset') || m.includes('econnrefused') || m.includes('socket hang up') || m.includes('network');
const isProviderError = (m: string) => m.includes('temporarily unavailable') || m.includes('503') || m.includes('502') || m.includes('504');
const isValidationError = (m: string) => m.includes('invalid filepath') || m.includes('only image and pdf files are supported') || m.includes('filepath is required') || m.includes('ocr model is not configured');

export const isRetryableCaseResolverOcrError = (error: unknown): boolean => {
  const category = classifyCaseResolverOcrError(error);
  return (
    category === 'timeout' ||
    category === 'rate_limit' ||
    category === 'network' ||
    category === 'provider'
  );
};
