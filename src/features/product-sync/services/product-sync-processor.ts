import 'server-only';

import { randomUUID } from 'crypto';

import {
  getProductSyncProfile,
  getProductSyncRun,
  putProductSyncRunItem,
  touchProductSyncProfileLastRunAt,
  updateProductSyncRun,
  updateProductSyncRunStatus,
} from '@/features/product-sync/services/product-sync-repository';
import { extractBaseParameters } from '@/features/integrations/services/imports/parameter-import/extractor';
import {
  getCatalogParameterLinks,
  mergeCatalogParameterLinks,
} from '@/features/integrations/services/imports/parameter-import/link-map-repository';
import {
  checkBaseSkuExists,
  getExportDefaultConnectionId,
  getIntegrationRepository,
  getProductListingRepository,
  findProductListingByProductAndConnectionAcrossProviders,
  resolveBaseConnectionToken,
  callBaseApi,
  fetchBaseProductDetails,
  fetchBaseWarehouses,
} from '@/server/integrations';
import {
  buildEffectiveProductSyncFieldRules,
  getProductSyncAppFieldLabel,
} from '@/shared/contracts/product-sync';
import type {
  ProductSyncAppField,
  ProductSyncFieldPreview,
  ProductSyncFieldRule,
  ProductSyncProfile,
  ProductSyncPreview,
  ProductSyncTargetSource,
  ProductSyncRunItemRecord,
  ProductSyncRunRecord,
  ProductSyncRunStats,
  ProductSyncRunStatus,
} from '@/shared/contracts/product-sync';
import { getProductSyncBaseFieldPresentation } from '@/shared/contracts/product-sync';
import type { BaseWarehouse } from '@/shared/contracts/integrations/base-com';
import type { ExtractedBaseParameter } from '@/shared/contracts/integrations/parameter-import';
import type { ProductParameter } from '@/shared/contracts/products/parameters';
import type { ProductParameterValue, ProductWithImages } from '@/shared/contracts/products/product';
import type { UpdateProductInput } from '@/shared/contracts/products/io';
import type { MongoPriceGroupDoc } from '@/shared/lib/db/services/database-sync-types';
import { getMongoDb } from '@/shared/lib/db/mongo-client';
import { getParameterRepository } from '@/shared/lib/products/services/parameter-repository';
import { getProductRepository } from '@/shared/lib/products/services/product-repository';
import { normalizeParameterValuesByLanguage } from '@/shared/lib/products/utils/parameter-values';
import { ErrorSystem } from '@/shared/utils/observability/error-system';

const BASE_INTEGRATION_SLUGS = new Set(['base', 'base-com', 'baselinker']);
const BASE_DETAILS_BATCH_SIZE = 100;
const RUN_PROGRESS_FLUSH_EVERY_ITEMS = 25;
const RUN_PROGRESS_FLUSH_EVERY_MS = 20_000;

export type BaseConnectionContext = {
  integrationId: string;
  connectionId: string;
  connectionName: string | null;
  inventoryId: string;
  token: string;
};

export type LinkedProductSyncResult = {
  status: 'success' | 'skipped' | 'failed';
  localChanges: string[];
  baseChanges: string[];
  message: string | null;
  errorMessage: string | null;
};

export type LinkedProductSyncPlan = {
  fields: ProductSyncFieldPreview[];
  localPatch: Record<string, unknown>;
  basePayload: Record<string, unknown>;
  localChanges: string[];
  baseChanges: string[];
};

export type BaseSyncResolvedTarget = {
  baseProductId: string | null;
  linkedVia: 'product' | 'listing' | 'sku_backfill' | 'none';
};

export type ResolvedProductSyncTarget = {
  product: ProductWithImages;
  target: BaseSyncResolvedTarget;
};

export type ProductSyncBaseFieldPresentationMetadata = {
  warehousesByIdentifier: Map<
    string,
    {
      name: string;
      isDefault: boolean;
    }
  >;
  priceGroupsByIdentifier: Map<
    string,
    {
      name: string;
      currencyCode: string | null;
      isDefault: boolean;
    }
  >;
};

export const isTerminalRunStatus = (status: ProductSyncRunStatus): boolean =>
  status === 'completed' || status === 'partial_success' || status === 'failed';

export const nowIso = (): string => new Date().toISOString();

export const toTrimmedString = (value: unknown): string => {
  if (typeof value !== 'string') return '';
  return value.trim();
};

export const toFiniteNumber = (value: unknown): number | null => {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === 'string') {
    const parsed = Number(value.replace(',', '.').trim());
    if (Number.isFinite(parsed)) return parsed;
  }
  return null;
};

export const coerceNumber = (value: unknown): number | null => {
  const direct = toFiniteNumber(value);
  if (direct !== null) return Math.max(0, Math.round(direct));

  if (Array.isArray(value)) {
    for (const item of value) {
      const parsed = coerceNumber(item);
      if (parsed !== null) return parsed;
    }
    return null;
  }

  if (value && typeof value === 'object') {
    for (const entry of Object.values(value as Record<string, unknown>)) {
      const parsed = coerceNumber(entry);
      if (parsed !== null) return parsed;
    }
  }

  return null;
};

const serializeArrayField = (value: unknown): string | null => {
  if (value === null || value === undefined) return null;
  try {
    return JSON.stringify(value);
  } catch {
    return null;
  }
};

const PARAMETER_NAME_KEYS = [
  'parameterId',
  'name',
  'parameter',
  'code',
  'title',
  'parameter_id',
  'param_id',
  'id',
  'attribute_id',
] as const;

const PARAMETER_VALUE_KEYS = ['value', 'values', 'value_id', 'text', 'label'] as const;
const PARAMETER_COLLECTION_KEYS = ['parameters', 'params', 'attributes', 'features'] as const;

const normalizeScalarParameterValue = (value: unknown): string => {
  const direct = toTrimmedString(value);
  if (direct) return direct;
  if (typeof value === 'number' && Number.isFinite(value)) return String(value);
  if (typeof value === 'boolean') return value ? 'true' : 'false';
  if (Array.isArray(value)) {
    return value
      .map((entry: unknown) => normalizeScalarParameterValue(entry))
      .filter((entry: string): boolean => entry.length > 0)
      .join(', ');
  }
  if (value && typeof value === 'object') {
    try {
      const serialized = JSON.stringify(value);
      return serialized !== '{}' ? serialized : '';
    } catch {
      return '';
    }
  }
  return '';
};

const firstParameterRecordString = (
  record: Record<string, unknown>,
  keys: readonly string[]
): string => {
  const entry = firstParameterRecordEntry(record, keys);
  return entry?.value ?? '';
};

const firstParameterRecordEntry = (
  record: Record<string, unknown>,
  keys: readonly string[]
): { key: string; value: string } | null => {
  for (const key of keys) {
    const normalized = normalizeScalarParameterValue(record[key]);
    if (normalized) return { key, value: normalized };
  }
  return null;
};

const normalizeLanguageCode = (value: unknown): string => {
  const normalized = toTrimmedString(value).toLowerCase().replace(/[^a-z0-9_-]/g, '');
  return normalized || 'default';
};

