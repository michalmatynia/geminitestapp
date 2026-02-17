import 'server-only';

import fs from 'fs/promises';
import path from 'path';

import sharp from 'sharp';

import { getDiskPathFromPublicPath } from '@/features/files/server';
import { callBaseApi } from '@/features/integrations/services/imports/base-client';
import type { BaseProductRecord } from '@/features/integrations/services/imports/base-client';
import { ErrorSystem } from '@/features/observability/server';
import type { ProductWithImages } from '@/features/products';
import type { ImportExportTemplateMapping as ExportTemplateMapping } from '@/shared/types/domain/integrations';

const IMAGE_BASE_URL =
  process.env['NEXT_PUBLIC_APP_URL'] ||
  process.env['NEXT_PUBLIC_BASE_URL'] ||
  process.env['PUBLIC_BASE_URL'] ||
  process.env['APP_URL'] ||
  process.env['NEXTAUTH_URL'] ||
  '';

const hasScheme = (value: string): boolean => /^[a-z][a-z0-9+.-]*:/i.test(value);
export const resolveImageUrl = (
  value: string | null | undefined,
  baseUrl?: string | null
): string | null => {
  if (!value) return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (hasScheme(trimmed)) return trimmed;
  const baseCandidate = baseUrl ?? IMAGE_BASE_URL;
  if (!baseCandidate) return trimmed;
  const base = baseCandidate.replace(/\/+$/, '');
  const path = trimmed.replace(/^\/+/, '');
  return `${base}/${path}`;
};

export type ImageExportDiagnostics = {
  log: (message: string, data?: Record<string, unknown>) => void;
};

export type ImageBase64Mode = 'base-only' | 'full-data-uri';

export type ImageTransformOptions = {
  forceJpeg?: boolean;
  maxDimension?: number;
  jpegQuality?: number;
};

export type ImageUrlDiagnostic = {
  sourceType: 'slot' | 'link';
  index: number;
  filepath: string | null;
  resolvedUrl: string | null;
  mimetype?: string | null;
  size?: number | null;
  supported: boolean;
  reason?: string | undefined;
  extension?: string | null;
  normalizedMime?: string | null;
};

const SUPPORTED_IMAGE_MIME_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/gif',
]);

const SUPPORTED_IMAGE_EXTENSIONS = new Set([
  '.jpg',
  '.jpeg',
  '.jpe',
  '.jfif',
  '.png',
  '.gif',
]);

const UNSUPPORTED_IMAGE_EXTENSIONS = new Set([
  '.webp',
  '.avif',
  '.heic',
  '.heif',
  '.tif',
  '.tiff',
  '.bmp',
  '.svg',
]);

const BASE_IMAGE_MAX_BYTES = 1_900_000;
const BASE_IMAGE_CLAMP_DIMENSIONS = [1600, 1400, 1200, 1000, 900, 800, 700, 600];
const BASE_IMAGE_CLAMP_QUALITIES = [85, 75, 65, 55, 45];

const normalizeMimeType = (value?: string | null): string | null => {
  if (!value) return null;
  const trimmed = value.trim().toLowerCase();
  if (!trimmed) return null;
  const base = trimmed.split(';')[0]?.trim() ?? trimmed;
  if (base === 'image/jpeg' || base === 'image/jpg' || base === 'image/pjpeg') return 'image/jpeg';
  if (base === 'image/png' || base === 'image/x-png') return 'image/png';
  return base;
};

const getUrlExtension = (value: string): string => {
  const clean = value.split('#')[0]?.split('?')[0] ?? value;
  return path.extname(clean).toLowerCase();
};

const isSupportedImageMime = (value?: string | null): boolean => {
  const normalized = normalizeMimeType(value);
  if (!normalized) return false;
  return SUPPORTED_IMAGE_MIME_TYPES.has(normalized);
};

const inferMimeFromExtension = (extension?: string | null): string | null => {
  if (!extension) return null;
  if (SUPPORTED_IMAGE_EXTENSIONS.has(extension)) {
    if (extension === '.png') return 'image/png';
    if (extension === '.gif') return 'image/gif';
    return 'image/jpeg';
  }
  if (extension === '.webp') return 'image/webp';
  if (extension === '.avif') return 'image/avif';
  if (extension === '.heic') return 'image/heic';
  if (extension === '.heif') return 'image/heif';
  if (extension === '.tif' || extension === '.tiff') return 'image/tiff';
  if (extension === '.bmp') return 'image/bmp';
  if (extension === '.svg') return 'image/svg+xml';
  return null;
};

const getImageSupportStatus = (url: string, mimetype?: string | null): {
  supported: boolean;
  reason?: string;
  normalizedMime: string | null;
  extension: string | null;
} => {
  const normalizedMime = normalizeMimeType(mimetype);
  if (normalizedMime) {
    return {
      supported: isSupportedImageMime(normalizedMime),
      ...(isSupportedImageMime(normalizedMime) ? {} : { reason: `unsupported_mimetype:${normalizedMime}` }),
      normalizedMime,
      extension: null,
    };
  }
  const extension = getUrlExtension(url);
  if (!extension) {
    return {
      supported: true,
      reason: 'unknown_extension',
      extension: null,
      normalizedMime: null,
    };
  }
  if (SUPPORTED_IMAGE_EXTENSIONS.has(extension)) {
    return {
      supported: true,
      extension,
      normalizedMime: inferMimeFromExtension(extension),
    };
  }
  if (UNSUPPORTED_IMAGE_EXTENSIONS.has(extension)) {
    return {
      supported: false,
      reason: `unsupported_extension:${extension}`,
      extension,
      normalizedMime: inferMimeFromExtension(extension),
    };
  }
  return {
    supported: true,
    reason: 'unknown_extension',
    extension,
    normalizedMime: inferMimeFromExtension(extension),
  };
};

const shouldIncludeImageUrl = (
  url: string,
  options?: {
    mimetype?: string | null;
    diagnostics?: ImageExportDiagnostics | undefined;
    sourceType?: 'slot' | 'link' | 'mapped' | 'unknown';
    index?: number;
    source?: string | null;
  }
): boolean => {
  const status = getImageSupportStatus(url, options?.mimetype);
  if (status.supported) return true;
  options?.diagnostics?.log('Skipping unsupported image format', {
    url,
    source: options?.source ?? url,
    sourceType: options?.sourceType ?? 'unknown',
    index: options?.index,
    mimetype: options?.mimetype ?? null,
    reason: status.reason,
    extension: status.extension,
  });
  return false;
};

export const collectProductImageDiagnostics = (
  product: ProductWithImages,
  imageBaseUrl?: string | null
): ImageUrlDiagnostic[] => {
  const diagnostics: ImageUrlDiagnostic[] = [];

  const slotImages = product.images ?? [];
  slotImages.forEach((entry: { imageFile?: { filepath?: string | null; mimetype?: string | null; size?: number | null } | null }, index: number) => {
    const filepath = entry?.imageFile?.filepath ?? null;
    const resolvedUrl = resolveImageUrl(filepath, imageBaseUrl);
    if (!resolvedUrl) {
      diagnostics.push({
        sourceType: 'slot',
        index,
        filepath,
        resolvedUrl: null,
        mimetype: entry?.imageFile?.mimetype ?? null,
        size: entry?.imageFile?.size ?? null,
        supported: false,
        reason: 'missing_url',
      });
      return;
    }
    const status = getImageSupportStatus(resolvedUrl, entry?.imageFile?.mimetype);
    diagnostics.push({
      sourceType: 'slot',
      index,
      filepath,
      resolvedUrl,
      mimetype: entry?.imageFile?.mimetype ?? null,
      size: entry?.imageFile?.size ?? null,
      supported: status.supported,
      ...(status.reason ? { reason: status.reason } : {}),
      extension: status.extension,
      normalizedMime: status.normalizedMime,
    });
  });

  const linkImages = product.imageLinks ?? [];
  linkImages.forEach((link: string, index: number) => {
    const filepath = typeof link === 'string' ? link : null;
    const resolvedUrl = resolveImageUrl(filepath, imageBaseUrl);
    if (!resolvedUrl) {
      diagnostics.push({
        sourceType: 'link',
        index,
        filepath,
        resolvedUrl: null,
        supported: false,
        reason: 'missing_url',
      });
      return;
    }
    const status = getImageSupportStatus(resolvedUrl);
    diagnostics.push({
      sourceType: 'link',
      index,
      filepath,
      resolvedUrl,
      supported: status.supported,
      reason: status.reason,
      extension: status.extension,
      normalizedMime: status.normalizedMime,
    });
  });

  return diagnostics;
};

