import { logClientError } from '@/shared/utils/observability/client-error-logger';
import type { BaseProductRecord } from '@/features/integrations/services/imports/base-client';
import type {
  ProductCustomFieldDefinition,
  ProductCustomFieldValue,
} from '@/shared/contracts/products/custom-fields';
import {
  normalizeProductCustomFieldSelectedOptionIds,
} from '@/shared/lib/products/utils/custom-field-values';
import {
  normalizeStructuredProductName,
  parseStructuredProductName,
  splitStructuredProductName,
  composeStructuredProductName,
} from '@/shared/lib/products/title-terms';

export const toTrimmedString = (value: unknown): string | null => {
  if (typeof value === 'string') {
    const trimmed = value.trim();
    return trimmed ? trimmed : null;
  }
  if (typeof value === 'number' && Number.isFinite(value)) {
    return String(value);
  }
  return null;
};

export const STRUCTURED_IMPORT_FALLBACK_CATEGORY = 'Collectible';
export const STRUCTURED_IMPORT_CATEGORY_KEYS = [
  'category_en',
  'category_name_en',
  'category_name',
  'product_type_en',
  'product_type',
  'type_en',
  'type',
  'group_name_en',
  'group_name',
];
export const STRUCTURED_IMPORT_CATEGORY_PATHS = [
  ['category', 'name_en'],
  ['category', 'name'],
  ['categoryPath', 'leaf'],
  ['group', 'name_en'],
  ['group', 'name'],
] as const;

export const looksLikeStructuredSizeSegment = (value: string): boolean => {
  const normalized = value.trim().toLowerCase();
  if (!/\d/.test(normalized)) {
    return false;
  }
  return (
    /\b(mm|cm|m|km|in|inch|inches|ft|g|kg|lb|lbs|oz|ml|l|pcs?|pc)\b/.test(normalized) ||
    /\d+\s?[x×]\s?\d+/.test(normalized)
  );
};

export const normalizeStructuredImportCategory = (value: string): string => {
  const leaf = value
    .split(/>|\/|›|»/)
    .map((segment: string): string => segment.trim())
    .filter((segment: string): boolean => segment.length > 0)
    .at(-1);
  return leaf ?? value.trim();
};

export const resolveStructuredImportCategory = (record: BaseProductRecord): string | null => {
  const direct =
    pickString(record, STRUCTURED_IMPORT_CATEGORY_KEYS) ??
    pickNestedString(
      record,
      STRUCTURED_IMPORT_CATEGORY_PATHS.map((path) => [...path])
    );
  if (!direct) {
    return null;
  }
  const normalized = normalizeStructuredImportCategory(direct);
  return normalized || null;
};

export const normalizeImportedStructuredName = (
  record: BaseProductRecord,
  value: string | null
): string | null => {
  if (!value) {
    return value;
  }

  const normalized = normalizeStructuredProductName(value);
  if (parseStructuredProductName(normalized)) {
    return normalized;
  }

  const segments = splitStructuredProductName(normalized).filter(
    (segment: string): boolean => segment.length > 0
  );
  if (segments.length !== 4) {
    return normalized;
  }

  const [baseName = '', second = '', third = '', theme = ''] = segments;
  if (!baseName || !theme) {
    return normalized;
  }

  let size = second;
  let material = third;
  if (looksLikeStructuredSizeSegment(third) && !looksLikeStructuredSizeSegment(second)) {
    size = third;
    material = second;
  }

  return composeStructuredProductName({
    baseName,
    size,
    material,
    category: resolveStructuredImportCategory(record) ?? STRUCTURED_IMPORT_FALLBACK_CATEGORY,
    theme,
  });
};

export const normalizeCurrencyCode = (value: unknown): string | null => {
  const normalized = toTrimmedString(value)?.toUpperCase();
  if (!normalized) return null;
  const compact = normalized.replace(/[^A-Z]/g, '');
  return compact || null;
};

