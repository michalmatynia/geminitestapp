import type {
  TraderaParameterMapperRule,
  TraderaParameterMapperCatalogEntry,
  TraderaParameterMapperCategoryFetch,
} from '@/shared/contracts/integrations/tradera-parameter-mapper';

export type MapperTab = 'mappings' | 'catalogs';

export const buildCategoryOptionLabel = (category: {
  externalCategoryPath?: string | null;
  externalCategoryName?: string | null;
  path?: string | null;
  name?: string | null;
}): string =>
  (
    category.externalCategoryPath ??
    category.path ??
    category.externalCategoryName ??
    category.name ??
    ''
  ).trim();

export const normalizeMapperLookupKey = (value: string): string =>
  value
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '');

export const createRuleId = (): string => {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }

  return `tradera-param-rule-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
};

export const sortRules = (rules: TraderaParameterMapperRule[]): TraderaParameterMapperRule[] =>
  rules
    .slice()
    .sort(
      (left, right) =>
        new Date(right.updatedAt ?? 0).getTime() - new Date(left.updatedAt ?? 0).getTime()
    );

export const getRuleStatus = (
  rule: TraderaParameterMapperRule,
  parameterCatalogEntryById: Map<string, TraderaParameterMapperCatalogEntry>,
  parameterCatalogCategoryFetchesByCategoryId: Map<string, TraderaParameterMapperCategoryFetch>
): { label: string; tone: 'default' | 'warning' } => {
  const catalogEntryId = `${rule.externalCategoryId.trim()}:${rule.fieldKey.trim()}`;
  const catalogEntry = parameterCatalogEntryById.get(catalogEntryId) ?? null;
  const categoryFetch = parameterCatalogCategoryFetchesByCategoryId.get(rule.externalCategoryId) ?? null;

  if (!categoryFetch && !catalogEntry) {
    return {
      label: 'Category catalog not fetched',
      tone: 'warning',
    };
  }

  if (!catalogEntry) {
    return {
      label: 'Field missing from current catalog',
      tone: 'warning',
    };
  }

  const hasOption = catalogEntry.optionLabels.some(
    (optionLabel) =>
      normalizeMapperLookupKey(optionLabel) ===
      normalizeMapperLookupKey(rule.targetOptionLabel)
  );

  return {
    label: hasOption ? 'Current' : `Missing option: ${rule.targetOptionLabel}`,
    tone: hasOption ? 'default' : 'warning',
  };
};
