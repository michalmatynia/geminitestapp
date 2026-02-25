import { randomUUID } from 'crypto';

import type { BaseProductRecord } from '@/features/integrations/services/imports/base-client';
import type { TemplateMapping } from '@/shared/contracts/integrations';
import type { ProductCreateInputDto as ProductCreateInput } from '@/shared/contracts/products';

const toTrimmedString = (value: unknown): string | null => {
  if (typeof value === 'string') {
    const trimmed = value.trim();
    return trimmed ? trimmed : null;
  }
  if (typeof value === 'number' && Number.isFinite(value)) {
    return String(value);
  }
  return null;
};

const normalizeCurrencyCode = (value: unknown): string | null => {
  const normalized = toTrimmedString(value)?.toUpperCase();
  if (!normalized) return null;
  const compact = normalized.replace(/[^A-Z]/g, '');
  return compact || null;
};

const parsePrice = (value: unknown): number | null => {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return Math.round(value);
  }
  if (typeof value === 'string') {
    const cleaned = value.replace(/\s/g, '').replace(',', '.');
    const parsed = Number(cleaned);
    if (Number.isFinite(parsed)) {
      return Math.round(parsed);
    }
  }
  return null;
};

const toInt = (value: unknown): number | null => {
  return parsePrice(value);
};

const pickString = (record: BaseProductRecord, keys: string[]): string | null => {
  for (const key of keys) {
    const value = toTrimmedString(record[key]);
    if (value) return value;
  }
  return null;
};

const pickInt = (record: BaseProductRecord, keys: string[]): number | null => {
  for (const key of keys) {
    const value = toInt(record[key]);
    if (value !== null) return value;
  }
  return null;
};

const pickNested = (
  record: BaseProductRecord,
  path: string[]
): unknown => {
  let current: unknown = record;
  for (const key of path) {
    if (!current || typeof current !== 'object') return null;
    current = (current as Record<string, unknown>)[key];
  }
  return current;
};

const pickNestedInt = (record: BaseProductRecord, paths: string[][]): number | null => {
  for (const path of paths) {
    const value = toInt(pickNested(record, path));
    if (value !== null) return value;
  }
  return null;
};

const pickNestedString = (record: BaseProductRecord, paths: string[][]): string | null => {
  for (const path of paths) {
    const value = toTrimmedString(pickNested(record, path));
    if (value) return value;
  }
  return null;
};

const pickFirstIntFromObject = (record: BaseProductRecord, key: string): number | null => {
  const obj = record[key];
  if (!obj || typeof obj !== 'object') return null;
  const values = Object.values(obj);
  for (const v of values) {
    if (typeof v === 'number') return toInt(v);
    if (typeof v === 'string') return toInt(v);
    if (typeof v === 'object' && v) {
      const pObj = v as Record<string, unknown>;
      const p = toInt(
        pObj['price'] ?? pObj['price_brutto'] ?? pObj['price_gross']
      );
      if (p !== null) return p;
    }
  }
  return null;
};

const normalizePreferredCurrencies = (preferred?: string[]): string[] =>
  Array.from(
    new Set(
      (preferred ?? [])
        .map((value: string): string | null => normalizeCurrencyCode(value))
        .filter((value: string | null): value is string => Boolean(value))
    )
  );

const readPriceFromPriceEntry = (value: unknown): number | null => {
  if (value === null || value === undefined) return null;
  if (typeof value === 'number' || typeof value === 'string') {
    return parsePrice(value);
  }
  if (!value || typeof value !== 'object') return null;
  const record = value as Record<string, unknown>;
  const directCandidates = [
    record['price'],
    record['price_brutto'],
    record['price_gross'],
    record['gross'],
    record['brutto'],
    record['value'],
    record['amount'],
  ];
  for (const candidate of directCandidates) {
    const parsed = parsePrice(candidate);
    if (parsed !== null) return parsed;
  }
  return null;
};

