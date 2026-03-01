import { badRequestError } from '@/shared/errors/app-error';
import {
  type BaseFieldMapping,
  type BaseExportProductLike,
  type BaseExportRequestData,
  baseExportRequestSchema as exportSchema,
} from '@/shared/contracts/integrations';

export type { BaseFieldMapping, BaseExportProductLike, BaseExportRequestData };
export { exportSchema };

export const CATEGORY_TEMPLATE_PRODUCT_FIELDS = new Set(['categoryid', 'category_id', 'category']);
export const PRODUCER_ID_TEMPLATE_FIELDS = new Set([
  'producer_id',
  'producerid',
  'manufacturer_id',
  'manufacturerid',
  'producer',
]);
export const TAG_ID_TEMPLATE_FIELDS = new Set(['tagid', 'tag_id', 'tagids', 'tag_ids']);

export const toTrimmedString = (value: unknown): string => {
  if (typeof value === 'string') return value.trim();
  if (typeof value === 'number') return String(value).trim();
  return '';
};

export const matchesTemplateField = (value: string, fields: Set<string>): boolean => {
  if (!value) return false;
  const normalized = value.trim().toLowerCase();
  return fields.has(normalized);
};

export const isMissingExternalEntity = (name: unknown, kind: 'category' | 'producer'): boolean => {
  if (typeof name !== 'string') return false;
  const normalized = name.trim().toLowerCase();
  if (kind === 'category') {
    return normalized.includes('[deleted]') || normalized.includes('[unknown]');
  }
  return normalized.includes('[deleted]') || normalized.includes('[unknown]');
};

export const toTimeMs = (value: unknown): number => {
  if (value instanceof Date) return value.getTime();
  if (typeof value === 'string') return Date.parse(value) || 0;
  if (typeof value === 'number') return value;
  return 0;
};

export const autoScaleBadRequest = (message: string, meta?: Record<string, unknown>): Error => {
  return badRequestError(message, { autoScaleErrorCode: 'INVALID_PAYLOAD', ...meta });
};

export const guessExtension = (mime: string): string => {
  const normalized = mime.toLowerCase();
  if (normalized === 'image/png') return '.png';
  if (normalized === 'image/webp') return '.webp';
  return '.jpg';
};