const normalizeParameterSyncEntry = (
  entry: unknown,
  fallbackId: string,
  languageCode: string = 'default'
): ProductParameterValue | null => {
  const normalizedLanguageCode = normalizeLanguageCode(languageCode);
  if (!entry || typeof entry !== 'object' || Array.isArray(entry)) {
    const value = normalizeScalarParameterValue(entry);
    if (!fallbackId || !value) return null;
    return {
      parameterId: fallbackId,
      value,
      ...(normalizedLanguageCode !== 'default'
        ? { valuesByLanguage: { [normalizedLanguageCode]: value } }
        : {}),
    };
  }

  const record = entry as Record<string, unknown>;
  const valueEntry = firstParameterRecordEntry(record, PARAMETER_VALUE_KEYS);
  const valuesByLanguage = normalizeParameterValuesByLanguage(record['valuesByLanguage']);
  const localizedFallbackValue =
    valuesByLanguage[normalizedLanguageCode] ??
    valuesByLanguage['default'] ??
    valuesByLanguage['en'] ??
    Object.values(valuesByLanguage)[0] ??
    '';
  const labelAsName =
    valueEntry?.key !== 'label' ? normalizeScalarParameterValue(record['label']) : '';
  const parameterId =
    firstParameterRecordString(record, PARAMETER_NAME_KEYS) || labelAsName || fallbackId.trim();
  const value = valueEntry?.value ?? localizedFallbackValue;
  if (!parameterId || !value) return null;
  if (normalizedLanguageCode !== 'default') {
    valuesByLanguage[normalizedLanguageCode] = value;
  }
  return {
    parameterId,
    value,
    ...(Object.keys(valuesByLanguage).length > 0 ? { valuesByLanguage } : {}),
  };
};

const normalizeParameterSyncValues = (
  value: unknown,
  languageCode: string = 'default'
): ProductParameterValue[] => {
  const byParameterId = new Map<string, ProductParameterValue>();
  const pushEntry = (entry: ProductParameterValue | null): void => {
    if (!entry) return;
    const parameterId = entry.parameterId.trim();
    const parameterValue = toTrimmedString(entry.value);
    const valuesByLanguage = normalizeParameterValuesByLanguage(entry.valuesByLanguage);
    if (!parameterId || (!parameterValue && Object.keys(valuesByLanguage).length === 0)) return;
    const existing = byParameterId.get(parameterId);
    const nextValuesByLanguage = {
      ...normalizeParameterValuesByLanguage(existing?.valuesByLanguage),
      ...valuesByLanguage,
    };
    const nextValue = parameterValue || toTrimmedString(existing?.value);
    byParameterId.set(parameterId, {
      parameterId,
      value: nextValue,
      ...(Object.keys(nextValuesByLanguage).length > 0
        ? { valuesByLanguage: nextValuesByLanguage }
        : {}),
    });
  };

  if (Array.isArray(value)) {
    value.forEach((entry: unknown, index: number) => {
      pushEntry(normalizeParameterSyncEntry(entry, `parameter_${index + 1}`, languageCode));
    });
  } else if (value && typeof value === 'object') {
    Object.entries(value as Record<string, unknown>).forEach(
      ([key, entry]: [string, unknown]) => {
        pushEntry(normalizeParameterSyncEntry(entry, key.trim(), languageCode));
      }
    );
  } else {
    pushEntry(normalizeParameterSyncEntry(value, 'parameters', languageCode));
  }

  return Array.from(byParameterId.values()).sort((left, right) =>
    left.parameterId.localeCompare(right.parameterId)
  );
};

const resolveExtractedParameterId = (entry: ExtractedBaseParameter): string => {
  const namesByLanguage = entry.namesByLanguage ?? {};
  return (
    toTrimmedString(namesByLanguage['en']) ||
    toTrimmedString(entry.baseParameterId) ||
    toTrimmedString(namesByLanguage['default']) ||
    toTrimmedString(namesByLanguage['pl']) ||
    toTrimmedString(namesByLanguage['de'])
  );
};

const toNameLookupKey = (value: string): string => value.trim().toLowerCase();

const buildParameterLookupMaps = (
  parameters: ProductParameter[]
): {
  byId: Map<string, ProductParameter>;
  byName: Map<string, ProductParameter>;
} => {
  const byId = new Map<string, ProductParameter>();
  const byName = new Map<string, ProductParameter>();

  parameters.forEach((parameter: ProductParameter) => {
    const id = toTrimmedString(parameter.id);
    if (id) byId.set(id, parameter);
    [parameter.name_en, parameter.name_pl, parameter.name_de]
      .map(toTrimmedString)
      .filter((name: string): boolean => name.length > 0)
      .forEach((name: string) => {
        const key = toNameLookupKey(name);
        if (!byName.has(key)) {
          byName.set(key, parameter);
        }
      });
  });

  return { byId, byName };
};

const resolveMatchedParameter = (input: {
  entry: ExtractedBaseParameter;
  byId: Map<string, ProductParameter>;
  byName: Map<string, ProductParameter>;
  linkMap: Record<string, string>;
}): ProductParameter | null => {
  const baseParameterId = toTrimmedString(input.entry.baseParameterId);
  if (baseParameterId) {
    const linkedId = input.linkMap[baseParameterId];
    if (linkedId && input.byId.has(linkedId)) {
      return input.byId.get(linkedId) ?? null;
    }
  }

  const names = Object.values(input.entry.namesByLanguage ?? {})
    .map(toTrimmedString)
    .filter((name: string): boolean => name.length > 0);
  for (const name of names) {
    const matched = input.byName.get(toNameLookupKey(name));
    if (matched) return matched;
  }

  return null;
};

const toParameterSyncValueFromExtracted = (
  entry: ExtractedBaseParameter,
  parameterIdOverride?: string | null
): ProductParameterValue | null => {
  const parameterId = toTrimmedString(parameterIdOverride) || resolveExtractedParameterId(entry);
  const valuesByLanguage = normalizeParameterValuesByLanguage(entry.valuesByLanguage);
  const value =
    valuesByLanguage['default'] ??
    valuesByLanguage['en'] ??
    Object.values(valuesByLanguage)[0] ??
    '';
  const localizedValuesByLanguage = Object.fromEntries(
    Object.entries(valuesByLanguage).filter(([languageCode]: [string, string]) =>
      languageCode !== 'default'
    )
  );
  if (!parameterId || !value) return null;

  return {
    parameterId,
    value,
    ...(Object.keys(localizedValuesByLanguage).length > 0
      ? { valuesByLanguage: localizedValuesByLanguage }
      : {}),
  };
};

const normalizeExistingParameterSyncValues = (
  values: ProductWithImages['parameters']
): Map<string, ProductParameterValue> => {
  const byParameterId = new Map<string, ProductParameterValue>();
  if (!Array.isArray(values)) return byParameterId;

  values.forEach((entry: ProductParameterValue) => {
    const parameterId = toTrimmedString(entry.parameterId);
    if (!parameterId) return;
    const value = toTrimmedString(entry.value);
    const valuesByLanguage = normalizeParameterValuesByLanguage(entry.valuesByLanguage);
    byParameterId.set(parameterId, {
      parameterId,
      value,
      ...(Object.keys(valuesByLanguage).length > 0 ? { valuesByLanguage } : {}),
    });
  });

  return byParameterId;
};

const extractBaseRecordParameterSyncValues = (
  record: Record<string, unknown>
): ProductParameterValue[] => {
  const extracted = extractBaseParameters({
    record,
    settings: {
      enabled: true,
      mode: 'all',
      languageScope: 'catalog_languages',
      createMissingParameters: false,
      overwriteExistingValues: true,
      matchBy: 'base_id_then_name',
    },
    templateMappings: [],
  });

  return extracted
    .map(toParameterSyncValueFromExtracted)
    .filter((entry: ProductParameterValue | null): entry is ProductParameterValue =>
      entry !== null
    );
};