const pickPriceByPreferredCurrency = (
  record: BaseProductRecord,
  preferredCurrencies: string[]
): number | null => {
  const preferredSet = new Set(normalizePreferredCurrencies(preferredCurrencies));
  const rawPrices = record['prices'];
  if (!rawPrices) return null;

  const tryValue = (entry: unknown, keyHint?: string): { value: number | null; currency: string | null } => {
    const parsed = readPriceFromPriceEntry(entry);
    if (parsed === null) return { value: null, currency: null };
    let detectedCurrency: string | null = null;
    if (keyHint) {
      detectedCurrency = normalizeCurrencyCode(keyHint);
    }
    if (!detectedCurrency && entry && typeof entry === 'object') {
      const entryRecord = entry as Record<string, unknown>;
      detectedCurrency =
        normalizeCurrencyCode(entryRecord['currency']) ??
        normalizeCurrencyCode(entryRecord['currency_code']) ??
        normalizeCurrencyCode(entryRecord['code']) ??
        normalizeCurrencyCode(entryRecord['symbol']);
    }
    return { value: parsed, currency: detectedCurrency };
  };

  const buffered: Array<{ value: number; currency: string | null }> = [];
  if (Array.isArray(rawPrices)) {
    rawPrices.forEach((entry: unknown) => {
      const resolved = tryValue(entry);
      if (resolved.value !== null) {
        buffered.push({ value: resolved.value, currency: resolved.currency });
      }
    });
  } else if (rawPrices && typeof rawPrices === 'object') {
    Object.entries(rawPrices as Record<string, unknown>).forEach(
      ([key, value]: [string, unknown]) => {
        const resolved = tryValue(value, key);
        if (resolved.value !== null) {
          buffered.push({ value: resolved.value, currency: resolved.currency });
        }
      }
    );
  } else {
    const resolved = tryValue(rawPrices);
    if (resolved.value !== null) {
      buffered.push({ value: resolved.value, currency: resolved.currency });
    }
  }

  if (buffered.length === 0) return null;
  if (preferredSet.size > 0) {
    const preferredMatch = buffered.find(
      (entry) => entry.currency && preferredSet.has(entry.currency)
    );
    if (preferredMatch) return preferredMatch.value;
  }
  return buffered[0]?.value ?? null;
};

const isUrl = (value: string): boolean => /^https?:\/\//i.test(value);

const collectUrls = (value: unknown, urls: string[]): void => {
  if (!value) return;
  if (typeof value === 'string') {
    if (isUrl(value)) urls.push(value);
    return;
  }
  if (Array.isArray(value)) {
    value.forEach((entry: unknown) => collectUrls(entry, urls));
    return;
  }
  if (typeof value === 'object') {
    const record = value as Record<string, unknown>;
    const candidates = [
      record['url'],
      record['href'],
      record['src'],
      record['image'],
      record['imageUrl'],
      record['image_url'],
      record['link'],
      record['photo'],
      record['thumbnail'],
    ];
    candidates.forEach((candidate: unknown) => collectUrls(candidate, urls));
    Object.values(record).forEach((candidate: unknown) => collectUrls(candidate, urls));
  }
};

const extractImageUrlsFromValue = (value: unknown): string[] => {
  const urls: string[] = [];
  collectUrls(value, urls);
  return Array.from(new Set(urls));
};

const IMAGE_SLOT_KEYS = [
  'images',
  'image',
  'photos',
  'photo',
  'gallery',
  'pictures',
  'main_image',
  'mainImage',
];

const IMAGE_LINK_KEYS = [
  'image_links',
  'images_links',
  'image_link',
  'images_link',
  'image_url',
  'imageUrl',
  'image_urls',
  'images_url',
  'images_urls',
  'imageUrls',
  'image_links_all',
  'links',
  'link',
];

const extractImageUrlsFromRecordKeys = (
  record: BaseProductRecord,
  keys: string[]
): string[] => {
  const urls: string[] = [];
  keys.forEach((key: string) => collectUrls(record[key], urls));
  return Array.from(new Set(urls));
};

const getImageUrlsForSlots = (record: BaseProductRecord): string[] => {
  const urls = extractImageUrlsFromRecordKeys(record, IMAGE_SLOT_KEYS);
  return urls.length > 0 ? urls : extractBaseImageUrls(record);
};

const getImageUrlsForLinks = (record: BaseProductRecord): string[] => {
  const urls = extractImageUrlsFromRecordKeys(record, IMAGE_LINK_KEYS);
  return urls.length > 0 ? urls : extractBaseImageUrls(record);
};

const getImageUrlsForAll = (record: BaseProductRecord): string[] => {
  const urls = [...getImageUrlsForSlots(record), ...getImageUrlsForLinks(record)];
  return Array.from(new Set(urls));
};

