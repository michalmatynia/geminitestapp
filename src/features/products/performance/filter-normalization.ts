import type { UnknownRecordDto } from '@/shared/contracts/base';
import type { ProductFilters } from '@/shared/contracts/products/drafts';

export type ProductFilterInput = UnknownRecordDto;

type SearchLanguage = NonNullable<ProductFilters['searchLanguage']>;
type StockOperator = NonNullable<ProductFilters['stockOperator']>;
type IdMatchMode = NonNullable<ProductFilters['idMatchMode']>;

const STOCK_OPERATORS: ReadonlySet<StockOperator> = new Set(['gt', 'gte', 'lt', 'lte', 'eq']);
const ID_MATCH_MODES: ReadonlySet<IdMatchMode> = new Set(['exact', 'partial']);
const SEARCH_LANGUAGES: ReadonlySet<SearchLanguage> = new Set(['name_en', 'name_pl', 'name_de']);

function toOptionalString(value: unknown): string | undefined {
  if (typeof value === 'string') {
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : undefined;
  }
  if (typeof value === 'number' && Number.isFinite(value)) {
    return String(value);
  }
  return undefined;
}

function toOptionalNumber(value: unknown): number | undefined {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === 'string') {
    const parsed = Number(value.replace(',', '.'));
    if (Number.isFinite(parsed)) return parsed;
  }
  return undefined;
}

function toOptionalBoolean(value: unknown): boolean | undefined {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    if (normalized === 'true' || normalized === '1') return true;
    if (normalized === 'false' || normalized === '0') return false;
  }
  return undefined;
}

function assignDefined<K extends keyof ProductFilters>(
  normalized: ProductFilters,
  key: K,
  value: ProductFilters[K] | undefined
): void {
  if (value !== undefined) {
    Object.assign(normalized, { [key]: value });
  }
}

function normalizePagination(filters: ProductFilterInput, normalized: ProductFilters): void {
  const pageSize = toOptionalNumber(filters['pageSize']) ?? toOptionalNumber(filters['limit']);
  let page = toOptionalNumber(filters['page']);

  if (page === undefined && pageSize !== undefined) {
    const offset = toOptionalNumber(filters['offset']);
    if (offset !== undefined) {
      page = Math.floor(offset / pageSize) + 1;
    }
  }

  assignDefined(normalized, 'pageSize', pageSize);
  assignDefined(normalized, 'page', page);
}

function normalizeStringFilters(filters: ProductFilterInput, normalized: ProductFilters): void {
  assignDefined(normalized, 'search', toOptionalString(filters['search']));
  assignDefined(normalized, 'id', toOptionalString(filters['id']));
  assignDefined(normalized, 'sku', toOptionalString(filters['sku']));
  assignDefined(normalized, 'categoryId', toOptionalString(filters['categoryId']));
  assignDefined(normalized, 'startDate', toOptionalString(filters['startDate']));
  assignDefined(normalized, 'endDate', toOptionalString(filters['endDate']));
  assignDefined(normalized, 'advancedFilter', toOptionalString(filters['advancedFilter']));
  assignDefined(normalized, 'catalogId', toOptionalString(filters['catalogId']));
}

function normalizeNumberFilters(filters: ProductFilterInput, normalized: ProductFilters): void {
  assignDefined(normalized, 'minPrice', toOptionalNumber(filters['minPrice']));
  assignDefined(normalized, 'maxPrice', toOptionalNumber(filters['maxPrice']));
  assignDefined(normalized, 'stockValue', toOptionalNumber(filters['stockValue']));
}

function normalizeBooleanFilters(filters: ProductFilterInput, normalized: ProductFilters): void {
  assignDefined(normalized, 'baseExported', toOptionalBoolean(filters['baseExported']));
  assignDefined(normalized, 'archived', toOptionalBoolean(filters['archived']));
}

function normalizeEnumFilters(filters: ProductFilterInput, normalized: ProductFilters): void {
  const idMatchMode = toOptionalString(filters['idMatchMode']);
  if (idMatchMode !== undefined && ID_MATCH_MODES.has(idMatchMode as IdMatchMode)) {
    assignDefined(normalized, 'idMatchMode', idMatchMode as IdMatchMode);
  }

  const stockOperator = toOptionalString(filters['stockOperator']);
  if (stockOperator !== undefined && STOCK_OPERATORS.has(stockOperator as StockOperator)) {
    assignDefined(normalized, 'stockOperator', stockOperator as StockOperator);
  }

  const searchLanguage = toOptionalString(filters['searchLanguage']);
  if (searchLanguage !== undefined && SEARCH_LANGUAGES.has(searchLanguage as SearchLanguage)) {
    assignDefined(normalized, 'searchLanguage', searchLanguage as SearchLanguage);
  }
}

export function normalizeFilters(filters: ProductFilterInput = {}): ProductFilters {
  const normalized: ProductFilters = {};

  normalizePagination(filters, normalized);
  normalizeStringFilters(filters, normalized);
  normalizeNumberFilters(filters, normalized);
  normalizeBooleanFilters(filters, normalized);
  normalizeEnumFilters(filters, normalized);

  return normalized;
}
