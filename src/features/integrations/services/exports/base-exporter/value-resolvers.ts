import type { ProductWithImages } from '@/shared/contracts/products/product';

import {
  ProducerNameLookup,
  ProducerExternalIdLookup,
  TagNameLookup,
  TagExternalIdLookup,
  getProducerNameFromLookup,
  getProducerExternalIdFromLookup,
  getTagNameFromLookup,
  getTagExternalIdFromLookup,
  buildProducerNameToExternalIdLookup,
  buildTagNameToExternalIdLookup,
} from './lookup-resolvers';
import {
  getProductParameterValue,
  getProductCategoryId,
  getProductProducerValues,
  getProductTagValues,
} from './product-resolvers';
import {
  toStringValue,
  toTrimmedString,
  parseParameterSourceKey,
  IMAGE_TARGET_FIELDS,
} from './template-helpers';
import { ImageExportLogger } from '../base-exporter-images';
import { getAllImageUrls, getImageSlotUrl } from '../base-exporter-images';

type ExportValueLookupOptions = {
  imageBaseUrl?: string | null;
  diagnostics?: ImageExportLogger;
  producerNameById?: ProducerNameLookup;
  producerExternalIdByInternalId?: ProducerExternalIdLookup;
  tagNameById?: TagNameLookup;
  tagExternalIdByInternalId?: TagExternalIdLookup;
};

const CATEGORY_SOURCE_KEYS = new Set(['category', 'category_id', 'categoryid']);
const PRODUCER_SOURCE_KEYS = new Set([
  'producerids',
  'producer_ids',
  'producerid',
  'producer_id',
  'producers',
  'producer',
  'producername',
  'producer_name',
  'producernames',
  'producer_names',
  'manufacturerids',
  'manufacturer_ids',
  'manufacturerid',
  'manufacturer_id',
  'manufacturer',
  'manufacturername',
  'manufacturer_name',
  'manufacturernames',
  'manufacturer_names',
]);
const TAG_SOURCE_KEYS = new Set([
  'tagids',
  'tag_ids',
  'tagid',
  'tag_id',
  'tags',
  'tag',
  'tagnames',
  'tag_names',
  'tagname',
  'tag_name',
]);
const IMAGE_LIST_SOURCE_KEYS = new Set(['images_list', 'image_list']);
const IMAGE_SLOT_SOURCE_RE = /^(?:image|img)(?:_url)?_(\d+)$/i;
const PRODUCER_NAME_VALUE_KEYS = [
  'producerId',
  'producer_id',
  'manufacturerId',
  'manufacturer_id',
  'producerName',
  'manufacturerName',
  'manufacturer_name',
  'name',
  'value',
  'id',
] as const;
const PRODUCER_ID_VALUE_KEYS = [
  'producerId',
  'producer_id',
  'manufacturerId',
  'manufacturer_id',
  'id',
  'value',
  'producerName',
  'manufacturerName',
  'manufacturer_name',
  'name',
] as const;
const TAG_NAME_VALUE_KEYS = ['tagId', 'tag_id', 'tagName', 'name', 'value', 'id'] as const;
const TAG_ID_VALUE_KEYS = ['tagId', 'tag_id', 'id', 'value', 'tagName', 'name'] as const;

const normalizeExportSourceKey = (sourceKey: string): string => sourceKey.trim().toLowerCase();

const resolveProducerSourceValue = (
  normalizedSourceKey: string,
  product: ProductWithImages,
  options?: ExportValueLookupOptions
): unknown | undefined => {
  if (!PRODUCER_SOURCE_KEYS.has(normalizedSourceKey)) return undefined;

  const { producerIds, producerNames } = getProductProducerValues(
    product,
    options?.producerNameById,
    options?.producerExternalIdByInternalId
  );
  if (normalizedSourceKey.includes('id')) return producerIds;
  if (normalizedSourceKey.includes('name')) return producerNames;
  return producerIds.length > 0 ? producerIds : producerNames;
};

const resolveTagSourceValue = (
  normalizedSourceKey: string,
  product: ProductWithImages,
  options?: ExportValueLookupOptions
): unknown | undefined => {
  if (!TAG_SOURCE_KEYS.has(normalizedSourceKey)) return undefined;

  const { tagIds, tagNames } = getProductTagValues(
    product,
    options?.tagNameById,
    options?.tagExternalIdByInternalId
  );
  if (normalizedSourceKey.includes('id')) return tagIds;
  if (normalizedSourceKey.includes('name')) return tagNames;
  return tagIds.length > 0 ? tagIds : tagNames;
};

const resolveImageSourceValue = (
  normalizedSourceKey: string,
  product: ProductWithImages,
  options?: ExportValueLookupOptions
): unknown | undefined => {
  if (IMAGE_TARGET_FIELDS.has(normalizedSourceKey) || IMAGE_LIST_SOURCE_KEYS.has(normalizedSourceKey)) {
    return getAllImageUrls(product, options?.imageBaseUrl, options?.diagnostics);
  }

  const imageSlotMatch = IMAGE_SLOT_SOURCE_RE.exec(normalizedSourceKey);
  if (!imageSlotMatch) return undefined;

  const slotIndex = Number.parseInt(imageSlotMatch[1]!, 10);
  return getImageSlotUrl(product, slotIndex, 'slot', options?.imageBaseUrl, options?.diagnostics);
};

