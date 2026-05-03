import { productAdvancedFilterGroupSchema } from '@/shared/contracts/products/filters';
import { logClientError } from '@/shared/utils/observability/client-error-logger';

import type {
  AppliedStockOperator,
  BaseExportedFilter,
  IdMatchMode,
  SearchLanguage,
  StockOperator,
  UseProductDataProps,
} from './useProductData.types';
import type { UseProductsFilters } from './useProductsQuery';

export const PARSED_MATCH_PRODUCT_IDS_MAX = 500;

const SEARCH_LANGUAGES: ReadonlySet<SearchLanguage> = new Set(['name_en', 'name_pl', 'name_de']);

export const hasNonEmptyText = (value: string | null | undefined): value is string =>
  value !== null && value !== undefined && value.length > 0;

const isSearchLanguage = (value: string): value is SearchLanguage =>
  SEARCH_LANGUAGES.has(value as SearchLanguage);

const toOptionalFilterText = (value: string | undefined): string | undefined =>
  value !== undefined && value.length > 0 ? value : undefined;

const resolveIdMatchMode = (
  productId: string | undefined,
  idMatchMode: IdMatchMode
): IdMatchMode | undefined => (productId !== undefined ? idMatchMode : undefined);

const resolveStockOperator = (
  stockValue: number | undefined,
  stockOperator: StockOperator
): AppliedStockOperator | undefined => {
  if (stockValue === undefined) return undefined;
  if (stockOperator === '') return 'eq';
  return stockOperator;
};

const resolveCatalogId = (catalogFilter: string): string | undefined =>
  catalogFilter === 'all' ? undefined : catalogFilter;

const parseBaseExportedFilter = (baseExported: BaseExportedFilter): boolean | undefined => {
  if (baseExported === 'true') return true;
  if (baseExported === 'false') return false;
  return undefined;
};

const createParsedIdFilters = (
  input: ProductFilterFactoryInput,
  searchLanguage: SearchLanguage | undefined
): UseProductsFilters => ({
  ids: input.parsedMatchProductIds,
  page: input.page,
  pageSize: input.effectivePageSize,
  searchLanguage,
});

const createStandardFilters = (
  input: ProductFilterFactoryInput,
  searchLanguage: SearchLanguage | undefined
): UseProductsFilters => {
  const productId = toOptionalFilterText(input.productId);
  return {
    search: toOptionalFilterText(input.debouncedSearch),
    id: productId,
    idMatchMode: resolveIdMatchMode(productId, input.idMatchMode),
    sku: toOptionalFilterText(input.sku),
    description: toOptionalFilterText(input.description),
    categoryId: toOptionalFilterText(input.categoryId),
    minPrice: input.minPrice,
    maxPrice: input.maxPrice,
    stockValue: input.stockValue,
    stockOperator: resolveStockOperator(input.stockValue, input.stockOperator),
    startDate: toOptionalFilterText(input.startDate),
    endDate: toOptionalFilterText(input.endDate),
    advancedFilter: toOptionalFilterText(input.advancedFilter),
    page: input.page,
    pageSize: input.pageSize,
    catalogId: resolveCatalogId(input.catalogFilter),
    searchLanguage,
    baseExported: parseBaseExportedFilter(input.baseExported),
    archived: input.includeArchived ? undefined : false,
  };
};

export type ProductFilterFactoryInput = Pick<
  UseProductsFilters,
  'page' | 'pageSize' | 'minPrice' | 'maxPrice' | 'stockValue'
> & {
  advancedFilter: string;
  baseExported: BaseExportedFilter;
  catalogFilter: string;
  categoryId: string;
  debouncedSearch: string;
  description: string;
  effectivePageSize: number;
  endDate: string | undefined;
  idMatchMode: IdMatchMode;
  includeArchived: boolean;
  parsedMatchProductIds: string[];
  productId: string;
  searchLanguage: UseProductDataProps['searchLanguage'];
  sku: string;
  startDate: string | undefined;
  stockOperator: StockOperator;
};

export const isValidAdvancedFilterPayload = (payload: string): boolean => {
  try {
    const parsed: unknown = JSON.parse(payload);
    return productAdvancedFilterGroupSchema.safeParse(parsed).success;
  } catch (error) {
    logClientError(error);
    return false;
  }
};

export const normalizeInitialCatalogFilter = (value: string | null | undefined): string =>
  hasNonEmptyText(value) ? value : 'all';

export const normalizeProductIdList = (ids: string[]): string[] =>
  Array.from(
    new Set(
      ids
        .map((id: string): string => id.trim())
        .filter((id: string): boolean => id.length > 0)
    )
  ).slice(0, PARSED_MATCH_PRODUCT_IDS_MAX);

export const normalizeSearchLanguage = (
  value: UseProductDataProps['searchLanguage']
): SearchLanguage | undefined => {
  if (!hasNonEmptyText(value)) return undefined;
  return isSearchLanguage(value) ? value : undefined;
};

export const resolveEffectivePageSize = (pageSize: number, parsedIdsLength: number): number =>
  parsedIdsLength > 0
    ? Math.min(PARSED_MATCH_PRODUCT_IDS_MAX, Math.max(pageSize, parsedIdsLength))
    : pageSize;

export const resolveLoadError = (error: unknown): Error | null => {
  if (error === null || error === undefined) return null;
  if (error instanceof Error) return error;
  return new Error(String(error));
};

export const createProductDataFilters = (
  input: ProductFilterFactoryInput
): UseProductsFilters => {
  const searchLanguage = normalizeSearchLanguage(input.searchLanguage);
  if (input.parsedMatchProductIds.length > 0) return createParsedIdFilters(input, searchLanguage);
  return createStandardFilters(input, searchLanguage);
};
