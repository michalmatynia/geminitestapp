import {
  traderaParameterMapperCatalogPayloadSchema,
  traderaParameterMapperRulesPayloadSchema,
  type TraderaParameterMapperCatalogEntry,
  type TraderaParameterMapperRule,
  type TraderaResolvedParameterMapperSelection,
} from '@/shared/contracts/integrations/tradera-parameter-mapper';
import type { ResolvedTraderaCategoryMapping } from '@/features/integrations/services/tradera-listing/category-mapping';
import type { ProductParameter } from '@/shared/contracts/products/parameters';
import type { ProductParameterValue, ProductWithImages } from '@/shared/contracts/products/product';
import { logClientCatch } from '@/shared/utils/observability/client-error-logger';

const toTrimmedString = (value: unknown): string =>
  typeof value === 'string' ? value.trim() : '';

const normalizeLookupKey = (value: string): string =>
  value
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '');

const compareByUpdatedAtDesc = (
  left: { updatedAt?: string | null },
  right: { updatedAt?: string | null }
): number => new Date(right.updatedAt ?? 0).getTime() - new Date(left.updatedAt ?? 0).getTime();

const compareCatalogEntries = (
  left: TraderaParameterMapperCatalogEntry,
  right: TraderaParameterMapperCatalogEntry
): number => {
  const byPath = (left.externalCategoryPath ?? left.externalCategoryName).localeCompare(
    right.externalCategoryPath ?? right.externalCategoryName
  );
  if (byPath !== 0) return byPath;
  return left.fieldLabel.localeCompare(right.fieldLabel);
};

const parseJsonPayload = <T>(
  rawValue: string | null | undefined,
  parser: { safeParse: (value: unknown) => { success: true; data: T } | { success: false } },
  fallback: T
): T => {
  if (!rawValue?.trim()) return fallback;

  try {
    const parsed = parser.safeParse(JSON.parse(rawValue));
    return parsed.success ? parsed.data : fallback;
  } catch (error) {
    logClientCatch(error, {
      source: 'tradera-parameter-mapper',
      action: 'parseJsonPayload',
      level: 'warn',
    });
    return fallback;
  }
};

export const buildTraderaParameterMapperFieldKey = (fieldLabel: string): string => {
  const normalized = normalizeLookupKey(fieldLabel);
  return normalized || normalizeLookupKey(toTrimmedString(fieldLabel));
};

export const buildTraderaParameterMapperCatalogEntryId = (input: {
  externalCategoryId: string;
  fieldKey: string;
}): string => `${input.externalCategoryId.trim()}:${input.fieldKey.trim()}`;

export const parseTraderaParameterMapperRulesJson = (
  rawValue: string | null | undefined
): TraderaParameterMapperRule[] =>
  parseJsonPayload(rawValue, traderaParameterMapperRulesPayloadSchema, {
    version: 1 as const,
    rules: [],
  }).rules
    .slice()
    .sort(compareByUpdatedAtDesc);

export const serializeTraderaParameterMapperRules = (
  rules: TraderaParameterMapperRule[]
): string | null => {
  if (!Array.isArray(rules) || rules.length === 0) {
    return null;
  }

  return JSON.stringify({
    version: 1,
    rules: rules.slice().sort(compareByUpdatedAtDesc),
  });
};

export const parseTraderaParameterMapperCatalogJson = (
  rawValue: string | null | undefined
): TraderaParameterMapperCatalogEntry[] =>
  parseJsonPayload(rawValue, traderaParameterMapperCatalogPayloadSchema, {
    version: 1 as const,
    entries: [],
  }).entries
    .slice()
    .sort(compareCatalogEntries);

export const serializeTraderaParameterMapperCatalog = (
  entries: TraderaParameterMapperCatalogEntry[]
): string | null => {
  if (!Array.isArray(entries) || entries.length === 0) {
    return null;
  }

  return JSON.stringify({
    version: 1,
    entries: entries.slice().sort(compareCatalogEntries),
  });
};

export const replaceTraderaParameterMapperCatalogEntriesForCategory = ({
  existingEntries,
  externalCategoryId,
  nextEntries,
}: {
  existingEntries: TraderaParameterMapperCatalogEntry[];
  externalCategoryId: string;
  nextEntries: TraderaParameterMapperCatalogEntry[];
}): TraderaParameterMapperCatalogEntry[] => {
  const normalizedCategoryId = externalCategoryId.trim();
  const retainedEntries = existingEntries.filter(
    (entry) => entry.externalCategoryId.trim() !== normalizedCategoryId
  );

  return [...retainedEntries, ...nextEntries].sort(compareCatalogEntries);
};

