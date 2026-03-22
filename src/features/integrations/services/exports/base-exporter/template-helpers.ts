import type { ParameterReference as ParsedParameterSourceKey } from '@/shared/contracts/integrations/parameter-reference';
import { logClientError } from '@/shared/utils/observability/client-error-logger';


export const toStringValue = (value: unknown): string | null => {
  if (value === null || value === undefined) return null;
  if (typeof value === 'string') return value.trim() || null;
  if (typeof value === 'number') return String(value);
  if (typeof value === 'boolean') return value ? '1' : '0';
  if (Array.isArray(value)) {
    const parts = value
      .map((entry: unknown) => toStringValue(entry))
      .filter((entry: string | null): entry is string => Boolean(entry));
    return parts.length ? parts.join(', ') : null;
  }
  if (typeof value === 'object') {
    try {
      return JSON.stringify(value);
    } catch (error) {
      logClientError(error);
      return null;
    }
  }
  return null;
};

export const toNumberValue = (value: unknown): number | null => {
  if (value === null || value === undefined) return null;
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string') {
    const parsed = Number(value.replace(',', '.'));
    if (Number.isFinite(parsed)) return parsed;
  }
  return null;
};

export const toTrimmedString = (value: unknown): string | null => {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed || null;
};

export type { ParsedParameterSourceKey };

export const parseParameterSourceKey = (sourceKey: string): ParsedParameterSourceKey | null => {
  const trimmed = sourceKey.trim();
  if (!trimmed) return null;
  if (!trimmed.toLowerCase().startsWith('parameter:')) return null;
  const rawPayload = trimmed.slice('parameter:'.length).trim();
  if (!rawPayload) return null;

  const languageDelimiterIndex = rawPayload.indexOf('|');
  if (languageDelimiterIndex < 0) {
    return {
      parameterId: rawPayload,
      languageCode: null,
    };
  }

  const parameterId = rawPayload.slice(0, languageDelimiterIndex).trim();
  if (!parameterId) return null;
  const languageCode = rawPayload.slice(languageDelimiterIndex + 1).trim();
  return {
    parameterId,
    languageCode: languageCode ? languageCode.toLowerCase() : null,
  };
};

export type ProducerEntry = {
  producerId?: string | null;
  producer_id?: string | null;
  producerName?: string | null;
  manufacturerId?: string | null;
  manufacturer_id?: string | null;
  manufacturerName?: string | null;
  manufacturer_name?: string | null;
  value?: string | null;
  id?: string | null;
  name?: string | null;
  producer?: {
    id?: string | null;
    name?: string | null;
  } | null;
};

export type TagEntry = {
  tagId?: string | null;
  tagName?: string | null;
  name?: string | null;
};

export const IMAGE_TARGET_FIELDS = new Set(['images', 'image', 'image_urls']);

export const PRODUCER_TARGET_FIELDS = new Set([
  'producer',
  'producers',
  'producer_id',
  'producer_ids',
  'producer_name',
  'producer_names',
  'producernames',
  'manufacturer',
  'manufacturer_id',
  'manufacturer_ids',
]);

export const TAG_TARGET_FIELDS = new Set(['tag', 'tags', 'tag_id', 'tag_ids']);

export const NUMERIC_TARGET_FIELDS = new Set(['weight', 'length', 'width', 'height']);

export const normalizeProducerTargetField = (targetField: string): string | null => {
  const normalized = targetField.trim().toLowerCase();
  if (
    normalized === 'producer' ||
    normalized === 'producerid' ||
    normalized === 'producer_id' ||
    normalized === 'manufacturer' ||
    normalized === 'manufacturerid' ||
    normalized === 'manufacturer_id'
  ) {
    return 'producer_id';
  }
  if (
    normalized === 'producers' ||
    normalized === 'producernames' ||
    normalized === 'producer_names' ||
    normalized === 'producername' ||
    normalized === 'producer_name' ||
    normalized === 'producerids' ||
    normalized === 'producer_ids' ||
    normalized === 'manufacturerids' ||
    normalized === 'manufacturer_ids'
  ) {
    return 'producer_ids';
  }
  if (PRODUCER_TARGET_FIELDS.has(normalized)) return 'producer_id';
  return null;
};

export const normalizeTagTargetField = (targetField: string): string | null => {
  const normalized = targetField.trim().toLowerCase();
  if (normalized === 'tagid') return 'tag_id';
  if (normalized === 'tagids') return 'tag_ids';
  if (TAG_TARGET_FIELDS.has(normalized)) return normalized;
  return null;
};