export const parsePrice = (value: unknown): number | null => {
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

export const toInt = (value: unknown): number | null => {
  return parsePrice(value);
};

export const pickString = (record: BaseProductRecord, keys: string[]): string | null => {
  for (const key of keys) {
    const value = toTrimmedString(record[key]);
    if (value) return value;
  }
  return null;
};

export const pickInt = (record: BaseProductRecord, keys: string[]): number | null => {
  for (const key of keys) {
    const value = toInt(record[key]);
    if (value !== null) return value;
  }
  return null;
};

export const pickNested = (record: BaseProductRecord, path: string[]): unknown => {
  let current: unknown = record;
  for (const key of path) {
    if (!current || typeof current !== 'object') return null;
    current = (current as Record<string, unknown>)[key];
  }
  return current;
};

export const pickNestedInt = (record: BaseProductRecord, paths: string[][]): number | null => {
  for (const path of paths) {
    const value = toInt(pickNested(record, path));
    if (value !== null) return value;
  }
  return null;
};

export const pickNestedString = (record: BaseProductRecord, paths: string[][]): string | null => {
  for (const path of paths) {
    const value = toTrimmedString(pickNested(record, path));
    if (value) return value;
  }
  return null;
};

export const pickFirstIntFromObject = (record: BaseProductRecord, key: string): number | null => {
  const obj = record[key];
  if (!obj || typeof obj !== 'object') return null;
  const values = Object.values(obj);
  for (const v of values) {
    if (typeof v === 'number') return toInt(v);
    if (typeof v === 'string') return toInt(v);
    if (typeof v === 'object' && v) {
      const pObj = v as Record<string, unknown>;
      const p = toInt(pObj['price'] ?? pObj['price_brutto'] ?? pObj['price_gross']);
      if (p !== null) return p;
    }
  }
  return null;
};

export const normalizePreferredCurrencies = (preferred?: string[]): string[] =>
  Array.from(
    new Set(
      (preferred ?? [])
        .map((value: string): string | null => normalizeCurrencyCode(value))
        .filter((value: string | null): value is string => Boolean(value))
    )
  );

export const readPriceFromPriceEntry = (value: unknown): number | null => {
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

export const pickPriceByPreferredCurrency = (
  record: BaseProductRecord,
  preferredCurrencies: string[]
): number | null => {
  const preferredSet = new Set(normalizePreferredCurrencies(preferredCurrencies));
  const rawPrices = record['prices'];
  if (!rawPrices) return null;

  const tryValue = (
    entry: unknown,
    keyHint?: string
  ): { value: number | null; currency: string | null } => {
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

export const isUrl = (value: string): boolean => /^https?:\/\//i.test(value);

export const collectUrls = (value: unknown, urls: string[]): void => {
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

export const extractImageUrlsFromValue = (value: unknown): string[] => {
  const urls: string[] = [];
  collectUrls(value, urls);
  return Array.from(new Set(urls));
};

export const IMAGE_SLOT_KEYS = [
  'images',
  'image',
  'photos',
  'photo',
  'gallery',
  'pictures',
  'main_image',
  'mainImage',
];

export const IMAGE_LINK_KEYS = [
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

export const extractImageUrlsFromRecordKeys = (record: BaseProductRecord, keys: string[]): string[] => {
  const urls: string[] = [];
  keys.forEach((key: string) => collectUrls(record[key], urls));
  return Array.from(new Set(urls));
};

export const getImageUrlsForSlots = (record: BaseProductRecord): string[] => {
  const urls = extractImageUrlsFromRecordKeys(record, IMAGE_SLOT_KEYS);
  return urls.length > 0 ? urls : extractBaseImageUrls(record);
};

export const getImageUrlsForLinks = (record: BaseProductRecord): string[] => {
  const urls = extractImageUrlsFromRecordKeys(record, IMAGE_LINK_KEYS);
  return urls.length > 0 ? urls : extractBaseImageUrls(record);
};

export const getImageUrlsForAll = (record: BaseProductRecord): string[] => {
  const urls = [...getImageUrlsForSlots(record), ...getImageUrlsForLinks(record)];
  return Array.from(new Set(urls));
};

export const resolveImageTargetIndex = (targetField: string): number | null => {
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

export const autoExtractProducerIds = (record: BaseProductRecord): string[] => {
  const raw = record['producers'] ?? record['manufacturers'];
  if (!Array.isArray(raw) || raw.length === 0) return [];
  const ids = new Set<string>();
  for (const entry of raw as unknown[]) {
    if (!entry || typeof entry !== 'object') continue;
    const rec = entry as Record<string, unknown>;
    const id = toTrimmedString(
      rec['producerId'] ?? rec['producer_id'] ?? rec['manufacturerId'] ?? rec['manufacturer_id'] ?? rec['id']
    );
    if (id) ids.add(id);
  }
  return Array.from(ids);
};

export const autoExtractTagIds = (record: BaseProductRecord): string[] => {
  const raw = record['tags'] ?? record['labels'];
  if (!Array.isArray(raw) || raw.length === 0) return [];
  const ids = new Set<string>();
  for (const entry of raw as unknown[]) {
    if (!entry || typeof entry !== 'object') continue;
    const rec = entry as Record<string, unknown>;
    const id = toTrimmedString(rec['tagId'] ?? rec['tag_id'] ?? rec['id']);
    if (id) ids.add(id);
  }
  return Array.from(ids);
};

export const NUMBER_FIELDS = new Set(['price', 'stock', 'sizeLength', 'sizeWidth', 'weight', 'length']);

export const PRODUCER_TARGET_FIELDS = new Set([
  'producerids',
  'producer_ids',
  'producerid',
  'producer_id',
  'producer',
]);

export const TAG_TARGET_FIELDS = new Set([
  'tagids',
  'tag_ids',
  'tagid',
  'tag_id',
  'tags',
  'tag',
  'tagnames',
  'tag_names',
]);

export const toStringValue = (value: unknown): string | null => {
  if (Array.isArray(value)) {
    const parts = value
      .map((entry: unknown) => toTrimmedString(entry))
      .filter((entry: string | null): entry is string => Boolean(entry));
    return parts.length ? parts.join(', ') : null;
  }
  if (value && typeof value === 'object') {
    try {
      return JSON.stringify(value);
    } catch (error) {
      logClientError(error);
      return null;
    }
  }
  return toTrimmedString(value);
};

export const toIntValue = (value: unknown): number | null => {
  if (Array.isArray(value)) {
    for (const entry of value) {
      const parsed = toInt(entry);
      if (parsed !== null) return parsed;
    }
    return null;
  }
  return toInt(value);
};

export const normalizeProducerIds = (value: unknown): string[] => {
  const unique = new Set<string>();

  const pushValue = (entry: unknown): void => {
    if (typeof entry === 'string') {
      entry
        .split(/[,;|]/)
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

export const normalizeTagIds = (value: unknown): string[] => {
  const unique = new Set<string>();

  const pushValue = (entry: unknown): void => {
    if (typeof entry === 'string') {
      entry
        .split(/[,;|]/)
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

export const toCheckboxValue = (value: unknown): boolean => {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number') return Number.isFinite(value) && value !== 0;
  if (Array.isArray(value)) return value.some((entry: unknown) => toCheckboxValue(entry));
  if (typeof value !== 'string') return false;

  const normalized = value.trim().toLowerCase();
  if (!normalized) return false;
  if (['0', 'false', 'no', 'off', 'unchecked', 'null', 'none'].includes(normalized)) {
    return false;
  }
  return true;
};

export const mergeCheckboxOptionSelection = (
  customFieldValuesById: Map<string, ProductCustomFieldValue>,
  fieldId: string,
  optionId: string,
  selected: boolean
): void => {
  const existing = customFieldValuesById.get(fieldId);
  const nextSelectedOptionIds = new Set(
    normalizeProductCustomFieldSelectedOptionIds(existing?.selectedOptionIds)
  );
  if (selected) {
    nextSelectedOptionIds.add(optionId);
  } else {
    nextSelectedOptionIds.delete(optionId);
  }

  customFieldValuesById.set(fieldId, {
    fieldId,
    selectedOptionIds: Array.from(nextSelectedOptionIds),
  });
};

export const resolveCheckboxOptionId = (
  fieldId: string,
  optionIdOrLabel: string,
  definitions: ProductCustomFieldDefinition[] | undefined
): string => {
  if (!definitions) return optionIdOrLabel;
  const definition = definitions.find((d) => d.id === fieldId);
  if (definition?.type !== 'checkbox_set') return optionIdOrLabel;

  // Direct ID match — already canonical, no-op
  if (definition.options.some((o) => o.id === optionIdOrLabel)) return optionIdOrLabel;

  // Label match (case-insensitive) — resolves e.g. "Tradera" → actual UUID
  const normalized = optionIdOrLabel.trim().toLowerCase();
  const byLabel = definition.options.find(
    (o) => o.label.trim().toLowerCase() === normalized
  );
  return byLabel ? byLabel.id : optionIdOrLabel;
};

export const getByPath = (record: BaseProductRecord, path: string[]): unknown => {
  let current: unknown = record;
  for (const key of path) {
    if (!current || typeof current !== 'object') return null;
    current = (current as Record<string, unknown>)[key];
  }
  return current;
};