export const resolveBaseParameterSyncValues = async (input: {
  product: ProductWithImages;
  profile: ProductSyncProfile;
  baseRecord: Record<string, unknown> | null;
  connectionId: string;
  inventoryId: string;
  persistLinkMap: boolean;
}): Promise<ProductParameterValue[] | null> => {
  if (!input.baseRecord) return null;
  const rules = buildEffectiveProductSyncFieldRules(input.profile.fieldRules);
  const shouldResolveParameters = rules.some(
    (rule: ProductSyncFieldRule): boolean =>
      rule.appField === 'parameters' && rule.direction !== 'disabled'
  );
  if (!shouldResolveParameters) return null;
  const parameterRule =
    rules.find((rule: ProductSyncFieldRule): boolean => rule.appField === 'parameters') ?? null;
  const preserveExistingValues = parameterRule?.direction === 'base_to_app';

  const useLocalizedExtractor = hasLocalizedParameterTextFieldBuckets(input.baseRecord);
  if (!useLocalizedExtractor) {
    const rawParameters = resolveRawBaseParameterCollection(input.baseRecord);
    if (rawParameters === undefined || rawParameters === null) return null;
    const nextByParameterId = preserveExistingValues
      ? normalizeExistingParameterSyncValues(input.product.parameters)
      : new Map<string, ProductParameterValue>();
    normalizeParameterSyncValues(rawParameters).forEach((entry: ProductParameterValue) => {
      nextByParameterId.set(entry.parameterId, entry);
    });
    return Array.from(nextByParameterId.values());
  }

  const extracted = extractBaseParameters({
    record: input.baseRecord,
    settings: {
      enabled: true,
      mode: 'all',
      languageScope: 'catalog_languages',
      createMissingParameters: false,
      overwriteExistingValues: true,
      matchBy: 'base_id_then_name',
    },
    templateMappings: [],
  });
  if (extracted.length === 0) return null;

  const catalogId =
    toTrimmedString(input.profile.catalogId) || toTrimmedString(input.product.catalogId);
  const nextByParameterId = preserveExistingValues
    ? normalizeExistingParameterSyncValues(input.product.parameters)
    : new Map<string, ProductParameterValue>();

  if (!catalogId) {
    extracted.forEach((entry: ExtractedBaseParameter) => {
      const value = toParameterSyncValueFromExtracted(entry);
      if (value) nextByParameterId.set(value.parameterId, value);
    });
    return Array.from(nextByParameterId.values());
  }

  try {
    const parameterRepository = await getParameterRepository();
    const [parameters, linkMap] = await Promise.all([
      parameterRepository.listParameters({ catalogId }),
      getCatalogParameterLinks({
        catalogId,
        connectionId: input.connectionId,
        inventoryId: input.inventoryId,
      }),
    ]);
    const { byId, byName } = buildParameterLookupMaps(parameters);
    const linkUpdates: Record<string, string> = {};

    extracted.forEach((entry: ExtractedBaseParameter) => {
      const matched = resolveMatchedParameter({
        entry,
        byId,
        byName,
        linkMap,
      });
      if (matched?.linkedTitleTermType) return;

      const value = toParameterSyncValueFromExtracted(entry, matched?.id ?? null);
      if (!value) return;
      nextByParameterId.set(value.parameterId, value);

      const baseParameterId = toTrimmedString(entry.baseParameterId);
      if (
        input.persistLinkMap &&
        matched &&
        baseParameterId &&
        linkMap[baseParameterId] !== matched.id
      ) {
        linkUpdates[baseParameterId] = matched.id;
        linkMap[baseParameterId] = matched.id;
      }
    });

    if (Object.keys(linkUpdates).length > 0) {
      await mergeCatalogParameterLinks({
        catalogId,
        connectionId: input.connectionId,
        inventoryId: input.inventoryId,
        links: linkUpdates,
      });
    }

    return Array.from(nextByParameterId.values());
  } catch (error) {
    void ErrorSystem.captureException(error);
    extracted.forEach((entry: ExtractedBaseParameter) => {
      const value = toParameterSyncValueFromExtracted(entry);
      if (value) nextByParameterId.set(value.parameterId, value);
    });
    return Array.from(nextByParameterId.values());
  }
};

const extractLanguageFromBaseFieldPath = (path: string): string | null => {
  const lastSegment = path.split('.').pop() ?? path;
  const separatorIndex = lastSegment.lastIndexOf('|');
  if (separatorIndex < 0) return null;
  const languageCode = normalizeLanguageCode(lastSegment.slice(separatorIndex + 1));
  return languageCode === 'default' ? null : languageCode;
};

const normalizeBaseFieldCollectionKey = (path: string): string => {
  const lastSegment = path.split('.').pop() ?? path;
  const [namePart] = lastSegment.split('|');
  return namePart.trim().toLowerCase();
};

const isParameterCollectionBaseField = (path: string): boolean => {
  const collectionKey = normalizeBaseFieldCollectionKey(path);
  return PARAMETER_COLLECTION_KEYS.some((key: string): boolean => key === collectionKey);
};

const hasLocalizedParameterTextFieldBuckets = (record: Record<string, unknown>): boolean => {
  const textFields = record['text_fields'];
  if (!textFields || typeof textFields !== 'object' || Array.isArray(textFields)) return false;
  return Object.keys(textFields as Record<string, unknown>).some((key: string): boolean => {
    if (!key.includes('|')) return false;
    return isParameterCollectionBaseField(key);
  });
};

const resolveRawBaseParameterCollection = (record: Record<string, unknown>): unknown =>
  resolvePathValue(record, 'parameters') ??
  resolvePathValue(record, 'features') ??
  resolvePathValue(record, 'attributes') ??
  resolvePathValue(record, 'params');

export const normalizeFieldValue = (
  appField: ProductSyncAppField,
  value: unknown
): string | number | null => {
  if (
    appField === 'stock' ||
    appField === 'price' ||
    appField === 'weight' ||
    appField === 'length' ||
    appField === 'width'
  ) {
    return coerceNumber(value);
  }
  if (appField === 'parameters' || appField === 'custom_fields') {
    if (appField === 'parameters') {
      const parameters = normalizeParameterSyncValues(value);
      return parameters.length > 0 ? serializeArrayField(parameters) : null;
    }
    return serializeArrayField(value);
  }
  const stringValue = toTrimmedString(value);
  return stringValue || null;
};

const buildLocalPatchValue = (
  appField: ProductSyncAppField,
  rawBaseValue: unknown,
  normalizedBaseValue: string | number | null
): unknown => {
  if (normalizedBaseValue === null) return null;
  if (appField === 'parameters') return normalizeParameterSyncValues(rawBaseValue);
  if (appField === 'custom_fields') return rawBaseValue;
  return normalizedBaseValue;
};

export const valuesEqual = (appField: ProductSyncAppField, left: unknown, right: unknown): boolean => {
  const normalizedLeft = normalizeFieldValue(appField, left);
  const normalizedRight = normalizeFieldValue(appField, right);

  if (normalizedLeft === null && normalizedRight === null) return true;
  return normalizedLeft === normalizedRight;
};

export const getProductFieldValue = (product: ProductWithImages, field: ProductSyncAppField): unknown => {
  if (field === 'name_en') return product.name_en;
  if (field === 'name_pl') return product.name_pl;
  if (field === 'description_en') return product.description_en;
  if (field === 'description_pl') return product.description_pl;
  if (field === 'stock') return product.stock;
  if (field === 'price') return product.price;
  if (field === 'sku') return product.sku;
  if (field === 'ean') return product.ean;
  if (field === 'asin') return product.asin;
  if (field === 'weight') return product.weight;
  if (field === 'length') return product.length;
  if (field === 'width') return product.sizeWidth;
  if (field === 'category') return product.categoryId;
  if (field === 'parameters') return product.parameters;
  if (field === 'custom_fields') return product.customFields;
  return null;
};

export const resolvePathValue = (record: Record<string, unknown>, path: string): unknown => {
  const normalizedPath = toTrimmedString(path);
  if (!normalizedPath) return undefined;

  const parts = normalizedPath.split('.').map((segment: string) => segment.trim());
  let current: unknown = record;

  for (const segment of parts) {
    if (!segment) return undefined;
    if (Array.isArray(current)) {
      const index = Number(segment);
      if (!Number.isFinite(index)) return undefined;
      current = current[index];
      continue;
    }
    if (!current || typeof current !== 'object') return undefined;
    current = (current as Record<string, unknown>)[segment];
  }

  return current;
};

