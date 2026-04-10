import type { BaseProductRecord } from '@/features/integrations/services/imports/base-client';

export const BASE_MARKETPLACE_CHECKBOX_OPTIONS = [
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

export const normalizeBaseMarketplaceCheckboxKey = (value: string): string =>
  value.trim().toLowerCase().replace(/[^a-z0-9]/g, '');

const extractExplicitCheckboxState = (value: unknown): unknown => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return value;
  }

  const record = value as Record<string, unknown>;
  return (
    record['selected'] ??
    record['checked'] ??
    record['active'] ??
    record['enabled'] ??
    record['is_selected'] ??
    record['isSelected'] ??
    record['value'] ??
    value
  );
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

const buildMarketplaceOptionSearchKeys = (labelOrAlias: string): Set<string> => {
  const definition = getMarketplaceOptionDefinition(labelOrAlias);
  if (!definition) return new Set<string>();

  return new Set(
    definition.aliases.flatMap((alias) => [
      normalizeBaseMarketplaceCheckboxKey(alias),
      normalizeBaseMarketplaceCheckboxKey(`${alias} Yes`),
    ])
  );
};

const resolveMarketplaceCheckboxValueFromUnknown = (
  value: unknown,
  normalizedKeys: Set<string>,
  depth: number = 0
): unknown => {
  if (depth > 6 || value === null || value === undefined) {
    return null;
  }

  if (Array.isArray(value)) {
    for (const entry of value) {
      const optionKey = toOptionKey(
        typeof entry === 'object' && entry !== null && !Array.isArray(entry)
          ? (entry as Record<string, unknown>)['name'] ??
              (entry as Record<string, unknown>)['parameter'] ??
              (entry as Record<string, unknown>)['code'] ??
              (entry as Record<string, unknown>)['label'] ??
              (entry as Record<string, unknown>)['title'] ??
              (entry as Record<string, unknown>)['value'] ??
              (entry as Record<string, unknown>)['text']
          : entry
      );
      if (optionKey && normalizedKeys.has(optionKey)) {
        return extractExplicitCheckboxState(entry);
      }
    }

    for (const entry of value) {
      const nested = resolveMarketplaceCheckboxValueFromUnknown(entry, normalizedKeys, depth + 1);
      if (nested !== null && nested !== undefined) {
        return nested;
      }
    }
    return null;
  }

  if (typeof value !== 'object') {
    return null;
  }

  const record = value as Record<string, unknown>;

  for (const [key, entry] of Object.entries(record)) {
    const normalizedKey = normalizeBaseMarketplaceCheckboxKey(key);
    if (normalizedKeys.has(normalizedKey)) {
      return extractExplicitCheckboxState(entry);
    }
  }

  const selfOptionKey = toOptionKey(
    record['name'] ??
      record['parameter'] ??
      record['code'] ??
      record['label'] ??
      record['title'] ??
      record['value'] ??
      record['text']
  );
  if (selfOptionKey && normalizedKeys.has(selfOptionKey)) {
    return extractExplicitCheckboxState(record);
  }

  for (const entry of Object.values(record)) {
    const nested = resolveMarketplaceCheckboxValueFromUnknown(entry, normalizedKeys, depth + 1);
    if (nested !== null && nested !== undefined) {
      return nested;
    }
  }

  return null;
};

export const resolveBaseMarketplaceCheckboxValue = (
  record: BaseProductRecord | Record<string, unknown>,
  labelOrAlias: string
): unknown => {
  const normalizedKeys = buildMarketplaceOptionSearchKeys(labelOrAlias);
  if (normalizedKeys.size === 0) {
    return null;
  }
  return resolveMarketplaceCheckboxValueFromUnknown(record, normalizedKeys);
};

export const getNormalizedBaseMarketplaceCheckboxLabels = (
  record: BaseProductRecord | Record<string, unknown>
): string[] =>
  BASE_MARKETPLACE_CHECKBOX_OPTIONS.flatMap((option) =>
    resolveBaseMarketplaceCheckboxValue(record, option.label) !== null &&
    resolveBaseMarketplaceCheckboxValue(record, option.label) !== undefined
      ? [option.label]
      : []
  );