const resolveImageTargetIndex = (targetField: string): number | null => {
  const normalized = targetField.toLowerCase();
  if (normalized.startsWith('image_slot_')) {
    const index = parseInt(normalized.replace('image_slot_', ''), 10);
    return Number.isNaN(index) ? null : index - 1;
  }
  if (normalized.startsWith('image_file_')) {
    const index = parseInt(normalized.replace('image_file_', ''), 10);
    return Number.isNaN(index) ? null : index - 1;
  }
  if (normalized.startsWith('image_link_')) {
    const index = parseInt(normalized.replace('image_link_', ''), 10);
    return Number.isNaN(index) ? null : index - 1;
  }
  if (normalized.startsWith('image_')) {
    const index = parseInt(normalized.replace('image_', ''), 10);
    return Number.isNaN(index) ? null : index - 1;
  }
  return null;
};

export function extractBaseImageUrls(record: BaseProductRecord): string[] {
  const urls: string[] = [];
  const keys = [
    'images',
    'image',
    'image_url',
    'imageUrl',
    'images_url',
    'images_urls',
    'photos',
    'photo',
    'gallery',
    'pictures',
    'main_image',
    'mainImage',
  ];
  keys.forEach((key: string) => collectUrls(record[key], urls));
  collectUrls(record, urls);
  return Array.from(new Set(urls));
}

const NUMBER_FIELDS = new Set([
  'price',
  'stock',
  'sizeLength',
  'sizeWidth',
  'weight',
  'length',
]);

const PRODUCER_TARGET_FIELDS = new Set([
  'producerids',
  'producer_ids',
  'producerid',
  'producer_id',
  'producer',
]);

const TAG_TARGET_FIELDS = new Set([
  'tagids',
  'tag_ids',
  'tagid',
  'tag_id',
  'tags',
  'tag',
  'tagnames',
  'tag_names',
]);

const toStringValue = (value: unknown): string | null => {
  if (Array.isArray(value)) {
    const parts = value
      .map((entry: unknown) => toTrimmedString(entry))
      .filter((entry: string | null): entry is string => Boolean(entry));
    return parts.length ? parts.join(', ') : null;
  }
  if (value && typeof value === 'object') {
    try {
      return JSON.stringify(value);
    } catch {
      return null;
    }
  }
  return toTrimmedString(value);
};

const toIntValue = (value: unknown): number | null => {
  if (Array.isArray(value)) {
    for (const entry of value) {
      const parsed = toInt(entry);
      if (parsed !== null) return parsed;
    }
    return null;
  }
  return toInt(value);
};

const normalizeProducerIds = (value: unknown): string[] => {
  const unique = new Set<string>();

  const pushValue = (entry: unknown): void => {
    if (typeof entry === 'string') {
      entry
        .split(/[,\n;|]/)
        .map((part: string) => part.trim())
        .filter(Boolean)
        .forEach((part: string) => unique.add(part));
      return;
    }
    if (typeof entry === 'number' && Number.isFinite(entry)) {
      unique.add(String(entry));
      return;
    }
    if (entry && typeof entry === 'object') {
      const record = entry as Record<string, unknown>;
      const candidate =
        record['producerId'] ??
        record['producer_id'] ??
        record['id'] ??
        record['name'] ??
        record['label'] ??
        record['value'];
      if (candidate !== undefined && candidate !== null) {
        pushValue(candidate);
        return;
      }
      Object.values(record).forEach((nested: unknown) => pushValue(nested));
    }
  };

  if (Array.isArray(value)) {
    value.forEach((entry: unknown) => pushValue(entry));
  } else {
    pushValue(value);
  }

  return Array.from(unique);
};

const normalizeTagIds = (value: unknown): string[] => {
  const unique = new Set<string>();

  const pushValue = (entry: unknown): void => {
    if (typeof entry === 'string') {
      entry
        .split(/[,\n;|]/)
        .map((part: string) => part.trim())
        .filter(Boolean)
        .forEach((part: string) => unique.add(part));
      return;
    }
    if (typeof entry === 'number' && Number.isFinite(entry)) {
      unique.add(String(entry));
      return;
    }
    if (entry && typeof entry === 'object') {
      const record = entry as Record<string, unknown>;
      const candidate =
        record['tagId'] ??
        record['tag_id'] ??
        record['id'] ??
        record['name'] ??
        record['label'] ??
        record['value'];
      if (candidate !== undefined && candidate !== null) {
        pushValue(candidate);
        return;
      }
      Object.values(record).forEach((nested: unknown) => pushValue(nested));
    }
  };

  if (Array.isArray(value)) {
    value.forEach((entry: unknown) => pushValue(entry));
  } else {
    pushValue(value);
  }

  return Array.from(unique);
};

