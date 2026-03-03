import { type CaseResolverOcrErrorCategory } from '@/features/case-resolver/server/ocr-runtime-job-store';

export const classifyCaseResolverOcrError = (error: unknown): CaseResolverOcrErrorCategory => {
  const message =
    error instanceof Error ? error.message.toLowerCase() : String(error).toLowerCase();
  if (message.includes('timed out') || message.includes('timeout')) {
    return 'timeout';
  }
  if (
    message.includes('rate limit') ||
    message.includes('429') ||
    message.includes('too many requests')
  ) {
    return 'rate_limit';
  }
  if (
    message.includes('econnreset') ||
    message.includes('econnrefused') ||
    message.includes('socket hang up') ||
    message.includes('network')
  ) {
    return 'network';
  }
  if (
    message.includes('temporarily unavailable') ||
    message.includes('503') ||
    message.includes('502') ||
    message.includes('504')
  ) {
    return 'provider';
  }
  if (
    message.includes('invalid filepath') ||
    message.includes('only image and pdf files are supported') ||
    message.includes('filepath is required') ||
    message.includes('ocr model is not configured')
  ) {
    return 'validation';
  }
  return 'unknown';
};

export const isRetryableCaseResolverOcrError = (error: unknown): boolean => {
  const category = classifyCaseResolverOcrError(error);
  return (
    category === 'timeout' ||
    category === 'rate_limit' ||
    category === 'network' ||
    category === 'provider'
  );
};
