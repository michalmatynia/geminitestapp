import type { ProductSyncRunStatus } from '@/shared/contracts/product-sync';

export const isTerminalRunStatus = (status: ProductSyncRunStatus): boolean =>
  status === 'completed' || status === 'partial_success' || status === 'failed';

export const nowIso = (): string => new Date().toISOString();

export const toTrimmedString = (value: unknown): string => {
  if (typeof value !== 'string') return '';
  return value.trim();
};

export const toFiniteNumber = (value: unknown): number | null => {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === 'string') {
    const parsed = Number(value.replace(',', '.').trim());
    if (Number.isFinite(parsed)) return parsed;
  }
  return null;
};

export const coerceNumber = (value: unknown): number | null => {
  const direct = toFiniteNumber(value);
  if (direct !== null) return Math.max(0, Math.round(direct));

  if (Array.isArray(value)) {
    for (const item of value) {
      const parsed = coerceNumber(item);
      if (parsed !== null) return parsed;
    }
    return null;
  }

  if (value !== null && typeof value === 'object') {
    for (const entry of Object.values(value as Record<string, unknown>)) {
      const parsed = coerceNumber(entry);
      if (parsed !== null) return parsed;
    }
  }

  return null;
};

export const serializeArrayField = (value: unknown): string | null => {
  if (value === null || value === undefined) return null;
  try {
    return JSON.stringify(value);
  } catch {
    return null;
  }
};