const getByPath = (record: BaseProductRecord, path: string[]): unknown => {
  let current: unknown = record;
  for (const key of path) {
    if (!current || typeof current !== 'object') return null;
    current = (current as Record<string, unknown>)[key];
  }
  return current;
};

const collectTemplateParameterBuckets = (
  record: BaseProductRecord
): unknown[] => {
  const buckets: unknown[] = [];
  const pushBucket = (value: unknown): void => {
    if (value === null || value === undefined) return;
    buckets.push(value);
  };

  pushBucket(record['parameters']);
  pushBucket(record['params']);
  pushBucket(record['attributes']);
  pushBucket(record['features']);
  pushBucket(record['feature']);

  const textFields =
    record['text_fields'] && typeof record['text_fields'] === 'object'
      ? (record['text_fields'] as Record<string, unknown>)
      : null;
  if (!textFields) {
    return buckets;
  }

  pushBucket(textFields);
  pushBucket(textFields['features']);
  pushBucket(textFields['parameters']);

  Object.entries(textFields).forEach(([key, value]: [string, unknown]) => {
    const normalizedKey = key.trim().toLowerCase();
    if (!normalizedKey) return;
    if (
      normalizedKey.startsWith('features|') ||
      normalizedKey.startsWith('parameters|') ||
      normalizedKey.startsWith('params|') ||
      normalizedKey.startsWith('attributes|')
    ) {
      pushBucket(value);
    }
  });

  return buckets;
};

const findParameterValue = (
  params: unknown,
  sourceKey: string
): unknown => {
  if (!params) return null;
  const normalizedSourceKey = sourceKey.trim().toLowerCase();
  if (!normalizedSourceKey) return null;
  const getFromParameterRecord = (record: Record<string, unknown>): unknown => {
    const name = toTrimmedString(
      record['name'] ?? record['parameter'] ?? record['code'] ?? record['label'] ?? record['title']
    );
    const id = toTrimmedString(
      record['id'] ?? record['parameter_id'] ?? record['param_id'] ?? record['attribute_id']
    );
    if (
      name?.trim().toLowerCase() === normalizedSourceKey ||
      id?.trim().toLowerCase() === normalizedSourceKey
    ) {
      return (
        record['value'] ??
        record['values'] ??
        record['value_id'] ??
        record['label'] ??
        record['text']
      );
    }
    return null;
  };
  if (Array.isArray(params)) {
    for (const entry of params) {
      if (!entry || typeof entry !== 'object') continue;
      const record = entry as Record<string, unknown>;
      const fromRecord = getFromParameterRecord(record);
      if (fromRecord !== null && fromRecord !== undefined) return fromRecord;
    }
    return null;
  }
  if (typeof params === 'object') {
    const record = params as Record<string, unknown>;
    if (sourceKey in record) return record[sourceKey];
    const byNormalizedKey = Object.entries(record).find(
      ([key]: [string, unknown]) => key.trim().toLowerCase() === normalizedSourceKey
    );
    if (byNormalizedKey) {
      return byNormalizedKey[1];
    }
    for (const value of Object.values(record)) {
      if (!value || typeof value !== 'object' || Array.isArray(value)) continue;
      const fromRecord = getFromParameterRecord(value as Record<string, unknown>);
      if (fromRecord !== null && fromRecord !== undefined) return fromRecord;
    }
  }
  return null;
};

