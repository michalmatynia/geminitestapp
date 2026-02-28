import { z } from 'zod';
import { badRequestError } from '@/shared/errors/app-error';

export const exportSchema = z.object({
  connectionId: z.string().min(1),
  inventoryId: z.string().min(1),
  templateId: z.string().optional(),
  allowDuplicateSku: z.boolean().optional(),
  exportImagesAsBase64: z.boolean().optional(),
  imageBase64Mode: z.enum(['base-only', 'full-data-uri']).optional(),
  imagesOnly: z.boolean().optional(),
  listingId: z.string().optional(),
  externalListingId: z.string().optional(),
  imageTransform: z
    .object({
      forceJpeg: z.boolean().optional(),
      maxDimension: z.number().int().positive().optional(),
      jpegQuality: z.number().int().min(10).max(100).optional(),
    })
    .optional(),
});
export type BaseExportRequestData = z.infer<typeof exportSchema>;

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

export const isMissingExternalEntity = (
  name: unknown,
  kind: 'category' | 'producer'
): boolean => {
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

export const autoScaleBadRequest = (
  message: string,
  meta?: Record<string, unknown>
): Error => {
  return badRequestError(message, { autoScaleErrorCode: 'INVALID_PAYLOAD', ...meta });
};

export const guessExtension = (mime: string): string => {
  const normalized = mime.toLowerCase();
  if (normalized === 'image/png') return '.png';
  if (normalized === 'image/webp') return '.webp';
  return '.jpg';
};

export type BaseFieldMapping = {
  sourceKey: string;
  targetField: string;
  [key: string]: unknown;
};

export type BaseExportProductLike = {
  id: string;
  sku?: string | null;
  categoryId?: string | null;
  producers?: any[];
  tags?: any[];
  catalogs?: any[];
  parameters?: any[];
  [key: string]: any;
};
