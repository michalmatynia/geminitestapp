import type { BaseProductRecord } from '@/features/integrations/services/imports/base-client';
import type { ProductCustomFieldDefinition } from '@/shared/contracts/products/custom-fields';

export const BASE_MARKETPLACE_CHECKBOX_OPTIONS = [
  {
    id: 'market-exclusion-allegro',
    label: 'Allegro',
    aliases: ['Allegro'],
  },
  {
    id: 'market-exclusion-amazon-co-uk',
    label: 'Amazon.co.uk',
    aliases: ['Amazon.co.uk'],
  },
  {
    id: 'market-exclusion-amazon-pl',
    label: 'Amazon.pl',
    aliases: ['Amazon.pl'],
  },
  {
    id: 'market-exclusion-etsy-sparksofsindri',
    label: 'Etsy - SparksOfSindri',
    aliases: ['Etsy - SparksOfSindri'],
  },
  {
    id: 'market-exclusion-etsy-keyrealmz',
    label: 'Etsy - KeyRealmz',
    aliases: ['Etsy - KeyRealmz'],
  },
  {
    id: 'market-exclusion-etsy-good-old-times',
    label: 'Etsy - Good Old Times',
    aliases: ['Etsy - Good Old Times'],
  },
  {
    id: 'market-exclusion-ebay-pl',
    label: 'eBay.pl',
    aliases: ['eBay.pl'],
  },
  {
    id: 'market-exclusion-olx',
    label: 'Olx',
    aliases: ['Olx'],
  },
  {
    id: 'market-exclusion-taniey',
    label: 'Taniey',
    aliases: ['Taniey'],
  },
  {
    id: 'market-exclusion-empik',
    label: 'Empik',
    aliases: ['Empik'],
  },
  {
    id: 'market-exclusion-arena-pl',
    label: 'Arena.pl',
    aliases: ['Arena.pl'],
  },
  {
    id: 'market-exclusion-erli-pl',
    label: 'Erli.pl',
    aliases: ['Erli.pl'],
  },
  {
    id: 'market-exclusion-velomarket',
    label: 'Velomarket',
    aliases: ['Velomarket'],
  },
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

export const MARKET_EXCLUSION_FIELD_NAME = 'Market Exclusion';

export const normalizeBaseMarketplaceCheckboxKey = (value: string): string =>
  value.trim().toLowerCase().replace(/[^a-z0-9]/g, '');

type BaseMarketplaceCheckboxOptionDefinition = {
  id: string;
  label: string;
  aliases: readonly string[];
};

const toOptionKey = (value: unknown): string | null => {
  if (typeof value === 'string') {
    const trimmed = value.trim();
    return trimmed ? normalizeBaseMarketplaceCheckboxKey(trimmed) : null;
  }
  if (typeof value === 'number' && Number.isFinite(value)) {
    return normalizeBaseMarketplaceCheckboxKey(String(value));
  }
  return null;
};

const BOOLEAN_LIKE_STRINGS = new Set([
  '0',
  '1',
  'false',
  'true',
  'no',
  'yes',
  'off',
  'on',
  'unchecked',
  'checked',
  'null',
  'none',
]);

const toCheckboxBoolean = (value: unknown): boolean => {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number') return Number.isFinite(value) && value !== 0;
  if (Array.isArray(value)) return value.some((entry: unknown) => toCheckboxBoolean(entry));
  if (typeof value !== 'string') return false;

  const normalized = value.trim().toLowerCase();
  if (!normalized) return false;
  if (['0', 'false', 'no', 'off', 'unchecked', 'null', 'none'].includes(normalized)) {
    return false;
  }
  return true;
};

const getMarketplaceOptionDefinition = (
  value: string
): (typeof BASE_MARKETPLACE_CHECKBOX_OPTIONS)[number] | null => {
  const normalizedValue = normalizeBaseMarketplaceCheckboxKey(value);
  if (!normalizedValue) return null;

  return (
    BASE_MARKETPLACE_CHECKBOX_OPTIONS.find((option) =>
      option.aliases.some((alias) => {
        const normalizedAlias = normalizeBaseMarketplaceCheckboxKey(alias);
        return (
          normalizedAlias === normalizedValue ||
          normalizeBaseMarketplaceCheckboxKey(`${alias} Yes`) === normalizedValue
        );
      })
    ) ?? null
  );
};

const buildMarketplaceOptionAliases = (
  option: Pick<BaseMarketplaceCheckboxOptionDefinition, 'label' | 'aliases'>
): string[] =>
  Array.from(new Set([option.label, ...option.aliases].filter((alias) => alias.trim().length > 0)));

const buildMarketplaceOptionSearchKeys = (labelOrAlias: string): Set<string> => {
  const trimmed = labelOrAlias.trim();
  if (!trimmed) return new Set<string>();
  const definition = getMarketplaceOptionDefinition(trimmed);
  const aliases = definition ? buildMarketplaceOptionAliases(definition) : [trimmed];

  return new Set(
    aliases.flatMap((alias) => [
      normalizeBaseMarketplaceCheckboxKey(alias),
      normalizeBaseMarketplaceCheckboxKey(`${alias} Yes`),
    ])
  );
};

const buildMarketplaceOptionDefinitionsFromCustomField = (
  customFieldDefinitions: ProductCustomFieldDefinition[] | undefined
): BaseMarketplaceCheckboxOptionDefinition[] | null => {
  const definition =
    customFieldDefinitions?.find(
      (customField) =>
        customField.type === 'checkbox_set' &&
        normalizeBaseMarketplaceCheckboxKey(customField.name) ===
          normalizeBaseMarketplaceCheckboxKey(MARKET_EXCLUSION_FIELD_NAME)
    ) ?? null;
  if (!definition) {
    return null;
  }

  return definition.options.map((option) => {
    const defaultDefinition = getMarketplaceOptionDefinition(option.label);
    return {
      id: option.id,
      label: option.label,
      aliases: defaultDefinition?.aliases ?? [option.label],
    };
  });
};

export const getBaseMarketExclusionOptionDefinitions = (
  customFieldDefinitions?: ProductCustomFieldDefinition[]
): BaseMarketplaceCheckboxOptionDefinition[] =>
  buildMarketplaceOptionDefinitionsFromCustomField(customFieldDefinitions) ??
  BASE_MARKETPLACE_CHECKBOX_OPTIONS.map((option) => ({
    id: option.id,
    label: option.label,
    aliases: option.aliases,
  }));

export const getBaseMarketExclusionNormalizedKeys = (
  customFieldDefinitions?: ProductCustomFieldDefinition[]
): Set<string> =>
  new Set([
    normalizeBaseMarketplaceCheckboxKey(MARKET_EXCLUSION_FIELD_NAME),
    ...getBaseMarketExclusionOptionDefinitions(customFieldDefinitions).flatMap((option) =>
      buildMarketplaceOptionAliases(option).flatMap((alias) => [
        normalizeBaseMarketplaceCheckboxKey(alias),
        normalizeBaseMarketplaceCheckboxKey(`${alias} Yes`),
      ])
    ),
  ]);

const splitScalarCheckboxTokens = (value: string): string[] =>
  value
    .split(/[\n\r,;|]+/)
    .map((entry: string) => entry.trim())
    .filter((entry: string): boolean => entry.length > 0);

const readExplicitCheckboxState = (value: unknown): unknown => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return value;
  }

  const record = value as Record<string, unknown>;
  const explicitState =
    record['selected'] ??
    record['checked'] ??
    record['active'] ??
    record['enabled'] ??
    record['is_selected'] ??
    record['isSelected'];
  if (explicitState !== undefined) {
    return explicitState;
  }

  const rawValue = record['value'];
  if (typeof rawValue === 'boolean' || typeof rawValue === 'number') {
    return rawValue;
  }
  if (typeof rawValue === 'string') {
    const normalizedValue = rawValue.trim().toLowerCase();
    if (BOOLEAN_LIKE_STRINGS.has(normalizedValue)) {
      return rawValue;
    }
  }

  return undefined;
};

