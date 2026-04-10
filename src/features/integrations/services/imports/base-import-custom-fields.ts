import type { BaseProductRecord } from '@/features/integrations/services/imports/base-client';
import type {
  CustomFieldRepository,
} from '@/shared/contracts/products/drafts';
import type {
  ProductCustomFieldDefinition,
  ProductCustomFieldOption,
} from '@/shared/contracts/products/custom-fields';
import type { ProductParameter } from '@/shared/contracts/products/parameters';

import {
  BASE_MARKETPLACE_CHECKBOX_OPTIONS,
  normalizeBaseMarketplaceCheckboxKey,
} from '@/shared/lib/integrations/base-marketplace-checkboxes';

const MARKET_EXCLUSION_FIELD_NAME = 'Market Exclusion';
const TEXT_CUSTOM_FIELD_ID_PREFIX = 'base-text-custom-field';

const RESERVED_TEXT_FIELD_BASE_KEYS = new Set([
  'name',
  'title',
  'description',
  'features',
  'parameters',
  'params',
  'attributes',
].map(normalizeKey));

const RESERVED_TEXT_FIELD_EXACT_KEYS = new Set([
  'name',
  'name_en',
  'name_pl',
  'name_de',
  'title',
  'title_en',
  'title_pl',
  'title_de',
  'description',
  'description_en',
  'description_pl',
  'description_de',
  'description_long',
  'description_en_long',
  'description_pl_long',
  'description_de_long',
].map(normalizeKey));

const MARKET_EXCLUSION_OPTIONS = BASE_MARKETPLACE_CHECKBOX_OPTIONS;

function normalizeKey(value: string): string {
  return normalizeBaseMarketplaceCheckboxKey(value);
}

const stripLanguageScope = (value: string): string => {
  const trimmed = value.trim();
  const [baseName] = trimmed.split('|');
  return baseName?.trim() ?? trimmed;
};

