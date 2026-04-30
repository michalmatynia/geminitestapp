import { ApiError } from '@/shared/lib/api-client';

const isRecord = (value: unknown): value is Record<string, unknown> =>
  value !== null && typeof value === 'object' && Array.isArray(value) === false;

const readApiErrorPayload = (error: unknown): Record<string, unknown> | null => {
  if (!(error instanceof ApiError)) return null;
  return isRecord(error.payload) ? error.payload : null;
};

const readApiErrorCode = (error: unknown): string | null => {
  const payload = readApiErrorPayload(error);
  const code = payload?.['code'];
  return typeof code === 'string' ? code : null;
};

const readApiErrorDetails = (error: unknown): Record<string, unknown> | null => {
  const payload = readApiErrorPayload(error);
  const details = payload?.['details'];
  return isRecord(details) ? details : null;
};

const readBaseApiErrorCode = (error: unknown): string | null => {
  const details = readApiErrorDetails(error);
  const errorCode = details?.['errorCode'];
  return typeof errorCode === 'string' ? errorCode : null;
};

const shouldIgnoreApiErrorCode = (apiErrorCode: string | null): boolean | null => {
  if (apiErrorCode === 'TIMEOUT' || apiErrorCode === 'SERVICE_UNAVAILABLE') return true;
  if (apiErrorCode === 'INTEGRATION_ERROR' || apiErrorCode === 'API_KEY_INVALID') return false;
  if (apiErrorCode === 'UNAUTHORIZED' || apiErrorCode === 'FORBIDDEN') return false;
  return null;
};

export const shouldIgnoreInventoryLookupError = (
  error: unknown,
  configuredInventoryId: string
): boolean => {
  if (configuredInventoryId === '') return false;

  const baseErrorCode = readBaseApiErrorCode(error);
  if (baseErrorCode === 'ERROR_USER_ACCOUNT_BLOCKED') return false;
  if (baseErrorCode === 'ERROR_UNKNOWN_METHOD') return true;

  const apiErrorDecision = shouldIgnoreApiErrorCode(readApiErrorCode(error));
  if (apiErrorDecision !== null) return apiErrorDecision;

  if (error instanceof ApiError) return error.status >= 500;
  return true;
};
