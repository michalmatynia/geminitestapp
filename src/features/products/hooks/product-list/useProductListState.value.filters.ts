import type { ProductListStateReturn } from './useProductListState.types';
import type { ProductListValueInput } from './useProductListState.value.types';

type PaginationFilterValue = Pick<
  ProductListStateReturn,
  'page' | 'pageSize' | 'setPage' | 'setPageSize' | 'totalPages'
>;
type CatalogFilterValue = Pick<
  ProductListStateReturn,
  | 'catalogFilter'
  | 'catalogs'
  | 'currencyCode'
  | 'currencyOptions'
  | 'filtersCollapsedByDefault'
  | 'languageOptions'
  | 'nameLocale'
  | 'setCatalogFilter'
  | 'setCurrencyCode'
  | 'setNameLocale'
>;
type TextFilterValue = Pick<
  ProductListStateReturn,
  | 'categoryId'
  | 'description'
  | 'idMatchMode'
  | 'productId'
  | 'search'
  | 'setCategoryId'
  | 'setDescription'
  | 'setIdMatchMode'
  | 'setProductId'
  | 'setSearch'
  | 'setSku'
  | 'sku'
>;
type InventoryFilterValue = Pick<
  ProductListStateReturn,
  | 'baseExported'
  | 'endDate'
  | 'includeArchived'
  | 'maxPrice'
  | 'minPrice'
  | 'setBaseExported'
  | 'setEndDate'
  | 'setIncludeArchived'
  | 'setMaxPrice'
  | 'setMinPrice'
  | 'setStartDate'
  | 'setStockOperator'
  | 'setStockValue'
  | 'startDate'
  | 'stockOperator'
  | 'stockValue'
>;
type AdvancedFilterValue = Pick<
  ProductListStateReturn,
  | 'activeAdvancedFilterPresetId'
  | 'advancedFilter'
  | 'advancedFilterPresets'
  | 'clearParsedMatchProductIds'
  | 'parsedMatchProductIds'
  | 'setAdvancedFilter'
  | 'setAdvancedFilterPresets'
  | 'setAdvancedFilterState'
  | 'setParsedMatchProductIds'
>;

export type ProductListFilterValue = PaginationFilterValue &
  CatalogFilterValue &
  TextFilterValue &
  InventoryFilterValue &
  AdvancedFilterValue;

const buildPaginationFilterValue = ({
  callbacks,
  data,
}: ProductListValueInput): PaginationFilterValue => ({
  page: data.productData.page,
  totalPages: data.productData.totalPages,
  setPage: data.productData.setPage,
  pageSize: data.productData.pageSize,
  setPageSize: callbacks.handleSetPageSize,
});

const buildCatalogFilterValue = ({
  callbacks,
  data,
}: ProductListValueInput): CatalogFilterValue => ({
  nameLocale: data.preferencesState.preferences.nameLocale,
  setNameLocale: callbacks.handleSetNameLocale,
  languageOptions: data.catalogState.languageOptions,
  currencyCode: data.catalogState.currencyCode,
  setCurrencyCode: callbacks.handleSetCurrencyPreference,
  currencyOptions: data.catalogState.currencyOptions,
  filtersCollapsedByDefault: data.preferencesState.preferences.filtersCollapsedByDefault,
  catalogFilter: data.productData.catalogFilter,
  setCatalogFilter: callbacks.handleSetCatalogPreference,
  catalogs: data.catalogState.catalogs,
});

const buildTextFilterValue = ({ data }: ProductListValueInput): TextFilterValue => ({
  search: data.productData.search,
  setSearch: data.productData.setSearch,
  productId: data.productData.productId,
  setProductId: data.productData.setProductId,
  idMatchMode: data.productData.idMatchMode,
  setIdMatchMode: data.productData.setIdMatchMode,
  sku: data.productData.sku,
  setSku: data.productData.setSku,
  description: data.productData.description,
  setDescription: data.productData.setDescription,
  categoryId: data.productData.categoryId,
  setCategoryId: data.productData.setCategoryId,
});

const buildInventoryFilterValue = ({ data }: ProductListValueInput): InventoryFilterValue => ({
  minPrice: data.productData.minPrice,
  setMinPrice: data.productData.setMinPrice,
  maxPrice: data.productData.maxPrice,
  setMaxPrice: data.productData.setMaxPrice,
  stockValue: data.productData.stockValue,
  setStockValue: data.productData.setStockValue,
  stockOperator: data.productData.stockOperator,
  setStockOperator: data.productData.setStockOperator,
  startDate: data.productData.startDate ?? '',
  setStartDate: data.productData.setStartDate,
  endDate: data.productData.endDate ?? '',
  setEndDate: data.productData.setEndDate,
  baseExported: data.productData.baseExported,
  setBaseExported: data.productData.setBaseExported,
  includeArchived: data.productData.includeArchived,
  setIncludeArchived: data.productData.setIncludeArchived,
});

const buildAdvancedFilterValue = ({
  callbacks,
  data,
}: ProductListValueInput): AdvancedFilterValue => ({
  parsedMatchProductIds: data.productData.parsedMatchProductIds,
  setParsedMatchProductIds: data.productData.setParsedMatchProductIds,
  clearParsedMatchProductIds: data.productData.clearParsedMatchProductIds,
  advancedFilter: data.productData.advancedFilter,
  activeAdvancedFilterPresetId: data.productData.activeAdvancedFilterPresetId,
  advancedFilterPresets: data.preferencesState.preferences.advancedFilterPresets,
  setAdvancedFilterPresets: data.preferencesState.setAdvancedFilterPresets,
  setAdvancedFilter: callbacks.handleSetAdvancedFilter,
  setAdvancedFilterState: callbacks.handleSetAdvancedFilterState,
});

export const buildFilterValue = (
  input: ProductListValueInput
): ProductListFilterValue => ({
  ...buildPaginationFilterValue(input),
  ...buildCatalogFilterValue(input),
  ...buildTextFilterValue(input),
  ...buildInventoryFilterValue(input),
  ...buildAdvancedFilterValue(input),
});
