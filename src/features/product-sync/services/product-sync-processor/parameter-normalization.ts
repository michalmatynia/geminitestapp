import { extractBaseParameters } from '@/features/integrations/services/imports/parameter-import/extractor';
import {
  getCatalogParameterLinks,
  mergeCatalogParameterLinks,
} from '@/features/integrations/services/imports/parameter-import/link-map-repository';
import {
  buildEffectiveProductSyncFieldRules,
} from '@/shared/contracts/product-sync';
import type {
  ProductSyncFieldRule,
  ProductSyncProfile,
} from '@/shared/contracts/product-sync';
import type { ExtractedBaseParameter } from '@/shared/contracts/integrations/parameter-import';
import type { ProductParameter } from '@/shared/contracts/products/parameters';
import type { ProductParameterValue, ProductWithImages } from '@/shared/contracts/products/product';
import { getParameterRepository } from '@/shared/lib/products/services/parameter-repository';
import { normalizeParameterValuesByLanguage } from '@/shared/lib/products/utils/parameter-values';
import { ErrorSystem } from '@/shared/utils/observability/error-system';

import {
  toTrimmedString,
} from './utils';

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

export const normalizeScalarParameterValue = (value: unknown): string => {
  const direct = toTrimmedString(value);
  if (direct.length > 0) return direct;
  if (typeof value === 'number' && Number.isFinite(value)) return String(value);
  if (typeof value === 'boolean') return value ? 'true' : 'false';
  if (Array.isArray(value)) {
    return value
      .map((entry: unknown) => normalizeScalarParameterValue(entry))
      .filter((entry: string): boolean => entry.length > 0)
      .join(', ');
  }
  if (value !== null && typeof value === 'object') {
    try {
      const serialized = JSON.stringify(value);
      return serialized !== '{}' ? serialized : '';
    } catch {
      return '';
    }
  }
  return '';
};

export const firstParameterRecordString = (
  record: Record<string, unknown>,
  keys: readonly string[]
): string => {
  const entry = firstParameterRecordEntry(record, keys);
  return entry?.value ?? '';
};

export const firstParameterRecordEntry = (
  record: Record<string, unknown>,
  keys: readonly string[]
): { key: string; value: string } | null => {
  for (const key of keys) {
    const normalized = normalizeScalarParameterValue(record[key]);
    if (normalized !== '') return { key, value: normalized };
  }
  return null;
};

export const normalizeLanguageCode = (value: unknown): string => {
  const normalized = toTrimmedString(value).toLowerCase().replace(/[^a-z0-9_-]/g, '');
  return normalized !== '' ? normalized : 'default';
};

const normalizeSimpleParameterSyncEntry = (
  entry: unknown,
  fallbackId: string,
  normalizedLanguageCode: string
): ProductParameterValue | null => {
  const value = normalizeScalarParameterValue(entry);
  if (fallbackId === '' || value === '') return null;
  return {
    parameterId: fallbackId,
    value,
    ...(normalizedLanguageCode !== 'default'
      ? { valuesByLanguage: { [normalizedLanguageCode]: value } }
      : {}),
  };
};

const normalizeObjectParameterSyncEntry = (
  record: Record<string, unknown>,
  fallbackId: string,
  normalizedLanguageCode: string
): ProductParameterValue | null => {
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
  
  const firstId = firstParameterRecordString(record, PARAMETER_NAME_KEYS);
  let parameterId = firstId;
  if (parameterId === '') {
    parameterId = labelAsName !== '' ? labelAsName : fallbackId.trim();
  }
  
  const value = valueEntry?.value ?? localizedFallbackValue;
  if (parameterId === '' || value === '') return null;
  if (normalizedLanguageCode !== 'default') {
    valuesByLanguage[normalizedLanguageCode] = value;
  }
  return {
    parameterId,
    value,
    ...(Object.keys(valuesByLanguage).length > 0 ? { valuesByLanguage } : {}),
  };
};