const readNumericFromPriceEntry = (entry: unknown): number | null => {
  if (typeof entry === 'number') return Number.isFinite(entry) ? entry : null;
  if (typeof entry === 'string') return toFiniteNumber(entry);
  if (entry && typeof entry === 'object') {
    const e = entry as Record<string, unknown>;
    const candidate = e['price'] ?? e['price_brutto'] ?? e['price_gross'] ?? e['gross'];
    return toFiniteNumber(candidate);
  }
  return null;
};

const resolveFirstPriceFromRecord = (record: Record<string, unknown>): number | null => {
  // Try prices.0 (numeric key) — handles inventories with positional price groups
  const group0 = resolvePathValue(record, 'prices.0');
  if (group0 !== undefined && group0 !== null) {
    const v = readNumericFromPriceEntry(group0);
    if (v !== null) return v;
  }
  // Try top-level price/price_brutto fields
  const topLevel = readNumericFromPriceEntry({
    price: record['price'],
    price_brutto: record['price_brutto'],
    price_gross: record['price_gross'],
  });
  if (topLevel !== null) return topLevel;
  // Iterate all price group values (handles PLN / EUR / other currency-keyed groups)
  const pricesObj = record['prices'];
  if (pricesObj && typeof pricesObj === 'object' && !Array.isArray(pricesObj)) {
    for (const entry of Object.values(pricesObj as Record<string, unknown>)) {
      const v = readNumericFromPriceEntry(entry);
      if (v !== null) return v;
    }
  }
  return null;
};

export const resolveDefaultBaseValue = (
  appField: ProductSyncAppField,
  record: Record<string, unknown>
): unknown => {
  if (appField === 'stock') {
    return resolvePathValue(record, 'stock');
  }
  if (appField === 'price') {
    return resolveFirstPriceFromRecord(record);
  }
  if (appField === 'name_en') {
    return (
      resolvePathValue(record, 'name_en') ??
      resolvePathValue(record, 'text_fields.name_en') ??
      resolvePathValue(record, 'text_fields.name|en') ??
      resolvePathValue(record, 'text_fields.name') ??
      resolvePathValue(record, 'name')
    );
  }
  if (appField === 'description_en') {
    return (
      resolvePathValue(record, 'description_en') ??
      resolvePathValue(record, 'text_fields.description_en') ??
      resolvePathValue(record, 'text_fields.description|en') ??
      resolvePathValue(record, 'text_fields.description') ??
      resolvePathValue(record, 'description')
    );
  }
  if (appField === 'sku') {
    return resolvePathValue(record, 'sku');
  }
  if (appField === 'ean') {
    return resolvePathValue(record, 'ean');
  }
  if (appField === 'weight') {
    return resolvePathValue(record, 'weight');
  }
  if (appField === 'name_pl') {
    return (
      resolvePathValue(record, 'name_pl') ??
      resolvePathValue(record, 'text_fields.name_pl') ??
      resolvePathValue(record, 'text_fields.name|pl') ??
      resolvePathValue(record, 'name|pl') ??
      resolvePathValue(record, 'text_fields.name') ??
      resolvePathValue(record, 'name')
    );
  }
  if (appField === 'description_pl') {
    return (
      resolvePathValue(record, 'description_pl') ??
      resolvePathValue(record, 'text_fields.description_pl') ??
      resolvePathValue(record, 'text_fields.description|pl') ??
      resolvePathValue(record, 'description|pl') ??
      resolvePathValue(record, 'text_fields.description') ??
      resolvePathValue(record, 'description')
    );
  }
  if (appField === 'length') {
    return resolvePathValue(record, 'length');
  }
  if (appField === 'width') {
    return resolvePathValue(record, 'width');
  }
  if (appField === 'category') {
    return (
      resolvePathValue(record, 'category_id') ??
      resolvePathValue(record, 'category')
    );
  }
  if (appField === 'parameters') {
    const extracted = extractBaseRecordParameterSyncValues(record);
    if (extracted.length > 0) return extracted;
    return undefined;
  }
  if (appField === 'custom_fields') {
    return (
      resolvePathValue(record, 'custom_fields') ??
      resolvePathValue(record, 'features')
    );
  }
  return undefined;
};

export const resolveBaseValueByRule = (
  rule: ProductSyncFieldRule,
  record: Record<string, unknown>
): unknown => {
  if (rule.appField === 'parameters') {
    const normalizedBaseField = toTrimmedString(rule.baseField);
    const byPath = resolvePathValue(record, normalizedBaseField);
    if (byPath !== undefined && byPath !== null) {
      const languageCode = extractLanguageFromBaseFieldPath(normalizedBaseField);
      if (languageCode) {
        return normalizeParameterSyncValues(byPath, languageCode);
      }
      if (isParameterCollectionBaseField(normalizedBaseField)) {
        if (hasLocalizedParameterTextFieldBuckets(record)) {
          const extracted = extractBaseRecordParameterSyncValues(record);
          if (extracted.length > 0) return extracted;
        }
      }
      return normalizeParameterSyncValues(byPath);
    }
    return resolveDefaultBaseValue(rule.appField, record);
  }

  const byPath = resolvePathValue(record, rule.baseField);
  if (byPath !== undefined && byPath !== null) {
    return byPath;
  }
  return resolveDefaultBaseValue(rule.appField, record);
};

export const setPathValue = (target: Record<string, unknown>, path: string, value: unknown): void => {
  const normalizedPath = toTrimmedString(path);
  if (!normalizedPath) return;

  const segments = normalizedPath.split('.').map((segment: string) => segment.trim());
  if (segments.length === 0) return;

  let current: Record<string, unknown> = target;
  for (let index = 0; index < segments.length - 1; index += 1) {
    const key = segments[index];
    if (!key) return;
    const next = current[key];
    if (!next || typeof next !== 'object' || Array.isArray(next)) {
      current[key] = {};
    }
    current = current[key] as Record<string, unknown>;
  }

  const lastKey = segments[segments.length - 1];
  if (!lastKey) return;
  current[lastKey] = value;
};

export const createEmptyBaseFieldPresentationMetadata = (): ProductSyncBaseFieldPresentationMetadata => ({
  warehousesByIdentifier: new Map(),
  priceGroupsByIdentifier: new Map(),
});

export const getDynamicStockIdentifier = (rule: ProductSyncFieldRule): string | null => {
  if (rule.appField !== 'stock') return null;
  const normalizedBaseField = toTrimmedString(rule.baseField);
  if (!normalizedBaseField.startsWith('stock.')) return null;
  return toTrimmedString(normalizedBaseField.slice('stock.'.length)) || null;
};

export const getDynamicPriceGroupIdentifier = (rule: ProductSyncFieldRule): string | null => {
  if (rule.appField !== 'price') return null;
  const normalizedBaseField = toTrimmedString(rule.baseField);
  if (!normalizedBaseField.startsWith('prices.')) return null;
  return toTrimmedString(normalizedBaseField.slice('prices.'.length)) || null;
};

export const resolveWarehouseBaseFieldPresentation = (input: {
  identifier: string;
  warehouse: {
    name: string;
    isDefault: boolean;
  };
}): { label: string; description: string | null; isKnown: boolean } => {
  const suffix = input.warehouse.isDefault ? ' [default]' : '';
  return {
    label: `Warehouse stock: ${input.warehouse.name} (${input.identifier})`,
    description: `Stock for Base.com warehouse ${input.warehouse.name} (${input.identifier})${suffix}.`,
    isKnown: true,
  };
};

