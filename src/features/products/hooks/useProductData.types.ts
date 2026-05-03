import type { QueryClient } from '@tanstack/react-query';
import type { Dispatch, SetStateAction } from 'react';

import type { ProductWithImages } from '@/shared/contracts/products';

import type { UseProductsFilters } from './useProductsQuery';

export type IdMatchMode = NonNullable<UseProductsFilters['idMatchMode']>;
export type SearchLanguage = NonNullable<UseProductsFilters['searchLanguage']>;
export type AppliedStockOperator = NonNullable<UseProductsFilters['stockOperator']>;
export type StockOperator = '' | AppliedStockOperator;
export type BaseExportedFilter = '' | 'true' | 'false';

export interface UseProductDataProps {
  refreshTrigger?: number;
  initialCatalogFilter?: string | null;
  initialPageSize?: number | null;
  initialAppliedAdvancedFilter?: string | null;
  initialAppliedAdvancedFilterPresetId?: string | null;
  preferencesLoaded: boolean;
  currencyCode?: string | null;
  priceGroups?: unknown[];
  searchLanguage?: string | null;
}

export interface ProductDataHookResult {
  data: ProductWithImages[];
  totalPages: number;
  page: number;
  setPage: (p: number) => void;
  pageSize: number;
  setPageSize: (size: number) => void;
  search: string;
  setSearch: (s: string) => void;
  productId: string;
  setProductId: (s: string) => void;
  idMatchMode: IdMatchMode;
  setIdMatchMode: (mode: IdMatchMode) => void;
  sku: string;
  setSku: (s: string) => void;
  description: string;
  setDescription: (s: string) => void;
  categoryId: string;
  setCategoryId: (id: string) => void;
  minPrice: number | undefined;
  setMinPrice: (p: number | undefined) => void;
  maxPrice: number | undefined;
  setMaxPrice: (p: number | undefined) => void;
  stockValue: number | undefined;
  setStockValue: (value: number | undefined) => void;
  stockOperator: StockOperator;
  setStockOperator: (value: StockOperator) => void;
  startDate: string | undefined;
  setStartDate: (s: string | undefined) => void;
  endDate: string | undefined;
  setEndDate: (s: string | undefined) => void;
  advancedFilter: string;
  setAdvancedFilter: (value: string) => void;
  activeAdvancedFilterPresetId: string | null;
  setAdvancedFilterState: (value: string, presetId: string | null) => void;
  catalogFilter: string;
  setCatalogFilter: (f: string) => void;
  baseExported: BaseExportedFilter;
  setBaseExported: (value: BaseExportedFilter) => void;
  includeArchived: boolean;
  setIncludeArchived: (value: boolean) => void;
  parsedMatchProductIds: string[];
  setParsedMatchProductIds: (ids: string[]) => void;
  clearParsedMatchProductIds: () => void;
  loadError: Error | null;
  isLoading: boolean;
  isFetching: boolean;
  refresh: () => void;
}

export interface ProductDataState {
  page: number;
  setPage: Dispatch<SetStateAction<number>>;
  pageSize: number;
  setPageSize: Dispatch<SetStateAction<number>>;
  search: string;
  setSearch: Dispatch<SetStateAction<string>>;
  debouncedSearch: string;
  setDebouncedSearch: Dispatch<SetStateAction<string>>;
  productId: string;
  setProductId: Dispatch<SetStateAction<string>>;
  idMatchMode: IdMatchMode;
  setIdMatchMode: Dispatch<SetStateAction<IdMatchMode>>;
  sku: string;
  setSku: Dispatch<SetStateAction<string>>;
  description: string;
  setDescription: Dispatch<SetStateAction<string>>;
  categoryId: string;
  setCategoryId: Dispatch<SetStateAction<string>>;
  minPrice: number | undefined;
  setMinPrice: Dispatch<SetStateAction<number | undefined>>;
  maxPrice: number | undefined;
  setMaxPrice: Dispatch<SetStateAction<number | undefined>>;
  stockValue: number | undefined;
  setStockValue: Dispatch<SetStateAction<number | undefined>>;
  stockOperator: StockOperator;
  setStockOperator: Dispatch<SetStateAction<StockOperator>>;
  startDate: string | undefined;
  setStartDate: Dispatch<SetStateAction<string | undefined>>;
  endDate: string | undefined;
  setEndDate: Dispatch<SetStateAction<string | undefined>>;
  advancedFilter: string;
  setAdvancedFilter: Dispatch<SetStateAction<string>>;
  activeAdvancedFilterPresetId: string | null;
  setActiveAdvancedFilterPresetId: Dispatch<SetStateAction<string | null>>;
  catalogFilter: string;
  setCatalogFilter: Dispatch<SetStateAction<string>>;
  baseExported: BaseExportedFilter;
  setBaseExported: Dispatch<SetStateAction<BaseExportedFilter>>;
  includeArchived: boolean;
  setIncludeArchived: Dispatch<SetStateAction<boolean>>;
  parsedMatchProductIds: string[];
  setParsedMatchProductIdsState: Dispatch<SetStateAction<string[]>>;
  filtersInitialized: boolean;
  setFiltersInitialized: Dispatch<SetStateAction<boolean>>;
}

export interface ProductDataFiltersResult {
  filters: UseProductsFilters;
  effectivePageSize: number;
  parsedMatchProductIdsKey: string;
}

export type ProductDataActionsInput = ProductDataState & {
  queryClient: QueryClient;
};

export type ProductDataActions = Pick<
  ProductDataHookResult,
  | 'setPage'
  | 'setPageSize'
  | 'setSearch'
  | 'setProductId'
  | 'setIdMatchMode'
  | 'setSku'
  | 'setDescription'
  | 'setCategoryId'
  | 'setMinPrice'
  | 'setMaxPrice'
  | 'setStockValue'
  | 'setStockOperator'
  | 'setStartDate'
  | 'setEndDate'
  | 'setAdvancedFilter'
  | 'setAdvancedFilterState'
  | 'setCatalogFilter'
  | 'setBaseExported'
  | 'setIncludeArchived'
  | 'setParsedMatchProductIds'
  | 'clearParsedMatchProductIds'
>;

export type ProductDataEffectsInput = ProductDataState &
  UseProductDataProps & {
    parsedMatchProductIdsKey: string;
    refresh: () => void;
    totalPages: number;
  };

export interface ProductDataQueryMeta {
  loadError: Error | null;
  totalPages: number;
}

export interface ProductDataResultInput {
  actions: ProductDataActions;
  data: ProductWithImages[];
  isFetching: boolean;
  isLoading: boolean;
  loadError: Error | null;
  refresh: () => void;
  state: ProductDataState;
  totalPages: number;
}