const mergeOptionState = (
  states: Map<string, boolean>,
  optionId: string | null,
  selected: boolean
): void => {
  if (!optionId) return;
  states.set(optionId, selected);
};

const resolveOptionIdByValue = (
  value: unknown,
  optionDefinitions: BaseMarketplaceCheckboxOptionDefinition[]
): string | null => {
  const scalar = toOptionKey(value);
  if (!scalar) return null;

  const tokens =
    typeof value === 'string'
      ? splitScalarCheckboxTokens(value).map((entry: string) =>
          normalizeBaseMarketplaceCheckboxKey(entry)
        )
      : [scalar];

  for (const option of optionDefinitions) {
    const searchKeys = new Set(buildMarketplaceOptionSearchKeys(option.label));
    const hasMatch = tokens.some((token) => searchKeys.has(token));
    if (hasMatch) {
      return option.id;
    }
  }

  return null;
};

const resolveMarketplaceCheckboxValueFromUnknown = (
  value: unknown,
  optionDefinitions: BaseMarketplaceCheckboxOptionDefinition[],
  depth: number = 0
): Map<string, boolean> => {
  const states = new Map<string, boolean>();
  if (depth > 6 || value === null || value === undefined) {
    return states;
  }

  if (Array.isArray(value)) {
    for (const entry of value) {
      const optionId = resolveOptionIdByValue(
        typeof entry === 'object' && entry !== null && !Array.isArray(entry)
          ? (entry as Record<string, unknown>)['name'] ??
              (entry as Record<string, unknown>)['parameter'] ??
              (entry as Record<string, unknown>)['code'] ??
              (entry as Record<string, unknown>)['label'] ??
              (entry as Record<string, unknown>)['title'] ??
              (entry as Record<string, unknown>)['value'] ??
              (entry as Record<string, unknown>)['text']
          : entry
        ,
        optionDefinitions
      );
      if (optionId) {
        mergeOptionState(
          states,
          optionId,
          typeof entry === 'object' && entry !== null && !Array.isArray(entry)
            ? readExplicitCheckboxState(entry) !== undefined
              ? toCheckboxBoolean(readExplicitCheckboxState(entry))
              : true
            : true
        );
      }
    }

    for (const entry of value) {
      resolveMarketplaceCheckboxValueFromUnknown(entry, optionDefinitions, depth + 1).forEach(
        (selected: boolean, optionId: string) => mergeOptionState(states, optionId, selected)
      );
    }
    return states;
  }

  if (typeof value !== 'object') {
    mergeOptionState(states, resolveOptionIdByValue(value, optionDefinitions), true);
    return states;
  }

  const record = value as Record<string, unknown>;

  for (const [key, entry] of Object.entries(record)) {
    const optionId = resolveOptionIdByValue(key, optionDefinitions);
    if (optionId) {
      const explicitState = readExplicitCheckboxState(entry);
      mergeOptionState(
        states,
        optionId,
        explicitState !== undefined ? toCheckboxBoolean(explicitState) : true
      );
      continue;
    }
    resolveMarketplaceCheckboxValueFromUnknown(entry, optionDefinitions, depth + 1).forEach(
      (selected: boolean, nestedOptionId: string) =>
        mergeOptionState(states, nestedOptionId, selected)
    );
  }

  const selfOptionId = resolveOptionIdByValue(
    record['name'] ??
      record['parameter'] ??
      record['code'] ??
      record['label'] ??
      record['title'] ??
      record['value'] ??
      record['text'],
    optionDefinitions
  );
  if (selfOptionId) {
    const explicitState = readExplicitCheckboxState(record);
    mergeOptionState(
      states,
      selfOptionId,
      explicitState !== undefined ? toCheckboxBoolean(explicitState) : true
    );
  }

  return states;
};

