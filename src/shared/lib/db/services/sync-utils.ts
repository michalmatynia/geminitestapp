import 'server-only';

import { ObjectId } from 'mongodb';

export const isObjectIdString = (value: string): boolean => /^[a-fA-F0-9]{24}$/.test(value);

export const toObjectIdMaybe = (value: string | null | undefined): ObjectId | string | null => {
  if (!value) return null;
  return isObjectIdString(value) ? new ObjectId(value) : value;
};

export const toDate = (value: unknown): Date | null => {
  if (!value) return null;
  if (value instanceof Date) return value;
  if (typeof value === 'string' || typeof value === 'number') {
    const parsed = new Date(value);
    return Number.isNaN(parsed.valueOf()) ? null : parsed;
  }
  return null;
};

export const toJsonValue = (value: unknown): unknown => {
  if (value === undefined || value === null) return null;
  if (value instanceof Date) return value.toISOString();
  if (value instanceof ObjectId) return value.toString();
  if (Array.isArray(value)) {
    return value.map((entry: unknown): unknown => toJsonValue(entry));
  }
  if (typeof value === 'object') {
    const record = value as Record<string, unknown>;
    const entries = Object.entries(record).map(([key, entry]): [string, unknown] => [
      key,
      toJsonValue(entry),
    ]);
    return Object.fromEntries(entries);
  }
  return value;
};

export const normalizeId = (doc: Record<string, unknown>): string => {
  const direct = doc['id'];
  if (typeof direct === 'string' && direct.trim()) return direct;
  const raw = doc['_id'];
  if (typeof raw === 'string') return raw;
  if (raw && typeof raw === 'object' && 'toString' in raw) {
    return (raw as { toString: () => string }).toString();
  }
  return '';
};
