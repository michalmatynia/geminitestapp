import type { ProductParameterValue, ProductWithImages } from '@/shared/contracts/products';

import {
  getProducerNameFromLookup,
  getProducerExternalIdFromLookup,
  buildProducerNameToExternalIdLookup,
  getTagNameFromLookup,
  getTagExternalIdFromLookup,
  ProducerNameLookup,
  ProducerExternalIdLookup,
  TagNameLookup,
  TagExternalIdLookup,
} from './lookup-resolvers';
import { toTrimmedString, ProducerEntry, TagEntry } from './template-helpers';

const toScalarProducerValue = (value: unknown): string | null => {
  if (typeof value === 'string') {
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
  }
  if (typeof value === 'number' && Number.isFinite(value)) {
    return String(value);
  }
  return null;
};

export const getLocalizedParameterValue = (
  valuesByLanguage: Record<string, unknown>,
  languageCode: string
): string | null => {
  const directValue = toTrimmedString(valuesByLanguage[languageCode]);
  if (directValue) return directValue;

  const normalizedCode = languageCode.trim().toLowerCase();
  if (!normalizedCode) return null;
  for (const [key, value] of Object.entries(valuesByLanguage)) {
    if (key.trim().toLowerCase() !== normalizedCode) continue;
    const normalizedValue = toTrimmedString(value);
    if (normalizedValue) return normalizedValue;
  }
  return null;
};

const findMatchingProductParameter = (
  product: ProductWithImages,
  parameterId: string
): ProductParameterValue | undefined => {
  const normalizedParameterId = parameterId.trim().toLowerCase();
  if (!normalizedParameterId) return undefined;
  const entries = Array.isArray(product.parameters) ? product.parameters : [];
  return entries.find((entry) => {
    const entryParameterId = toTrimmedString(entry?.parameterId);
    return (
      typeof entryParameterId === 'string' &&
      entryParameterId.toLowerCase() === normalizedParameterId
    );
  });
};

const readLocalizedParameterValues = (
  value: unknown
): Record<string, unknown> | null =>
  value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;

const resolvePreferredLocalizedParameterValue = (
  valuesByLanguage: Record<string, unknown>
): string | null => {
  const preferred = ['default', 'en', 'pl', 'de']
    .map((code: string) => toTrimmedString(valuesByLanguage[code]))
    .find((value): value is string => Boolean(value));
  if (preferred) return preferred;

  return (
    Object.values(valuesByLanguage)
      .map((value) => toTrimmedString(value))
      .find((value): value is string => Boolean(value)) ?? null
  );
};

export const getProductParameterValue = (
  product: ProductWithImages,
  parameterId: string,
  languageCode?: string | null
): string | null => {
  const normalizedLanguageCode =
    typeof languageCode === 'string' ? languageCode.trim().toLowerCase() : '';
  const match = findMatchingProductParameter(product, parameterId);
  if (!match) return null;

  const valuesByLanguage = readLocalizedParameterValues(match.valuesByLanguage);

  if (normalizedLanguageCode && valuesByLanguage) {
    const localizedValue = getLocalizedParameterValue(valuesByLanguage, normalizedLanguageCode);
    if (localizedValue) return localizedValue;
  }

  const directValue = toTrimmedString(match.value);
  if (directValue) return directValue;

  if (valuesByLanguage) {
    const fallbackValue = resolvePreferredLocalizedParameterValue(valuesByLanguage);
    if (fallbackValue) return fallbackValue;
  }

  // Preserve attached-but-empty product attributes during export.
  return '';
};

export const getProducerEntryId = (entry: ProducerEntry): string | null => {
  return (
    toTrimmedString(entry.producerId) ??
    toTrimmedString(entry.producer_id) ??
    toTrimmedString(entry.manufacturerId) ??
    toTrimmedString(entry.manufacturer_id) ??
    toTrimmedString(entry.id) ??
    toTrimmedString(entry.value) ??
    toTrimmedString(entry.producer?.id)
  );
};

export const getProducerEntryName = (entry: ProducerEntry): string | null => {
  return (
    toTrimmedString(entry.producerName) ??
    toTrimmedString(entry.manufacturerName) ??
    toTrimmedString(entry.manufacturer_name) ??
    toTrimmedString(entry.name) ??
    toTrimmedString(entry.producer?.name)
  );
};

const readCategoryRecord = (value: unknown): Record<string, unknown> | null =>
  value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;

const readCategoryCandidateId = (value: unknown): string | null => {
  const categoryRecord = readCategoryRecord(value);
  if (!categoryRecord) return null;
  return (
    toTrimmedString(categoryRecord['categoryId']) ??
    toTrimmedString(categoryRecord['category_id']) ??
    toTrimmedString(categoryRecord['id']) ??
    toTrimmedString(categoryRecord['value'])
  );
};

