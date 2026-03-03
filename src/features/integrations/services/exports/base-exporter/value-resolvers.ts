 
 
 
 
 
 

import type { ProductWithImagesDto as ProductWithImages } from '@/shared/contracts/products';
import { ImageExportLogger } from '../base-exporter-images';
import { 
  toStringValue, 
  toTrimmedString, 
  parseParameterSourceKey,
  IMAGE_TARGET_FIELDS
} from './template-helpers';
import { 
  getProductParameterValue, 
  getProductCategoryId, 
  getProductProducerValues, 
  getProductTagValues 
} from './product-resolvers';
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
  buildTagNameToExternalIdLookup
} from './lookup-resolvers';
import { 
  getAllImageUrls, 
  getImageList, 
  getImageSlotUrl 
} from '../base-exporter-images';

export const getProductValue = (
  product: ProductWithImages,
  sourceKey: string,
  imageBaseUrl?: string | null,
  diagnostics?: ImageExportLogger,
  producerNameById?: ProducerNameLookup,
  producerExternalIdByInternalId?: ProducerExternalIdLookup,
  tagNameById?: TagNameLookup,
  tagExternalIdByInternalId?: TagExternalIdLookup
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
    if (normalized.includes('id')) return producerIds;
    if (normalized.includes('name')) return producerNames;
    return producerIds.length > 0 ? producerIds : producerNames;
  }

  if (normalized === 'tagids' || normalized === 'tag_ids' || normalized === 'tagid' || normalized === 'tag_id' || normalized === 'tags' || normalized === 'tag' || normalized === 'tagnames' || normalized === 'tag_names' || normalized === 'tagname' || normalized === 'tag_name') {
    const { tagIds, tagNames } = getProductTagValues(
      product,
      tagNameById,
      tagExternalIdByInternalId
    );
    if (normalized.includes('id')) return tagIds;
    if (normalized.includes('name')) return tagNames;
    return tagIds.length > 0 ? tagIds : tagNames;
  }

  if (IMAGE_TARGET_FIELDS.has(normalized)) {
    return getAllImageUrls(product, imageBaseUrl, diagnostics);
  }

  if (normalized === 'images_list' || normalized === 'image_list') {
    return getImageList(product, imageBaseUrl, diagnostics);
  }

  const imageSlotMatch = /^(?:image|img)(?:_url)?_(\d+)$/i.exec(normalized);
  if (imageSlotMatch) {
    const slotIndex = Number.parseInt(imageSlotMatch[1]!, 10);
    return getImageSlotUrl(product, slotIndex, imageBaseUrl, diagnostics);
  }

  const record = product as unknown as Record<string, unknown>;
  return record[sourceKey] ?? record[normalized] ?? null;
};

export const toProducerNameValueList = (
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
    const normalizedText = text.includes(',') || text.includes(';') ? text.split(/[,;]+/g) : [text];
    normalizedText.forEach((part: string) => {
      const trimmed = part.trim();
      if (!trimmed) return;
      const resolved = getProducerNameFromLookup(trimmed, producerNameById) ?? trimmed;
      if (!seen.has(resolved)) {
        seen.add(resolved);
        values.push(resolved);
      }
    });
  };

  pushValue(value);
  return values;
};

export const toProducerIdValueList = (
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
    const normalizedText = text.includes(',') || text.includes(';') ? text.split(/[,;]+/g) : [text];
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

export const toTagNameValueList = (value: unknown, tagNameById?: TagNameLookup): string[] => {
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
    const normalizedText = text.includes(',') || text.includes(';') ? text.split(/[,;]+/g) : [text];
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

export const toTagIdValueList = (
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
    const normalizedText = text.includes(',') || text.includes(';') ? text.split(/[,;]+/g) : [text];
    normalizedText.forEach((part: string) => {
      const trimmed = part.trim();
      if (!trimmed) return;
      const mappedFromInternal = getTagExternalIdFromLookup(trimmed, tagExternalIdByInternalId);
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