export const resolvePriceGroupBaseFieldPresentation = (input: {
  identifier: string;
  priceGroup: {
    name: string;
    currencyCode: string | null;
    isDefault: boolean;
  };
}): { label: string; description: string | null; isKnown: boolean } => {
  const details = [
    input.priceGroup.currencyCode,
    input.priceGroup.isDefault ? 'default' : null,
  ].filter((value): value is string => typeof value === 'string' && value.trim().length > 0);
  const suffix = details.length > 0 ? ` [${details.join(', ')}]` : '';
  return {
    label: `Price group: ${input.priceGroup.name} (${input.identifier})`,
    description: `Price for Base.com price group ${input.priceGroup.name} (${input.identifier})${suffix}.`,
    isKnown: true,
  };
};

export const getEffectiveBaseFieldPresentation = (
  rule: ProductSyncFieldRule,
  metadata?: ProductSyncBaseFieldPresentationMetadata
): { label: string; description: string | null; isKnown: boolean } => {
  const fallbackPresentation = getProductSyncBaseFieldPresentation(rule.appField, rule.baseField);
  if (!metadata) return fallbackPresentation;

  const warehouseIdentifier = getDynamicStockIdentifier(rule);
  if (warehouseIdentifier) {
    const warehouse = metadata.warehousesByIdentifier.get(warehouseIdentifier);
    if (warehouse) {
      return resolveWarehouseBaseFieldPresentation({
        identifier: warehouseIdentifier,
        warehouse,
      });
    }
  }

  const priceGroupIdentifier = getDynamicPriceGroupIdentifier(rule);
  if (priceGroupIdentifier) {
    const priceGroup = metadata.priceGroupsByIdentifier.get(priceGroupIdentifier);
    if (priceGroup) {
      return resolvePriceGroupBaseFieldPresentation({
        identifier: priceGroupIdentifier,
        priceGroup,
      });
    }
  }

  return fallbackPresentation;
};

export const loadWarehousePresentationMetadata = async (input: {
  token: string;
  inventoryId: string;
  identifiers: string[];
}): Promise<ProductSyncBaseFieldPresentationMetadata['warehousesByIdentifier']> => {
  if (input.identifiers.length === 0) {
    return new Map();
  }

  const wantedIdentifiers = new Set(input.identifiers.map(toTrimmedString).filter(Boolean));

  try {
    const warehouses = await fetchBaseWarehouses(input.token, input.inventoryId);
    const warehousesByIdentifier: ProductSyncBaseFieldPresentationMetadata['warehousesByIdentifier'] =
      new Map();

    warehouses.forEach((warehouse: BaseWarehouse) => {
      const identifiers = [
        toTrimmedString(warehouse.id),
        toTrimmedString(warehouse.typedId),
      ].filter(Boolean);
      if (identifiers.length === 0) return;

      const name = (toTrimmedString(warehouse.name) || identifiers[0]) ?? 'unknown';
      identifiers.forEach((identifier: string) => {
        if (!wantedIdentifiers.has(identifier)) return;
        warehousesByIdentifier.set(identifier, {
          name,
          isDefault: warehouse.is_default === true,
        });
      });
    });

    return warehousesByIdentifier;
  } catch (error) {
    void ErrorSystem.captureException(error);
    return new Map();
  }
};

export const loadPriceGroupPresentationMetadata = async (
  identifiers: string[]
): Promise<ProductSyncBaseFieldPresentationMetadata['priceGroupsByIdentifier']> => {
  if (identifiers.length === 0) {
    return new Map();
  }

  const wantedIdentifiers = Array.from(new Set(identifiers.map(toTrimmedString).filter(Boolean)));
  if (wantedIdentifiers.length === 0) {
    return new Map();
  }

  try {
    const mongo = await getMongoDb();
    const priceGroups = (await mongo
      .collection<MongoPriceGroupDoc>('price_groups')
      .find(
        {
          $or: [{ id: { $in: wantedIdentifiers } }, { groupId: { $in: wantedIdentifiers } }],
        },
        {
          projection: {
            id: 1,
            groupId: 1,
            name: 1,
            currencyId: 1,
            isDefault: 1,
          },
        }
      )
      .toArray()) as MongoPriceGroupDoc[];

    const currencyIds = Array.from(
      new Set(
        priceGroups
          .map((group: MongoPriceGroupDoc) => toTrimmedString(group.currencyId))
          .filter(Boolean)
      )
    );
    const currencyDocs = currencyIds.length
      ? ((await mongo
          .collection<{ id?: string; code?: string }>('currencies')
          .find({ id: { $in: currencyIds } }, { projection: { id: 1, code: 1 } })
          .toArray()) as Array<{ id?: string; code?: string }>)
      : [];
    const currencyCodeById = new Map(
      currencyDocs.map((currency: { id?: string; code?: string }) => [
        toTrimmedString(currency.id),
        toTrimmedString(currency.code) || null,
      ])
    );

    const priceGroupsByIdentifier: ProductSyncBaseFieldPresentationMetadata['priceGroupsByIdentifier'] =
      new Map();

    priceGroups.forEach((group: MongoPriceGroupDoc) => {
      const identifiersForGroup = [
        toTrimmedString(group.groupId),
        toTrimmedString(group.id),
      ].filter(Boolean);
      if (identifiersForGroup.length === 0) return;

      const name = (toTrimmedString(group.name) || identifiersForGroup[0]) ?? 'unknown';
      const currencyCode = currencyCodeById.get(toTrimmedString(group.currencyId)) ?? null;
      identifiersForGroup.forEach((identifier: string) => {
        if (!wantedIdentifiers.includes(identifier)) return;
        priceGroupsByIdentifier.set(identifier, {
          name,
          currencyCode,
          isDefault: group.isDefault === true,
        });
      });
    });

    return priceGroupsByIdentifier;
  } catch (error) {
    void ErrorSystem.captureException(error);
    return new Map();
  }
};

export const resolveBaseFieldPresentationMetadata = async (input: {
  connectionContext: BaseConnectionContext;
  rules: ProductSyncFieldRule[];
}): Promise<ProductSyncBaseFieldPresentationMetadata> => {
  const warehouseIdentifiers = Array.from(
    new Set(
      input.rules
        .map((rule: ProductSyncFieldRule) => getDynamicStockIdentifier(rule))
        .filter((value: string | null): value is string => typeof value === 'string' && value.length > 0)
    )
  );
  const priceGroupIdentifiers = Array.from(
    new Set(
      input.rules
        .map((rule: ProductSyncFieldRule) => getDynamicPriceGroupIdentifier(rule))
        .filter((value: string | null): value is string => typeof value === 'string' && value.length > 0)
    )
  );

  if (warehouseIdentifiers.length === 0 && priceGroupIdentifiers.length === 0) {
    return createEmptyBaseFieldPresentationMetadata();
  }

  const [warehousesByIdentifier, priceGroupsByIdentifier] = await Promise.all([
    loadWarehousePresentationMetadata({
      token: input.connectionContext.token,
      inventoryId: input.connectionContext.inventoryId,
      identifiers: warehouseIdentifiers,
    }),
    loadPriceGroupPresentationMetadata(priceGroupIdentifiers),
  ]);

  return {
    warehousesByIdentifier,
    priceGroupsByIdentifier,
  };
};

