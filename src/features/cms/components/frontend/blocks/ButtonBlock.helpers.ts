import { logClientError } from '@/shared/utils/observability/client-error-logger';

export const parseBoolean = (value: unknown): boolean => value === true || value === 'true';

export const isRuntimeTruthyValue = (value: unknown): boolean => {
  if (typeof value === 'boolean') {
    return value;
  }

  if (typeof value === 'number') {
    return value !== 0;
  }

  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    return normalized.length > 0 && normalized !== 'false' && normalized !== '0';
  }

  return Boolean(value);
};

export const parseRuntimeActionArgs = (value: unknown): unknown[] => {
  if (Array.isArray(value)) {
    return value;
  }

  if (typeof value !== 'string') {
    return [];
  }

  const trimmed = value.trim();
  if (trimmed === '') {
    return [];
  }

  try {
    const parsed = JSON.parse(trimmed) as unknown;
    return Array.isArray(parsed) ? parsed : [parsed];
  } catch (error) {
    logClientError(error);
    return [trimmed];
  }
};