const resolveTemplateValue = (
  record: BaseProductRecord,
  sourceKey: string
): unknown => {
  if (!sourceKey) return null;
  const normalized = sourceKey.trim().toLowerCase();
  if (normalized === 'image_slots_all') {
    return getImageUrlsForSlots(record);
  }
  if (normalized === 'image_links_all') {
    return getImageUrlsForLinks(record);
  }
  if (normalized === 'images_all') {
    return getImageUrlsForAll(record);
  }
  if (normalized.startsWith('image_slot_')) {
    const index = parseInt(normalized.replace('image_slot_', ''), 10);
    if (Number.isNaN(index)) return null;
    return getImageUrlsForSlots(record)[index - 1] ?? null;
  }
  if (normalized.startsWith('image_file_')) {
    const index = parseInt(normalized.replace('image_file_', ''), 10);
    if (Number.isNaN(index)) return null;
    return getImageUrlsForSlots(record)[index - 1] ?? null;
  }
  if (normalized.startsWith('image_link_')) {
    const index = parseInt(normalized.replace('image_link_', ''), 10);
    if (Number.isNaN(index)) return null;
    return getImageUrlsForLinks(record)[index - 1] ?? null;
  }
  if (normalized.startsWith('image_')) {
    const index = parseInt(normalized.replace('image_', ''), 10);
    if (Number.isNaN(index)) return null;
    return getImageUrlsForAll(record)[index - 1] ?? null;
  }
  if (sourceKey.includes('.')) {
    const pathParts = sourceKey.split('.').map((part: string) => part.trim());
    const value = getByPath(record, pathParts);
    if (value !== null && value !== undefined) return value;
  }
  if (sourceKey in record) {
    return record[sourceKey];
  }
  const parameterBuckets = collectTemplateParameterBuckets(record);
  for (const bucket of parameterBuckets) {
    const parameterValue = findParameterValue(bucket, sourceKey);
    if (parameterValue !== null && parameterValue !== undefined) {
      return parameterValue;
    }
  }
  return null;
};

const applyTemplateMappings = (
  record: BaseProductRecord,
  mapped: ProductCreateInput,
  mappings: TemplateMapping[]
): void => {
  const parameterValuesById = new Map<string, { parameterId: string; value: string }>();
  if (Array.isArray(mapped.parameters)) {
    mapped.parameters.forEach((entry) => {
      const parameterId = toTrimmedString(entry?.parameterId);
      const value = toTrimmedString(entry?.value);
      if (!parameterId || !value) return;
      parameterValuesById.set(parameterId, { parameterId, value });
    });
  }

  for (const mapping of mappings) {
    const sourceKey = mapping.sourceKey.trim();
    const targetField = mapping.targetField.trim();
    const normalizedTargetField = targetField.toLowerCase();
    if (!sourceKey || !targetField) continue;
    const rawValue = resolveTemplateValue(record, sourceKey);
    if (rawValue === null || rawValue === undefined) continue;
    if (PRODUCER_TARGET_FIELDS.has(normalizedTargetField)) {
      const producerIds = normalizeProducerIds(rawValue);
      if (producerIds.length > 0) {
        (mapped as ProductCreateInput & { producerIds?: string[] }).producerIds = producerIds;
      }
      continue;
    }
    if (TAG_TARGET_FIELDS.has(normalizedTargetField)) {
      const tagIds = normalizeTagIds(rawValue);
      if (tagIds.length > 0) {
        (mapped as ProductCreateInput & { tagIds?: string[] }).tagIds = tagIds;
      }
      continue;
    }
    if (normalizedTargetField.startsWith('parameter:')) {
      const parameterId = targetField.slice('parameter:'.length).trim();
      if (!parameterId) continue;
      const parameterValue = toStringValue(rawValue);
      if (!parameterValue) continue;
      parameterValuesById.set(parameterId, {
        parameterId,
        value: parameterValue,
      });
      continue;
    }
    if (NUMBER_FIELDS.has(targetField)) {
      const parsed = toIntValue(rawValue);
      if (parsed === null) continue;
      (mapped as Record<string, unknown>)[targetField] = parsed;
      continue;
    }
    const stringValue = toStringValue(rawValue);
    if (!stringValue) continue;
    if (targetField === 'sku') {
      mapped.sku = stringValue;
      continue;
    }
    const imageIndex = resolveImageTargetIndex(targetField);
    if (imageIndex !== null && imageIndex >= 0) {
      if (!mapped.imageLinks) mapped.imageLinks = [];
      mapped.imageLinks[imageIndex] = stringValue;
      continue;
    }
    if (
      targetField === 'image_links_all' ||
      targetField === 'image_slots_all' ||
      targetField === 'images_all'
    ) {
      const urls = extractImageUrlsFromValue(rawValue);
      if (urls.length > 0) {
        mapped.imageLinks = urls;
      }
      continue;
    }
    (mapped as Record<string, unknown>)[targetField] = stringValue;
  }
  
  // Clean up any empty slots if we created a sparse array
  if (mapped.imageLinks) {
    mapped.imageLinks = mapped.imageLinks.filter(Boolean);
  }
  if (parameterValuesById.size > 0) {
    mapped.parameters = Array.from(parameterValuesById.values());
  }
};

