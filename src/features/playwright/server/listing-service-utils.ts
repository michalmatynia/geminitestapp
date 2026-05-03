import 'server-only';

import { isAppError } from '@/shared/errors/app-error';

const toRecord = (value: unknown): Record<string, unknown> =>
  value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};

const toTrimmedString = (value: unknown): string | null =>
  typeof value === 'string' && value.trim().length > 0 ? value.trim() : null;

export const buildPlaywrightListingHistoryFields = ({
  browserMode,
  extraFields,
}: {
  browserMode: string | null | undefined;
  extraFields?: Array<string | null | undefined> | null;
}): string[] | null => {
  const fields: string[] = [];
  const normalizedBrowserMode = toTrimmedString(browserMode);
  if (normalizedBrowserMode) {
    fields.push(`browser_mode:${normalizedBrowserMode}`);
  }

  for (const field of extraFields ?? []) {
    const normalizedField = toTrimmedString(field);
    if (normalizedField) {
      fields.push(normalizedField);
    }
  }

  return fields.length > 0 ? fields : null;
};

export const resolvePlaywrightFailureListingStatus = (
  errorCategory: string | null | undefined
): string => (errorCategory === 'AUTH' ? 'auth_required' : 'failed');

export const extractPlaywrightAppErrorMetadata = (
  error: unknown
): Record<string, unknown> | undefined => {
  if (!isAppError(error)) return undefined;
  const metadata = toRecord(error.meta);
  return Object.keys(metadata).length > 0 ? metadata : undefined;
};
