import type {
  PlaywrightAutomationProductDefaults,
  PlaywrightAutomationStructuredNameDefaults,
} from '@/shared/contracts/playwright-automation';
import type { CreateProductDraftInput } from '@/shared/contracts/products/drafts';
import type { ProductCreateInput } from '@/shared/contracts/products/io';
import {
  composeStructuredProductName,
  normalizeStructuredProductName,
  parseStructuredProductName,
} from '@/shared/lib/products/title-terms';
import { getValueAtPath } from '@/shared/lib/ai-paths/core/utils/json';
import { removeUndefined } from '@/shared/utils/object-utils';
import { logClientError } from '@/shared/utils/observability/client-error-logger';

export const PLAYWRIGHT_FIELD_MAPPER_TARGET_FIELDS = [
  'title',
  'description',
  'price',
  'images',
  'sku',
  'ean',
  'sourceUrl',
] as const;

export type PlaywrightFieldMapperTargetField =
  (typeof PLAYWRIGHT_FIELD_MAPPER_TARGET_FIELDS)[number];

export type PlaywrightFieldMapperEntry = {
  sourceKey: string;
  targetField: PlaywrightFieldMapperTargetField;
};

export type PlaywrightMappedImportProduct = {
  title: string | null;
  description: string | null;
  price: number | null;
  images: string[];
  sku: string | null;
  ean: string | null;
  sourceUrl: string | null;
  raw: Record<string, unknown>;
  createInput: ProductCreateInput;
};

const PLAYWRIGHT_FIELD_TARGETS = new Set<string>(PLAYWRIGHT_FIELD_MAPPER_TARGET_FIELDS);

const toTrimmedString = (value: unknown): string | null => {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
};

const toNumberOrNull = (value: unknown): number | null => {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string') {
    const normalized = value.trim().replace(/,/g, '.');
    if (!normalized) return null;
    const parsed = Number(normalized);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
};

const toStringArray = (value: unknown): string[] => {
  if (Array.isArray(value)) {
    return value
      .map((item) => {
        if (typeof item === 'string') return item.trim();
        if (
          item &&
          typeof item === 'object' &&
          !Array.isArray(item) &&
          typeof (item as Record<string, unknown>)['url'] === 'string'
        ) {
          return ((item as Record<string, unknown>)['url'] as string).trim();
        }
        return '';
      })
      .filter((item) => item.length > 0);
  }
  const single = toTrimmedString(value);
  return single ? [single] : [];
};

const normalizeMapperEntry = (value: unknown): PlaywrightFieldMapperEntry | null => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const record = value as Record<string, unknown>;
  const sourceKey = toTrimmedString(record['sourceKey']);
  const targetField = toTrimmedString(record['targetField']);
  if (!sourceKey || !targetField || !PLAYWRIGHT_FIELD_TARGETS.has(targetField)) {
    return null;
  }
  return {
    sourceKey,
    targetField: targetField as PlaywrightFieldMapperTargetField,
  };
};

const createFallbackEntry = (
  sourceKey: string,
  targetField: PlaywrightFieldMapperTargetField
): PlaywrightFieldMapperEntry => ({
  sourceKey,
  targetField,
});

export const parsePlaywrightFieldMapperJson = (
  rawValue: string | null | undefined
): PlaywrightFieldMapperEntry[] => {
  if (!rawValue?.trim()) return [];

  try {
    const parsed = JSON.parse(rawValue) as unknown;
    if (Array.isArray(parsed)) {
      return parsed
        .map((entry) => normalizeMapperEntry(entry))
        .filter((entry): entry is PlaywrightFieldMapperEntry => Boolean(entry));
    }

    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      return Object.entries(parsed as Record<string, unknown>)
        .map(([sourceKey, targetField]) => {
          const normalizedTarget = toTrimmedString(targetField);
          if (!sourceKey.trim() || !normalizedTarget || !PLAYWRIGHT_FIELD_TARGETS.has(normalizedTarget)) {
            return null;
          }
          return createFallbackEntry(
            sourceKey.trim(),
            normalizedTarget as PlaywrightFieldMapperTargetField
          );
        })
        .filter((entry): entry is PlaywrightFieldMapperEntry => Boolean(entry));
    }
  } catch (error) {
    logClientError(error);
  }

  return [];
};

const getMappedValue = (
  rawProduct: Record<string, unknown>,
  mappings: PlaywrightFieldMapperEntry[],
  targetField: PlaywrightFieldMapperTargetField
): unknown => {
  const directEntry = mappings.find((entry) => entry.targetField === targetField);
  if (directEntry) {
    return getValueAtPath(rawProduct, directEntry.sourceKey);
  }

  const fallbackKeys: Partial<Record<PlaywrightFieldMapperTargetField, string[]>> = {
    title: ['title', 'name'],
    description: ['description', 'body'],
    price: ['price', 'amount'],
    images: ['images', 'imageUrls'],
    sku: ['sku'],
    ean: ['ean'],
    sourceUrl: ['sourceUrl', 'url'],
  };

  const keys = fallbackKeys[targetField] ?? [];
  for (const key of keys) {
    const value = getValueAtPath(rawProduct, key);
    if (value != null) return value;
  }

  return null;
};

const normalizeUniqueStrings = (values: ReadonlyArray<string | null | undefined>): string[] => {
  const unique = new Set<string>();
  for (const value of values) {
    const trimmed = toTrimmedString(value);
    if (trimmed) unique.add(trimmed);
  }
  return Array.from(unique);
};