// Base.com API field names that accept image data
const IMAGE_TARGET_FIELDS = new Set([
  'images',
  'image',
  'image_urls',
]);

// Internal product field aliases that map to "images" for export
const IMAGE_EXPORT_ALIASES = new Set([
  'images_all',
  'image_slots_all',
  'image_links_all',
]);

const PRODUCER_TARGET_FIELDS = new Set([
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

const TAG_TARGET_FIELDS = new Set([
  'tag',
  'tags',
  'tag_id',
  'tag_ids',
]);

const NUMERIC_TARGET_FIELDS = new Set([
  'weight',
  'length',
  'width',
  'height',
]);

type ProducerNameLookup = Record<string, string> | Map<string, string> | null | undefined;
type ProducerExternalIdLookup = Record<string, string> | Map<string, string> | null | undefined;
type ProducerLookup = ProducerNameLookup | ProducerExternalIdLookup;
type TagNameLookup = Record<string, string> | Map<string, string> | null | undefined;
type TagExternalIdLookup = Record<string, string> | Map<string, string> | null | undefined;
type TagLookup = TagNameLookup | TagExternalIdLookup;
type EntityLookup = ProducerLookup | TagLookup;

type ProducerEntry = {
  producerId?: string | null;
  producer_id?: string | null;
  producerName?: string | null;
  value?: string | null;
  id?: string | null;
  name?: string | null;
  producer?: {
    id?: string | null;
    name?: string | null;
  } | null;
};

type TagEntry = {
  tagId?: string | null;
  tagName?: string | null;
  name?: string | null;
};

const normalizeExportTargetField = (targetField: string): string => {
  const trimmed = targetField.trim();
  const normalized = trimmed.toLowerCase();
  if (IMAGE_EXPORT_ALIASES.has(normalized)) {
    return 'images';
  }
  if (normalized === 'category' || normalized === 'categoryid') {
    return 'category_id';
  }
  if (normalized === 'eans') {
    return 'ean';
  }
  if (normalized === 'weightkg' || normalized === 'weight_kg') {
    return 'weight';
  }
  if (normalized === 'lengthcm' || normalized === 'length_cm') {
    return 'length';
  }
  if (normalized === 'widthcm' || normalized === 'width_cm') {
    return 'width';
  }
  if (normalized === 'heightcm' || normalized === 'height_cm') {
    return 'height';
  }
  if (normalized === 'producerid') {
    return 'producer_id';
  }
  if (normalized === 'producerids') {
    return 'producer_ids';
  }
  if (
    normalized === 'producers' ||
    normalized === 'producernames' ||
    normalized === 'producer_names' ||
    normalized === 'producername' ||
    normalized === 'producer_name'
  ) {
    return 'producer_ids';
  }
  if (
    normalized === 'producer' ||
    normalized === 'manufacturer' ||
    normalized === 'manufacturerid' ||
    normalized === 'manufacturer_id'
  ) {
    return 'producer_id';
  }
  if (normalized === 'manufacturerids' || normalized === 'manufacturer_ids') {
    return 'producer_ids';
  }
  if (normalized === 'tagid') {
    return 'tag_id';
  }
  if (normalized === 'tagids') {
    return 'tag_ids';
  }
  return trimmed;
};

const toStringValue = (value: unknown): string | null => {
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
    } catch {
      return null;
    }
  }
  return null;
};

const toNumberValue = (value: unknown): number | null => {
  if (value === null || value === undefined) return null;
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string') {
    const parsed = Number(value.replace(',', '.'));
    if (Number.isFinite(parsed)) return parsed;
  }
  return null;
};

const toTrimmedString = (value: unknown): string | null => {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed || null;
};

const parseParameterSourceKey = (sourceKey: string): string | null => {
  const trimmed = sourceKey.trim();
  if (!trimmed) return null;
  if (!trimmed.toLowerCase().startsWith('parameter:')) return null;
  const parameterId = trimmed.slice('parameter:'.length).trim();
  return parameterId || null;
};

const getProductParameterValue = (
  product: ProductWithImages,
  parameterId: string
): string | null => {
  const normalizedParameterId = parameterId.trim().toLowerCase();
  if (!normalizedParameterId) return null;
  const entries = Array.isArray(product.parameters)
    ? product.parameters
    : [];
  const match = entries.find((entry) => {
    const entryParameterId = toTrimmedString(entry?.parameterId);
    return (
      typeof entryParameterId === 'string' &&
      entryParameterId.toLowerCase() === normalizedParameterId
    );
  });
  if (!match) return null;

  const directValue = toTrimmedString(match.value);
  if (directValue) return directValue;

  if (
    match.valuesByLanguage &&
    typeof match.valuesByLanguage === 'object' &&
    !Array.isArray(match.valuesByLanguage)
  ) {
    const valuesByLanguage = match.valuesByLanguage as Record<string, unknown>;
    const preferred = ['default', 'en', 'pl', 'de']
      .map((code: string) => toTrimmedString(valuesByLanguage[code]))
      .find((value): value is string => Boolean(value));
    if (preferred) return preferred;

    const fallback = Object.values(valuesByLanguage)
      .map((value) => toTrimmedString(value))
      .find((value): value is string => Boolean(value));
    if (fallback) return fallback;
  }

  return null;
};

const getProducerEntryId = (entry: ProducerEntry): string | null => {
  return (
    toTrimmedString(entry.producerId) ??
    toTrimmedString(entry.producer_id) ??
    toTrimmedString(entry.id) ??
    toTrimmedString(entry.value) ??
    toTrimmedString(entry.producer?.id)
  );
};

const getProducerEntryName = (entry: ProducerEntry): string | null => {
  return (
    toTrimmedString(entry.producerName) ??
    toTrimmedString(entry.name) ??
    toTrimmedString(entry.producer?.name)
  );
};

const getProductCategoryId = (product: ProductWithImages): string | null => {
  const record = product as unknown as Record<string, unknown>;
  const direct =
    toTrimmedString(record['categoryId']) ??
    toTrimmedString(record['category_id']);
  if (direct) return direct;

  const categoryValue = record['category'];
  if (categoryValue && typeof categoryValue === 'object') {
    const categoryRecord = categoryValue as Record<string, unknown>;
    const nested =
      toTrimmedString(categoryRecord['categoryId']) ??
      toTrimmedString(categoryRecord['category_id']) ??
      toTrimmedString(categoryRecord['id']) ??
      toTrimmedString(categoryRecord['value']);
    if (nested) return nested;
  }

  const categoriesValue = record['categories'];
  if (Array.isArray(categoriesValue)) {
    for (const categoryEntry of categoriesValue) {
      if (!categoryEntry || typeof categoryEntry !== 'object') continue;
      const categoryRecord = categoryEntry as Record<string, unknown>;
      const nested =
        toTrimmedString(categoryRecord['categoryId']) ??
        toTrimmedString(categoryRecord['category_id']) ??
        toTrimmedString(categoryRecord['id']) ??
        toTrimmedString(categoryRecord['value']);
      if (nested) return nested;
    }
  }

  return null;
};

const getLookupValue = (
  lookup: EntityLookup,
  key: string
): string | null => {
  if (!lookup) return null;
  if (lookup instanceof Map) {
    return (
      toTrimmedString(lookup.get(key)) ??
      toTrimmedString(lookup.get(key.toLowerCase()))
    );
  }
  return (
    toTrimmedString(lookup[key]) ??
    toTrimmedString(lookup[key.toLowerCase()])
  );
};

