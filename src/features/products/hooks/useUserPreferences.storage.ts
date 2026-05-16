import type { ProductAdvancedFilterPreset, ProductListPreferences } from '@/shared/contracts/products/filters';
import { productListPreferencesSchema } from '@/shared/contracts/products/filters';
import { normalizeProductPageSize } from '@/shared/lib/products/constants';

import { DEFAULT_PREFERENCES } from './useUserPreferences.types';

const PRODUCT_LIST_NAME_LOCALES = new Set(['name_en', 'name_pl', 'name_de']);
const PRODUCT_LIST_THUMBNAIL_SOURCES = new Set(['file', 'link', 'base64']);

type StoredPreferenceEntry<K extends keyof ProductListPreferences = keyof ProductListPreferences> = {
  key: K;
  value: ProductListPreferences[K];
};

export function getProductListPreferenceStorageKey(key: keyof ProductListPreferences): string {
  return `productList${key.charAt(0).toUpperCase()}${key.slice(1)}`;
}

function serializeProductListPreferenceValue(value: unknown): string {
  if (value === null) return 'null';
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

export function updateLocalStorage(key: keyof ProductListPreferences, value: unknown): void {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(
    getProductListPreferenceStorageKey(key),
    serializeProductListPreferenceValue(value)
  );
}

function parseStoredBooleanPreference(value: string | null): boolean | undefined {
  if (value === null) return undefined;
  if (value === 'true' || value === '1') return true;
  if (value === 'false' || value === '0') return false;
  return undefined;
}

function parseStoredJsonPreference(value: string | null): unknown {
  if (value === null || value === '') return undefined;
  try {
    return JSON.parse(value);
  } catch {
    return undefined;
  }
}

const readLocalStorageValue = (key: keyof ProductListPreferences): string | null =>
  window.localStorage.getItem(getProductListPreferenceStorageKey(key));

const readNameLocaleEntry = (): StoredPreferenceEntry<'nameLocale'> | null => {
  const value = readLocalStorageValue('nameLocale');
  if (value === null || !PRODUCT_LIST_NAME_LOCALES.has(value)) return null;
  return { key: 'nameLocale', value: value as ProductListPreferences['nameLocale'] };
};

const readCatalogFilterEntry = (): StoredPreferenceEntry<'catalogFilter'> | null => {
  const value = readLocalStorageValue('catalogFilter');
  return value === null ? null : { key: 'catalogFilter', value };
};

const readCurrencyCodeEntry = (): StoredPreferenceEntry<'currencyCode'> | null => {
  const value = readLocalStorageValue('currencyCode');
  if (value === null) return null;
  return { key: 'currencyCode', value: value === 'null' ? null : value };
};

const readPageSizeEntry = (): StoredPreferenceEntry<'pageSize'> | null => {
  const value = readLocalStorageValue('pageSize');
  if (value === null) return null;
  return { key: 'pageSize', value: normalizeProductPageSize(Number.parseInt(value, 10), 12) };
};

const readThumbnailSourceEntry = (): StoredPreferenceEntry<'thumbnailSource'> | null => {
  const value = readLocalStorageValue('thumbnailSource');
  if (value === null || !PRODUCT_LIST_THUMBNAIL_SOURCES.has(value)) return null;
  return { key: 'thumbnailSource', value: value as ProductListPreferences['thumbnailSource'] };
};

const readBooleanEntry = (
  key: 'filtersCollapsedByDefault' | 'showTriggerRunFeedback'
): StoredPreferenceEntry<typeof key> | null => {
  const value = parseStoredBooleanPreference(readLocalStorageValue(key));
  return value === undefined ? null : { key, value };
};

const readAdvancedFilterPresetsEntry = (): StoredPreferenceEntry<'advancedFilterPresets'> | null => {
  const value = parseStoredJsonPreference(readLocalStorageValue('advancedFilterPresets'));
  if (!Array.isArray(value)) return null;
  return { key: 'advancedFilterPresets', value: value as ProductAdvancedFilterPreset[] };
};

const readAppliedAdvancedFilterEntry = (): StoredPreferenceEntry<'appliedAdvancedFilter'> | null => {
  const value = readLocalStorageValue('appliedAdvancedFilter');
  return value === null ? null : { key: 'appliedAdvancedFilter', value };
};

const readAppliedAdvancedFilterPresetIdEntry =
  (): StoredPreferenceEntry<'appliedAdvancedFilterPresetId'> | null => {
    const value = readLocalStorageValue('appliedAdvancedFilterPresetId');
    if (value === null) return null;
    return { key: 'appliedAdvancedFilterPresetId', value: value === 'null' ? null : value };
  };

function readStoredProductListPreferenceEntries(): StoredPreferenceEntry[] {
  const entries: StoredPreferenceEntry[] = [];
  for (const entry of [
    readNameLocaleEntry(),
    readCatalogFilterEntry(),
    readCurrencyCodeEntry(),
    readPageSizeEntry(),
    readThumbnailSourceEntry(),
    readBooleanEntry('filtersCollapsedByDefault'),
    readBooleanEntry('showTriggerRunFeedback'),
    readAdvancedFilterPresetsEntry(),
    readAppliedAdvancedFilterEntry(),
    readAppliedAdvancedFilterPresetIdEntry(),
  ]) {
    if (entry !== null) entries.push(entry as StoredPreferenceEntry);
  }
  return entries;
}

export function readStoredProductListPreferences(): ProductListPreferences | null {
  if (typeof window === 'undefined') return null;
  const entries = readStoredProductListPreferenceEntries();
  if (entries.length === 0) return null;

  const partial: Partial<ProductListPreferences> = {};
  for (const entry of entries) {
    partial[entry.key] = entry.value as never;
  }

  const parsed = productListPreferencesSchema.safeParse({
    ...DEFAULT_PREFERENCES,
    ...partial,
  });

  return parsed.success ? parsed.data : DEFAULT_PREFERENCES;
}