const readRecordValueCandidate = (
  candidate: unknown,
  keys: readonly string[]
): string | null => {
  if (!candidate || typeof candidate !== 'object' || Array.isArray(candidate)) return null;
  const record = candidate as Record<string, unknown>;
  return (
    keys
      .map((key: string) => toTrimmedString(record[key]))
      .find((value): value is string => Boolean(value)) ?? null
  );
};

const splitExportValueParts = (value: string): string[] =>
  value.includes(',') || value.includes(';') ? value.split(/[,;]+/g) : [value];

const collectResolvedValueList = (
  value: unknown,
  nestedKeys: readonly string[],
  resolvePart: (value: string) => string
): string[] => {
  const values: string[] = [];
  const seen = new Set<string>();

  const pushResolvedValue = (resolvedValue: string): void => {
    if (seen.has(resolvedValue)) return;
    seen.add(resolvedValue);
    values.push(resolvedValue);
  };

  const pushValue = (candidate: unknown): void => {
    if (candidate === null || candidate === undefined) return;
    if (Array.isArray(candidate)) {
      candidate.forEach((entry: unknown) => pushValue(entry));
      return;
    }

    const nestedValue = readRecordValueCandidate(candidate, nestedKeys);
    if (nestedValue) {
      pushValue(nestedValue);
      return;
    }
    if (typeof candidate === 'object') return;

    const text = toStringValue(candidate);
    if (!text) return;

    splitExportValueParts(text).forEach((part: string) => {
      const trimmed = part.trim();
      if (!trimmed) return;
      pushResolvedValue(resolvePart(trimmed));
    });
  };

  pushValue(value);
  return values;
};

export const getProductValue = (
  product: ProductWithImages,
  sourceKey: string,
  options?: ExportValueLookupOptions
): unknown => {
  if (!sourceKey) return null;

  const parameterSource = parseParameterSourceKey(sourceKey);
  if (parameterSource) {
    return getProductParameterValue(
      product,
      parameterSource.parameterId,
      parameterSource.languageCode
    );
  }

  const normalized = normalizeExportSourceKey(sourceKey);
  if (CATEGORY_SOURCE_KEYS.has(normalized)) {
    return getProductCategoryId(product);
  }

  const producerValue = resolveProducerSourceValue(normalized, product, options);
  if (producerValue !== undefined) return producerValue;

  const tagValue = resolveTagSourceValue(normalized, product, options);
  if (tagValue !== undefined) return tagValue;

  const imageValue = resolveImageSourceValue(normalized, product, options);
  if (imageValue !== undefined) return imageValue;

  const record = product as Record<string, unknown>;
  return record[sourceKey] ?? record[normalized] ?? null;
};

export const toProducerNameValueList = (
  value: unknown,
  producerNameById?: ProducerNameLookup
): string[] =>
  collectResolvedValueList(
    value,
    PRODUCER_NAME_VALUE_KEYS,
    (trimmed: string): string => getProducerNameFromLookup(trimmed, producerNameById) ?? trimmed
  );

export const toProducerIdValueList = (
  value: unknown,
  producerExternalIdByInternalId?: ProducerExternalIdLookup,
  producerNameById?: ProducerNameLookup
): string[] => {
  const producerNameToExternalId = buildProducerNameToExternalIdLookup(
    producerNameById,
    producerExternalIdByInternalId
  );

  return collectResolvedValueList(value, PRODUCER_ID_VALUE_KEYS, (trimmed: string): string => {
    const mappedFromInternal = getProducerExternalIdFromLookup(
      trimmed,
      producerExternalIdByInternalId
    );
    const mappedFromName = producerNameToExternalId.get(trimmed.toLowerCase());
    return mappedFromInternal ?? mappedFromName ?? trimmed;
  });
};

export const toTagNameValueList = (value: unknown, tagNameById?: TagNameLookup): string[] =>
  collectResolvedValueList(
    value,
    TAG_NAME_VALUE_KEYS,
    (trimmed: string): string => getTagNameFromLookup(trimmed, tagNameById) ?? trimmed
  );

export const toTagIdValueList = (
  value: unknown,
  tagExternalIdByInternalId?: TagExternalIdLookup,
  tagNameById?: TagNameLookup
): string[] => {
  const tagNameToExternalId = buildTagNameToExternalIdLookup(
    tagNameById,
    tagExternalIdByInternalId
  );

  return collectResolvedValueList(value, TAG_ID_VALUE_KEYS, (trimmed: string): string => {
    const mappedFromInternal = getTagExternalIdFromLookup(trimmed, tagExternalIdByInternalId);
    const mappedFromName = tagNameToExternalId.get(trimmed.toLowerCase());
    return mappedFromInternal ?? mappedFromName ?? trimmed;
  });
};