const getLookupEntries = (
  lookup: EntityLookup
): Array<[string, string]> => {
  if (!lookup) return [];
  if (lookup instanceof Map) {
    return Array.from(lookup.entries())
      .map(([key, value]: [string, string]): [string, string] | null => {
        const normalizedKey = toTrimmedString(key);
        const normalizedValue = toTrimmedString(value);
        if (!normalizedKey || !normalizedValue) return null;
        return [normalizedKey, normalizedValue];
      })
      .filter((entry): entry is [string, string] => entry !== null);
  }
  return Object.entries(lookup)
    .map(([key, value]: [string, string]): [string, string] | null => {
      const normalizedKey = toTrimmedString(key);
      const normalizedValue = toTrimmedString(value);
      if (!normalizedKey || !normalizedValue) return null;
      return [normalizedKey, normalizedValue];
    })
    .filter((entry): entry is [string, string] => entry !== null);
};

const getProducerNameFromLookup = (
  producerId: string,
  producerNameById?: ProducerNameLookup
): string | null => {
  return getLookupValue(producerNameById, producerId);
};

const getProducerExternalIdFromLookup = (
  internalProducerId: string,
  producerExternalIdByInternalId?: ProducerExternalIdLookup
): string | null => {
  return getLookupValue(producerExternalIdByInternalId, internalProducerId);
};

const getTagNameFromLookup = (
  tagId: string,
  tagNameById?: TagNameLookup
): string | null => {
  return getLookupValue(tagNameById, tagId);
};

const getTagExternalIdFromLookup = (
  internalTagId: string,
  tagExternalIdByInternalId?: TagExternalIdLookup
): string | null => {
  return getLookupValue(tagExternalIdByInternalId, internalTagId);
};

const buildProducerNameToExternalIdLookup = (
  producerNameById?: ProducerNameLookup,
  producerExternalIdByInternalId?: ProducerExternalIdLookup
): Map<string, string> => {
  const result = new Map<string, string>();
  if (!producerNameById || !producerExternalIdByInternalId) return result;

  for (const [internalProducerId, externalProducerId] of getLookupEntries(
    producerExternalIdByInternalId
  )) {
    const producerName = getProducerNameFromLookup(
      internalProducerId,
      producerNameById
    );
    if (!producerName) continue;
    const key = producerName.toLowerCase();
    if (!result.has(key)) {
      result.set(key, externalProducerId);
    }
  }

  return result;
};

const buildTagNameToExternalIdLookup = (
  tagNameById?: TagNameLookup,
  tagExternalIdByInternalId?: TagExternalIdLookup
): Map<string, string> => {
  const result = new Map<string, string>();
  if (!tagNameById || !tagExternalIdByInternalId) return result;

  for (const [internalTagId, externalTagId] of getLookupEntries(
    tagExternalIdByInternalId
  )) {
    const tagName = getTagNameFromLookup(internalTagId, tagNameById);
    if (!tagName) continue;
    const key = tagName.toLowerCase();
    if (!result.has(key)) {
      result.set(key, externalTagId);
    }
  }

  return result;
};

