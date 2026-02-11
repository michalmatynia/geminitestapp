import { useInfiniteQuery, type UseInfiniteQueryOptions, type InfiniteData, type UseInfiniteQueryResult } from '@tanstack/react-query';

import type {
  LegacyPaginatedResponseDto,
  PaginatedResponseDto,
  PaginationDto,
} from '@/shared/dtos/http';

export type PaginatedResponse<T> = PaginatedResponseDto<T> | LegacyPaginatedResponseDto<T>;

export interface InfiniteQueryParams {
  page: number;
  pageSize: number;
  [key: string]: unknown;
}

const hasNestedPagination = <T>(page: PaginatedResponse<T>): page is PaginatedResponseDto<T> => {
  return (
    typeof page === 'object' &&
    page !== null &&
    'pagination' in page &&
    Boolean((page as { pagination?: unknown }).pagination)
  );
};

const toPagination = <T>(page: PaginatedResponse<T>): PaginationDto => {
  if (hasNestedPagination(page)) return page.pagination;
  const total = typeof page.total === 'number' ? page.total : 0;
  const currentPage = typeof page.page === 'number' ? page.page : 1;
  const pageSize = typeof page.limit === 'number' ? page.limit : 1;
  const totalPages = pageSize > 0 ? Math.max(1, Math.ceil(total / pageSize)) : 1;
  return {
    page: currentPage,
    pageSize,
    total,
    totalPages,
    hasNextPage: currentPage < totalPages,
    hasPreviousPage: currentPage > 1,
  };
};

// Hook for infinite/paginated queries
export function useInfiniteQueryWithPagination<TData>(
  queryKey: unknown[],
  queryFn: (params: InfiniteQueryParams) => Promise<PaginatedResponse<TData>>,
  options?: Omit<
    UseInfiniteQueryOptions<
      PaginatedResponse<TData>,
      Error,
      InfiniteData<PaginatedResponse<TData>>,
      unknown[],
      number
    >,
    'queryKey' | 'queryFn' | 'getNextPageParam' | 'getPreviousPageParam' | 'initialPageParam'
  > & {
    pageSize?: number;
    initialParams?: Record<string, unknown>;
  }
): UseInfiniteQueryResult<InfiniteData<PaginatedResponse<TData>>, Error> {
  const pageSize: number = options?.pageSize || 20;
  const initialParams: Record<string, unknown> = options?.initialParams || {};

  return useInfiniteQuery({
    queryKey: [...queryKey, { pageSize, ...initialParams }] as const,
    queryFn: ({ pageParam }: { pageParam: number }): Promise<PaginatedResponse<TData>> => 
      queryFn({
        page: pageParam || 1,
        pageSize,
        ...initialParams
      }),
    initialPageParam: 1,
    getNextPageParam: (lastPage: PaginatedResponse<TData>): number | undefined => {
      const pagination = toPagination(lastPage);
      return pagination.hasNextPage ? pagination.page + 1 : undefined;
    },
    getPreviousPageParam: (firstPage: PaginatedResponse<TData>): number | undefined => {
      const pagination = toPagination(firstPage);
      return pagination.hasPreviousPage ? pagination.page - 1 : undefined;
    },
    ...options,
  });
}

// Helper hook to flatten infinite query data
export function useFlattenedInfiniteData<T>(infiniteQuery: UseInfiniteQueryResult<InfiniteData<PaginatedResponse<T>>, Error>): {
  data: T[];
  totalCount: number;
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
  fetchNextPage: () => Promise<unknown>;
  hasNextPage: boolean;
  isFetchingNextPage: boolean;
  refetch: () => Promise<unknown>;
} {
  const pages: PaginatedResponse<T>[] | undefined = infiniteQuery.data?.pages;
  const flatData: T[] = pages?.flatMap((page: PaginatedResponse<T>) => page.data) || [];
  const totalCount: number = pages?.[0] ? toPagination(pages[0]).total : 0;
  
  return {
    data: flatData,
    totalCount,
    isLoading: infiniteQuery.isLoading,
    isError: infiniteQuery.isError,
    error: infiniteQuery.error,
    fetchNextPage: async (): Promise<unknown> => await infiniteQuery.fetchNextPage(),
    hasNextPage: !!infiniteQuery.hasNextPage,
    isFetchingNextPage: !!infiniteQuery.isFetchingNextPage,
    refetch: async (): Promise<unknown> => await infiniteQuery.refetch(),
  };
}