export const normalizeParameterSyncEntry = (
  entry: unknown,
  fallbackId: string,
  languageCode: string = 'default'
): ProductParameterValue | null => {
  const normalizedLanguageCode = normalizeLanguageCode(languageCode);
  if (entry === null || entry === undefined || typeof entry !== 'object' || Array.isArray(entry)) {
    return normalizeSimpleParameterSyncEntry(entry, fallbackId, normalizedLanguageCode);
  }

  return normalizeObjectParameterSyncEntry(
    entry as Record<string, unknown>,
    fallbackId,
    normalizedLanguageCode
  );
};

export const normalizeParameterSyncValues = (
  value: unknown,
  languageCode: string = 'default'
): ProductParameterValue[] => {
  const byParameterId = new Map<string, ProductParameterValue>();
  const pushEntry = (entry: ProductParameterValue | null): void => {
    if (entry === null) return;
    const parameterId = entry.parameterId.trim();
    const parameterValue = toTrimmedString(entry.value);
    const valuesByLanguage = normalizeParameterValuesByLanguage(entry.valuesByLanguage);
    if (parameterId === '' || (parameterValue === '' && Object.keys(valuesByLanguage).length === 0)) return;
    const existing = byParameterId.get(parameterId);
    const nextValuesByLanguage = {
      ...normalizeParameterValuesByLanguage(existing?.valuesByLanguage),
      ...valuesByLanguage,
    };
    const nextValue = parameterValue !== '' ? parameterValue : toTrimmedString(existing?.value);
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
  } else if (value !== null && value !== undefined && typeof value === 'object') {
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

export const resolveExtractedParameterId = (entry: ExtractedBaseParameter): string => {
  const namesByLanguage = entry.namesByLanguage ?? {};
  const enName = toTrimmedString(namesByLanguage['en']);
  if (enName !== '') return enName;
  const baseId = toTrimmedString(entry.baseParameterId);
  if (baseId !== '') return baseId;
  const defaultName = toTrimmedString(namesByLanguage['default']);
  if (defaultName !== '') return defaultName;
  const plName = toTrimmedString(namesByLanguage['pl']);
  if (plName !== '') return plName;
  const deName = toTrimmedString(namesByLanguage['de']);
  if (deName !== '') return deName;
  return '';
};

export const toNameLookupKey = (value: string): string => value.trim().toLowerCase();

export const buildParameterLookupMaps = (
  parameters: ProductParameter[]
): {
  byId: Map<string, ProductParameter>;
  byName: Map<string, ProductParameter>;
} => {
  const byId = new Map<string, ProductParameter>();
  const byName = new Map<string, ProductParameter>();

  parameters.forEach((parameter: ProductParameter) => {
    const id = toTrimmedString(parameter.id);
    if (id !== '') byId.set(id, parameter);
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

export const resolveMatchedParameter = (input: {
  entry: ExtractedBaseParameter;
  byId: Map<string, ProductParameter>;
  byName: Map<string, ProductParameter>;
  linkMap: Record<string, string>;
}): ProductParameter | null => {
  const baseParameterId = toTrimmedString(input.entry.baseParameterId);
  if (baseParameterId !== '') {
    const linkedId = input.linkMap[baseParameterId];
    if (linkedId != null && input.byId.has(linkedId)) {
      return input.byId.get(linkedId) ?? null;
    }
  }

  const names = Object.values(input.entry.namesByLanguage ?? {})
    .map(toTrimmedString)
    .filter((name: string): boolean => name.length > 0);
  for (const name of names) {
    const matched = input.byName.get(toNameLookupKey(name));
    if (matched != null) return matched;
  }

  return null;
};

export const toParameterSyncValueFromExtracted = (
  entry: ExtractedBaseParameter,
  parameterIdOverride?: string | null
): ProductParameterValue | null => {
  const parameterId = toTrimmedString(parameterIdOverride) !== '' ? toTrimmedString(parameterIdOverride) : resolveExtractedParameterId(entry);
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
  if (parameterId === '' || value === '') return null;

  return {
    parameterId,
    value,
    ...(Object.keys(localizedValuesByLanguage).length > 0
      ? { valuesByLanguage: localizedValuesByLanguage }
      : {}),
  };
};

export const normalizeExistingParameterSyncValues = (
  values: ProductWithImages['parameters']
): Map<string, ProductParameterValue> => {
  const byParameterId = new Map<string, ProductParameterValue>();
  if (!Array.isArray(values)) return byParameterId;

  values.forEach((entry: ProductParameterValue) => {
    const parameterId = toTrimmedString(entry.parameterId);
    if (parameterId === '') return;
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

export const extractBaseRecordParameterSyncValues = (
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
    .map((entry: ExtractedBaseParameter) => toParameterSyncValueFromExtracted(entry))
    .filter((entry: ProductParameterValue | null): entry is ProductParameterValue =>
      entry !== null
    );
};

export const isParameterCollectionBaseField = (path: string): boolean => {
  const lastSegment = path.split('.').pop() ?? path;
  const namePart = lastSegment.split('|')[0] ?? '';
  const collectionKey = namePart.trim().toLowerCase();
  return PARAMETER_COLLECTION_KEYS.some((key: string): boolean => key === collectionKey);
};

export const hasLocalizedParameterTextFieldBuckets = (record: Record<string, unknown>): boolean => {
  const textFields = record['text_fields'];
  if (textFields === null || textFields === undefined || typeof textFields !== 'object' || Array.isArray(textFields)) return false;
  return Object.keys(textFields as Record<string, unknown>).some((key: string): boolean => {
    if (!key.includes('|')) return false;
    return isParameterCollectionBaseField(key);
  });
};

export const resolveBaseParameterSyncValues = async (input: {
  product: ProductWithImages;
  profile: ProductSyncProfile;
  baseRecord: Record<string, unknown> | null;
  connectionId: string;
  inventoryId: string;
  persistLinkMap: boolean;
}): Promise<ProductParameterValue[] | null> => {
  if (input.baseRecord === null) return null;
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
    const rawParameters = input.baseRecord['parameters'] ?? input.baseRecord['features'] ?? input.baseRecord['attributes'] ?? input.baseRecord['params'];
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
    toTrimmedString(input.profile.catalogId) !== '' ? toTrimmedString(input.profile.catalogId) : toTrimmedString(input.product.catalogId);
  const nextByParameterId = preserveExistingValues
    ? normalizeExistingParameterSyncValues(input.product.parameters)
    : new Map<string, ProductParameterValue>();

  if (catalogId === '') {
    extracted.forEach((entry: ExtractedBaseParameter) => {
      const value = toParameterSyncValueFromExtracted(entry);
      if (value !== null) nextByParameterId.set(value.parameterId, value);
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
      if (matched?.linkedTitleTermType != null) return;

      const value = toParameterSyncValueFromExtracted(entry, matched?.id ?? null);
      if (value === null) return;
      nextByParameterId.set(value.parameterId, value);

      const baseParameterId = toTrimmedString(entry.baseParameterId);
      if (
        input.persistLinkMap &&
        matched != null &&
        baseParameterId !== '' &&
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
    void ErrorSystem.captureException(error, {
      service: 'product-sync-processor',
      action: 'resolveBaseParameterSyncValues',
      catalogId,
      connectionId: input.connectionId,
      inventoryId: input.inventoryId,
      productId: input.product.id,
    });
    extracted.forEach((entry: ExtractedBaseParameter) => {
      const value = toParameterSyncValueFromExtracted(entry);
      if (value !== null) nextByParameterId.set(value.parameterId, value);
    });
    return Array.from(nextByParameterId.values());
  }
};
