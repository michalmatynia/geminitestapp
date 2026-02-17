import 'server-only';

import type { ProductWithImages } from '@/features/products';
import type { ImportExportTemplateMapping as ExportTemplateMapping } from '@/shared/types/domain/integrations';

import {
  getAllImageUrls,
  getImageList,
  getImageSlotUrl,
  resolveImageUrl,
  shouldIncludeImageUrl,
} from './base-exporter-images';

import type { ImageExportDiagnostics } from './base-exporter-images';

// Base.com API field names that accept image data
const IMAGE_TARGET_FIELDS = new Set([
  'images',
  'image',
  'image_urls',
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
    } catch {
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
export function applyExportTemplateMappings(
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
