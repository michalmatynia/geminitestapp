import type { BaseProductRecord } from '@/features/integrations/services/imports/base-client';
import type { ProductCreateInput as ProductCreateData } from '@/features/products/validations/schemas';

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

const toInt = (value: unknown): number | null => {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return Math.round(value);
  }
  if (typeof value === 'string') {
    const parsed = Number(value.replace(',', '.'));
    if (Number.isFinite(parsed)) {
      return Math.round(parsed);
    }
  }
  return null;
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
  'images_link_all',
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

type TemplateMapping = {
  sourceKey: string;
  targetField: string;
};

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

const getByPath = (record: BaseProductRecord, path: string[]): unknown => {
  let current: unknown = record;
  for (const key of path) {
    if (!current || typeof current !== 'object') return null;
    current = (current as Record<string, unknown>)[key];
  }
  return current;
};

const findParameterValue = (
  params: unknown,
  sourceKey: string
): unknown => {
  if (!params) return null;
  if (Array.isArray(params)) {
    for (const entry of params) {
      if (!entry || typeof entry !== 'object') continue;
      const record = entry as Record<string, unknown>;
      const name = toTrimmedString(record['name'] ?? record['parameter'] ?? record['code']);
      const id = toTrimmedString(
        record['id'] ?? record['parameter_id'] ?? record['param_id']
      );
      if (name === sourceKey || id === sourceKey) {
        return (
          record['value'] ??
          record['values'] ??
          record['value_id'] ??
          record['label'] ??
          record['text']
        );
      }
    }
    return null;
  }
  if (typeof params === 'object') {
    const record = params as Record<string, unknown>;
    if (sourceKey in record) return record[sourceKey];
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
  if (normalized === 'image_all') {
    return getImageUrlsForSlots(record);
  }
  if (normalized === 'images_link_all' || normalized === 'image_links_all') {
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
  const parameters =
    record['parameters'] ?? record['params'] ?? record['attributes'] ?? null;
  const parameterValue = findParameterValue(parameters, sourceKey);
  if (parameterValue !== null && parameterValue !== undefined) {
    return parameterValue;
  }
  const features = record['features'] ?? record['feature'] ?? null;
  return findParameterValue(features, sourceKey);
};

const applyTemplateMappings = (
  record: BaseProductRecord,
  mapped: ProductCreateData,
  mappings: TemplateMapping[]
): void => {
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
        (mapped as ProductCreateData & { producerIds?: string[] }).producerIds = producerIds;
      }
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
      targetField === 'image_all' ||
      targetField === 'image_links' ||
      targetField === 'image_links_all' ||
      targetField === 'image_files' ||
      targetField === 'image_slots' ||
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
};

export function mapBaseProduct(
  record: BaseProductRecord,
  mappings: TemplateMapping[] = []
): ProductCreateData {
  // Extend this mapper as new Base.com fields are needed.
  const baseProductId = pickString(record, [
    'base_product_id',
    'product_id',
    'id',
  ]);

  const nameEn =
    pickString(record, ['name_en', 'name', 'title']) ??
    pickNestedString(record, [
      ['text_fields', 'name'],
      ['text_fields', 'name_en'],
      ['text_fields', 'name|en'],
      ['text_fields', 'title'],
    ]);

  const namePl = pickString(record, ['name_pl']);
  const nameDe = pickString(record, ['name_de']);

  const descriptionEn =
    pickString(record, [
      'description_en',
      'description',
      'description_long',
    ]) ??
    pickNestedString(record, [
      ['text_fields', 'description'],
      ['text_fields', 'description_en'],
      ['text_fields', 'description|en'],
      ['text_fields', 'description_long'],
    ]);

  const descriptionPl = pickString(record, ['description_pl']);
  const descriptionDe = pickString(record, ['description_de']);

  const sku = pickString(record, ['sku', 'code', 'product_code', 'item_code']);

  const price =
    pickInt(record, ['price', 'price_gross', 'price_brutto']) ??
    pickNestedInt(record, [
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

  const mapped: ProductCreateData = {
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

  applyTemplateMappings(record, mapped, mappings);

  return mapped;
}
