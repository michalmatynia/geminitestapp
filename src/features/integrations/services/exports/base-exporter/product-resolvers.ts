import type { ProductWithImagesDto as ProductWithImages } from '@/shared/contracts/products';
import { 
  toTrimmedString, 
  ProducerEntry, 
  TagEntry 
} from './template-helpers';
import { 
  getProducerNameFromLookup, 
  getProducerExternalIdFromLookup, 
  getTagNameFromLookup, 
  getTagExternalIdFromLookup,
  ProducerNameLookup,
  ProducerExternalIdLookup,
  TagNameLookup,
  TagExternalIdLookup
} from './lookup-resolvers';

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

export const getProductParameterValue = (
  product: ProductWithImages,
  parameterId: string,
  languageCode?: string | null
): string | null => {
  const normalizedParameterId = parameterId.trim().toLowerCase();
  if (!normalizedParameterId) return null;
  const normalizedLanguageCode =
    typeof languageCode === 'string' ? languageCode.trim().toLowerCase() : '';
  const entries = Array.isArray(product.parameters) ? product.parameters : [];
  const match = entries.find((entry) => {
    const entryParameterId = toTrimmedString(entry?.parameterId);
    return (
      typeof entryParameterId === 'string' &&
      entryParameterId.toLowerCase() === normalizedParameterId
    );
  });
  if (!match) return null;

  const valuesByLanguage =
    match.valuesByLanguage &&
    typeof match.valuesByLanguage === 'object' &&
    !Array.isArray(match.valuesByLanguage)
      ? (match.valuesByLanguage as Record<string, unknown>)
      : null;

  if (normalizedLanguageCode && valuesByLanguage) {
    const localizedValue = getLocalizedParameterValue(valuesByLanguage, normalizedLanguageCode);
    if (localizedValue) return localizedValue;
  }

  const directValue = toTrimmedString(match.value);
  if (directValue) return directValue;

  if (valuesByLanguage) {
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

export const getProducerEntryId = (entry: ProducerEntry): string | null => {
  return (
    toTrimmedString(entry.producerId) ??
    toTrimmedString(entry.producer_id) ??
    toTrimmedString(entry.id) ??
    toTrimmedString(entry.value) ??
    toTrimmedString(entry.producer?.id)
  );
};

export const getProducerEntryName = (entry: ProducerEntry): string | null => {
  return (
    toTrimmedString(entry.producerName) ??
    toTrimmedString(entry.name) ??
    toTrimmedString(entry.producer?.name)
  );
};

export const getProductCategoryId = (product: ProductWithImages): string | null => {
  const record = product as unknown as Record<string, unknown>;
  const direct = toTrimmedString(record['categoryId']) ?? toTrimmedString(record['category_id']);
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

export const getProductProducerValues = (
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

export const getProductTagValues = (
  product: ProductWithImages,
  tagNameById?: TagNameLookup,
  tagExternalIdByInternalId?: TagExternalIdLookup
): { tagIds: string[]; tagNames: string[] } => {
  const entries = Array.isArray(product.tags) ? (product.tags as unknown as TagEntry[]) : [];
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