const formatDetectedFieldName = (value: string): string => {
  const normalizedSeparators = stripLanguageScope(value).replace(/[_-]+/g, ' ').replace(/\s+/g, ' ').trim();
  if (!normalizedSeparators) return '';
  if (!/[A-Z]/.test(normalizedSeparators) && /^[a-z0-9 ]+$/.test(normalizedSeparators)) {
    return normalizedSeparators
      .split(' ')
      .filter((part: string): boolean => part.length > 0)
      .map((part: string) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(' ');
  }
  return normalizedSeparators;
};

const MARKET_EXCLUSION_NORMALIZED_KEYS = new Set([
  normalizeKey(MARKET_EXCLUSION_FIELD_NAME),
  ...MARKET_EXCLUSION_OPTIONS.flatMap((option) =>
    option.aliases.flatMap((alias) => [
      normalizeKey(alias),             // e.g. "tradera"
      normalizeKey(`${alias} Yes`),    // e.g. "traderayes" — FileMaker checkbox convention
    ])
  ),
]);

const collectSourceKeys = (
  value: unknown,
  keys: Set<string>,
  depth: number = 0,
  prefix?: string
): void => {
  if (value === null || value === undefined || depth > 4) return;

  if (Array.isArray(value)) {
    value.forEach((entry: unknown) => collectSourceKeys(entry, keys, depth + 1, prefix));
    return;
  }

  if (typeof value !== 'object') return;

  const record = value as Record<string, unknown>;

  Object.entries(record).forEach(([key, entry]: [string, unknown]) => {
    if (key.trim()) {
      keys.add(key.trim());
      if (prefix) {
        keys.add(`${prefix}.${key.trim()}`);
      }
    }

    if (
      ['name', 'parameter', 'code', 'label', 'title'].includes(key) &&
      typeof entry === 'string' &&
      entry.trim()
    ) {
      keys.add(entry.trim());
    }

    collectSourceKeys(entry, keys, depth + 1, prefix ? `${prefix}.${key.trim()}` : key.trim());
  });
};

const hasMarketExclusionSignals = (records: BaseProductRecord[]): boolean => {
  const detectedKeys = new Set<string>();
  records.forEach((record: BaseProductRecord) => {
    collectSourceKeys(record, detectedKeys);
  });

  const normalizedDetectedKeys = Array.from(detectedKeys).map(normalizeKey);
  return MARKET_EXCLUSION_OPTIONS.some((option) =>
    option.aliases.some((alias) => {
      const normalizedAlias = normalizeKey(alias);
      return normalizedDetectedKeys.some(
        (candidate) => candidate === normalizedAlias || candidate.endsWith(normalizedAlias)
      );
    })
  );
};

const findByNormalizedName = (
  customFieldDefinitions: ProductCustomFieldDefinition[],
  name: string
): ProductCustomFieldDefinition | null => {
  const normalizedName = normalizeKey(name);
  return (
    customFieldDefinitions.find(
      (definition: ProductCustomFieldDefinition) => normalizeKey(definition.name) === normalizedName
    ) ?? null
  );
};

const buildMergedOptions = (
  existingOptions: ProductCustomFieldOption[]
): ProductCustomFieldOption[] => {
  const nextOptions = [...existingOptions];

  MARKET_EXCLUSION_OPTIONS.forEach((marketOption) => {
    const hasExistingOption = existingOptions.some((existingOption: ProductCustomFieldOption) => {
      const normalizedExistingLabel = normalizeKey(existingOption.label);
      return marketOption.aliases.some(
        (alias) => normalizeKey(alias) === normalizedExistingLabel
      );
    });

    if (!hasExistingOption) {
      nextOptions.push({
        id: marketOption.id,
        label: marketOption.label,
      });
    }
  });

  return nextOptions;
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const shouldSkipDetectedTextFieldKey = (key: string): boolean => {
  const trimmedKey = key.trim();
  if (!trimmedKey) return true;

  const normalizedExactKey = normalizeKey(trimmedKey);
  if (RESERVED_TEXT_FIELD_EXACT_KEYS.has(normalizedExactKey)) {
    return true;
  }

  const normalizedBaseKey = normalizeKey(stripLanguageScope(trimmedKey));
  return (
    !normalizedBaseKey ||
    RESERVED_TEXT_FIELD_BASE_KEYS.has(normalizedBaseKey) ||
    MARKET_EXCLUSION_NORMALIZED_KEYS.has(normalizedBaseKey)
  );
};

const isSupportedGenericTextFieldValue = (value: unknown): boolean =>
  value !== null && value !== undefined && !isRecord(value);

const collectBaseTextCustomFieldNames = (records: BaseProductRecord[]): string[] => {
  const namesByNormalizedKey = new Map<string, string>();

  records.forEach((record: BaseProductRecord) => {
    const textFields = record['text_fields'];
    if (!isRecord(textFields)) return;

    Object.entries(textFields).forEach(([key, value]: [string, unknown]) => {
      if (shouldSkipDetectedTextFieldKey(key) || !isSupportedGenericTextFieldValue(value)) {
        return;
      }

      const displayName = formatDetectedFieldName(key);
      const normalizedDisplayName = normalizeKey(displayName);
      if (!normalizedDisplayName || namesByNormalizedKey.has(normalizedDisplayName)) {
        return;
      }

      namesByNormalizedKey.set(normalizedDisplayName, displayName);
    });
  });

  return Array.from(namesByNormalizedKey.values()).sort((left: string, right: string) =>
    left.localeCompare(right)
  );
};

const collectFeatureBucketObjects = (record: BaseProductRecord): Record<string, unknown>[] => {
  const buckets: Record<string, unknown>[] = [];
  const topLevelFeatures = record['features'];
  if (isRecord(topLevelFeatures)) {
    buckets.push(topLevelFeatures);
  }

  const textFields = record['text_fields'];
  if (!isRecord(textFields)) {
    return buckets;
  }

  const directFeatures = textFields['features'];
  if (isRecord(directFeatures)) {
    buckets.push(directFeatures);
  }

  Object.entries(textFields).forEach(([key, value]: [string, unknown]) => {
    const trimmedKey = key.trim();
    if (!trimmedKey) return;
    const [baseName] = trimmedKey.split('|');
    if (normalizeKey(baseName ?? '') !== 'features') return;
    if (!isRecord(value)) return;
    buckets.push(value);
  });

  return buckets;
};

const buildReservedFeatureFieldNames = (parameters: ProductParameter[] | undefined): Set<string> => {
  const reserved = new Set<string>();
  (parameters ?? []).forEach((parameter: ProductParameter) => {
    [parameter.name_en, parameter.name_pl, parameter.name_de].forEach((name) => {
      const normalizedName = normalizeKey(name ?? '');
      if (normalizedName) {
        reserved.add(normalizedName);
      }
    });
  });
  return reserved;
};

const collectBaseFeatureCustomFieldNames = (input: {
  records: BaseProductRecord[];
  existingParameters?: ProductParameter[];
}): string[] => {
  const namesByNormalizedKey = new Map<string, string>();
  const reservedFeatureNames = buildReservedFeatureFieldNames(input.existingParameters);

  input.records.forEach((record: BaseProductRecord) => {
    collectFeatureBucketObjects(record).forEach((bucket) => {
      Object.entries(bucket).forEach(([key, value]: [string, unknown]) => {
        if (!key.trim() || !isSupportedGenericTextFieldValue(value)) {
          return;
        }

        const displayName = formatDetectedFieldName(key);
        const normalizedDisplayName = normalizeKey(displayName);
        if (
          !normalizedDisplayName ||
          MARKET_EXCLUSION_NORMALIZED_KEYS.has(normalizedDisplayName) ||
          reservedFeatureNames.has(normalizedDisplayName) ||
          namesByNormalizedKey.has(normalizedDisplayName)
        ) {
          return;
        }

        namesByNormalizedKey.set(normalizedDisplayName, displayName);
      });
    });
  });

  return Array.from(namesByNormalizedKey.values()).sort((left: string, right: string) =>
    left.localeCompare(right)
  );
};

export const ensureBaseTextCustomFields = async (input: {
  repository: CustomFieldRepository;
  existingDefinitions: ProductCustomFieldDefinition[];
  records: BaseProductRecord[];
  existingParameters?: ProductParameter[];
  includeFeatureBuckets?: boolean;
  persist?: boolean;
}): Promise<ProductCustomFieldDefinition[]> => {
  const shouldPersist = input.persist ?? true;
  const detectedFieldNames = [
    ...collectBaseTextCustomFieldNames(input.records),
    ...(input.includeFeatureBuckets
      ? collectBaseFeatureCustomFieldNames({
        records: input.records,
        existingParameters: input.existingParameters,
      })
      : []),
  ].sort((left: string, right: string) => left.localeCompare(right));

  let nextDefinitions = [...input.existingDefinitions];

  for (const fieldName of detectedFieldNames) {
    if (findByNormalizedName(nextDefinitions, fieldName)) {
      continue;
    }

    if (!shouldPersist) {
      const now = new Date().toISOString();
      nextDefinitions = [
        ...nextDefinitions,
        {
          id: `${TEXT_CUSTOM_FIELD_ID_PREFIX}-${normalizeKey(fieldName)}`,
          name: fieldName,
          type: 'text',
          options: [],
          createdAt: now,
          updatedAt: now,
        },
      ];
      continue;
    }

    const created = await input.repository.createCustomField({
      name: fieldName,
      type: 'text',
      options: [],
    });
    nextDefinitions = [...nextDefinitions, created];
  }

  return nextDefinitions;
};

export const ensureBaseMarketplaceExclusionCustomField = async (input: {
  repository: CustomFieldRepository;
  existingDefinitions: ProductCustomFieldDefinition[];
  records: BaseProductRecord[];
  persist?: boolean;
}): Promise<ProductCustomFieldDefinition[]> => {
  const shouldPersist = input.persist ?? true;
  if (!hasMarketExclusionSignals(input.records)) {
    return input.existingDefinitions;
  }

  const existing = findByNormalizedName(input.existingDefinitions, MARKET_EXCLUSION_FIELD_NAME);

  if (!existing) {
    const now = new Date().toISOString();
    const createdDefinition: ProductCustomFieldDefinition = {
      id: 'base-market-exclusion',
      name: MARKET_EXCLUSION_FIELD_NAME,
      type: 'checkbox_set',
      options: MARKET_EXCLUSION_OPTIONS.map((option) => ({
        id: option.id,
        label: option.label,
      })),
      createdAt: now,
      updatedAt: now,
    };
    if (!shouldPersist) {
      return [...input.existingDefinitions, createdDefinition];
    }

    const created = await input.repository.createCustomField({
      name: MARKET_EXCLUSION_FIELD_NAME,
      type: 'checkbox_set',
      options: MARKET_EXCLUSION_OPTIONS.map((option) => ({
        id: option.id,
        label: option.label,
      })),
    });
    return [...input.existingDefinitions, created];
  }

  if (existing.type !== 'checkbox_set') {
    return input.existingDefinitions;
  }

  const nextOptions = buildMergedOptions(existing.options);
  const optionsChanged =
    nextOptions.length !== existing.options.length ||
    nextOptions.some((option, index) => {
      const current = existing.options[index];
      return current?.id !== option.id || current?.label !== option.label;
    });

  if (!optionsChanged) {
    return input.existingDefinitions;
  }

  if (!shouldPersist) {
    return input.existingDefinitions.map((definition: ProductCustomFieldDefinition) =>
      definition.id === existing.id
        ? {
          ...definition,
          options: nextOptions,
          updatedAt: new Date().toISOString(),
        }
        : definition
    );
  }

  const updated = await input.repository.updateCustomField(existing.id, {
    options: nextOptions,
  });

  return input.existingDefinitions.map((definition: ProductCustomFieldDefinition) =>
    definition.id === updated.id ? updated : definition
  );
};
