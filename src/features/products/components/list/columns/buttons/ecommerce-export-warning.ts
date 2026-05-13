import { ApiError } from '@/shared/lib/api-client';

const MISSING_ECOMMERCE_CATEGORY_REASON = 'missing_ecommerce_category';

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

export const getEcommerceExportToastVariant = (error: unknown): 'warning' | 'error' =>
  isMissingEcommerceCategoryError(error) ? 'warning' : 'error';
