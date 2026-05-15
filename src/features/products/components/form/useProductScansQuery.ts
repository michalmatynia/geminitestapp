'use client';
'use no memo';

import { useQueryClient, type QueryClient } from '@tanstack/react-query';
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
import { useSingleQueryV2 } from '@/shared/lib/query-factories-v2';

const PRODUCT_SCAN_ACTIVE_REFETCH_MS = 5_000;

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

const hasActiveProductScans = (scansData: unknown): boolean =>
  Array.isArray(scansData) &&
  scansData.some((scan: ProductScanRecord) => isProductScanActiveStatus(scan.status));

const invalidateProductScansQuery = async (
  queryClient: QueryClient,
  productId: string
): Promise<void> => {
  await queryClient.invalidateQueries({ queryKey: QUERY_KEYS.products.scans(productId) });
};

const shouldSkipAmazonCandidateExtraction = ({
  extractingAmazonCandidateScanId,
  productId,
  scan,
}: {
  extractingAmazonCandidateScanId: string | null;
  productId: string;
  scan: ProductScanRecord;
}): boolean =>
  extractingAmazonCandidateScanId !== null || productId === '' || scan.provider !== 'amazon';

const requiresTrackableAmazonCandidateScanId = (
  status: ProductScanAmazonExtractCandidateResponse['status']
): boolean => status === 'queued' || status === 'running' || status === 'already_running';

const hasTrackableScanId = (scanId: unknown): boolean =>
  typeof scanId === 'string' && scanId.trim().length > 0;

const assertTrackableAmazonCandidateResponse = (
  response: ProductScanAmazonExtractCandidateResponse
): void => {
  if (
    requiresTrackableAmazonCandidateScanId(response.status) &&
    hasTrackableScanId(response.scanId) === false
  ) {
    throw new Error('Amazon candidate extraction did not return a trackable scan id.');
  }
};

const useDeleteProductScan = ({
  productId,
  queryClient,
}: {
  productId: string;
  queryClient: QueryClient;
}): {
  isDeletingScanId: string | null;
  handleDeleteScan: (scanId: string) => Promise<void>;
} => {
  const [isDeletingScanId, setIsDeletingScanId] = useState<string | null>(null);

  const handleDeleteScan = async (scanId: string): Promise<void> => {
    if (isDeletingScanId !== null) return;
    setIsDeletingScanId(scanId);
    try {
      await api.delete(`/api/v2/products/scans/${scanId}`);
      await invalidateProductScansQuery(queryClient, productId);
    } catch {
      // Handled implicitly
    } finally {
      setIsDeletingScanId(null);
    }
  };

  return { isDeletingScanId, handleDeleteScan };
};

const useExtractAmazonCandidate = ({
  productId,
  queryClient,
}: {
  productId: string;
  queryClient: QueryClient;
}): Pick<
  ProductScansQueryResult,
  'extractingAmazonCandidateScanId' | 'extractingAmazonCandidateUrl' | 'handleExtractAmazonCandidate'
> => {
  const [extractingAmazonCandidateScanId, setExtractingAmazonCandidateScanId] =
    useState<string | null>(null);
  const [extractingAmazonCandidateUrl, setExtractingAmazonCandidateUrl] =
    useState<string | null>(null);

  const handleExtractAmazonCandidate = useCallback(
    async (
      scan: ProductScanRecord,
      candidate: ProductScanAmazonCandidatePreview
    ): Promise<void> => {
      if (shouldSkipAmazonCandidateExtraction({ extractingAmazonCandidateScanId, productId, scan })) {
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
        assertTrackableAmazonCandidateResponse(response);
        await invalidateProductScansQuery(queryClient, productId);
      } finally {
        setExtractingAmazonCandidateScanId(null);
        setExtractingAmazonCandidateUrl(null);
      }
    },
    [extractingAmazonCandidateScanId, productId, queryClient]
  );

  return {
    extractingAmazonCandidateScanId,
    extractingAmazonCandidateUrl,
    handleExtractAmazonCandidate,
  };
};

export function useProductScansQuery(productId: string): ProductScansQueryResult {
  const queryClient = useQueryClient();
  const { isDeletingScanId, handleDeleteScan } = useDeleteProductScan({ productId, queryClient });
  const {
    extractingAmazonCandidateScanId,
    extractingAmazonCandidateUrl,
    handleExtractAmazonCandidate,
  } = useExtractAmazonCandidate({ productId, queryClient });

  const queryKey = QUERY_KEYS.products.scans(productId);
  const query = useSingleQueryV2<ProductScanListResponse>({
    queryKey,
    enabled: productId !== '',
    queryFn: async (): Promise<ProductScanListResponse> =>
      api.get<ProductScanListResponse>(`/api/v2/products/${productId}/scans`, {
        cache: 'no-store',
      }),
    meta: {
      source: 'products.components.form.useProductScansQuery',
      operation: 'list',
      resource: 'products.scans',
      domain: 'products',
      queryKey,
      tags: ['products', 'scans'],
      description: 'Loads product scans for the product form.',
    },
    refetchInterval: (q) => {
      return hasActiveProductScans(q.state.data?.scans) ? PRODUCT_SCAN_ACTIVE_REFETCH_MS : false;
    },
  });

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