export function mapBaseProduct(
  record: BaseProductRecord,
  mappings: TemplateMapping[] = [],
  options?: {
    preferredPriceCurrencies?: string[];
  }
): ProductCreateInput {
  // Extend this mapper as new Base.com fields are needed.
  const baseProductId = pickString(record, [
    'base_product_id',
    'product_id',
    'id',
  ]);

  const nameEn =
    pickString(record, ['name_en', 'title_en', 'name|en']) ??
    pickNestedString(record, [
      ['text_fields', 'name_en'],
      ['text_fields', 'name|en'],
      ['text_fields', 'title_en'],
      ['text_fields', 'title|en'],
    ]);

  const namePl =
    pickString(record, ['name_pl', 'title_pl', 'name', 'title']) ??
    pickNestedString(record, [
      ['text_fields', 'name_pl'],
      ['text_fields', 'name|pl'],
      ['text_fields', 'name'],
      ['text_fields', 'title_pl'],
      ['text_fields', 'title|pl'],
      ['text_fields', 'title'],
    ]);
  const nameDe = pickString(record, ['name_de']);

  const descriptionEn =
    pickString(record, [
      'description_en',
      'description_en_long',
      'description|en',
    ]) ??
    pickNestedString(record, [
      ['text_fields', 'description_en'],
      ['text_fields', 'description|en'],
      ['text_fields', 'description_en_long'],
    ]);

  const descriptionPl =
    pickString(record, ['description_pl', 'description', 'description_long']) ??
    pickNestedString(record, [
      ['text_fields', 'description_pl'],
      ['text_fields', 'description|pl'],
      ['text_fields', 'description'],
      ['text_fields', 'description_long'],
    ]);
  const descriptionDe = pickString(record, ['description_de']);

  const sku = pickString(record, ['sku', 'code', 'product_code', 'item_code']);

  const preferredCurrencies = normalizePreferredCurrencies(options?.preferredPriceCurrencies);
  const price =
    pickPriceByPreferredCurrency(record, preferredCurrencies) ??
    pickInt(record, [
      ...(preferredCurrencies.includes('PLN') ? ['price_pln', 'price_gross_pln', 'price_brutto_pln'] : []),
      'price',
      'price_gross',
      'price_brutto',
    ]) ??
    pickNestedInt(record, [
      ...(preferredCurrencies.includes('PLN')
        ? [
          ['prices', 'pln'],
          ['prices', 'PLN'],
          ['prices', 'pln', 'price'],
          ['prices', 'PLN', 'price'],
          ['prices', 'pln', 'price_brutto'],
          ['prices', 'PLN', 'price_brutto'],
        ]
        : []),
      ['prices', '0', 'price'],
      ['prices', '0', 'price_brutto'],
    ]) ??
    pickFirstIntFromObject(record, 'prices');

  const stock =
    pickInt(record, ['stock', 'quantity', 'qty', 'available']) ??
    pickFirstIntFromObject(record, 'stock');

  const weight = pickInt(record, ['weight']);
  const sizeLength = pickInt(record, ['sizeLength', 'length_cm']);
  const sizeWidth = pickInt(record, ['sizeWidth', 'width_cm']);
  const length = pickInt(record, ['length']);

  const mapped: ProductCreateInput = {
    baseProductId: baseProductId ?? undefined,
    name_en: nameEn ?? undefined,
    name_pl: namePl ?? undefined,
    name_de: nameDe ?? undefined,
    description_en: descriptionEn ?? undefined,
    description_pl: descriptionPl ?? undefined,
    description_de: descriptionDe ?? undefined,
    sku: sku ?? '',
    price: price ?? undefined,
    stock: stock ?? undefined,
    weight: weight ?? undefined,
    sizeLength: sizeLength ?? undefined,
    sizeWidth: sizeWidth ?? undefined,
    length: length ?? undefined,
    imageLinks: getImageUrlsForAll(record),
  };

  const finalSku = (sku || '').trim() || `BASE-${baseProductId || randomUUID()}`;

  const result: ProductCreateInput = {
    ...mapped,
    sku: finalSku,
  };

  applyTemplateMappings(record, result, mappings);

  return result;
}