export const buildLinkedProductSyncPlan = (input: {
  product: ProductWithImages;
  baseRecord: Record<string, unknown> | null;
  profile: ProductSyncProfile;
  baseProductId: string;
  persistBaseProductId: boolean;
  baseFieldPresentationMetadata?: ProductSyncBaseFieldPresentationMetadata;
  resolvedBaseParameterValues?: ProductParameterValue[] | null;
}): LinkedProductSyncPlan => {
  const rules = buildEffectiveProductSyncFieldRules(input.profile.fieldRules);
  const localPatch: Record<string, unknown> = {};
  const basePayload: Record<string, unknown> = {};
  const localChanges: string[] = [];
  const baseChanges: string[] = [];

  const fields = rules.map((rule: ProductSyncFieldRule): ProductSyncFieldPreview => {
    const rawAppValue = getProductFieldValue(input.product, rule.appField);
    const rawBaseValue =
      rule.appField === 'parameters' && input.resolvedBaseParameterValues
        ? input.resolvedBaseParameterValues
        : input.baseRecord
          ? resolveBaseValueByRule(rule, input.baseRecord)
          : null;
    const appValue = normalizeFieldValue(rule.appField, rawAppValue);
    const baseValue = input.baseRecord
      ? normalizeFieldValue(rule.appField, rawBaseValue)
      : null;
    const baseFieldPresentation = getEffectiveBaseFieldPresentation(
      rule,
      input.baseFieldPresentationMetadata
    );
    const hasDifference =
      input.baseRecord !== null ? !valuesEqual(rule.appField, appValue, baseValue) : false;
    const willWriteToApp =
      rule.direction === 'base_to_app' &&
      input.baseRecord !== null &&
      hasDifference;
    const willWriteToBase =
      rule.direction === 'app_to_base' &&
      input.baseRecord !== null &&
      hasDifference;

    if (willWriteToApp) {
      localPatch[rule.appField] = buildLocalPatchValue(rule.appField, rawBaseValue, baseValue);
      localChanges.push(rule.appField);
    }

    if (willWriteToBase) {
      setPathValue(basePayload, rule.baseField, rawAppValue);
      baseChanges.push(rule.baseField);
    }

    return {
      appField: rule.appField,
      appFieldLabel: getProductSyncAppFieldLabel(rule.appField),
      baseField: rule.baseField,
      baseFieldLabel: baseFieldPresentation.label,
      baseFieldDescription: baseFieldPresentation.description,
      direction: rule.direction,
      appValue,
      baseValue,
      hasDifference,
      willWriteToApp,
      willWriteToBase,
    };
  });

  if (input.persistBaseProductId && !toTrimmedString(input.product.baseProductId)) {
    localPatch['baseProductId'] = input.baseProductId;
    localChanges.push('baseProductId');
  }

  return {
    fields,
    localPatch,
    basePayload,
    localChanges,
    baseChanges,
  };
};

export const buildBlockedSyncPreview = (input: {
  status: ProductSyncPreview['status'];
  disabledReason: string;
  profile: ProductSyncProfile | null;
  product: ProductWithImages;
  linkedBaseProductId?: string | null;
  connectionName?: string | null;
  resolvedTargetSource?: ProductSyncTargetSource;
}): ProductSyncPreview => ({
  status: input.status,
  canSync: false,
  disabledReason: input.disabledReason,
  profile: input.profile
    ? {
        id: input.profile.id,
        name: input.profile.name,
        isDefault: input.profile.isDefault,
        enabled: input.profile.enabled,
        connectionId: input.profile.connectionId,
        connectionName: input.connectionName ?? null,
        inventoryId: input.profile.inventoryId,
        catalogId: input.profile.catalogId,
        lastRunAt: input.profile.lastRunAt,
      }
    : null,
  linkedBaseProductId: toTrimmedString(input.linkedBaseProductId) || null,
  resolvedTargetSource: input.resolvedTargetSource ?? 'none',
  fields: input.profile
    ? buildLinkedProductSyncPlan({
        product: input.product,
        baseRecord: null,
        profile: input.profile,
        baseProductId: toTrimmedString(input.linkedBaseProductId) || '',
        persistBaseProductId: false,
      }).fields
    : [],
});

export const toProductSyncPreviewProfile = (
  profile: ProductSyncProfile,
  options?: { connectionName?: string | null }
): ProductSyncPreview['profile'] => ({
  id: profile.id,
  name: profile.name,
  isDefault: profile.isDefault,
  enabled: profile.enabled,
  connectionId: profile.connectionId,
  connectionName: options?.connectionName ?? null,
  inventoryId: profile.inventoryId,
  catalogId: profile.catalogId,
  lastRunAt: profile.lastRunAt,
});

export const summarizeRun = (stats: ProductSyncRunStats): string => {
  return `Processed ${stats.processed}/${stats.total} Base-targeted products. Success: ${stats.success}, skipped: ${stats.skipped}, failed: ${stats.failed}, local updates: ${stats.localUpdated}, Base updates: ${stats.baseUpdated}.`;
};

export const resolveBaseConnectionContext = async (
  profile: ProductSyncProfile
): Promise<BaseConnectionContext> => {
  const integrationRepo = await getIntegrationRepository();
  const connection = await integrationRepo.getConnectionById(profile.connectionId);
  if (!connection) {
    throw new Error('Configured Base connection does not exist.');
  }

  const integration = await integrationRepo.getIntegrationById(connection.integrationId);
  if (
    !integration ||
    !BASE_INTEGRATION_SLUGS.has(toTrimmedString(integration.slug).toLowerCase())
  ) {
    throw new Error('Selected connection is not a Base.com integration.');
  }

  const tokenResolution = resolveBaseConnectionToken({
    baseApiToken: connection.baseApiToken,
  });
  if (!tokenResolution.token) {
    throw new Error(tokenResolution.error ?? 'No Base API token configured.');
  }

  return {
    integrationId: integration.id,
    connectionId: connection.id,
    connectionName: toTrimmedString(connection.name) || null,
    inventoryId: profile.inventoryId,
    token: tokenResolution.token,
  };
};

export const fetchBaseDetailsMap = async (
  token: string,
  inventoryId: string,
  baseProductIds: string[]
): Promise<Map<string, Record<string, unknown>>> => {
  const uniqueIds = Array.from(
    new Set(
      baseProductIds.map((id: string) => toTrimmedString(id)).filter((id: string) => id.length > 0)
    )
  );

  const map = new Map<string, Record<string, unknown>>();
  for (let offset = 0; offset < uniqueIds.length; offset += BASE_DETAILS_BATCH_SIZE) {
    const batch = uniqueIds.slice(offset, offset + BASE_DETAILS_BATCH_SIZE);
    if (batch.length === 0) continue;
    const records = await fetchBaseProductDetails(token, inventoryId, batch);
    records.forEach((record: Record<string, unknown>) => {
      const id =
        toTrimmedString(record['base_product_id']) ||
        toTrimmedString(record['product_id']) ||
        toTrimmedString(record['id']);
      if (!id) return;
      map.set(id, record);
    });
  }

  return map;
};

export const resolveLinkedBaseSyncTarget = async (input: {
  product: ProductWithImages;
  connectionId: string;
}): Promise<BaseSyncResolvedTarget> => {
  const persistedBaseProductId = toTrimmedString(input.product.baseProductId);
  if (persistedBaseProductId) {
    return {
      baseProductId: persistedBaseProductId,
      linkedVia: 'product',
    };
  }

  const listingLink = await findProductListingByProductAndConnectionAcrossProviders(
    input.product.id,
    input.connectionId
  );
  const listingBaseProductId = toTrimmedString(listingLink?.listing.externalListingId);

  if (listingBaseProductId) {
    return {
      baseProductId: listingBaseProductId,
      linkedVia: 'listing',
    };
  }

  return {
    baseProductId: null,
    linkedVia: 'none',
  };
};

export const resolveManualBaseSyncTarget = async (input: {
  product: ProductWithImages;
  connectionId: string;
  token: string;
  inventoryId: string;
}): Promise<BaseSyncResolvedTarget> => {
  const linkedTarget = await resolveLinkedBaseSyncTarget({
    product: input.product,
    connectionId: input.connectionId,
  });
  if (linkedTarget.baseProductId) {
    return linkedTarget;
  }

  const backfilledBaseProductId = await resolveBackfillBaseProductId({
    product: input.product,
    token: input.token,
    inventoryId: input.inventoryId,
  });
  if (backfilledBaseProductId) {
    return {
      baseProductId: backfilledBaseProductId,
      linkedVia: 'sku_backfill',
    };
  }

  return linkedTarget;
};