export const getProductCategoryId = (product: ProductWithImages): string | null => {
  const record = product as Record<string, unknown>;
  const direct = toTrimmedString(record['categoryId']) ?? toTrimmedString(record['category_id']);
  if (direct) return direct;

  const nestedCategoryId = readCategoryCandidateId(record['category']);
  if (nestedCategoryId) return nestedCategoryId;

  const categoriesValue = record['categories'];
  if (Array.isArray(categoriesValue)) {
    for (const categoryEntry of categoriesValue) {
      const categoryId = readCategoryCandidateId(categoryEntry);
      if (categoryId) return categoryId;
    }
  }

  return null;
};

export const getProductProducerValues = (
  product: ProductWithImages,
  producerNameById?: ProducerNameLookup,
  producerExternalIdByInternalId?: ProducerExternalIdLookup
): { producerIds: string[]; producerNames: string[] } => {
  const producerIds: string[] = [];
  const producerNames: string[] = [];
  const seenIds = new Set<string>();
  const seenNames = new Set<string>();
  const productRecord = product as Record<string, unknown>;

  const pushProducerId = (candidate: string | null): void => {
    if (!candidate || seenIds.has(candidate)) return;
    seenIds.add(candidate);
    producerIds.push(candidate);
  };
  const pushProducerName = (candidate: string | null): void => {
    if (!candidate || seenNames.has(candidate)) return;
    seenNames.add(candidate);
    producerNames.push(candidate);
  };

  const pushScalarProducer = (candidate: unknown): void => {
    const value = toScalarProducerValue(candidate);
    if (!value) return;
    pushProducerId(value);
    pushProducerName(value);
  };
  const pushProducerLike = (candidate: unknown): void => {
    if (candidate && typeof candidate === 'object' && !Array.isArray(candidate)) {
      const producerEntry = candidate as ProducerEntry;
      pushProducerId(getProducerEntryId(producerEntry));
      pushProducerName(getProducerEntryName(producerEntry));
      return;
    }
    pushScalarProducer(candidate);
  };

  const relationEntries = Array.isArray(productRecord['producers'])
    ? (productRecord['producers'] as unknown[])
    : [];
  for (const entry of relationEntries) {
    if (!entry) continue;
    if (typeof entry !== 'object' || Array.isArray(entry)) {
      pushScalarProducer(entry);
      continue;
    }
    const producerId = getProducerEntryId(entry as ProducerEntry);
    const producerName = getProducerEntryName(entry as ProducerEntry);
    pushProducerId(producerId);
    pushProducerName(producerName);
  }

  const legacyProducerIds = Array.isArray(productRecord['producerIds'])
    ? (productRecord['producerIds'] as unknown[])
    : [];
  legacyProducerIds.forEach(pushScalarProducer);
  pushScalarProducer(productRecord['producerId']);
  pushScalarProducer(productRecord['producer_id']);
  pushScalarProducer(productRecord['manufacturerId']);
  pushScalarProducer(productRecord['manufacturer_id']);
  pushProducerLike(productRecord['producer']);
  pushProducerLike(productRecord['manufacturer']);

  const legacyProducerNames = Array.isArray(productRecord['producerNames'])
    ? (productRecord['producerNames'] as unknown[])
    : [];
  legacyProducerNames.forEach((candidate: unknown) => {
    pushProducerName(toScalarProducerValue(candidate));
  });
  pushProducerName(toScalarProducerValue(productRecord['producerName']));
  pushProducerName(toScalarProducerValue(productRecord['producer_name']));
  pushProducerName(toScalarProducerValue(productRecord['manufacturerName']));
  pushProducerName(toScalarProducerValue(productRecord['manufacturer_name']));

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

  const producerNameToExternalId = buildProducerNameToExternalIdLookup(
    producerNameById,
    producerExternalIdByInternalId
  );
  producerNames.forEach((producerName: string) => {
    const resolvedExternalId = producerNameToExternalId.get(producerName.toLowerCase());
    if (resolvedExternalId) {
      pushProducerId(resolvedExternalId);
    }
  });

  return {
    producerIds: Array.from(new Set(producerIds)),
    producerNames,
  };
};

export const getProductTagValues = (
  product: ProductWithImages,
  tagNameById?: TagNameLookup,
  tagExternalIdByInternalId?: TagExternalIdLookup
): { tagIds: string[]; tagNames: string[] } => {
  const entries = Array.isArray(product.tags) ? (product.tags as TagEntry[]) : [];
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
    const resolvedExternalId = getTagExternalIdFromLookup(tagId, tagExternalIdByInternalId);
    if (resolvedExternalId) {
      tagIds[index] = resolvedExternalId;
    }
    pushTagName(getTagNameFromLookup(tagId, tagNameById));
  });

  return { tagIds, tagNames };
};
