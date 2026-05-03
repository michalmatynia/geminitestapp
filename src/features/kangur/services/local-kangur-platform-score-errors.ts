import { isRecoverableKangurClientFetchError } from '@/features/kangur/observability/client';
import { isKangurStatusError } from '@/features/kangur/services/status-errors';

const RECOVERABLE_SCORE_LIST_STATUS_CODES = new Set([404, 502, 503, 504]);

const getErrorMessage = (error: unknown): string | null => {
  if (error instanceof Error) {
    return error.message;
  }
  if (typeof error === 'string') {
    return error;
  }
  if (
    typeof error === 'object' &&
    error !== null &&
    'message' in error &&
    typeof error.message === 'string'
  ) {
    return error.message;
  }
  return null;
};

const isHtmlJsonParseMessage = (message: string | null): boolean => {
  if (message === null || message.length === 0) {
    return false;
  }

  const normalizedMessage = message.trim().toLowerCase();
  return (
    normalizedMessage.includes('unexpected token \'<\'') ||
    normalizedMessage.includes('"<!doctype "') ||
    normalizedMessage.includes('<!doctype html')
  );
};

export const isRecoverableScoreListReadError = (error: unknown): boolean => {
  if (isRecoverableKangurClientFetchError(error)) {
    return true;
  }

  if (isKangurStatusError(error) && RECOVERABLE_SCORE_LIST_STATUS_CODES.has(error.status)) {
    return true;
  }

  return isHtmlJsonParseMessage(getErrorMessage(error));
};