export const resolveBatchProductSyncTargets = async (input: {
  products: ProductWithImages[];
  connectionId: string;
  token: string;
  inventoryId: string;
}): Promise<ResolvedProductSyncTarget[]> => {
  const resolvedTargets: ResolvedProductSyncTarget[] = [];

  for (const product of input.products) {
    const target = await resolveManualBaseSyncTarget({
      product,
      connectionId: input.connectionId,
      token: input.token,
      inventoryId: input.inventoryId,
    });
    if (!target.baseProductId) continue;
    resolvedTargets.push({ product, target });
  }

  return resolvedTargets;
};

export const ensureBaseListingLink = async (input: {
  productId: string;
  baseProductId: string;
  integrationId: string;
  connectionId: string;
  inventoryId: string;
  source: string;
}): Promise<'created' | 'updated' | 'none'> => {
  const existing = await findProductListingByProductAndConnectionAcrossProviders(
    input.productId,
    input.connectionId
  );

  const marketplaceDataPatch = {
    source: input.source,
    marketplace: 'base',
  } as const;

  if (existing) {
    let changed = false;
    if (existing.listing.externalListingId !== input.baseProductId) {
      await existing.repository.updateListingExternalId(existing.listing.id, input.baseProductId);
      changed = true;
    }
    if ((existing.listing.inventoryId ?? '') !== input.inventoryId) {
      await existing.repository.updateListingInventoryId(existing.listing.id, input.inventoryId);
      changed = true;
    }
    if (toTrimmedString(existing.listing.status).toLowerCase() !== 'active') {
      await existing.repository.updateListingStatus(existing.listing.id, 'active');
      changed = true;
    }
    await existing.repository.updateListing(existing.listing.id, {
      marketplaceData: {
        ...(existing.listing.marketplaceData ?? {}),
        ...marketplaceDataPatch,
      },
    });
    return changed ? 'updated' : 'none';
  }

  const listingRepository = await getProductListingRepository();
  await listingRepository.createListing({
    productId: input.productId,
    integrationId: input.integrationId,
    connectionId: input.connectionId,
    status: 'active',
    externalListingId: input.baseProductId,
    inventoryId: input.inventoryId,
    marketplaceData: marketplaceDataPatch,
  });
  return 'created';
};

export const resolveBackfillBaseProductId = async (input: {
  product: ProductWithImages;
  token: string;
  inventoryId: string;
}): Promise<string | null> => {
  const persistedBaseProductId = toTrimmedString(input.product.baseProductId);
  if (persistedBaseProductId) {
    return persistedBaseProductId;
  }

  if (toTrimmedString(input.product.importSource).toLowerCase() !== 'base') {
    return null;
  }

  const sku = toTrimmedString(input.product.sku);
  if (!sku) {
    return null;
  }

  const skuLookup = await checkBaseSkuExists(input.token, input.inventoryId, sku);
  return toTrimmedString(skuLookup.productId) || null;
};

export const syncSingleLinkedProduct = async (input: {
  product: ProductWithImages;
  baseProductId: string;
  baseRecord: Record<string, unknown> | null;
  profile: ProductSyncProfile;
  integrationId: string;
  connectionId: string;
  inventoryId: string;
  token: string;
}): Promise<LinkedProductSyncResult> => {
  const baseProductId = toTrimmedString(input.baseProductId);
  if (!baseProductId) {
    return {
      status: 'skipped',
      localChanges: [],
      baseChanges: [],
      message: 'Product has no Base product ID.',
      errorMessage: null,
    };
  }

  if (!input.baseRecord) {
    return {
      status: 'failed',
      localChanges: [],
      baseChanges: [],
      message: null,
      errorMessage: `Base product ${baseProductId} not found in inventory ${input.inventoryId}.`,
    };
  }

  const resolvedBaseParameterValues = await resolveBaseParameterSyncValues({
    product: input.product,
    profile: input.profile,
    baseRecord: input.baseRecord,
    connectionId: input.connectionId,
    inventoryId: input.inventoryId,
    persistLinkMap: true,
  });
  const plan = buildLinkedProductSyncPlan({
    product: input.product,
    baseRecord: input.baseRecord,
    profile: input.profile,
    baseProductId,
    persistBaseProductId: !toTrimmedString(input.product.baseProductId),
    resolvedBaseParameterValues,
  });
  const { localPatch, basePayload, localChanges, baseChanges } = plan;

  if (localChanges.length === 0 && baseChanges.length === 0) {
    await ensureBaseListingLink({
      productId: input.product.id,
      baseProductId,
      integrationId: input.integrationId,
      connectionId: input.connectionId,
      inventoryId: input.inventoryId,
      source: 'product-sync',
    });

    return {
      status: 'skipped',
      localChanges: [],
      baseChanges: [],
      message: 'No field changes detected.',
      errorMessage: null,
    };
  }

  const productRepository = await getProductRepository();

  if (Object.keys(localPatch).length > 0) {
    const updated = await productRepository.updateProduct(
      input.product.id,
      localPatch as UpdateProductInput
    );
    if (!updated) {
      return {
        status: 'failed',
        localChanges,
        baseChanges,
        message: null,
        errorMessage: `Product ${input.product.id} was not found for local update.`,
      };
    }
  }

  if (Object.keys(basePayload).length > 0) {
    // Base updates existing inventory products via addInventoryProduct when product_id is provided.
    await callBaseApi(input.token, 'addInventoryProduct', {
      inventory_id: input.inventoryId,
      product_id: baseProductId,
      ...basePayload,
    });
  }

  await ensureBaseListingLink({
    productId: input.product.id,
    baseProductId,
    integrationId: input.integrationId,
    connectionId: input.connectionId,
    inventoryId: input.inventoryId,
    source: 'product-sync',
  });

  return {
    status: 'success',
    localChanges,
    baseChanges,
    message: 'Synchronized successfully.',
    errorMessage: null,
  };
};

