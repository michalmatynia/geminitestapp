import type { PaginatedResponseDto, PaginationDto } from '@/shared/contracts/http';
import { createInfiniteQueryV2 } from '@/shared/lib/query-factories-v2';

import type {
  InfiniteData,
  UseInfiniteQueryOptions,
  UseInfiniteQueryResult,
} from '@tanstack/react-query';

export type PaginatedResponse<T> = PaginatedResponseDto<T>;

export interface InfiniteQueryParams {
  page: number;
  pageSize: number;
  [key: string]: unknown;
}

const toPagination = <T>(page: PaginatedResponse<T>): PaginationDto => {
  return page.pagination;
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
  const pageSize: number = options?.pageSize ?? 20;
  const initialParams: Record<string, unknown> = options?.initialParams ?? {};
  const {
    pageSize: _ignoredPageSize,
    initialParams: _ignoredInitialParams,
    ...queryOptions
  } = options ?? {};

  return createInfiniteQueryV2<
    PaginatedResponse<TData>,
    Error,
    InfiniteData<PaginatedResponse<TData>>,
    unknown[],
    number
  >({
    queryKey: [...queryKey, { pageSize, ...initialParams }] as const,
    queryFn: ({ pageParam }: { pageParam: number }): Promise<PaginatedResponse<TData>> =>
      queryFn({
        page: pageParam || 1,
        pageSize,
        ...initialParams,
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
    ...queryOptions,
    meta: {
      source: 'shared.hooks.query.useInfiniteQueryWithPagination',
      operation: 'infinite',
      resource: 'pagination',
      domain: 'global',
      tags: ['infinite', 'pagination'],
    },
  });
}

// Helper hook to flatten infinite query data
export function useFlattenedInfiniteData<T>(
  infiniteQuery: UseInfiniteQueryResult<InfiniteData<PaginatedResponse<T>>, Error>
): {
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
