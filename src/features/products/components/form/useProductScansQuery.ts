'use client';

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/shared/lib/api-client';
import { QUERY_KEYS } from '@/shared/lib/query-keys';
import { isProductScanActiveStatus } from '@/shared/contracts/product-scans';
import type { ProductScanListResponse, ProductScanRecord } from '@/shared/contracts/product-scans';
import { useState, useCallback } from 'react';

export type ProductScansQueryResult = {
  scans: ProductScanRecord[];
  isFetching: boolean;
  refetch: () => void;
  handleDeleteScan: (scanId: string) => Promise<void>;
  isDeletingScanId: string | null;
};

export function useProductScansQuery(productId: string): ProductScansQueryResult {
  const queryClient = useQueryClient();
  const [isDeletingScanId, setIsDeletingScanId] = useState<string | null>(null);

  const query = useQuery<ProductScanListResponse, Error>({
    queryKey: QUERY_KEYS.products.scans(productId),
    enabled: productId !== '',
    queryFn: async (): Promise<ProductScanListResponse> =>
      api.get<ProductScanListResponse>(`/api/v2/products/${productId}/scans`, {
        cache: 'no-store',
      }),
    refetchInterval: (q) => {
      const scansData = q.state.data?.scans;
      if (!Array.isArray(scansData)) return false;
      return scansData.some((scan) => isProductScanActiveStatus(scan.status));
    },
  });

  const handleDeleteScan = async (scanId: string): Promise<void> => {
    if (isDeletingScanId !== null) return;
    setIsDeletingScanId(scanId);
    try {
      await api.delete(`/api/v2/products/scans/${scanId}`);
      await queryClient.invalidateQueries({ queryKey: QUERY_KEYS.products.scans(productId) });
    } catch {
       // Handled implicitly
    } finally {
      setIsDeletingScanId(null);
    }
  };

  const { refetch: queryRefetch } = query;
  const handleRefetch = useCallback((): void => {
    queryRefetch().catch(() => { /* silent */ });
  }, [queryRefetch]);

  const rawData: ProductScanListResponse | undefined = query.data;
  const rawScans = rawData?.scans;

  return {
    scans: Array.isArray(rawScans) ? rawScans : [],
    isFetching: query.isFetching,
    refetch: handleRefetch,
    handleDeleteScan,
    isDeletingScanId,
  };
}