const resolveCatalogIds = (
  defaults: PlaywrightAutomationProductDefaults | null | undefined
): string[] => {
  return normalizeUniqueStrings([
    ...(defaults?.catalogIds ?? []),
    defaults?.catalogId ?? null,
  ]);
};

const buildStructuredProductName = ({
  title,
  defaults,
}: {
  title: string | null;
  defaults: PlaywrightAutomationStructuredNameDefaults;
}): string | null => {
  if (!title) return null;
  return composeStructuredProductName({
    baseName: title,
    size: defaults.size,
    material: defaults.material,
    category: defaults.category,
    theme: defaults.theme,
  });
};

const resolveNameEn = ({
  mapped,
  defaults,
}: {
  mapped: Omit<PlaywrightMappedImportProduct, 'createInput'>;
  defaults?: PlaywrightAutomationProductDefaults | null;
}): string | null => {
  const title = mapped.title;
  if (!title) return null;

  const normalizedTitle = normalizeStructuredProductName(title);
  if (parseStructuredProductName(normalizedTitle)) {
    return normalizedTitle;
  }

  if (defaults?.structuredName) {
    return buildStructuredProductName({
      title,
      defaults: defaults.structuredName,
    });
  }

  return title;
};

const buildFallbackDraftName = (mapped: Omit<PlaywrightMappedImportProduct, 'createInput'>): string =>
  mapped.title ?? mapped.sku ?? mapped.sourceUrl ?? 'Imported product';

export const buildPlaywrightProductCreateInput = (
  mapped: Omit<PlaywrightMappedImportProduct, 'createInput'>,
  defaults?: PlaywrightAutomationProductDefaults | null
): ProductCreateInput => {
  const catalogIds = resolveCatalogIds(defaults);
  const nameEn = resolveNameEn({ mapped, defaults });

  return removeUndefined({
    sku: mapped.sku ?? '',
    baseProductId: null,
    importSource: defaults?.importSource ?? null,
    defaultPriceGroupId: null,
    ean: mapped.ean ?? null,
    gtin: null,
    asin: null,
    name_en: nameEn,
    name_pl: null,
    name_de: null,
    description_en: mapped.description ?? null,
    description_pl: null,
    description_de: null,
    price: mapped.price ?? undefined,
    supplierName: null,
    supplierLink: mapped.sourceUrl ?? null,
    priceComment: null,
    stock: undefined,
    sizeLength: undefined,
    sizeWidth: undefined,
    weight: undefined,
    length: undefined,
    archived: false,
    categoryId: defaults?.categoryId ?? null,
    catalogIds: catalogIds.length > 0 ? catalogIds : undefined,
    imageLinks: mapped.images.length > 0 ? mapped.images : undefined,
  }) as ProductCreateInput;
};

export const buildPlaywrightProductDraftInput = (
  mapped: Omit<PlaywrightMappedImportProduct, 'createInput'>,
  defaults?: PlaywrightAutomationProductDefaults | null
): CreateProductDraftInput => {
  const catalogIds = resolveCatalogIds(defaults);
  const nameEn = resolveNameEn({ mapped, defaults });

  return removeUndefined({
    name: nameEn ?? buildFallbackDraftName(mapped),
    description: mapped.description ?? null,
    sku: mapped.sku ?? null,
    ean: mapped.ean ?? null,
    gtin: null,
    asin: null,
    name_en: nameEn,
    name_pl: null,
    name_de: null,
    description_en: mapped.description ?? null,
    description_pl: null,
    description_de: null,
    price: mapped.price ?? null,
    supplierName: null,
    supplierLink: mapped.sourceUrl ?? null,
    priceComment: null,
    stock: null,
    catalogIds,
    categoryId: defaults?.categoryId ?? null,
    tagIds: [],
    producerIds: [],
    parameters: [],
    defaultPriceGroupId: null,
    imageLinks: mapped.images,
    baseProductId: null,
    importSource: defaults?.importSource ?? null,
  }) as CreateProductDraftInput;
};

export const mapPlaywrightImportProduct = (
  rawProduct: Record<string, unknown>,
  mappings: PlaywrightFieldMapperEntry[]
): PlaywrightMappedImportProduct => {
  const mappedBase = {
    title: toTrimmedString(getMappedValue(rawProduct, mappings, 'title')),
    description: toTrimmedString(getMappedValue(rawProduct, mappings, 'description')),
    price: toNumberOrNull(getMappedValue(rawProduct, mappings, 'price')),
    images: toStringArray(getMappedValue(rawProduct, mappings, 'images')),
    sku: toTrimmedString(getMappedValue(rawProduct, mappings, 'sku')),
    ean: toTrimmedString(getMappedValue(rawProduct, mappings, 'ean')),
    sourceUrl: toTrimmedString(getMappedValue(rawProduct, mappings, 'sourceUrl')),
    raw: rawProduct,
  };

  return {
    ...mappedBase,
    createInput: buildPlaywrightProductCreateInput(mappedBase),
  };
};

export const mapPlaywrightImportProducts = (
  rawProducts: Array<Record<string, unknown>>,
  mappings: PlaywrightFieldMapperEntry[]
): PlaywrightMappedImportProduct[] => rawProducts.map((product) => mapPlaywrightImportProduct(product, mappings));