const normalizeProducerTargetField = (targetField: string): string | null => {
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

const normalizeTagTargetField = (targetField: string): string | null => {
  const normalized = targetField.trim().toLowerCase();
  if (normalized === 'tagid') return 'tag_id';
  if (normalized === 'tagids') return 'tag_ids';
  if (TAG_TARGET_FIELDS.has(normalized)) return normalized;
  return null;
};

const toProducerNameValueList = (
  value: unknown,
  producerNameById?: ProducerNameLookup
): string[] => {
  const values: string[] = [];
  const seen = new Set<string>();

  const pushValue = (candidate: unknown): void => {
    if (candidate === null || candidate === undefined) return;
    if (Array.isArray(candidate)) {
      candidate.forEach((entry: unknown) => pushValue(entry));
      return;
    }
    if (typeof candidate === 'object') {
      const record = candidate as Record<string, unknown>;
      const nested =
        toTrimmedString(record['producerId']) ??
        toTrimmedString(record['producer_id']) ??
        toTrimmedString(record['producerName']) ??
        toTrimmedString(record['name']) ??
        toTrimmedString(record['value']) ??
        toTrimmedString(record['id']);
      if (nested) {
        pushValue(nested);
      }
      return;
    }

    const text = toStringValue(candidate);
    if (!text) return;
    const normalizedText = text.includes(',') || text.includes(';')
      ? text.split(/[,;]+/g)
      : [text];
    normalizedText.forEach((part: string) => {
      const trimmed = part.trim();
      if (!trimmed) return;
      const resolved =
        getProducerNameFromLookup(trimmed, producerNameById) ?? trimmed;
      if (!seen.has(resolved)) {
        seen.add(resolved);
        values.push(resolved);
      }
    });
  };

  pushValue(value);
  return values;
};

const toProducerIdValueList = (
  value: unknown,
  producerExternalIdByInternalId?: ProducerExternalIdLookup,
  producerNameById?: ProducerNameLookup
): string[] => {
  const values: string[] = [];
  const seen = new Set<string>();
  const producerNameToExternalId = buildProducerNameToExternalIdLookup(
    producerNameById,
    producerExternalIdByInternalId
  );

  const pushValue = (candidate: unknown): void => {
    if (candidate === null || candidate === undefined) return;
    if (Array.isArray(candidate)) {
      candidate.forEach((entry: unknown) => pushValue(entry));
      return;
    }
    if (typeof candidate === 'object') {
      const record = candidate as Record<string, unknown>;
      const nested =
        toTrimmedString(record['producerId']) ??
        toTrimmedString(record['producer_id']) ??
        toTrimmedString(record['id']) ??
        toTrimmedString(record['value']) ??
        toTrimmedString(record['producerName']) ??
        toTrimmedString(record['name']);
      if (nested) {
        pushValue(nested);
      }
      return;
    }

    const text = toStringValue(candidate);
    if (!text) return;
    const normalizedText = text.includes(',') || text.includes(';')
      ? text.split(/[,;]+/g)
      : [text];
    normalizedText.forEach((part: string) => {
      const trimmed = part.trim();
      if (!trimmed) return;
      const mappedFromInternal = getProducerExternalIdFromLookup(
        trimmed,
        producerExternalIdByInternalId
      );
      const mappedFromName = producerNameToExternalId.get(trimmed.toLowerCase());
      const resolved = mappedFromInternal ?? mappedFromName ?? trimmed;
      if (!seen.has(resolved)) {
        seen.add(resolved);
        values.push(resolved);
      }
    });
  };

  pushValue(value);
  return values;
};

const toTagNameValueList = (
  value: unknown,
  tagNameById?: TagNameLookup
): string[] => {
  const values: string[] = [];
  const seen = new Set<string>();

  const pushValue = (candidate: unknown): void => {
    if (candidate === null || candidate === undefined) return;
    if (Array.isArray(candidate)) {
      candidate.forEach((entry: unknown) => pushValue(entry));
      return;
    }
    if (typeof candidate === 'object') {
      const record = candidate as Record<string, unknown>;
      const nested =
        toTrimmedString(record['tagId']) ??
        toTrimmedString(record['tag_id']) ??
        toTrimmedString(record['tagName']) ??
        toTrimmedString(record['name']) ??
        toTrimmedString(record['value']) ??
        toTrimmedString(record['id']);
      if (nested) {
        pushValue(nested);
      }
      return;
    }

    const text = toStringValue(candidate);
    if (!text) return;
    const normalizedText = text.includes(',') || text.includes(';')
      ? text.split(/[,;]+/g)
      : [text];
    normalizedText.forEach((part: string) => {
      const trimmed = part.trim();
      if (!trimmed) return;
      const resolved = getTagNameFromLookup(trimmed, tagNameById) ?? trimmed;
      if (!seen.has(resolved)) {
        seen.add(resolved);
        values.push(resolved);
      }
    });
  };

  pushValue(value);
  return values;
};

const toTagIdValueList = (
  value: unknown,
  tagExternalIdByInternalId?: TagExternalIdLookup,
  tagNameById?: TagNameLookup
): string[] => {
  const values: string[] = [];
  const seen = new Set<string>();
  const tagNameToExternalId = buildTagNameToExternalIdLookup(
    tagNameById,
    tagExternalIdByInternalId
  );

  const pushValue = (candidate: unknown): void => {
    if (candidate === null || candidate === undefined) return;
    if (Array.isArray(candidate)) {
      candidate.forEach((entry: unknown) => pushValue(entry));
      return;
    }
    if (typeof candidate === 'object') {
      const record = candidate as Record<string, unknown>;
      const nested =
        toTrimmedString(record['tagId']) ??
        toTrimmedString(record['tag_id']) ??
        toTrimmedString(record['id']) ??
        toTrimmedString(record['value']) ??
        toTrimmedString(record['tagName']) ??
        toTrimmedString(record['name']);
      if (nested) {
        pushValue(nested);
      }
      return;
    }

    const text = toStringValue(candidate);
    if (!text) return;
    const normalizedText = text.includes(',') || text.includes(';')
      ? text.split(/[,;]+/g)
      : [text];
    normalizedText.forEach((part: string) => {
      const trimmed = part.trim();
      if (!trimmed) return;
      const mappedFromInternal = getTagExternalIdFromLookup(
        trimmed,
        tagExternalIdByInternalId
      );
      const mappedFromName = tagNameToExternalId.get(trimmed.toLowerCase());
      const resolved = mappedFromInternal ?? mappedFromName ?? trimmed;
      if (!seen.has(resolved)) {
        seen.add(resolved);
        values.push(resolved);
      }
    });
  };

  pushValue(value);
  return values;
};

const getProductProducerValues = (
  product: ProductWithImages,
  producerNameById?: ProducerNameLookup,
  producerExternalIdByInternalId?: ProducerExternalIdLookup
): { producerIds: string[]; producerNames: string[] } => {
  const entries = Array.isArray(product.producers)
    ? (product.producers as unknown as ProducerEntry[])
    : [];
  const producerIds: string[] = [];
  const producerNames: string[] = [];
  const seenIds = new Set<string>();
  const seenNames = new Set<string>();

  const pushProducerName = (candidate: string | null): void => {
    if (!candidate || seenNames.has(candidate)) return;
    seenNames.add(candidate);
    producerNames.push(candidate);
  };

  for (const entry of entries) {
    if (!entry || typeof entry !== 'object') continue;
    const producerId = getProducerEntryId(entry);
    const producerName = getProducerEntryName(entry);

    if (producerId && !seenIds.has(producerId)) {
      seenIds.add(producerId);
      producerIds.push(producerId);
    }
    pushProducerName(producerName);
  }

  producerIds.forEach((producerId: string, index: number) => {
    const resolvedExternalId = getProducerExternalIdFromLookup(
      producerId,
      producerExternalIdByInternalId
    );
    if (resolvedExternalId) {
      producerIds[index] = resolvedExternalId;
    }
    pushProducerName(getProducerNameFromLookup(producerId, producerNameById));
  });

  return { producerIds, producerNames };
};

const getProductTagValues = (
  product: ProductWithImages,
  tagNameById?: TagNameLookup,
  tagExternalIdByInternalId?: TagExternalIdLookup
): { tagIds: string[]; tagNames: string[] } => {
  const entries = Array.isArray(product.tags)
    ? (product.tags as unknown as TagEntry[])
    : [];
  const tagIds: string[] = [];
  const tagNames: string[] = [];
  const seenIds = new Set<string>();
  const seenNames = new Set<string>();

  const pushTagName = (candidate: string | null): void => {
    if (!candidate || seenNames.has(candidate)) return;
    seenNames.add(candidate);
    tagNames.push(candidate);
  };

  for (const entry of entries) {
    if (!entry || typeof entry !== 'object') continue;
    const tagId = toTrimmedString(entry.tagId);
    const tagName = toTrimmedString(entry.tagName) ?? toTrimmedString(entry.name);
    if (tagId && !seenIds.has(tagId)) {
      seenIds.add(tagId);
      tagIds.push(tagId);
    }
    pushTagName(tagName);
  }

  tagIds.forEach((tagId: string, index: number) => {
    const resolvedExternalId = getTagExternalIdFromLookup(
      tagId,
      tagExternalIdByInternalId
    );
    if (resolvedExternalId) {
      tagIds[index] = resolvedExternalId;
    }
    pushTagName(getTagNameFromLookup(tagId, tagNameById));
  });

  return { tagIds, tagNames };
};

export const normalizeStockKey = (value: string): string | null => {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const typedMatch = trimmed.match(/([a-z]+)[_-]?(\d+)/i);
  if (typedMatch?.[1] && typedMatch?.[2]) {
    const prefix = typedMatch[1].toLowerCase();
    return `${prefix}_${typedMatch[2]}`;
  }
  const match = trimmed.match(/(\d+)/);
  if (match?.[1]) return match[1];
  return null;
};

const getImageSlotUrl = (
  product: ProductWithImages,
  index: number,
  mode: 'slot' | 'file' | 'link',
  imageBaseUrl?: string | null,
  diagnostics?: ImageExportDiagnostics
): string | null => {
  if (index < 0) return null;
  if (mode !== 'link') {
    const slotEntry = product.images?.[index];
    const imageFile = slotEntry?.imageFile?.filepath;
    const resolved = resolveImageUrl(imageFile, imageBaseUrl);
    if (
      resolved &&
      shouldIncludeImageUrl(resolved, {
        mimetype: slotEntry?.imageFile?.mimetype ?? null,
        diagnostics,
        sourceType: 'slot',
        index,
        source: imageFile ?? resolved,
      })
    ) {
      return resolved;
    }
  }
  const link = product.imageLinks?.[index];
  const resolved = resolveImageUrl(
    typeof link === 'string' ? link : null,
    imageBaseUrl
  );
  if (
    resolved &&
    shouldIncludeImageUrl(resolved, {
      diagnostics,
      sourceType: 'link',
      index,
      source: typeof link === 'string' ? link : resolved,
    })
  )
    return resolved;
  return null;
};

const getImageList = (
  product: ProductWithImages,
  mode: 'slot' | 'file' | 'link',
  imageBaseUrl?: string | null,
  diagnostics?: ImageExportDiagnostics
): string[] => {
  if (mode === 'link') {
    return (product.imageLinks ?? [])
      .map((link: string, index: number): string => {
        const resolved =
          resolveImageUrl(typeof link === 'string' ? link : null, imageBaseUrl) ?? '';
        if (
          resolved &&
          !shouldIncludeImageUrl(resolved, {
            diagnostics,
            sourceType: 'link',
            index,
            source: typeof link === 'string' ? link : resolved,
          })
        ) {
          return '';
        }
        return resolved;
      })
      .filter(Boolean);
  }
  const slots = (product.images ?? [])
    .map((entry: { imageFile?: { filepath?: string | null; mimetype?: string | null } | null }, index: number): string => {
      const resolved = resolveImageUrl(entry.imageFile?.filepath, imageBaseUrl) ?? '';
      if (
        resolved &&
        !shouldIncludeImageUrl(resolved, {
          mimetype: entry.imageFile?.mimetype ?? null,
          diagnostics,
          sourceType: 'slot',
          index,
          source: entry.imageFile?.filepath ?? resolved,
        })
      ) {
        return '';
      }
      return resolved;
    })
    .filter(Boolean);
  return slots;
};

const getAllImageUrls = (
  product: ProductWithImages,
  imageBaseUrl?: string | null,
  diagnostics?: ImageExportDiagnostics
): string[] => {
  const slots = getImageList(product, 'slot', imageBaseUrl, diagnostics);
  const links = getImageList(product, 'link', imageBaseUrl, diagnostics);
  return Array.from(new Set([...slots, ...links]));
};

/**
 * Convert image file to base64 data URI for Base.com
 * Base.com expects format: "data:BASE64STRING" (without MIME type and "base64," prefix)
 */
const FORMAT_MIME_MAP: Record<string, string> = {
  jpeg: 'image/jpeg',
  jpg: 'image/jpeg',
  png: 'image/png',
  gif: 'image/gif',
  webp: 'image/webp',
  avif: 'image/avif',
  heic: 'image/heic',
  heif: 'image/heif',
  tiff: 'image/tiff',
  bmp: 'image/bmp',
  svg: 'image/svg+xml',
};

const imageToBase64DataUri = async (
  filepath: string,
  options?: {
    contentTypeHint?: string | null;
    diagnostics?: ImageExportDiagnostics | undefined;
    sourceType?: 'slot' | 'link' | 'mapped' | 'unknown';
    index?: number;
    outputMode?: ImageBase64Mode | undefined;
    transform?: ImageTransformOptions | null;
  }
): Promise<string | null> => {
  const diagnostics = options?.diagnostics;
  const sourceType = options?.sourceType ?? 'unknown';
  const index = options?.index;
  const outputMode: ImageBase64Mode = options?.outputMode ?? 'base-only';
  const transform = options?.transform ?? null;
  try {
    let buffer: Buffer;
    let originalBytes: number | null = null;
    let contentType = normalizeMimeType(options?.contentTypeHint);
    let metadataWidth: number | null = null;
    let metadataHeight: number | null = null;

    if (hasScheme(filepath)) {
      const response = await fetch(filepath);
      if (!response.ok) {
        diagnostics?.log('Failed to fetch external image', {
          url: filepath,
          sourceType,
          index,
          status: response.status,
        });
        return null;
      }
      const headerType = normalizeMimeType(response.headers.get('content-type'));
      if (headerType) {
        contentType = headerType;
      }
      const arrayBuffer = await response.arrayBuffer();
      buffer = Buffer.from(arrayBuffer);
      originalBytes = buffer.length;
    } else {
      const diskPath = getDiskPathFromPublicPath(filepath);
      buffer = await fs.readFile(diskPath);
      originalBytes = buffer.length;
    }

    let format: string | null = null;
    try {
      const metadata = await sharp(buffer, { failOnError: false }).metadata();
      format = metadata.format ? metadata.format.toLowerCase() : null;
      metadataWidth = metadata.width ?? null;
      metadataHeight = metadata.height ?? null;
    } catch (error: unknown) {
      diagnostics?.log('Failed to read image metadata', {
        source: filepath,
        sourceType,
        index,
        error: error instanceof Error ? error.message : String(error),
      });
    }

    const extension = getUrlExtension(filepath);
    const formatMime = format ? FORMAT_MIME_MAP[format] ?? null : null;
    const inferredMime = contentType ?? inferMimeFromExtension(extension);

    let shouldConvert: boolean;
    if (formatMime) {
      shouldConvert = !isSupportedImageMime(formatMime);
    } else if (inferredMime) {
      shouldConvert = !isSupportedImageMime(inferredMime);
    } else {
      shouldConvert = Boolean(extension && UNSUPPORTED_IMAGE_EXTENSIONS.has(extension));
    }
    if (transform?.forceJpeg) {
      shouldConvert = true;
    }

    const maxDimension = transform?.maxDimension ?? null;
    const needsResize =
      Boolean(maxDimension) &&
      metadataWidth !== null &&
      metadataHeight !== null &&
      (metadataWidth > (maxDimension ?? 0) || metadataHeight > (maxDimension ?? 0));

    let outputBuffer = buffer;
    let outputFormat = formatMime ?? inferredMime;
    let converted = false;
    let resized = false;

    if (shouldConvert || needsResize) {
      try {
        let pipeline = sharp(buffer, { failOnError: false });
        if (needsResize && maxDimension) {
          pipeline = pipeline.resize({
            width: maxDimension,
            height: maxDimension,
            fit: 'inside',
            withoutEnlargement: true,
          });
          resized = true;
        }
        if (shouldConvert) {
          pipeline = pipeline.jpeg({ quality: transform?.jpegQuality ?? 85 });
          outputFormat = 'image/jpeg';
          converted = true;
        }
        outputBuffer = await pipeline.toBuffer();
        if (!shouldConvert) {
          outputFormat = formatMime ?? inferredMime;
        }
        diagnostics?.log('Converted image to supported format', {
          source: filepath,
          sourceType,
          index,
          originalFormat: formatMime ?? inferredMime ?? null,
          outputFormat,
          resized,
        });
      } catch (error: unknown) {
        diagnostics?.log('Failed to convert image to supported format', {
          source: filepath,
          sourceType,
          index,
          originalFormat: formatMime ?? inferredMime ?? null,
          error: error instanceof Error ? error.message : String(error),
        });
        return null;
      }
    }

    if (outputBuffer.length > BASE_IMAGE_MAX_BYTES) {
      const dimensionCandidates = Array.from(
        new Set(
          [
            maxDimension ?? null,
            ...(metadataWidth && metadataHeight
              ? [Math.min(Math.max(metadataWidth, metadataHeight), 1600)]
              : []),
            ...BASE_IMAGE_CLAMP_DIMENSIONS,
          ]
            .filter(
              (value): value is number =>
                typeof value === 'number' && Number.isFinite(value) && value > 0
            )
            .map((value: number) => Math.round(value))
        )
      );
      const qualityCandidates = Array.from(
        new Set(
          [
            transform?.jpegQuality ?? null,
            ...BASE_IMAGE_CLAMP_QUALITIES,
          ]
            .filter(
              (value): value is number =>
                typeof value === 'number' && Number.isFinite(value) && value > 0
            )
            .map((value: number) => Math.round(value))
        )
      );

      let bestBuffer = outputBuffer;
      let bestDimension: number | null = null;
      let bestQuality: number | null = null;
      let reachedLimit = false;

      outer: for (const dimension of dimensionCandidates) {
        for (const quality of qualityCandidates) {
          try {
            const candidate = await sharp(buffer, { failOnError: false })
              .resize({
                width: dimension,
                height: dimension,
                fit: 'inside',
                withoutEnlargement: true,
              })
              .jpeg({ quality, mozjpeg: true })
              .toBuffer();

            if (candidate.length < bestBuffer.length) {
              bestBuffer = candidate;
              bestDimension = dimension;
              bestQuality = quality;
            }

            if (candidate.length <= BASE_IMAGE_MAX_BYTES) {
              reachedLimit = true;
              break outer;
            }
          } catch (error: unknown) {
            diagnostics?.log('Image clamp candidate failed', {
              source: filepath,
              sourceType,
              index,
              dimension,
              quality,
              error: error instanceof Error ? error.message : String(error),
            });
          }
        }
      }

      outputBuffer = bestBuffer;
      outputFormat = 'image/jpeg';
      converted = true;
      resized = resized || bestDimension !== null;

      diagnostics?.log('Applied image size clamp for Base export', {
        source: filepath,
        sourceType,
        index,
        targetMaxBytes: BASE_IMAGE_MAX_BYTES,
        outputBytes: outputBuffer.length,
        dimension: bestDimension,
        quality: bestQuality,
        reachedLimit,
      });
    }

    if (outputBuffer.length > BASE_IMAGE_MAX_BYTES) {
      diagnostics?.log('Skipping image: exceeds Base.com size limit after compression', {
        source: filepath,
        sourceType,
        index,
        outputBytes: outputBuffer.length,
        maxBytes: BASE_IMAGE_MAX_BYTES,
      });
      return null;
    }

    const base64 = outputBuffer.toString('base64');
    diagnostics?.log('Prepared image for Base export', {
      source: filepath,
      sourceType,
      index,
      originalBytes,
      outputBytes: outputBuffer.length,
      base64Length: base64.length,
      contentType: contentType ?? null,
      outputFormat: outputFormat ?? null,
      converted,
      resized,
      outputMode,
    });

    if (outputMode === 'full-data-uri') {
      const mime = outputFormat ?? 'image/jpeg';
      return `data:${mime};base64,${base64}`;
    }
    return `data:${base64}`;
  } catch (error: unknown) {
    diagnostics?.log('Failed to convert image to base64', {
      source: filepath,
      sourceType,
      index,
      error: error instanceof Error ? error.message : String(error),
    });
    return null;
  }
};

/**
 * Get product images as base64 data URIs
 */
export const getProductImagesAsBase64 = async (
  product: ProductWithImages,
  options?: {
    diagnostics?: ImageExportDiagnostics | undefined;
    outputMode?: ImageBase64Mode | undefined;
    transform?: ImageTransformOptions | null;
  }
): Promise<Record<string, string>> => {
  const images: Record<string, string> = {};
  const imageSlots = product.images || [];

  let index = 0;
  for (const [slotIndex, imageSlot] of imageSlots.entries()) {
    const filepath = imageSlot.imageFile?.filepath;
    if (!filepath) continue;

    const base64 = await imageToBase64DataUri(filepath, {
      contentTypeHint: imageSlot.imageFile?.mimetype ?? null,
      diagnostics: options?.diagnostics,
      sourceType: 'slot',
      index: slotIndex,
      ...(options?.outputMode ? { outputMode: options.outputMode } : {}),
      ...(options?.transform ? { transform: options.transform } : {}),
    });
    if (base64) {
      images[String(index)] = base64;
      index++;
    }
  }

  // Also process imageLinks if they exist and we don't have enough images
  const imageLinks = product.imageLinks || [];
  for (const [linkIndex, link] of imageLinks.entries()) {
    if (!link?.trim()) continue;

    // Skip if we already have this as an uploaded image
    const alreadyProcessed = imageSlots.some(
      (slot: { imageFile?: { filepath?: string | null } | null }) => slot.imageFile?.filepath === link
    );
    if (alreadyProcessed) continue;

    const base64 = await imageToBase64DataUri(link, {
      diagnostics: options?.diagnostics,
      sourceType: 'link',
      index: linkIndex,
      ...(options?.outputMode ? { outputMode: options.outputMode } : {}),
      ...(options?.transform ? { transform: options.transform } : {}),
    });
    if (base64) {
      images[String(index)] = base64;
      index++;
    }
  }

  return images;
};

/**
 * Get value from product using a dot-notation path or direct field access
 */
const getProductValue = (
  product: ProductWithImages,
  sourceKey: string,
  imageBaseUrl?: string | null,
  diagnostics?: ImageExportDiagnostics,
  producerNameById?: ProducerNameLookup,
  producerExternalIdByInternalId?: ProducerExternalIdLookup,
  tagNameById?: TagNameLookup,
  tagExternalIdByInternalId?: TagExternalIdLookup
): unknown => {
  if (!sourceKey) return null;

  const parameterId = parseParameterSourceKey(sourceKey);
  if (parameterId) {
    return getProductParameterValue(product, parameterId);
  }

  const normalized = sourceKey.trim().toLowerCase();
  if (normalized === 'category' || normalized === 'category_id' || normalized === 'categoryid') {
    return getProductCategoryId(product);
  }
  if (
    normalized === 'producerids' ||
    normalized === 'producer_ids' ||
    normalized === 'producerid' ||
    normalized === 'producer_id' ||
    normalized === 'producers' ||
    normalized === 'producer' ||
    normalized === 'producername' ||
    normalized === 'producer_name' ||
    normalized === 'producernames' ||
    normalized === 'producer_names'
  ) {
    const { producerIds, producerNames } = getProductProducerValues(
      product,
      producerNameById,
      producerExternalIdByInternalId
    );
    if (
      normalized === 'producerid' ||
      normalized === 'producer_id'
    ) {
      return producerIds[0] ?? null;
    }
    if (normalized === 'producerids' || normalized === 'producer_ids') {
      return producerIds;
    }
    if (
      normalized === 'producers' ||
      normalized === 'producernames' ||
      normalized === 'producer_names'
    ) {
      return producerNames.length > 0 ? producerNames : producerIds;
    }
    if (
      normalized === 'producer' ||
      normalized === 'producername' ||
      normalized === 'producer_name'
    ) {
      return producerNames[0] ?? producerIds[0] ?? null;
    }
    return null;
  }
  if (
    normalized === 'tagids' ||
    normalized === 'tag_ids' ||
    normalized === 'tagid' ||
    normalized === 'tag_id' ||
    normalized === 'tags' ||
    normalized === 'tag' ||
    normalized === 'tagnames' ||
    normalized === 'tag_names'
  ) {
    const { tagIds, tagNames } = getProductTagValues(
      product,
      tagNameById,
      tagExternalIdByInternalId
    );
    if (normalized === 'tagid' || normalized === 'tag_id') {
      return tagIds[0] ?? null;
    }
    if (normalized === 'tagids' || normalized === 'tag_ids') {
      return tagIds;
    }
    if (
      normalized === 'tags' ||
      normalized === 'tagnames' ||
      normalized === 'tag_names'
    ) {
      return tagNames.length > 0 ? tagNames : tagIds;
    }
    if (normalized === 'tag') {
      return tagNames[0] ?? tagIds[0] ?? null;
    }
    return null;
  }
  const slotMatch = normalized.match(/^image_(slot|file|link)_(\d+)$/);
  if (slotMatch) {
    const index = Number.parseInt(slotMatch[2] ?? '', 10) - 1;
    if (Number.isNaN(index)) return null;
    const mode = slotMatch[1] as 'slot' | 'file' | 'link';
    return getImageSlotUrl(product, index, mode, imageBaseUrl, diagnostics);
  }
  const imageMatch = normalized.match(/^image_(\d+)$/);
  if (imageMatch) {
    const index = Number.parseInt(imageMatch[1] ?? '', 10) - 1;
    if (Number.isNaN(index)) return null;
    return getImageSlotUrl(product, index, 'slot', imageBaseUrl, diagnostics);
  }
  if (normalized === 'image_slots_all') {
    return getImageList(product, 'slot', imageBaseUrl, diagnostics);
  }
  if (normalized === 'image_links_all') {
    return getImageList(product, 'link', imageBaseUrl, diagnostics);
  }
  if (normalized === 'images_all') {
    return getAllImageUrls(product, imageBaseUrl, diagnostics);
  }
  // Handle dot notation for nested access
  if (sourceKey.includes('.')) {
    const pathParts = sourceKey.split('.').map((part: string) => part.trim());
    let current: unknown = product;
    for (const key of pathParts) {
      if (!current || typeof current !== 'object') return null;
      current = (current as Record<string, unknown>)[key];
    }
    return current;
  }

  // Direct field access
  return (product as unknown as Record<string, unknown>)[sourceKey];
};

/**
 * Apply export template mappings to convert internal product fields to Base.com format
 */
function applyExportTemplateMappings(
  product: ProductWithImages,
  mappings: ExportTemplateMapping[],
  imageBaseUrl?: string | null,
  imageDiagnostics?: ImageExportDiagnostics,
  producerNameById?: ProducerNameLookup,
  producerExternalIdByInternalId?: ProducerExternalIdLookup,
  tagNameById?: TagNameLookup,
  tagExternalIdByInternalId?: TagExternalIdLookup
): Record<string, unknown> {
  const result: Record<string, unknown> = {};

  for (const mapping of mappings) {
    const sourceKey = mapping.sourceKey.trim();
    const targetField = mapping.targetField.trim();

    if (!sourceKey || !targetField) continue;

    const rawValue = getProductValue(
      product,
      sourceKey,
      imageBaseUrl,
      imageDiagnostics,
      producerNameById,
      producerExternalIdByInternalId,
      tagNameById,
      tagExternalIdByInternalId
    );
    if (rawValue === null || rawValue === undefined) continue;

    const targetKey = targetField.toLowerCase();
    const isImageTarget = IMAGE_TARGET_FIELDS.has(targetKey);

    if (isImageTarget) {
      if (Array.isArray(rawValue)) {
        const urls = rawValue
          .map((entry: unknown) =>
            typeof entry === 'string' ? resolveImageUrl(entry, imageBaseUrl) ?? '' : ''
          )
          .filter(Boolean)
          .filter((url: string, index: number) =>
            shouldIncludeImageUrl(url, {
              diagnostics: imageDiagnostics,
              sourceType: 'mapped',
              index,
              source: url,
            })
          );
        if (urls.length > 0) {
          result[targetField] = urls;
        }
        continue;
      }
      if (typeof rawValue === 'string') {
        const resolved = resolveImageUrl(rawValue, imageBaseUrl);
        if (
          resolved &&
          shouldIncludeImageUrl(resolved, {
            diagnostics: imageDiagnostics,
            sourceType: 'mapped',
            index: 0,
            source: rawValue,
          })
        ) {
          result[targetField] = [resolved];
        }
      }
      continue;
    }

    const producerTarget = normalizeProducerTargetField(targetField);
    if (producerTarget) {
      const normalizedTargetField = targetField.trim().toLowerCase();
      const normalizedOutputField =
        normalizedTargetField === 'producers' ||
        normalizedTargetField === 'producernames' ||
        normalizedTargetField === 'producer_names' ||
        normalizedTargetField === 'producername' ||
        normalizedTargetField === 'producer_name'
          ? 'producer_ids'
          : targetField;
      const producerValues =
        producerTarget === 'producer'
          ? toProducerNameValueList(rawValue, producerNameById)
          : toProducerIdValueList(
            rawValue,
            producerExternalIdByInternalId,
            producerNameById
          );
      if (producerValues.length === 0) continue;
      if (producerTarget === 'producer' || producerTarget === 'producer_id') {
        const producerValue = producerValues[0] ?? null;
        result[normalizedOutputField] = producerValue;
        if (
          (normalizedTargetField === 'producer' ||
            normalizedTargetField === 'producer_id') &&
          result['manufacturer_id'] === undefined
        ) {
          result['manufacturer_id'] = producerValue;
        }
        if (
          (normalizedTargetField === 'manufacturer' ||
            normalizedTargetField === 'manufacturer_id') &&
          result['producer_id'] === undefined
        ) {
          result['producer_id'] = producerValue;
        }
      } else {
        result[normalizedOutputField] = producerValues;
        // Base.com commonly expects a primary producer field to render producer details.
        // Preserve multi-producer payload while also setting a deterministic primary producer.
        const primaryProducerId = producerValues[0] ?? null;
        if (primaryProducerId) {
          if (result['producer_id'] === undefined) {
            result['producer_id'] = primaryProducerId;
          }
          if (result['manufacturer_id'] === undefined) {
            result['manufacturer_id'] = primaryProducerId;
          }
        }
        if (
          normalizedTargetField === 'producer_ids' &&
          result['manufacturer_ids'] === undefined
        ) {
          result['manufacturer_ids'] = producerValues;
        }
        if (
          normalizedTargetField === 'manufacturer_ids' &&
          result['producer_ids'] === undefined
        ) {
          result['producer_ids'] = producerValues;
        }
      }
      continue;
    }

    const tagTarget = normalizeTagTargetField(targetField);
    if (tagTarget) {
      const tagValues =
        tagTarget === 'tag'
          ? toTagNameValueList(rawValue, tagNameById)
          : toTagIdValueList(
            rawValue,
            tagExternalIdByInternalId,
            tagNameById
          );
      if (tagValues.length === 0) continue;
      if (tagTarget === 'tag' || tagTarget === 'tag_id') {
        result[targetField] = tagValues[0] ?? null;
      } else {
        result[targetField] = tagValues;
      }
      continue;
    }

    const normalizedTargetField = targetField.trim().toLowerCase();
    if (NUMERIC_TARGET_FIELDS.has(normalizedTargetField)) {
      const numericValue = toNumberValue(rawValue);
      if (numericValue !== null) {
        result[targetField] = numericValue;
        continue;
      }
    }

    // Try to convert to string first
    const stringValue = toStringValue(rawValue);
    if (stringValue) {
      result[targetField] = stringValue;
      continue;
    }

    // Try number conversion
    const numberValue = toNumberValue(rawValue);
    if (numberValue !== null) {
      result[targetField] = numberValue;
    }
  }

  return result;
}

const mergeTextFields = (
  baseData: BaseProductRecord,
  templateData: Record<string, unknown>
): void => {
  const nextTextFields: Record<string, string> = {};

  const pushValue = (key: string, value: unknown): void => {
    if (value === null || value === undefined) return;
    const stringValue = toStringValue(value);
    if (!stringValue) return;
    nextTextFields[key] = stringValue;
  };

  if (
    templateData['text_fields'] &&
    typeof templateData['text_fields'] === 'object' &&
    !Array.isArray(templateData['text_fields'])
  ) {
    for (const [key, value] of Object.entries(
      templateData['text_fields'] as Record<string, unknown>
    )) {
      const trimmedKey = key.trim();
      if (!trimmedKey) continue;
      pushValue(trimmedKey, value);
    }
    delete templateData['text_fields'];
  }

  for (const [key, value] of Object.entries(templateData)) {
    const trimmedKey = key.trim();
    if (!trimmedKey) continue;
    const lowered = trimmedKey.toLowerCase();
    if (lowered.startsWith('text_fields.')) {
      const fieldKey = trimmedKey.slice('text_fields.'.length);
      if (fieldKey) {
        pushValue(fieldKey, value);
      }
      delete templateData[key];
      continue;
    }
    if (lowered === 'name' || lowered === 'description') {
      pushValue(trimmedKey, value);
      delete templateData[key];
      continue;
    }
    if (lowered.startsWith('name|') || lowered.startsWith('description|')) {
      pushValue(trimmedKey, value);
      delete templateData[key];
    }
  }

  if (Object.keys(nextTextFields).length === 0) return;

  const baseTextFields =
    baseData['text_fields'] && typeof baseData['text_fields'] === 'object'
      ? (baseData['text_fields'] as Record<string, string>)
      : {};

  baseData['text_fields'] = {
    ...baseTextFields,
    ...nextTextFields,
  };
};

const mergeNumericFields = (
  templateData: Record<string, unknown>,
  fieldName: 'prices' | 'stock',
  normalizeKey?: (value: string) => string | null
): void => {
  const nextEntries: Record<string, number> = {};

  const existing = templateData[fieldName];
  if (existing && typeof existing === 'object' && !Array.isArray(existing)) {
    for (const [key, value] of Object.entries(
      existing as Record<string, unknown>
    )) {
      const normalized = normalizeKey ? normalizeKey(key) : key.trim();
      if (!normalized) continue;
      const numeric = toNumberValue(value);
      if (numeric !== null) {
        nextEntries[normalized] = numeric;
      }
    }
  }

  for (const [key, value] of Object.entries(templateData)) {
    const trimmedKey = key.trim();
    const lowered = trimmedKey.toLowerCase();
    if (!lowered.startsWith(`${fieldName}.`)) continue;
    const suffix = trimmedKey.slice(fieldName.length + 1);
    if (!suffix) {
      delete templateData[key];
      continue;
    }
    const normalized = normalizeKey ? normalizeKey(suffix) : suffix.trim();
    if (!normalized) {
      delete templateData[key];
      continue;
    }
    const numeric = toNumberValue(value);
    if (numeric !== null) {
      nextEntries[normalized] = numeric;
    }
    delete templateData[key];
  }

  if (Object.keys(nextEntries).length > 0) {
    templateData[fieldName] = nextEntries;
  }
};

/**
 * Build Base.com product data from internal product
 * Applies default mapping + optional template mappings
 * Returns data in Baselinker API format
 */
export async function buildBaseProductData(
  product: ProductWithImages,
  mappings: ExportTemplateMapping[] = [],
  warehouseId?: string | null,
  options?: {
    imageBaseUrl?: string | null;
    includeStockWithoutWarehouse?: boolean;
    stockWarehouseAliases?: Record<string, string>;
    producerNameById?: Record<string, string>;
    producerExternalIdByInternalId?: Record<string, string>;
    tagNameById?: Record<string, string>;
    tagExternalIdByInternalId?: Record<string, string>;
    exportImagesAsBase64?: boolean | undefined;
    imageDiagnostics?: ImageExportDiagnostics | undefined;
    imageBase64Mode?: ImageBase64Mode | undefined;
    imageTransform?: ImageTransformOptions | null;
    imagesOnly?: boolean;
  }
): Promise<BaseProductRecord> {
  // Start with default field mappings in Baselinker API format
  const baseData: BaseProductRecord = {};

  // SKU is required
  if (product.sku) baseData['sku'] = product.sku;

  const imagesOnly = options?.imagesOnly ?? false;

  // EAN (optional)
  if (!imagesOnly && product.ean) baseData['ean'] = product.ean;

  // Weight (optional)
  if (!imagesOnly && product.weight !== null) baseData['weight'] = product.weight;

  // Text fields (name, description, etc.) go in text_fields object
  if (!imagesOnly) {
    const textFields: Record<string, string> = {};
    if (product.name_en) textFields['name'] = product.name_en;
    if (product.description_en) textFields['description'] = product.description_en;
    if (Object.keys(textFields).length > 0) {
      baseData['text_fields'] = textFields;
    }
  }

  // Prices need to be in format: { "price_group_id": price_value }
  // Using a default price group - this may need configuration
  if (!imagesOnly && product.price !== null) {
    baseData['prices'] = { '0': product.price };
  }

  // Stock needs to be in format: { "warehouse_id": quantity }
  if (!imagesOnly && product.stock !== null) {
    if (warehouseId) {
      baseData['stock'] = { [warehouseId]: product.stock };
    } else if (options?.includeStockWithoutWarehouse) {
      baseData['stock'] = product.stock;
    }
  }

  // Handle images - export as base64 data URIs if requested
  if (options?.exportImagesAsBase64) {
    const base64Images = await getProductImagesAsBase64(product, {
      diagnostics: options.imageDiagnostics,
      outputMode: options.imageBase64Mode,
      transform: options.imageTransform ?? null,
    });
    if (Object.keys(base64Images).length > 0) {
      baseData['images'] = base64Images;
    }
  } else {
    const urlImages = getAllImageUrls(
      product,
      options?.imageBaseUrl ?? null,
      options?.imageDiagnostics
    );
    if (urlImages.length > 0) {
      baseData['images'] = urlImages;
    }
  }

  // Apply template mappings (these override defaults)
  if (!imagesOnly && mappings.length > 0) {
    // Templates are saved as Base -> product mappings, so invert for export.
    const exportMappings = mappings.map((mapping: ExportTemplateMapping) => ({
      sourceKey: mapping.targetField,
      targetField: normalizeExportTargetField(mapping.sourceKey),
    }));
    const templateData = applyExportTemplateMappings(
      product,
      exportMappings,
      options?.imageBaseUrl ?? null,
      options?.imageDiagnostics,
      options?.producerNameById ?? null,
      options?.producerExternalIdByInternalId ?? null,
      options?.tagNameById ?? null,
      options?.tagExternalIdByInternalId ?? null
    );
    mergeTextFields(baseData, templateData);
    mergeNumericFields(templateData, 'prices');
    const stockAliases = options?.stockWarehouseAliases ?? null;
    const normalizeStockKeyWithAliases = (value: string): string | null => {
      const normalized = normalizeStockKey(value);
      if (!normalized) return null;
      return stockAliases?.[normalized] ?? normalized;
    };
    mergeNumericFields(templateData, 'stock', normalizeStockKeyWithAliases);
    const templateStock = templateData['stock'];
    if (templateStock !== undefined) {
      const hasWarehouse = Boolean(warehouseId);
      const baseStock = baseData['stock'] ?? null;
      if (typeof templateStock === 'string' || typeof templateStock === 'number') {
        const numeric = Number(templateStock);
        if (hasWarehouse && Number.isFinite(numeric)) {
          templateData['stock'] = {
            ...((baseStock as Record<string, number>) ?? {}),
            [warehouseId as string]: numeric,
          };
        } else if (baseStock) {
          delete templateData['stock'];
        }
      } else if (
        templateStock &&
        typeof templateStock === 'object' &&
        !Array.isArray(templateStock)
      ) {
        templateData['stock'] = {
          ...(templateStock as Record<string, unknown>),
          ...((baseStock as Record<string, number>) ?? {}),
        };
        if (stockAliases) {
          const nextStock = templateData['stock'] as Record<string, unknown>;
          for (const [key, value] of Object.entries(nextStock)) {
            const normalized = normalizeStockKey(key);
            if (!normalized) continue;
            const aliased = stockAliases[normalized];
            if (!aliased || aliased === key) continue;
            if (nextStock[aliased] === undefined) {
              nextStock[aliased] = value;
            }
            delete nextStock[key];
          }
        }
      } else if (baseStock) {
        delete templateData['stock'];
      }
    }

    // If exporting images as base64, don't let template mappings override them
    if (options?.exportImagesAsBase64 && baseData['images']) {
      delete templateData['images'];
    }

    Object.assign(baseData, templateData);
  }

  return baseData;
}

/**
 * Export a product to Base.com inventory
 */
export async function exportProductToBase(
  token: string,
  inventoryId: string,
  product: ProductWithImages,
  mappings: ExportTemplateMapping[] = [],
  warehouseId?: string | null,
  options?: {
    imageBaseUrl?: string | null;
    includeStockWithoutWarehouse?: boolean;
    stockWarehouseAliases?: Record<string, string>;
    producerNameById?: Record<string, string>;
    producerExternalIdByInternalId?: Record<string, string>;
    tagNameById?: Record<string, string>;
    tagExternalIdByInternalId?: Record<string, string>;
    exportImagesAsBase64?: boolean | undefined;
    imageDiagnostics?: ImageExportDiagnostics | undefined;
    imageBase64Mode?: ImageBase64Mode | undefined;
    imageTransform?: ImageTransformOptions | null;
    imagesOnly?: boolean;
  }
): Promise<{ success: boolean; productId?: string; error?: string }> {
  try {
    const productData = await buildBaseProductData(product, mappings, warehouseId, options);

    // Build API parameters - inventory_id + all product fields as top-level params
    const apiParams: Record<string, unknown> = {
      inventory_id: inventoryId,
      ...productData,
    };

    const response = await callBaseApi(token, 'addInventoryProduct', apiParams);

    // Extract product ID from response
    // Baselinker API returns { status: "SUCCESS", product_id: "..." }
    const productIdValue = response['product_id'];
    const productId = (typeof productIdValue === 'string' || typeof productIdValue === 'number')
      ? String(productIdValue)
      : null;

    return {
      success: true,
      ...(productId ? { productId } : {}),
    };
  } catch (error) {
    void ErrorSystem.captureException(error, { 
      service: 'base-exporter',
      action: 'exportProductToBase', 
      productId: product.id 
    });
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

export async function exportProductImagesToBase(
  token: string,
  inventoryId: string,
  product: ProductWithImages,
  externalProductId: string,
  options?: {
    imageBaseUrl?: string | null;
    exportImagesAsBase64?: boolean | undefined;
    imageDiagnostics?: ImageExportDiagnostics | undefined;
    imageBase64Mode?: ImageBase64Mode | undefined;
    imageTransform?: ImageTransformOptions | null;
  }
): Promise<{ success: boolean; productId?: string; error?: string }> {
  try {
    const productData = await buildBaseProductData(product, [], null, {
      imageBaseUrl: options?.imageBaseUrl ?? null,
      ...(options?.exportImagesAsBase64 !== undefined ? { exportImagesAsBase64: options.exportImagesAsBase64 } : {}),
      ...(options?.imageDiagnostics ? { imageDiagnostics: options.imageDiagnostics } : {}),
      ...(options?.imageBase64Mode ? { imageBase64Mode: options.imageBase64Mode } : {}),
      imageTransform: options?.imageTransform ?? null,
      imagesOnly: true,
    });

    const apiParams: Record<string, unknown> = {
      inventory_id: inventoryId,
      product_id: externalProductId,
      ...productData,
    };

    const response = await callBaseApi(token, 'updateInventoryProduct', apiParams);
    const productIdValue = response['product_id'];
    const productId = (typeof productIdValue === 'string' || typeof productIdValue === 'number')
      ? String(productIdValue)
      : externalProductId;

    return {
      success: true,
      productId,
    };
  } catch (error) {
    void ErrorSystem.captureException(error, { 
      service: 'base-exporter',
      action: 'exportProductImagesToBase', 
      productId: product.id, 
      externalProductId 
    });
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}