export const processProductSyncRun = async (runId: string): Promise<ProductSyncRunRecord> => {
  const run = await getProductSyncRun(runId);
  if (!run) {
    throw new Error(`Product sync run not found: ${runId}`);
  }

  if (isTerminalRunStatus(run.status)) {
    return run;
  }

  const profile = await getProductSyncProfile(run.profileId);
  if (!profile) {
    return updateProductSyncRunStatus(runId, 'failed', {
      errorMessage: 'Sync profile no longer exists.',
      summaryMessage: 'Run failed because the profile was deleted.',
    });
  }

  let connectionContext: BaseConnectionContext;
  try {
    connectionContext = await resolveBaseConnectionContext(profile);
  } catch (error) {
    void ErrorSystem.captureException(error);
    return updateProductSyncRunStatus(runId, 'failed', {
      errorMessage: error instanceof Error ? error.message : 'Connection resolution failed.',
      summaryMessage: 'Run failed during connection preflight.',
    });
  }

  await updateProductSyncRunStatus(runId, 'running', {
    errorMessage: null,
    summaryMessage: null,
    stats: {
      total: 0,
      processed: 0,
      success: 0,
      skipped: 0,
      failed: 0,
      localUpdated: 0,
      baseUpdated: 0,
    },
  });

  const productRepository = await getProductRepository();
  const pageSize = Math.max(1, Math.min(profile.batchSize, 500));
  const stats: ProductSyncRunStats = {
    total: 0,
    processed: 0,
    success: 0,
    skipped: 0,
    failed: 0,
    localUpdated: 0,
    baseUpdated: 0,
  };

  let page = 1;
  let itemCounter = 0;
  let lastProgressFlushProcessed = 0;
  let lastProgressFlushAtMs = Date.now();

  const flushRunProgress = async (force = false): Promise<void> => {
    const nowMs = Date.now();
    const processedDelta = stats.processed - lastProgressFlushProcessed;
    const dueToProcessedItems = processedDelta >= RUN_PROGRESS_FLUSH_EVERY_ITEMS;
    const dueToHeartbeatAge = nowMs - lastProgressFlushAtMs >= RUN_PROGRESS_FLUSH_EVERY_MS;
    if (!force && !dueToProcessedItems && !dueToHeartbeatAge) return;

    await updateProductSyncRun(runId, {
      stats: { ...stats },
      summaryMessage: summarizeRun(stats),
      errorMessage: null,
    });
    lastProgressFlushProcessed = stats.processed;
    lastProgressFlushAtMs = nowMs;
  };

  try {
    while (true) {
      const products = await productRepository.getProducts({
        page,
        pageSize,
        ...(profile.catalogId ? { catalogId: profile.catalogId } : {}),
      });

      if (products.length === 0) {
        break;
      }

      const resolvedProducts = await resolveBatchProductSyncTargets({
        products,
        connectionId: connectionContext.connectionId,
        token: connectionContext.token,
        inventoryId: connectionContext.inventoryId,
      });

      if (resolvedProducts.length > 0) {
        stats.total += resolvedProducts.length;
        const baseDetailsById = await fetchBaseDetailsMap(
          connectionContext.token,
          connectionContext.inventoryId,
          resolvedProducts
            .map(({ target }: ResolvedProductSyncTarget) => toTrimmedString(target.baseProductId))
            .filter((id: string | null): id is string => typeof id === 'string' && id.length > 0)
        );

        for (const { product, target } of resolvedProducts) {
          const baseProductId = toTrimmedString(target.baseProductId);
          itemCounter += 1;

          try {
            const result = await syncSingleLinkedProduct({
              product,
              baseProductId,
              baseRecord: baseDetailsById.get(baseProductId) ?? null,
              profile,
              integrationId: connectionContext.integrationId,
              connectionId: connectionContext.connectionId,
              inventoryId: connectionContext.inventoryId,
              token: connectionContext.token,
            });

            stats.processed += 1;
            if (result.status === 'success') {
              stats.success += 1;
              if (result.localChanges.length > 0) stats.localUpdated += 1;
              if (result.baseChanges.length > 0) stats.baseUpdated += 1;
            } else if (result.status === 'skipped') {
              stats.skipped += 1;
            } else {
              stats.failed += 1;
            }

            const item: ProductSyncRunItemRecord = {
              id: randomUUID(),
              runId,
              itemId: String(itemCounter).padStart(8, '0'),
              productId: product.id,
              baseProductId,
              status: result.status,
              localChanges: result.localChanges,
              baseChanges: result.baseChanges,
              message: result.message,
              errorMessage: result.errorMessage,
              createdAt: nowIso(),
              updatedAt: nowIso(),
            };

            await putProductSyncRunItem(item);
            await flushRunProgress();
          } catch (error) {
            void ErrorSystem.captureException(error);
            stats.processed += 1;
            stats.failed += 1;

            const item: ProductSyncRunItemRecord = {
              id: randomUUID(),
              runId,
              itemId: String(itemCounter).padStart(8, '0'),
              productId: product.id,
              baseProductId,
              status: 'failed',
              localChanges: [],
              baseChanges: [],
              message: null,
              errorMessage:
                error instanceof Error ? error.message : 'Unexpected synchronization error.',
              createdAt: nowIso(),
              updatedAt: nowIso(),
            };

            await putProductSyncRunItem(item);
            await flushRunProgress();
          }
        }
      }

      if (products.length < pageSize) {
        break;
      }
      page += 1;
    }

    await flushRunProgress(true);

    const summaryMessage = summarizeRun(stats);
    const finalStatus: ProductSyncRunStatus =
      stats.failed === 0
        ? 'completed'
        : stats.success > 0 || stats.skipped > 0
          ? 'partial_success'
          : 'failed';

    const updatedRun = await updateProductSyncRunStatus(runId, finalStatus, {
      stats,
      summaryMessage,
      errorMessage: finalStatus === 'failed' ? summaryMessage : null,
    });

    await touchProductSyncProfileLastRunAt(profile.id, updatedRun.finishedAt ?? nowIso());

    return updatedRun;
  } catch (error) {
    void ErrorSystem.captureException(error);
    await ErrorSystem.captureException(error, {
      service: 'product-sync-service',
      action: 'processProductSyncRun',
      runId,
      profileId: profile.id,
    });

    const failed = await updateProductSyncRunStatus(runId, 'failed', {
      stats,
      summaryMessage: summarizeRun(stats),
      errorMessage: error instanceof Error ? error.message : 'Synchronization failed.',
    });

    await touchProductSyncProfileLastRunAt(profile.id, failed.finishedAt ?? nowIso());

    return failed;
  }
};

export const runBaseListingBackfill = async (options?: {
  connectionId?: string;
  inventoryId?: string;
  catalogId?: string | null;
  limit?: number;
  source?: string;
}): Promise<{
  scanned: number;
  created: number;
  updated: number;
  unchanged: number;
}> => {
  const integrationRepo = await getIntegrationRepository();
  const integrations = await integrationRepo.listIntegrations();
  const baseIntegration = integrations.find((integration) =>
    BASE_INTEGRATION_SLUGS.has(toTrimmedString(integration.slug).toLowerCase())
  );

  if (!baseIntegration) {
    throw new Error('Base.com integration is not configured.');
  }

  const connections = await integrationRepo.listConnections(baseIntegration.id);
  if (connections.length === 0) {
    throw new Error('No Base.com connection found.');
  }

  const preferredConnectionId =
    toTrimmedString(options?.connectionId) || toTrimmedString(await getExportDefaultConnectionId());

  const connection =
    (preferredConnectionId
      ? connections.find((entry) => entry.id === preferredConnectionId)
      : null) ??
    connections.find((entry) => Boolean(entry.baseApiToken)) ??
    connections[0];

  if (!connection) {
    throw new Error('No usable Base.com connection found.');
  }

  const inventoryId =
    toTrimmedString(options?.inventoryId) || toTrimmedString(connection.baseLastInventoryId);

  if (!inventoryId) {
    throw new Error('Inventory ID is required for link backfill.');
  }

  const tokenResolution = resolveBaseConnectionToken({
    baseApiToken: connection.baseApiToken,
  });

  const productRepository = await getProductRepository();
  const pageSize = 200;
  const limit =
    typeof options?.limit === 'number' && Number.isFinite(options.limit) && options.limit > 0
      ? Math.floor(options.limit)
      : Number.POSITIVE_INFINITY;

  let page = 1;
  let scanned = 0;
  let created = 0;
  let updated = 0;
  let unchanged = 0;

  while (scanned < limit) {
    const products = await productRepository.getProducts({
      page,
      pageSize,
      ...(toTrimmedString(options?.catalogId)
        ? { catalogId: toTrimmedString(options?.catalogId) }
        : {}),
    });

    if (products.length === 0) break;

    for (const product of products) {
      if (scanned >= limit) break;
      const baseProductId = toTrimmedString(product.baseProductId);
      const resolvedBaseProductId =
        baseProductId ||
        (tokenResolution.token
          ? await resolveBackfillBaseProductId({
              product,
              token: tokenResolution.token,
              inventoryId,
            })
          : null);
      if (!resolvedBaseProductId) continue;

      scanned += 1;

      if (!baseProductId) {
        await productRepository.updateProduct(product.id, {
          baseProductId: resolvedBaseProductId,
        });
      }

      const result = await ensureBaseListingLink({
        productId: product.id,
        baseProductId: resolvedBaseProductId,
        integrationId: baseIntegration.id,
        connectionId: connection.id,
        inventoryId,
        source: toTrimmedString(options?.source) || 'base-link-backfill',
      });

      if (result === 'created') {
        created += 1;
      } else if (result === 'updated') {
        updated += 1;
      } else {
        unchanged += 1;
      }
    }

    if (products.length < pageSize) break;
    page += 1;
  }

  return {
    scanned,
    created,
    updated,
    unchanged,
  };
};
