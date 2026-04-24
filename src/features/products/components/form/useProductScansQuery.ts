'use client';

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/shared/lib/api-client';
import { QUERY_KEYS } from '@/shared/lib/query-keys';
import { isProductScanActiveStatus } from '@/shared/contracts/product-scans';
import type {
  ProductScanAmazonExtractCandidateResponse,
  ProductScanListResponse,
  ProductScanRecord,
} from '@/shared/contracts/product-scans';
import { useState, useCallback } from 'react';
import type { ProductScanAmazonCandidatePreview } from '@/features/products/lib/product-scan-amazon-candidates';

export type ProductScansQueryResult = {
  scans: ProductScanRecord[];
  isFetching: boolean;
  refetch: () => void;
  handleDeleteScan: (scanId: string) => Promise<void>;
  handleExtractAmazonCandidate: (
    scan: ProductScanRecord,
    candidate: ProductScanAmazonCandidatePreview
  ) => Promise<void>;
  extractingAmazonCandidateScanId: string | null;
  extractingAmazonCandidateUrl: string | null;
  isDeletingScanId: string | null;
};

export function useProductScansQuery(productId: string): ProductScansQueryResult {
  const queryClient = useQueryClient();
  const [isDeletingScanId, setIsDeletingScanId] = useState<string | null>(null);
  const [extractingAmazonCandidateScanId, setExtractingAmazonCandidateScanId] =
    useState<string | null>(null);
  const [extractingAmazonCandidateUrl, setExtractingAmazonCandidateUrl] =
    useState<string | null>(null);

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
      return scansData.some((scan) => isProductScanActiveStatus(scan.status)) ? 5_000 : false;
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

  const handleExtractAmazonCandidate = useCallback(
    async (
      scan: ProductScanRecord,
      candidate: ProductScanAmazonCandidatePreview
    ): Promise<void> => {
      if (
        extractingAmazonCandidateScanId !== null ||
        productId === '' ||
        scan.provider !== 'amazon'
      ) {
        return;
      }

      setExtractingAmazonCandidateScanId(scan.id);
      setExtractingAmazonCandidateUrl(candidate.url);

      try {
        const response = await api.post<ProductScanAmazonExtractCandidateResponse>(
          '/api/v2/products/scans/amazon/extract-candidate',
          {
            productId,
            scanId: scan.id,
            candidateUrl: candidate.url,
            candidateRank: candidate.rank,
            candidateId: candidate.matchedImageId ?? candidate.id,
          }
        );

        if (
          (response.status === 'queued' ||
            response.status === 'running' ||
            response.status === 'already_running') &&
          (typeof response.scanId !== 'string' || response.scanId.trim().length === 0)
        ) {
          throw new Error('Amazon candidate extraction did not return a trackable scan id.');
        }

        await queryClient.invalidateQueries({
          queryKey: QUERY_KEYS.products.scans(productId),
        });
      } finally {
        setExtractingAmazonCandidateScanId(null);
        setExtractingAmazonCandidateUrl(null);
      }
    },
    [extractingAmazonCandidateScanId, productId, queryClient]
  );

  const { refetch: queryRefetch } = query;
  const handleRefetch = useCallback((): void => {
    queryRefetch().catch(() => { /* silent */ });
  }, [queryRefetch]);

  const rawScans = query.data?.scans;

  return {
    scans: Array.isArray(rawScans) ? rawScans : [],
    isFetching: query.isFetching,
    refetch: handleRefetch,
    handleDeleteScan,
    handleExtractAmazonCandidate,
    extractingAmazonCandidateScanId,
    extractingAmazonCandidateUrl,
    isDeletingScanId,
  };
}