const toPreferredParameterValue = (value: ProductParameterValue): string => {
  const directValue = toTrimmedString(value.value);
  if (directValue) return directValue;

  const valuesByLanguage = value.valuesByLanguage ?? {};
  return (
    toTrimmedString(valuesByLanguage['pl']) ||
    toTrimmedString(valuesByLanguage['en']) ||
    toTrimmedString(valuesByLanguage['de']) ||
    Object.values(valuesByLanguage)
      .map((entry) => toTrimmedString(entry))
      .find(Boolean) ||
    ''
  );
};

const resolveProductCatalogIds = (product: ProductWithImages): Set<string> => {
  const catalogIds = new Set<string>();
  const directCatalogId = toTrimmedString(product.catalogId);
  if (directCatalogId) {
    catalogIds.add(directCatalogId);
  }

  for (const catalog of product.catalogs ?? []) {
    const catalogId = toTrimmedString(catalog.catalogId);
    if (catalogId) {
      catalogIds.add(catalogId);
    }
  }

  return catalogIds;
};

const hasCatalogEntryOption = ({
  catalogEntry,
  optionLabel,
}: {
  catalogEntry: TraderaParameterMapperCatalogEntry | null;
  optionLabel: string;
}): boolean => {
  if (!catalogEntry) return false;
  const normalizedTarget = normalizeLookupKey(optionLabel);
  return catalogEntry.optionLabels.some(
    (candidate) => normalizeLookupKey(candidate) === normalizedTarget
  );
};

export const resolveTraderaParameterMapperSelections = ({
  product,
  mappedCategory,
  rules,
  catalogEntries,
  parameters,
}: {
  product: ProductWithImages;
  mappedCategory: ResolvedTraderaCategoryMapping | null;
  rules: TraderaParameterMapperRule[];
  catalogEntries: TraderaParameterMapperCatalogEntry[];
  parameters: ProductParameter[];
}): TraderaResolvedParameterMapperSelection[] => {
  if (!mappedCategory) {
    return [];
  }

  const productCatalogIds = resolveProductCatalogIds(product);
  const parameterDefinitionsById = new Map(
    parameters.map((parameter) => [parameter.id.trim(), parameter] as const)
  );
  const productParameterValuesById = new Map(
    (product.parameters ?? []).map((parameterValue) => [parameterValue.parameterId.trim(), parameterValue] as const)
  );
  const catalogEntryById = new Map(
    catalogEntries.map((entry) => [entry.id.trim(), entry] as const)
  );

  const relevantRules = rules
    .filter((rule) => {
      if (!rule.isActive) return false;
      if (rule.externalCategoryId.trim() !== mappedCategory.externalCategoryId.trim()) {
        return false;
      }
      return productCatalogIds.has(rule.parameterCatalogId.trim());
    })
    .sort(compareByUpdatedAtDesc);

  const seenFieldKeys = new Set<string>();
  const selections: TraderaResolvedParameterMapperSelection[] = [];

  for (const rule of relevantRules) {
    const parameterId = rule.parameterId.trim();
    const productParameterValue = productParameterValuesById.get(parameterId);
    if (!productParameterValue) {
      continue;
    }

    const resolvedSourceValue = toPreferredParameterValue(productParameterValue);
    if (!resolvedSourceValue) {
      continue;
    }

    if (normalizeLookupKey(resolvedSourceValue) !== normalizeLookupKey(rule.sourceValue)) {
      continue;
    }

    const fieldKey = rule.fieldKey.trim();
    if (!fieldKey || seenFieldKeys.has(fieldKey)) {
      continue;
    }

    const catalogEntry =
      catalogEntryById.get(
        buildTraderaParameterMapperCatalogEntryId({
          externalCategoryId: rule.externalCategoryId,
          fieldKey,
        })
      ) ?? null;
    if (!hasCatalogEntryOption({ catalogEntry, optionLabel: rule.targetOptionLabel })) {
      continue;
    }

    const parameterDefinition = parameterDefinitionsById.get(parameterId);

    selections.push({
      fieldLabel: rule.fieldLabel,
      fieldKey,
      optionLabel: rule.targetOptionLabel,
      parameterId,
      parameterName:
        toTrimmedString(parameterDefinition?.name_en) ||
        toTrimmedString(parameterDefinition?.name) ||
        rule.parameterName,
      sourceValue: resolvedSourceValue,
    });
    seenFieldKeys.add(fieldKey);
  }

  return selections;
};
