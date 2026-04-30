import type { Catalog } from '@/shared/contracts/products/catalogs';
import type { PriceGroupWithDetails } from '@/shared/contracts/products/product';

export type LanguageOption = {
  value: 'name_en' | 'name_pl' | 'name_de';
  label: string;
};

const EN_LANGUAGE_OPTION: LanguageOption = { value: 'name_en', label: 'English' };
const PL_LANGUAGE_OPTION: LanguageOption = { value: 'name_pl', label: 'Polish' };
const DE_LANGUAGE_OPTION: LanguageOption = { value: 'name_de', label: 'German' };

const supportedLanguageMap: Partial<Record<string, LanguageOption>> = {
  EN: EN_LANGUAGE_OPTION,
  PL: PL_LANGUAGE_OPTION,
  DE: DE_LANGUAGE_OPTION,
};

const DEFAULT_LANGUAGE_OPTIONS: LanguageOption[] = [
  EN_LANGUAGE_OPTION,
  PL_LANGUAGE_OPTION,
  DE_LANGUAGE_OPTION,
];

type RuntimeCatalog = Catalog & {
  priceGroupIds?: unknown;
  defaultPriceGroupId?: unknown;
  languageIds?: unknown;
};

export const isCatalogScopedFilter = (catalogFilter: string): boolean =>
  catalogFilter !== 'all' && catalogFilter !== 'unassigned';

export const resolveSupportedLanguageOption = (
  value: string | null | undefined
): LanguageOption | undefined => {
  const normalizedValue = String(value ?? '').trim().toUpperCase();
  if (normalizedValue.length === 0) return undefined;
  if (normalizedValue in supportedLanguageMap) return supportedLanguageMap[normalizedValue];

  const suffix = normalizedValue.split(/[-_]/).pop();
  if (suffix === undefined || suffix.length === 0) return undefined;
  return supportedLanguageMap[suffix];
};

export const readStringArray = (value: unknown): string[] =>
  Array.isArray(value)
    ? value.filter((entry): entry is string => typeof entry === 'string' && entry.length > 0)
    : [];

export const normalizeCatalogRecord = (catalog: Catalog): Catalog => {
  const runtimeCatalog = catalog as RuntimeCatalog;
  return {
    ...catalog,
    languageIds: readStringArray(runtimeCatalog.languageIds),
    priceGroupIds: readStringArray(runtimeCatalog.priceGroupIds),
    defaultPriceGroupId:
      typeof runtimeCatalog.defaultPriceGroupId === 'string'
        ? runtimeCatalog.defaultPriceGroupId
        : null,
  };
};

export const resolveCatalogPriceGroups = ({
  catalogFilter,
  catalogs,
  priceGroups,
}: {
  catalogFilter: string;
  catalogs: Catalog[];
  priceGroups: PriceGroupWithDetails[];
}): PriceGroupWithDetails[] => {
  if (!isCatalogScopedFilter(catalogFilter)) return priceGroups;
  const catalog = catalogs.find((entry) => entry.id === catalogFilter);
  if (catalog === undefined || catalog.priceGroupIds.length === 0) return priceGroups;
  const allowedGroupIds = new Set(catalog.priceGroupIds);
  return priceGroups.filter((group) => allowedGroupIds.has(group.id));
};

export const resolveCurrencyCodes = (priceGroups: PriceGroupWithDetails[]): string[] =>
  Array.from(
    new Set(priceGroups.map((group) => group.currency.code.trim().toUpperCase()))
  ).filter((code) => /^[A-Z]{3,5}$/.test(code));

export const resolveFallbackCurrencyCode = ({
  catalogFilter,
  catalogs,
  candidateGroups,
  codes,
}: {
  catalogFilter: string;
  catalogs: Catalog[];
  candidateGroups: PriceGroupWithDetails[];
  codes: string[];
}): string => {
  const catalog = findCatalogForFilter(catalogFilter, catalogs);
  const defaultGroupId = catalog?.defaultPriceGroupId;
  const defaultGroup =
    defaultGroupId !== null && defaultGroupId !== undefined
      ? candidateGroups.find((group) => group.id === defaultGroupId)
      : candidateGroups.find((group) => group.isDefault);
  return defaultGroup?.currency.code ?? codes[0] ?? '';
};

export const findCatalogForFilter = (
  catalogFilter: string,
  catalogs: Catalog[]
): Catalog | undefined =>
  isCatalogScopedFilter(catalogFilter)
    ? catalogs.find((entry) => entry.id === catalogFilter)
    : undefined;

export const buildLanguageOptions = (languageIds: string[]): LanguageOption[] => {
  const options: LanguageOption[] = [];
  const seen = new Set<string>();
  languageIds.forEach((languageId) => {
    const option = resolveSupportedLanguageOption(languageId);
    if (option === undefined || seen.has(option.value)) return;
    seen.add(option.value);
    options.push(option);
  });
  return options.length > 0 ? options : DEFAULT_LANGUAGE_OPTIONS;
};

export const getSupportedLanguageKeys = (): string[] => Object.keys(supportedLanguageMap);

export const getCatalogsErrorMessage = (error: unknown): string | null => {
  if (error === null || error === undefined) return null;
  return error instanceof Error ? error.message : String(error);
};
