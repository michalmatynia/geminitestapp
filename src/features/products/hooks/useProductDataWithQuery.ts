'use client';
// useProductDataWithQuery: lightweight list hook combining local UI filter and
// pagination state with useProductsWithCount. Debounces inputs and exposes a
// simple interface for list UIs that don't need the full product-list state.

import { useState, useMemo, useCallback, useEffect } from 'react';

import { useProductsWithCount } from '@/features/products/hooks/useProductsQuery';
import type { ProductWithImages } from '@/shared/contracts/products/product';

interface UseProductDataWithQueryProps {
  initialCatalogFilter?: string;
  initialPageSize?: number;
  preferencesLoaded?: boolean;
}

interface UseProductDataWithQueryReturn {
  data: ProductWithImages[];
  total: number;
  totalPages: number;
  page: number;
  setPage: (page: number) => void;
  pageSize: number;
  setPageSize: (size: number) => void;
  search: string;
  setSearch: (value: string) => void;
  sku: string;
  setSku: (value: string) => void;
  minPrice: number | undefined;
  setMinPrice: (value: number | undefined) => void;
  maxPrice: number | undefined;
  setMaxPrice: (value: number | undefined) => void;
  startDate: string;
  setStartDate: (value: string) => void;
  endDate: string;
  setEndDate: (value: string) => void;
  catalogFilter: string;
  setCatalogFilter: (filter: string) => void;
  isLoading: boolean;
  isFetching: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  resetFilters: () => void;
}

type ProductDataFilters = {
  catalogId: string | undefined;
  endDate: string;
  maxPrice: number | undefined;
  minPrice: number | undefined;
  page: number;
  pageSize: number;
  search: string;
  sku: string;
  startDate: string;
};

type ProductDataReturnInput = {
  catalogFilter: string;
  data: ProductWithImages[];
  endDate: string;
  error: unknown;
  isFetching: boolean;
  isLoading: boolean;
  maxPrice: number | undefined;
  minPrice: number | undefined;
  page: number;
  pageSize: number;
  refetch: () => Promise<void>;
  resetFilters: () => void;
  search: string;
  setCatalogFilter: (filter: string) => void;
  setEndDate: (value: string) => void;
  setMaxPrice: (value: number | undefined) => void;
  setMinPrice: (value: number | undefined) => void;
  setPage: (page: number) => void;
  setPageSize: (size: number) => void;
  setSearch: (value: string) => void;
  setSku: (value: string) => void;
  setStartDate: (value: string) => void;
  sku: string;
  startDate: string;
  total: number;
  totalPages: number;
};

type ProductDataControls = Omit<
  ProductDataReturnInput,
  | 'data'
  | 'error'
  | 'isFetching'
  | 'isLoading'
  | 'refetch'
  | 'total'
  | 'totalPages'
>;

const useDebouncedTextFilter = (
  value: string,
  setPage: (page: number) => void
): string => {
  const [debouncedValue, setDebouncedValue] = useState<string>('');
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedValue(value);
      setPage(1);
    }, 300);
    return (): void => clearTimeout(timer);
  }, [setPage, value]);

  return debouncedValue;
};

const useProductDataFilters = ({
  catalogFilter,
  debouncedSearch,
  debouncedSku,
  endDate,
  maxPrice,
  minPrice,
  page,
  pageSize,
  startDate,
}: {
  catalogFilter: string;
  debouncedSearch: string;
  debouncedSku: string;
  endDate: string;
  maxPrice: number | undefined;
  minPrice: number | undefined;
  page: number;
  pageSize: number;
  startDate: string;
}): ProductDataFilters =>
  useMemo(
    () => ({
      search: debouncedSearch,
      sku: debouncedSku,
      minPrice,
      maxPrice,
      startDate,
      endDate,
      page,
      pageSize,
      catalogId: catalogFilter === 'all' ? undefined : catalogFilter,
    }),
    [catalogFilter, debouncedSearch, debouncedSku, endDate, maxPrice, minPrice, page, pageSize, startDate]
  );

