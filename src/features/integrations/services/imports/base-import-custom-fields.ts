import type { BaseProductRecord } from '@/features/integrations/services/imports/base-client';
import type {
  CustomFieldRepository,
} from '@/shared/contracts/products/drafts';
import type {
  ProductCustomFieldDefinition,
  ProductCustomFieldOption,
} from '@/shared/contracts/products/custom-fields';

const MARKET_EXCLUSION_FIELD_NAME = 'Market Exclusion';

const MARKET_EXCLUSION_OPTIONS = [
  {
    id: 'market-exclusion-tradera',
    label: 'Tradera',
    aliases: ['Tradera'],
  },
  {
    id: 'market-exclusion-willhaben',
    label: 'Willhaben',
    aliases: ['Willhaben'],
  },
  {
    id: 'market-exclusion-depop',
    label: 'Depop',
    aliases: ['Depop'],
  },
  {
    id: 'market-exclusion-grailed',
    label: 'Grailed',
    aliases: ['Grailed'],
  },
  {
    id: 'market-exclusion-shpock',
    label: 'Schpock',
    aliases: ['Schpock', 'Shpock'],
  },
  {
    id: 'market-exclusion-vinted',
    label: 'Vinted',
    aliases: ['Vinted'],
  },
] as const;

const normalizeKey = (value: string): string => value.trim().toLowerCase().replace(/[^a-z0-9]/g, '');

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
      return !current || current.id !== option.id || current.label !== option.label;
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