export const resolveBaseMarketplaceCheckboxValue = (
  record: BaseProductRecord | Record<string, unknown> | unknown,
  labelOrAlias: string
): unknown => {
  const definition = getMarketplaceOptionDefinition(labelOrAlias.trim());
  if (!definition) {
    return null;
  }
  const optionDefinitions: BaseMarketplaceCheckboxOptionDefinition[] = [{
    id: definition.id,
    label: definition.label,
    aliases: definition.aliases,
  }];
  const states = resolveMarketplaceCheckboxValueFromUnknown(record, optionDefinitions);
  return states.size > 0 ? Array.from(states.values())[0] ?? null : null;
};

export const getNormalizedBaseMarketplaceCheckboxLabels = (
  record: BaseProductRecord | Record<string, unknown> | unknown
): string[] =>
  BASE_MARKETPLACE_CHECKBOX_OPTIONS.flatMap((option) =>
    resolveBaseMarketplaceCheckboxValue(record, option.label) !== null &&
    resolveBaseMarketplaceCheckboxValue(record, option.label) !== undefined
      ? [option.label]
      : []
  );

export const hasBaseMarketExclusionValue = (
  value: unknown,
  customFieldDefinitions?: ProductCustomFieldDefinition[]
): boolean =>
  getBaseMarketExclusionOptionDefinitions(customFieldDefinitions).some((option) => {
    const states = resolveMarketplaceCheckboxValueFromUnknown(value, [option]);
    return states.size > 0;
  });

export const resolveBaseMarketExclusionOptionStates = (
  value: unknown,
  customFieldDefinitions?: ProductCustomFieldDefinition[]
): Map<string, boolean> =>
  resolveMarketplaceCheckboxValueFromUnknown(
    value,
    getBaseMarketExclusionOptionDefinitions(customFieldDefinitions)
  );