const resolveProductDataError = (error: unknown): string | null => {
  if (error === null || error === undefined) {
    return null;
  }
  if (error instanceof Error) {
    return error.message;
  }
  return 'Failed to load products';
};

const createProductDataReturn = (input: ProductDataReturnInput): UseProductDataWithQueryReturn => ({
  data: input.data,
  total: input.total,
  totalPages: input.totalPages,
  page: input.page,
  setPage: input.setPage,
  pageSize: input.pageSize,
  setPageSize: input.setPageSize,
  search: input.search,
  setSearch: input.setSearch,
  sku: input.sku,
  setSku: input.setSku,
  minPrice: input.minPrice,
  setMinPrice: input.setMinPrice,
  maxPrice: input.maxPrice,
  setMaxPrice: input.setMaxPrice,
  startDate: input.startDate,
  setStartDate: input.setStartDate,
  endDate: input.endDate,
  setEndDate: input.setEndDate,
  catalogFilter: input.catalogFilter,
  setCatalogFilter: input.setCatalogFilter,
  isLoading: input.isLoading,
  isFetching: input.isFetching,
  error: resolveProductDataError(input.error),
  refetch: input.refetch,
  resetFilters: input.resetFilters,
});

const useProductDataControls = (
  initialCatalogFilter: string,
  initialPageSize: number
): ProductDataControls => {
  const [search, setSearch] = useState<string>('');
  const [sku, setSku] = useState<string>('');
  const [minPrice, setMinPrice] = useState<number | undefined>(undefined);
  const [maxPrice, setMaxPrice] = useState<number | undefined>(undefined);
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [catalogFilter, setCatalogFilter] = useState(initialCatalogFilter);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(initialPageSize);

  const resetFilters = useCallback((): void => {
    setSearch('');
    setSku('');
    setMinPrice(undefined);
    setMaxPrice(undefined);
    setStartDate('');
    setEndDate('');
    setPage(1);
  }, []);

  return {
    catalogFilter,
    endDate,
    maxPrice,
    minPrice,
    page,
    pageSize,
    resetFilters,
    search,
    setCatalogFilter,
    setEndDate,
    setMaxPrice,
    setMinPrice,
    setPage,
    setPageSize,
    setSearch,
    setSku,
    setStartDate,
    sku,
    startDate,
  };
};

export function useProductDataWithQuery({
  initialCatalogFilter = 'all',
  initialPageSize = 24,
  preferencesLoaded = true,
}: UseProductDataWithQueryProps = {}): UseProductDataWithQueryReturn {
  const controls = useProductDataControls(initialCatalogFilter, initialPageSize);
  const debouncedSearch = useDebouncedTextFilter(controls.search, controls.setPage);
  const debouncedSku = useDebouncedTextFilter(controls.sku, controls.setPage);
  const filters = useProductDataFilters({
    catalogFilter: controls.catalogFilter,
    debouncedSearch,
    debouncedSku,
    endDate: controls.endDate,
    maxPrice: controls.maxPrice,
    minPrice: controls.minPrice,
    page: controls.page,
    pageSize: controls.pageSize,
    startDate: controls.startDate,
  });

  const { products, total, isLoading, isFetching, error, refetch } = useProductsWithCount(
    {
      ...filters,
      advancedFilter: undefined,
      baseExported: undefined,
    },
    {
      enabled: preferencesLoaded,
      prefetchNextPage: controls.page > 1,
    }
  );

  const totalPages = useMemo((): number => {
    return Math.max(1, Math.ceil(total / controls.pageSize));
  }, [controls.pageSize, total]);

  return createProductDataReturn({
    ...controls,
    data: products,
    error,
    isFetching,
    isLoading,
    refetch,
    total,
    totalPages,
  });
}
