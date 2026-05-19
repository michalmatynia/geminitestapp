import { ApiError } from '@/shared/lib/api-client';

const MISSING_ECOMMERCE_CATEGORY_REASON = 'missing_ecommerce_category';
const ECOMMERCE_DB_CONNECTION_STATUSES = new Set([503]);
const ECOMMERCE_DB_CONNECTION_CODES = new Set(['DATABASE_ERROR', 'CONFIGURATION_ERROR']);

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

export const isMissingEcommerceCategoryError = (error: unknown): boolean => {
  if (!(error instanceof ApiError) || !isRecord(error.payload)) return false;
  const details = error.payload['details'];
  return (
    isRecord(details) &&
    details['reason'] === MISSING_ECOMMERCE_CATEGORY_REASON
  );
};

export const isEcommerceDbConnectionError = (error: unknown): boolean => {
  if (!(error instanceof ApiError)) return false;
  if (ECOMMERCE_DB_CONNECTION_STATUSES.has(error.status)) return true;
  if (!isRecord(error.payload)) return false;
  const code = error.payload['code'];
  return typeof code === 'string' && ECOMMERCE_DB_CONNECTION_CODES.has(code);
};

export const getEcommerceExportToastVariant = (error: unknown): 'warning' | 'error' =>
  isMissingEcommerceCategoryError(error) ? 'warning' : 'error';
